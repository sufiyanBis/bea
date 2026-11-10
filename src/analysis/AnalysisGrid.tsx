import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, getGroupedRowModel, getExpandedRowModel, getPaginationRowModel,
  flexRender, type ColumnDef, type SortingState, type AggregationFn, type FilterFn,
} from '@tanstack/react-table';
import { ChevronDown, ChevronRight, ChevronUp, Columns3, Download, X } from 'lucide-react';
import type { Company } from '../data/types';
import { FIELDS, FIELD_BY_ID, FIELD_IDS, fieldSeries, kindToFormat, type FieldDef, type FieldKind } from './fields';
import { useAnalysis, type Agg, type CalcColumn } from './analysisStore';
import { FormulaBar } from './FormulaBar';
import { compile } from '../formula/evaluate';
import { toExcelTemplate } from '../formula/excel';
import { fieldsOf, parse } from '../formula/parse';
import { formatDate, formatInt, formatMoney } from '../lib/format';
import { profilePath } from '../lib/nav';
import { Popover } from '../components/ui/Popover';
import { useUi } from '../store/uiStore';
import { Flag } from '../components/ui/Flag';
import type { ExportColumn, ExportFormat, ExportSpec } from '../export/types';
import { requestExport } from '../export/requestExport';

type Val = string | number | null;
const AGGS: { id: Agg; label: string }[] = [
  { id: 'sum', label: 'Sum' }, { id: 'avg', label: 'Average' }, { id: 'median', label: 'Median' }, { id: 'min', label: 'Min' }, { id: 'max', label: 'Max' }, { id: 'count', label: 'Count' },
];

export function aggregateValues(agg: Agg, vals: number[]): number | null {
  if (agg === 'count') return vals.length;
  if (!vals.length) return null;
  switch (agg) {
    case 'sum': return vals.reduce((s, v) => s + v, 0);
    case 'avg': return vals.reduce((s, v) => s + v, 0) / vals.length;
    case 'min': return Math.min(...vals);
    case 'max': return Math.max(...vals);
    case 'median': { const s = [...vals].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
  }
}

export function fmtVal(v: Val, kind: FieldKind | 'calc'): string {
  if (v == null || v === '') return '—';
  if (typeof v === 'string') return kind === 'date' ? formatDate(v) : v;
  switch (kind) {
    case 'money': return (v < 0 ? '-' : '') + (formatMoney(Math.abs(v)) || '£0');
    case 'int': return formatInt(Math.round(v));
    case 'pct': return `${v.toFixed(1)}%`;
    case 'ratio': case 'calc': return Math.abs(v) >= 1000 ? formatInt(Math.round(v)) : String(Math.round(v * 100) / 100);
    default: return String(v);
  }
}

interface ColMeta { kind: FieldKind | 'calc'; label: string; calc?: CalcColumn; field?: FieldDef }

const rangeFilter: FilterFn<Company> = (row, id, f: { min?: number | null; max?: number | null }) => {
  const v = row.getValue<Val>(id);
  if (typeof v !== 'number') return false;
  return (f.min == null || v >= f.min) && (f.max == null || v <= f.max);
};
const textFilter: FilterFn<Company> = (row, id, f: string) => String(row.getValue<Val>(id) ?? '').toLowerCase().includes(f.toLowerCase());

/** Build calculated-column evaluators over the given rows. */
export function useCalcEvaluators(rows: Company[], calcs: CalcColumn[]) {
  return useMemo(() => {
    const ctx = { rows, get: (c: Company, f: string) => FIELD_BY_ID[f]?.get(c) ?? null, series: fieldSeries };
    return Object.fromEntries(calcs.map((k) => {
      try { return [k.id, compile(k.formula, ctx, FIELD_IDS).evaluate]; } catch { return [k.id, () => null]; }
    })) as Record<string, (c: Company) => Val>;
  }, [rows, calcs]);
}

export function AnalysisGrid({ rows, filtersUsed = [] }: { rows: Company[]; filtersUsed?: string[] }) {
  const { columns, calcs, groupBy, agg, filters, setColumns, addCalc, removeCalc, setGroupBy, setAgg, setFilter } = useAnalysis();
  const [sorting, setSorting] = useState<SortingState>([]);
  const evals = useCalcEvaluators(rows, calcs);

  const aggFn: AggregationFn<Company> = (id, leafRows) => aggregateValues(agg, leafRows.map((r) => r.getValue<Val>(id)).filter((v): v is number => typeof v === 'number'));

  const colDefs = useMemo<ColumnDef<Company, Val>[]>(() => {
    const visible = columns.filter((id) => FIELD_BY_ID[id] || calcs.some((c) => c.id === id));
    if (groupBy && !visible.includes(groupBy)) visible.unshift(groupBy);
    return visible.map((id) => {
      const f = FIELD_BY_ID[id];
      const calc = calcs.find((c) => c.id === id);
      const kind: FieldKind | 'calc' = f ? f.kind : 'calc';
      const numeric = kind !== 'text' && kind !== 'date';
      return {
        id,
        accessorFn: (c: Company) => (f ? f.get(c) : evals[id]?.(c) ?? null),
        header: f?.label ?? calc!.label,
        meta: { kind, label: f?.label ?? calc!.label, calc, field: f } as ColMeta,
        enableGrouping: !!f?.groupable,
        filterFn: numeric ? rangeFilter : textFilter,
        aggregationFn: numeric ? aggFn : 'count',
        sortUndefined: 'last',
        cell: (ctx) => {
          const v = ctx.getValue();
          if (id === 'name') return <Link to={profilePath(ctx.row.original.id)} className="text-primary hover:underline font-semibold inline-flex items-center gap-[5px]"><Flag code={ctx.row.original.country} className="text-[13px]" />{v}</Link>;
          return fmtVal(v, kind);
        },
        aggregatedCell: (ctx) => (numeric ? fmtVal(ctx.getValue() as Val, kind === 'int' && agg !== 'avg' && agg !== 'median' ? 'int' : kind === 'pct' ? 'pct' : kind) : ''),
      } as ColumnDef<Company, Val>;
    });
  }, [columns, calcs, evals, groupBy, agg]); // eslint-disable-line react-hooks/exhaustive-deps

  const columnFilters = useMemo(() => Object.entries(filters).map(([id, value]) => ({ id, value })), [filters]);
  const grouping = useMemo(() => (groupBy ? [groupBy] : []), [groupBy]);
  const table = useReactTable({
    data: rows,
    columns: colDefs,
    state: { sorting, columnFilters, grouping },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
    autoResetPageIndex: false,
    autoResetExpanded: false,
  });
  // back to page 1 whenever the filters, grouping or data change
  useEffect(() => { table.setPageIndex(0); }, [filters, groupBy, rows.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = table.getFilteredRowModel().rows.map((r) => r.original);
  const footer = (id: string, kind: FieldKind | 'calc') => {
    if (kind === 'text' || kind === 'date') return id === colDefs[0]?.id ? `${AGGS.find((a) => a.id === agg)!.label} of ${formatInt(filtered.length)} rows` : '';
    const col = table.getColumn(id)!;
    const vals = table.getFilteredRowModel().rows.map((r) => r.getValue<Val>(col.id)).filter((v): v is number => typeof v === 'number');
    return fmtVal(aggregateValues(agg, vals), agg === 'count' ? 'int' : kind);
  };

  const doExport = (format: ExportFormat) => requestExport(analysisSpec(filtered, columns, calcs, evals, agg, filtersUsed), format, 'analysis');

  return (
    <div data-analysis-grid>
      <div className="flex flex-wrap items-center gap-[10px] mb-[10px] text-[14px] text-text">
        <ColumnPicker columns={columns} calcs={calcs} onChange={setColumns} onRemoveCalc={removeCalc} />
        <label className="inline-flex items-center gap-[6px]">Group by
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="h-[30px] border border-border rounded-btn px-2 bg-white text-ink" data-group-by>
            <option value="">None</option>
            {FIELDS.filter((f) => f.groupable).map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </label>
        <label className="inline-flex items-center gap-[6px]">Aggregate
          <select value={agg} onChange={(e) => setAgg(e.target.value as Agg)} className="h-[30px] border border-border rounded-btn px-2 bg-white text-ink" data-aggregate>
            {AGGS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </label>
        <span>{formatInt(filtered.length)} of {formatInt(rows.length)} rows{Object.keys(filters).length ? ' (filtered)' : ''}</span>
        <div className="ml-auto flex items-center gap-[6px]">
          {(['xlsx', 'pdf', 'csv'] as ExportFormat[]).map((f) => (
            <button key={f} onClick={() => doExport(f)} data-analysis-export={f} className="inline-flex items-center gap-[5px] h-[30px] px-[10px] border border-primary rounded-btn text-primary text-[13px] font-semibold bg-white hover:bg-primary-light"><Download size={14} />{f === 'xlsx' ? 'Excel' : f.toUpperCase()}</button>
          ))}
        </div>
      </div>
      <div className="mb-[12px] bg-white border border-card-border rounded-card px-[12px] py-[10px]">
        <FormulaBar onAdd={(label, formula) => addCalc({ label, formula })} />
      </div>
      <div className="bg-white border border-border rounded-card overflow-x-auto">
        <table className="w-full border-collapse text-[14px]" role="grid" aria-label="Analysis grid" aria-rowcount={filtered.length}>
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const meta = h.column.columnDef.meta as ColMeta;
                  const sorted = h.column.getIsSorted();
                  return (
                    <th key={h.id} scope="col" aria-sort={sorted ? (sorted === 'asc' ? 'ascending' : 'descending') : 'none'} className={`px-[10px] py-[8px] border-b border-border bg-[#FAFAFA] text-[13px] font-semibold text-ink whitespace-nowrap ${meta.kind === 'text' || meta.kind === 'date' ? 'text-left' : 'text-right'}`}>
                      <span className="inline-flex items-center gap-[4px]">
                        <button onClick={h.column.getToggleSortingHandler()} className="hover:text-primary" data-sort-col={h.column.id}>
                          {meta.calc && <span className="text-primary mr-[3px]" title={meta.calc.formula}>ƒ</span>}{flexRender(h.column.columnDef.header, h.getContext())}
                        </button>
                        {sorted === 'asc' ? <ChevronUp size={13} /> : sorted === 'desc' ? <ChevronDown size={13} /> : null}
                        {meta.calc && <button aria-label={`Remove ${meta.label}`} onClick={() => removeCalc(meta.calc!.id)} className="text-muted hover:text-ink"><X size={12} /></button>}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
            <tr>
              {table.getHeaderGroups()[0].headers.map((h) => {
                const meta = h.column.columnDef.meta as ColMeta;
                const numeric = meta.kind !== 'text' && meta.kind !== 'date';
                const f = filters[h.column.id];
                return (
                  <th key={h.id} className="px-[6px] py-[4px] border-b border-border bg-[#FAFAFA]">
                    {numeric ? (
                      <span className="flex gap-[3px]">
                        <input aria-label={`${meta.label} minimum`} placeholder="min" inputMode="decimal" value={typeof f === 'object' && f.min != null ? f.min : ''} onChange={(e) => setFilter(h.column.id, { ...(typeof f === 'object' ? f : {}), min: e.target.value === '' ? null : Number(e.target.value) })} className="w-[64px] h-[24px] border border-border rounded-[3px] px-[4px] text-[12px] font-normal" />
                        <input aria-label={`${meta.label} maximum`} placeholder="max" inputMode="decimal" value={typeof f === 'object' && f.max != null ? f.max : ''} onChange={(e) => setFilter(h.column.id, { ...(typeof f === 'object' ? f : {}), max: e.target.value === '' ? null : Number(e.target.value) })} className="w-[64px] h-[24px] border border-border rounded-[3px] px-[4px] text-[12px] font-normal" />
                      </span>
                    ) : (
                      <input aria-label={`Filter ${meta.label}`} placeholder="filter" value={typeof f === 'string' ? f : ''} onChange={(e) => setFilter(h.column.id, e.target.value)} className="w-full min-w-[80px] h-[24px] border border-border rounded-[3px] px-[4px] text-[12px] font-normal" data-col-filter={h.column.id} />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className={row.getIsGrouped() ? 'bg-[#F4F4F7] font-semibold' : 'hover:bg-[#FAFAFA]'} data-group-row={row.getIsGrouped() || undefined}>
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as ColMeta;
                  const numeric = meta.kind !== 'text' && meta.kind !== 'date';
                  return (
                    <td key={cell.id} className={`px-[10px] py-[7px] border-b border-card-border whitespace-nowrap ${numeric ? 'text-right tabular-nums' : ''}`}>
                      {cell.getIsGrouped() ? (
                        <button onClick={row.getToggleExpandedHandler()} aria-expanded={row.getIsExpanded()} className="inline-flex items-center gap-[4px] text-ink">
                          {row.getIsExpanded() ? <ChevronDown size={14} /> : <ChevronRight size={14} />}{String(cell.getValue() ?? '—')} <span className="text-muted font-normal">({row.subRows.length})</span>
                        </button>
                      ) : cell.getIsAggregated() ? flexRender(cell.column.columnDef.aggregatedCell ?? cell.column.columnDef.cell, cell.getContext())
                        : cell.getIsPlaceholder() ? null : flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#EEEDF6] font-semibold" data-aggregate-row>
              {table.getHeaderGroups()[0].headers.map((h) => {
                const meta = h.column.columnDef.meta as ColMeta;
                return <td key={h.id} className={`px-[10px] py-[8px] border-t-2 border-primary text-[13px] whitespace-nowrap ${meta.kind === 'text' || meta.kind === 'date' ? '' : 'text-right tabular-nums'}`} data-footer-col={h.column.id}>{footer(h.column.id, meta.kind)}</td>;
              })}
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex items-center justify-end gap-[8px] mt-[10px] text-[14px]">
        <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="h-[28px] px-[10px] border border-border rounded-btn disabled:opacity-40">Previous</button>
        <span>Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}</span>
        <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="h-[28px] px-[10px] border border-border rounded-btn disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}

function ColumnPicker({ columns, calcs, onChange, onRemoveCalc }: { columns: string[]; calcs: CalcColumn[]; onChange: (c: string[]) => void; onRemoveCalc: (id: string) => void }) {
  const [el, setEl] = useState<HTMLButtonElement | null>(null);
  const toggle = useUi((s) => s.toggle);
  const set = (id: string, on: boolean) => onChange(on ? [...columns, id] : columns.filter((c) => c !== id));
  return (
    <>
      <button ref={setEl} onClick={() => toggle('analysis-columns')} className="inline-flex items-center gap-[6px] h-[30px] px-[10px] border border-border rounded-btn bg-white text-ink hover:border-primary" data-column-picker>
        <Columns3 size={15} />Columns ({columns.length})
      </button>
      <Popover id="analysis-columns" anchor={el} width={300} caret={false} className="p-[10px] max-h-[420px] overflow-y-auto nb-scroll">
        <fieldset>
          <legend className="text-[12px] text-muted mb-[6px]">Company fields</legend>
          {FIELDS.map((f) => (
            <label key={f.id} className="flex items-center gap-[8px] py-[3px] text-[14px] text-ink cursor-pointer">
              <input type="checkbox" className="accent-primary" checked={columns.includes(f.id)} disabled={f.id === 'name'} onChange={(e) => set(f.id, e.target.checked)} />{f.label}
            </label>
          ))}
        </fieldset>
        {calcs.length > 0 && (
          <fieldset className="mt-[8px] pt-[8px] border-t border-border">
            <legend className="text-[12px] text-muted mb-[6px]">Calculated columns</legend>
            {calcs.map((c) => (
              <div key={c.id} className="flex items-center gap-[8px] py-[3px] text-[14px]">
                <input type="checkbox" className="accent-primary" checked={columns.includes(c.id)} onChange={(e) => set(c.id, e.target.checked)} aria-label={c.label} />
                <span className="flex-1 truncate" title={c.formula}>ƒ {c.label}</span>
                <button onClick={() => onRemoveCalc(c.id)} className="text-[12px] text-text hover:text-ink">Delete</button>
              </div>
            ))}
          </fieldset>
        )}
      </Popover>
    </>
  );
}

/** Export spec for the analysis grid: calculated columns become real Excel formulas where possible. */
export function analysisSpec(rows: Company[], columns: string[], calcs: CalcColumn[], evals: Record<string, (c: Company) => Val>, agg: Agg, filtersUsed: string[]): ExportSpec {
  const visible = columns.filter((id) => FIELD_BY_ID[id] || calcs.some((c) => c.id === id));
  // fields a formula needs must be in the sheet for Excel to reference them
  const needed = new Set<string>();
  calcs.filter((c) => visible.includes(c.id)).forEach((c) => { try { fieldsOf(parse(c.formula)).forEach((f) => needed.add(f)); } catch { /* invalid: skipped */ } });
  const all = [...visible, ...[...needed].filter((f) => !visible.includes(f))];
  const cols: ExportColumn[] = all.map((id) => {
    const f = FIELD_BY_ID[id];
    if (f) return { key: id, label: f.label, format: kindToFormat(f.kind) };
    const c = calcs.find((x) => x.id === id)!;
    const tpl = (() => { try { return toExcelTemplate(c.formula); } catch { return null; } })();
    return { key: id, label: c.label, format: 'ratio', formula: tpl ?? undefined, definition: `${c.formula}${tpl ? '' : ' (value only: uses history not in this sheet)'}` };
  });
  const data = rows.map((r) => Object.fromEntries(all.map((id) => [id, FIELD_BY_ID[id] ? FIELD_BY_ID[id].get(r) : evals[id]?.(r) ?? null])));
  const footer = [Object.fromEntries(cols.map((c, i) => {
    if (i === 0) return [c.key, `${AGGS.find((a) => a.id === agg)!.label} (${rows.length} rows)`];
    const vals = data.map((d) => d[c.key]).filter((v): v is number => typeof v === 'number');
    return [c.key, c.format === 'text' || c.format === 'date' ? null : aggregateValues(agg, vals)];
  }))];
  return {
    title: 'Analysis of search results',
    subtitle: `${rows.length} companies`,
    filtersUsed,
    sheets: [{ name: 'Data', columns: cols, rows: data, footer }],
    sources: ['companies-house', 'cro', 'national-registers', 'in-house'],
    viewPath: '/',
  };
}
