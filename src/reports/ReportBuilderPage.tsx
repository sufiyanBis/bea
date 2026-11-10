import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, Copy, Download, GripVertical, Play, Plus, Save, Trash2 } from 'lucide-react';
import { PageShell, Panel, btnOutline, btnPrimary } from '../components/layout/PageShell';
import { useReports, newReport, resolveScope, scopeLabel, NEW_BLOCK, BLOCK_LABEL, type Block, type BlockKind, type Report, type ScopeKind } from './model';
import { renderReport, reportSpec } from './render';
import { ReportPreview } from './ReportPreview';
import { FIELDS } from '../analysis/fields';
import { useSaved } from '../store/savedStore';
import { useCollections } from '../store/collectionsStore';
import { useCompare } from '../store/compareStore';
import { useResults } from '../store/resultsStore';
import { getCompanies } from '../data/dataset';
import { requestExport } from '../export/requestExport';
import { renderOffscreen } from '../components/stats/ChartCard';
import { formatDate, formatInt } from '../lib/format';
import { validate } from '../formula/evaluate';
import { FIELD_IDS } from '../analysis/fields';

const STEPS = ['Scope', 'Content', 'Layout & branding'] as const;
const input = 'h-[32px] border border-border rounded-btn px-[8px] text-[14px] bg-white';

function logoDataUrl(): string {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const g = c.getContext('2d')!; g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#4B4291'; g.font = 'bold 44px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('N', 32, 35);
  return c.toDataURL('image/png');
}

export default function ReportBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const stored = useReports((s) => s.reports.find((r) => r.id === id));
  const upsert = useReports((s) => s.upsert);
  const markRun = useReports((s) => s.markRun);
  const [draft, setDraft] = useState<Report>(() => (stored ? structuredClone(stored) : newReport(useResults.getState().ranQuery ? { kind: 'search', query: useResults.getState().ranQuery! } : undefined)));
  const [step, setStep] = useState(0);
  const [savedMsg, setSavedMsg] = useState('');
  useEffect(() => { if (stored) setDraft(structuredClone(stored)); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const companies = useMemo(() => resolveScope(draft.scope), [draft.scope]);
  const rendered = useMemo(() => renderReport(draft, companies), [draft, companies]);
  const set = (patch: Partial<Report>) => setDraft((d) => ({ ...d, ...patch }));
  const setBlock = (bid: string, patch: Partial<Block>) => setDraft((d) => ({ ...d, blocks: d.blocks.map((b) => (b.id === bid ? ({ ...b, ...patch } as Block) : b)) }));

  const save = (asTemplate = false) => {
    const r = { ...draft, isTemplate: asTemplate || draft.isTemplate };
    upsert(r);
    setSavedMsg(asTemplate ? 'Saved as a template.' : 'Report saved.');
    if (!id) navigate(`/reports/${r.id}`, { replace: true });
  };
  const runAgain = () => { upsert(draft); markRun(draft.id, companies.length); setSavedMsg(`Ran again on ${formatDate(new Date().toISOString())} with ${formatInt(companies.length)} companies (latest data).`); };
  const exportAs = (format: 'pdf' | 'xlsx') => requestExport(reportSpec(draft, companies, (o) => renderOffscreen(o, 'png'), logoDataUrl()), format, draft.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'));

  return (
    <PageShell
      title={id ? draft.title : 'New report'}
      wide
      crumbs={[{ label: 'Home', to: '/' }, { label: 'Reports', to: '/reports' }, { label: id ? draft.title : 'New report' }]}
      actions={
        <div className="flex items-center gap-[8px]">
          {id && <button className={btnOutline} onClick={runAgain} data-run-again><Play size={15} />Run again</button>}
          <button className={btnOutline} onClick={() => save(true)} data-save-template><Copy size={15} />Save as template</button>
          <button className={btnOutline} onClick={() => exportAs('xlsx')} data-report-export="xlsx"><Download size={15} />Excel</button>
          <button className={btnOutline} onClick={() => exportAs('pdf')} data-report-export="pdf"><Download size={15} />PDF</button>
          <button className={btnPrimary} onClick={() => save()} data-save-report><Save size={15} />Save report</button>
        </div>
      }
    >
      {savedMsg && <p role="status" className="mb-[10px] text-[14px] text-[#1E6B34]" data-report-status>{savedMsg}</p>}
      <div className="grid grid-cols-[480px_1fr] gap-[22px] items-start">
        <div>
          <ol className="flex mb-[12px] border border-border rounded-btn overflow-hidden" aria-label="Report steps">
            {STEPS.map((s, i) => (
              <li key={s} className="flex-1">
                <button aria-current={step === i ? 'step' : undefined} onClick={() => setStep(i)} data-report-step={i + 1} className={`w-full h-[38px] text-[14px] font-semibold ${step === i ? 'bg-primary text-white' : 'bg-white text-primary hover:bg-primary-light'}`}>{i + 1}. {s}</button>
              </li>
            ))}
          </ol>
          {step === 0 && <ScopeStep draft={draft} set={set} count={companies.length} />}
          {step === 1 && <ContentStep draft={draft} set={set} setBlock={setBlock} />}
          {step === 2 && <LayoutStep draft={draft} set={set} />}
          <div className="flex justify-between mt-[12px]">
            <button className={btnOutline} disabled={step === 0} onClick={() => setStep(step - 1)}>Back</button>
            <button className={btnPrimary} disabled={step === 2} onClick={() => setStep(step + 1)}>Next</button>
          </div>
        </div>
        <div tabIndex={0} role="region" aria-label="Report preview" className="sticky top-[100px] max-h-[calc(100vh-120px)] overflow-y-auto nb-scroll bg-[#E9E9EE] rounded-card p-[18px] focus:outline focus:outline-2 focus:outline-primary">
          <div className="text-[12px] text-text mb-[8px]">Live preview · {scopeLabel(draft.scope)} · {formatInt(companies.length)} companies</div>
          <ReportPreview report={draft} rendered={rendered} companies={companies} />
        </div>
      </div>
    </PageShell>
  );
}

function ScopeStep({ draft, set, count }: { draft: Report; set: (p: Partial<Report>) => void; count: number }) {
  const saved = useSaved((s) => s.saved);
  const collections = useCollections((s) => s.collections);
  const comparisons = useCompare((s) => s.saved);
  const ranQuery = useResults((s) => s.ranQuery);
  const [pick, setPick] = useState('');
  const kinds: { k: ScopeKind; label: string }[] = [
    { k: 'search', label: 'Current search' }, { k: 'saved-search', label: 'A saved search' }, { k: 'collection', label: 'A collection' },
    { k: 'comparison', label: 'A comparison set' }, { k: 'companies', label: 'Hand-picked companies' },
  ];
  const s = draft.scope;
  const matches = pick.length >= 2 ? getCompanies().filter((c) => c.name.toLowerCase().includes(pick.toLowerCase())).slice(0, 6) : [];
  return (
    <Panel title="Which companies?">
      <fieldset className="space-y-[6px] text-[14px]">
        <legend className="sr-only">Report scope</legend>
        {kinds.map((k) => (
          <label key={k.k} className="flex items-center gap-[8px] cursor-pointer">
            <input type="radio" name="scope" className="accent-primary" checked={s.kind === k.k} onChange={() => set({ scope: { kind: k.k, query: k.k === 'search' ? ranQuery ?? undefined : undefined, ids: k.k === 'companies' ? [] : undefined } })} data-scope={k.k} />
            {k.label}
          </label>
        ))}
      </fieldset>
      <div className="mt-[12px] text-[14px]">
        {s.kind === 'search' && <p className="text-text">{ranQuery || s.query ? 'Uses the criteria of your current search; "Run again" re-runs it on the latest data.' : 'Run a search first, or choose another scope.'}</p>}
        {s.kind === 'saved-search' && <select aria-label="Saved search" className={`${input} w-full`} value={s.ref ?? ''} onChange={(e) => set({ scope: { kind: 'saved-search', ref: e.target.value } })}><option value="">{s.query ? 'Embedded query (demo)' : 'Choose…'}</option>{saved.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>}
        {s.kind === 'collection' && <select aria-label="Collection" className={`${input} w-full`} value={s.ref ?? ''} onChange={(e) => set({ scope: { kind: 'collection', ref: e.target.value } })} data-scope-collection><option value="">Choose…</option>{collections.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.companyIds.length})</option>)}</select>}
        {s.kind === 'comparison' && <select aria-label="Comparison" className={`${input} w-full`} value={s.ref ?? ''} onChange={(e) => set({ scope: { kind: 'comparison', ref: e.target.value } })}><option value="">Choose…</option>{comparisons.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>}
        {s.kind === 'companies' && (
          <div>
            <input className={`${input} w-full`} placeholder="Type a company name" value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Find a company to add" />
            <ul className="mt-[4px]">{matches.map((c) => <li key={c.id}><button className="text-primary hover:underline text-[13px]" onClick={() => { set({ scope: { kind: 'companies', ids: [...new Set([...(s.ids ?? []), c.id])] } }); setPick(''); }}>+ {c.name}</button></li>)}</ul>
            <p className="text-[13px] text-text mt-[6px]">{s.ids?.length ?? 0} picked</p>
          </div>
        )}
        <p className="mt-[10px] text-ink font-semibold" data-scope-count>{formatInt(count)} companies in scope</p>
      </div>
    </Panel>
  );
}

function SortableBlock({ b, index, total, move, setBlock, remove }: { b: Block; index: number; total: number; move: (from: number, to: number) => void; setBlock: (id: string, p: Partial<Block>) => void; remove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: b.id });
  const numericFields = FIELDS.filter((f) => f.kind !== 'text' && f.kind !== 'date');
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`bg-white border border-card-border rounded-card p-[10px] ${isDragging ? 'shadow-lg z-10 relative' : ''}`} data-block={b.kind}>
      <div className="flex items-center gap-[6px]">
        <button {...attributes} {...listeners} aria-label={`Drag to reorder ${b.title}`} className="text-muted hover:text-ink cursor-grab"><GripVertical size={16} /></button>
        <span className="text-[11px] uppercase tracking-wide text-muted">{BLOCK_LABEL[b.kind]}</span>
        <input aria-label="Block title" value={b.title} onChange={(e) => setBlock(b.id, { title: e.target.value })} className="flex-1 h-[28px] border border-transparent hover:border-border focus:border-primary rounded-btn px-[6px] text-[14px] font-semibold" />
        <button aria-label={`Move ${b.title} up`} disabled={index === 0} onClick={() => move(index, index - 1)} className="text-text disabled:opacity-30"><ArrowUp size={15} /></button>
        <button aria-label={`Move ${b.title} down`} disabled={index === total - 1} onClick={() => move(index, index + 1)} className="text-text disabled:opacity-30"><ArrowDown size={15} /></button>
        <button aria-label={`Remove ${b.title}`} onClick={() => remove(b.id)} className="text-text hover:text-[#C0392B]"><Trash2 size={15} /></button>
      </div>
      <div className="mt-[8px] text-[13px] space-y-[6px]">
        {b.kind === 'text' && <textarea aria-label="Text" value={b.body} onChange={(e) => setBlock(b.id, { body: e.target.value })} rows={3} className="w-full border border-border rounded-btn p-[6px]" />}
        {b.kind === 'table' && (
          <>
            <div className="flex flex-wrap gap-[4px]">{FIELDS.map((f) => <label key={f.id} className={`px-[6px] py-[2px] rounded-full border cursor-pointer ${b.fields.includes(f.id) ? 'bg-primary-light border-primary text-primary' : 'border-border text-text'}`}><input type="checkbox" className="sr-only" checked={b.fields.includes(f.id)} onChange={(e) => setBlock(b.id, { fields: e.target.checked ? [...b.fields, f.id] : b.fields.filter((x) => x !== f.id) })} />{f.label}</label>)}</div>
            <label className="inline-flex items-center gap-[6px]">Rows <input type="number" min={1} max={500} value={b.limit} onChange={(e) => setBlock(b.id, { limit: Number(e.target.value) || 10 })} className="w-[70px] h-[26px] border border-border rounded-btn px-[4px]" /></label>
          </>
        )}
        {b.kind === 'calc' && (
          <div className="space-y-[4px]">
            {b.metrics.map((m, i) => {
              const err = validate(m.formula, FIELD_IDS);
              return (
                <div key={i} className="flex gap-[4px] items-start">
                  <input aria-label="Metric label" value={m.label} onChange={(e) => setBlock(b.id, { metrics: b.metrics.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)) })} className="w-[140px] h-[26px] border border-border rounded-btn px-[4px]" />
                  <div className="flex-1">
                    <input aria-label="Metric formula" value={m.formula} onChange={(e) => setBlock(b.id, { metrics: b.metrics.map((x, k) => (k === i ? { ...x, formula: e.target.value } : x)) })} className={`w-full h-[26px] border rounded-btn px-[4px] font-mono text-[12px] ${err ? 'border-[#C0392B]' : 'border-border'}`} />
                    {err && <p className="text-[11px] text-[#C0392B]" role="alert">{err.message}</p>}
                  </div>
                  <button aria-label="Remove metric" onClick={() => setBlock(b.id, { metrics: b.metrics.filter((_, k) => k !== i) })} className="text-text"><Trash2 size={13} /></button>
                </div>
              );
            })}
            <button className="text-primary hover:underline" onClick={() => setBlock(b.id, { metrics: [...b.metrics, { label: 'New metric', formula: 'AVG(turnover)' }] })}>+ Add metric</button>
          </div>
        )}
        {b.kind === 'chart' && (
          <div className="flex flex-wrap gap-[6px]">
            <select aria-label="Chart type" value={b.chartType} onChange={(e) => setBlock(b.id, { chartType: e.target.value as 'bar' })} className={input}><option value="bar">Bar</option><option value="line">Line</option><option value="donut">Donut</option></select>
            <select aria-label="Aggregate" value={b.agg} onChange={(e) => setBlock(b.id, { agg: e.target.value as 'count' })} className={input}><option value="count">Count of companies</option><option value="sum">Sum of</option><option value="avg">Average of</option><option value="median">Median of</option></select>
            {b.agg !== 'count' && <select aria-label="Field" value={b.field} onChange={(e) => setBlock(b.id, { field: e.target.value })} className={input}>{numericFields.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select>}
            <select aria-label="Group by" value={b.groupBy} onChange={(e) => setBlock(b.id, { groupBy: e.target.value })} className={input}>{[...FIELDS.filter((f) => f.groupable), FIELDS[0]].map((f) => <option key={f.id} value={f.id}>by {f.label}</option>)}</select>
          </div>
        )}
        {b.kind === 'stat' && <select aria-label="Statistic" value={b.stat} onChange={(e) => setBlock(b.id, { stat: e.target.value as 'by-stage' })} className={input}><option value="by-country">Companies by country</option><option value="by-stage">Stage of evolution</option><option value="top-raised">Top 10 by total raised</option><option value="founded-by-year">Foundations by year</option></select>}
        {b.kind === 'summaries' && <label className="inline-flex items-center gap-[6px]">Companies <input type="number" min={1} max={20} value={b.limit} onChange={(e) => setBlock(b.id, { limit: Number(e.target.value) || 3 })} className="w-[60px] h-[26px] border border-border rounded-btn px-[4px]" /></label>}
      </div>
    </li>
  );
}

function ContentStep({ draft, set, setBlock }: { draft: Report; set: (p: Partial<Report>) => void; setBlock: (id: string, p: Partial<Block>) => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const move = (from: number, to: number) => set({ blocks: arrayMove(draft.blocks, from, to) });
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    move(draft.blocks.findIndex((b) => b.id === e.active.id), draft.blocks.findIndex((b) => b.id === e.over!.id));
  };
  return (
    <Panel title="Content blocks" bodyClass="p-[12px]">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={draft.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-[8px]" aria-label="Report blocks (drag, or use the arrow buttons, to reorder)">
            {draft.blocks.map((b, i) => <SortableBlock key={b.id} b={b} index={i} total={draft.blocks.length} move={move} setBlock={setBlock} remove={(id) => set({ blocks: draft.blocks.filter((x) => x.id !== id) })} />)}
          </ul>
        </SortableContext>
      </DndContext>
      <div className="flex flex-wrap gap-[6px] mt-[10px]" aria-label="Add a block">
        {(Object.keys(NEW_BLOCK) as BlockKind[]).map((k) => <button key={k} onClick={() => set({ blocks: [...draft.blocks, NEW_BLOCK[k]()] })} data-add-block={k} className="inline-flex items-center gap-[4px] h-[28px] px-[8px] border border-border rounded-btn text-[13px] text-primary bg-white hover:border-primary"><Plus size={13} />{BLOCK_LABEL[k]}</button>)}
      </div>
    </Panel>
  );
}

function LayoutStep({ draft, set }: { draft: Report; set: (p: Partial<Report>) => void }) {
  const row = 'flex items-center gap-[10px] text-[14px]';
  return (
    <Panel title="Layout and branding">
      <div className="space-y-[10px]">
        <label className={row}><span className="w-[90px] text-text">Title</span><input className={`${input} flex-1`} value={draft.title} onChange={(e) => set({ title: e.target.value })} data-report-title /></label>
        <label className={row}><span className="w-[90px] text-text">Subtitle</span><input className={`${input} flex-1`} value={draft.subtitle} onChange={(e) => set({ subtitle: e.target.value })} /></label>
        <label className={row}><span className="w-[90px] text-text">Author</span><input className={`${input} flex-1`} value={draft.author} onChange={(e) => set({ author: e.target.value })} /></label>
        <label className={row}><span className="w-[90px] text-text">Date</span><input type="date" className={input} value={draft.date} onChange={(e) => set({ date: e.target.value })} /></label>
        <label className={row}><input type="checkbox" className="accent-primary" checked={draft.logo} onChange={(e) => set({ logo: e.target.checked })} />Show logo</label>
        <label className={row}><input type="checkbox" className="accent-primary" checked={draft.cover} onChange={(e) => set({ cover: e.target.checked })} />Cover page</label>
        <fieldset className={row}><legend className="sr-only">Orientation</legend><span className="w-[90px] text-text">Orientation</span>
          {(['portrait', 'landscape'] as const).map((o) => <label key={o} className="inline-flex items-center gap-[4px] capitalize"><input type="radio" name="orient" className="accent-primary" checked={draft.orientation === o} onChange={() => set({ orientation: o })} />{o}</label>)}
        </fieldset>
      </div>
    </Panel>
  );
}

export function ReportsPage() {
  const reports = useReports((s) => s.reports);
  const remove = useReports((s) => s.remove);
  const duplicate = useReports((s) => s.duplicate);
  const upsert = useReports((s) => s.upsert);
  const markRun = useReports((s) => s.markRun);
  const navigate = useNavigate();
  const [renaming, setRenaming] = useState<string | null>(null);
  return (
    <PageShell title="Reports" actions={<Link to="/reports/new" className={btnPrimary} data-new-report><Plus size={15} />New report</Link>}
      intro="Customised reports built from searches, collections, comparisons or hand-picked companies. Run a report again to refresh it with the latest data.">
      <Panel bodyClass="">
        <table className="w-full border-collapse text-[14px]" data-reports-table>
          <thead><tr>{['Report', 'Scope', 'Blocks', 'Last run', ''].map((h) => <th key={h} className="text-left px-[14px] py-[9px] border-b border-border bg-[#FAFAFA] text-[13px] font-semibold text-text">{h}</th>)}</tr></thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} className="border-b border-card-border" data-report-row={r.id}>
                <td className="px-[14px] py-[9px]">
                  {renaming === r.id
                    ? <input autoFocus defaultValue={r.title} aria-label="Report name" onBlur={(e) => { upsert({ ...r, title: e.target.value || r.title }); setRenaming(null); }} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} className={input} />
                    : <Link to={`/reports/${r.id}`} className="text-primary font-semibold hover:underline">{r.title}</Link>}
                  {r.isTemplate && <span className="ml-[6px] px-[6px] py-[1px] rounded-full bg-chip-blue text-badge-blue-text text-[11px] font-semibold">Template</span>}
                </td>
                <td className="px-[14px] py-[9px] text-text">{scopeLabel(r.scope)}</td>
                <td className="px-[14px] py-[9px] text-text">{r.blocks.length}</td>
                <td className="px-[14px] py-[9px] text-text">{r.lastRun ? `${formatDate(r.lastRun)}${r.lastRunCount ? ` · ${formatInt(r.lastRunCount)} companies` : ''}` : 'Never'}</td>
                <td className="px-[14px] py-[9px] whitespace-nowrap text-right space-x-[10px]">
                  <button className="text-primary hover:underline" onClick={() => { markRun(r.id, resolveScope(r.scope).length); navigate(`/reports/${r.id}`); }} data-run={r.id}>Run again</button>
                  <button className="text-primary hover:underline" onClick={() => setRenaming(r.id)}>Rename</button>
                  <button className="text-primary hover:underline" onClick={() => duplicate(r.id)} data-duplicate={r.id}>Duplicate</button>
                  <button className="text-text hover:text-[#C0392B]" onClick={() => remove(r.id)} data-delete={r.id}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </PageShell>
  );
}
