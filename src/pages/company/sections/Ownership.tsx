import { OwnershipStructure } from './OwnershipStructure';
import { ProvenanceInfo } from '../provenance';
import { Fragment, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, Sheet, Triangle } from 'lucide-react';
import type { SectionProps } from '../CompanyPage';
import { groupHoldings } from '../../../data/profile/ownership';
import { formatDate, formatInt, formatMoney } from '../../../lib/format';
import { downloadBlob, toCsv } from '../../../lib/download';
import { Checkbox } from '../../../components/ui/Checkbox';
import { Card, PersonLink, SectionTitle, SegmentedToggle, SortTh, Tip, useSort } from '../ui';
import { MultiSelect } from '../MultiSelect';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
type Key = 'shareholder' | 'shares' | 'classPct' | 'totalPct' | 'worth';

export function Ownership(props: SectionProps) {
  const { p } = props;
  const filings = p.ownership.filings;
  const [idx, setIdx] = useState(filings.length - 1);
  const [changes, setChanges] = useState(false);
  const [q, setQ] = useState('');
  const [who, setWho] = useState<'all' | 'people' | 'companies'>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const sort = useSort<Key>('shares', 'desc');
  const f = filings[idx];
  const prev = filings[idx - 1];
  const { groups, totalShares, totalWorth } = useMemo(() => groupHoldings(f, p.ownership.pricePerShare), [f, p]);
  const [classes, setClasses] = useState<string[]>(() => groups.map((g) => g.shareClass));
  const prevMap = useMemo(() => new Map(prev?.holdings.map((h) => [`${h.shareClass}|${h.shareholder}`, h.shares]) ?? []), [prev]);

  const firstYear = Number(filings[0].date.slice(0, 4)), lastYear = Number(filings[filings.length - 1].date.slice(0, 4));
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => firstYear + i);

  const csv = () => {
    const rows = groups.flatMap((g) => g.rows.map((h) => [h.shareholder, h.shareClass, h.shares, h.classPct.toFixed(4), h.totalPct.toFixed(4), Math.round(h.worth)]));
    downloadBlob(toCsv(['Shareholder', 'Share class', 'Number of shares', 'Class percent', 'Total percent', 'Estimated paper worth (£)'], rows), `shareholdings-${f.date}.csv`, 'text/csv;charset=utf-8');
  };

  const cmp = (a: { shareholder: string; shares: number; classPct: number; totalPct: number; worth: number }, b: typeof a) =>
    (sort.dir === 'asc' ? 1 : -1) * (sort.key === 'shareholder' ? a.shareholder.localeCompare(b.shareholder) : a[sort.key] - b[sort.key]);

  return (
    <>
      <SectionTitle>Ownership</SectionTitle>
      <OwnershipStructure {...props} />
      <Card bodyClass="pb-[6px]" tourKey="ownership-strip">
        <div className="overflow-x-auto nb-scroll">
          <div className="flex min-w-max">
            {years.map((y) => (
              <div key={y} className="border-l border-card-border first:border-l-0">
                <div className="text-[12px] font-semibold text-ink px-[6px] pb-[4px]">{y}</div>
                <div className="flex">
                  {MONTHS.map((m, mi) => {
                    const fi = filings.findIndex((x) => x.date.startsWith(`${y}-${String(mi + 1).padStart(2, '0')}`));
                    return (
                      <div key={m} className="w-[32px] flex flex-col items-center">
                        <div className="h-[34px] w-full flex items-end justify-center border-b border-card-border">
                          {fi >= 0 && <button onClick={() => setIdx(fi)} aria-label={`Filing ${formatDate(filings[fi].date)}`} className={`w-[16px] h-[30px] rounded-t-[2px] ${fi === idx ? 'bg-primary' : 'bg-[#CFCFCF] hover:bg-[#b5b5b5]'}`} />}
                        </div>
                        <span className={`text-[10px] mt-[3px] ${fi >= 0 ? 'text-ink font-semibold' : 'text-transparent'}`}>{m}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between my-[14px]">
        <Checkbox checked={changes} onChange={setChanges} disabled={!prev} className="text-[14px] text-ink">Show changes from last filing</Checkbox>
        <div className="flex items-center gap-[12px]">
          <span className="inline-flex items-center text-[14px] text-text">Shareholdings<ProvenanceInfo dataset="ownership" label="Shareholdings" /></span>
          <span className="inline-flex items-center border border-border rounded-btn bg-white">
            <button disabled={idx === 0} onClick={() => setIdx(idx - 1)} aria-label="Previous filing" className="w-[28px] h-[30px] flex items-center justify-center text-primary disabled:text-[#C9C9C9]"><ChevronLeft size={16} /></button>
            <span className="px-[10px] text-[14px] text-ink tabular-nums">{formatDate(f.date)}</span>
            <button disabled={idx === filings.length - 1} onClick={() => setIdx(idx + 1)} aria-label="Next filing" className="w-[28px] h-[30px] flex items-center justify-center text-primary disabled:text-[#C9C9C9]"><ChevronRight size={16} /></button>
          </span>
          <button onClick={csv} className="inline-flex items-center gap-[6px] h-[30px] px-[12px] border border-primary rounded-btn text-primary text-[14px] font-semibold bg-white hover:bg-primary-light"><Sheet size={15} />Download as CSV</button>
        </div>
      </div>

      <Card>
        <div className="flex items-center gap-[14px] mb-[12px]">
          <div className="relative w-[320px]">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by Shareholder" aria-label="Search by Shareholder" className="w-full h-[32px] border border-border rounded-btn pl-3 pr-8 text-[14px] focus:outline-none focus:border-primary" />
            <Search size={15} className="absolute right-[10px] top-[9px] text-text" />
          </div>
          <MultiSelect label="Select a filter" options={groups.map((g) => ({ id: g.shareClass, label: g.shareClass, count: g.rows.length }))} value={classes} onChange={setClasses} />
          <SegmentedToggle size="sm" value={who} onChange={setWho} options={[{ value: 'all', label: 'All' }, { value: 'people', label: 'People only' }, { value: 'companies', label: 'Companies only' }]} />
        </div>
        <table className="w-full text-[14px]">
          <thead className="border-b border-card-border">
            <tr>
              <SortTh label="Shareholder" active={sort.key === 'shareholder'} dir={sort.dir} onClick={() => sort.toggle('shareholder')} />
              <th className="py-[9px] px-[10px] text-left font-semibold text-ink">Share class</th>
              <SortTh label="Number of shares" align="right" active={sort.key === 'shares'} dir={sort.dir} onClick={() => sort.toggle('shares')} />
              {changes && <th className="py-[9px] px-[10px] text-right font-semibold text-ink">Change</th>}
              <SortTh label="Class percent" align="right" active={sort.key === 'classPct'} dir={sort.dir} onClick={() => sort.toggle('classPct')} />
              <SortTh label="Total percent" align="right" active={sort.key === 'totalPct'} dir={sort.dir} onClick={() => sort.toggle('totalPct')} />
              <SortTh label={<span className="inline-flex items-center gap-[4px]">Estimated paper worth <Tip text="Shares multiplied by the price per share implied by the latest known valuation."><span className="text-muted">ⓘ</span></Tip></span>} align="right" active={sort.key === 'worth'} dir={sort.dir} onClick={() => sort.toggle('worth')} />
            </tr>
          </thead>
          <tbody>
            {groups.filter((g) => classes.includes(g.shareClass)).map((g) => {
              const rows = g.rows
                .filter((h) => (!q || h.shareholder.toLowerCase().includes(q.toLowerCase())) && (who === 'all' || (who === 'people') === h.isPerson))
                .sort(cmp);
              const open = expanded.has(g.shareClass) || !!q;
              const shown = open ? rows : rows.slice(0, 15);
              return (
                <Fragment key={g.shareClass}>
                  {shown.map((h) => {
                    const before = prevMap.get(`${h.shareClass}|${h.shareholder}`);
                    const delta = before == null ? null : h.shares - before;
                    return (
                      <tr key={h.shareClass + h.shareholder + h.shares} className="border-b border-card-border">
                        <td className="py-[7px] px-[10px]">{h.isPerson ? <PersonLink name={h.shareholder} degree={null} /> : <span className="text-ink">{h.shareholder}</span>}</td>
                        <td className="py-[7px] px-[10px] text-text">{h.shareClass}</td>
                        <td className="py-[7px] px-[10px] text-right tabular-nums text-ink">{formatInt(h.shares)}</td>
                        {changes && (
                          <td className="py-[7px] px-[10px] text-right text-[13px] tabular-nums">
                            {before == null ? <span className="bg-badge-green text-badge-green-text font-semibold px-[6px] rounded-[3px]">New</span>
                              : delta === 0 ? <span className="text-muted">–</span>
                              : <span className={`inline-flex items-center gap-[3px] ${delta! > 0 ? 'text-delta-up' : 'text-delta-down'}`}><Triangle size={9} fill="currentColor" className={delta! > 0 ? '' : 'rotate-180'} />{formatInt(Math.abs(delta!))}</span>}
                          </td>
                        )}
                        <td className="py-[7px] px-[10px] text-right tabular-nums">{h.classPct.toFixed(2)}%</td>
                        <td className="py-[7px] px-[10px] text-right tabular-nums">{h.totalPct.toFixed(2)}%</td>
                        <td className="py-[7px] px-[10px] text-right tabular-nums">{formatMoney(h.worth) || '£0'}</td>
                      </tr>
                    );
                  })}
                  {!open && rows.length > 15 && (
                    <tr className="border-b border-card-border"><td colSpan={changes ? 7 : 6} className="py-[8px] text-center">
                      <button onClick={() => setExpanded(new Set([...expanded, g.shareClass]))} className="text-primary text-[14px] hover:underline">View remaining {rows.length - 15} shareholders in this class</button>
                    </td></tr>
                  )}
                  <tr className="border-b border-card-border bg-[#FAFAFA] font-semibold text-muted">
                    <td className="py-[7px] px-[10px]">Class total</td><td className="py-[7px] px-[10px]">{g.shareClass}</td>
                    <td className="py-[7px] px-[10px] text-right tabular-nums">{formatInt(g.total)}</td>{changes && <td />}
                    <td className="py-[7px] px-[10px] text-right">100.00%</td><td className="py-[7px] px-[10px] text-right">{((g.total / totalShares) * 100).toFixed(2)}%</td>
                    <td className="py-[7px] px-[10px] text-right">{formatMoney(g.worth)}</td>
                  </tr>
                </Fragment>
              );
            })}
            <tr className="bg-[#E9E9E9] font-bold text-ink" data-total-row>
              <td className="py-[9px] px-[10px]">Total</td><td />
              <td className="py-[9px] px-[10px] text-right tabular-nums">{formatInt(totalShares)}</td>{changes && <td />}
              <td /><td className="py-[9px] px-[10px] text-right">100.00%</td>
              <td className="py-[9px] px-[10px] text-right">{formatMoney(totalWorth)}</td>
            </tr>
          </tbody>
        </table>
        <p className="text-[13px] text-muted mt-[10px]">Based on annual return filed by {p.registeredName} on {formatDate(f.date)}</p>
      </Card>
    </>
  );
}
