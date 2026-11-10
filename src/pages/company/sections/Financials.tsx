import { ProvenanceInfo } from '../provenance';
import { useState } from 'react';
import { Check, Download, Minus, Plus } from 'lucide-react';
import type { SectionProps } from '../CompanyPage';
import type { FinValue } from '../../../data/profile/types';
import { FIN_TABLES, FinLine } from '../../../data/profile/financials';
import { formatAccounting, formatDate, formatInt } from '../../../lib/format';
import { downloadBlob, toCsv } from '../../../lib/download';
import { Button } from '../../../components/ui/Button';
import { Card, EmptyState, InfoBar, SectionTitle, Tip } from '../ui';
import { FinancialSummary } from '../shared';
import { fxPerGbp } from '../../../lib/money';
import { TENDER } from '../../../config';
import { SampleTag } from '../../../components/ui/Sample';

function fmt(line: FinLine, v: FinValue, fx = 1): string {
  if (v == null || v === '') return '—';
  if (typeof v === 'boolean') return v ? '✓' : '✗';
  if (typeof v === 'string') return v;
  switch (line.kind) {
    case 'ratio': return v.toFixed(2);
    case 'pct': return v < 0 ? `(${Math.abs(v).toFixed(2)})` : v.toFixed(2);
    case 'int': return formatInt(v);
    default: return formatAccounting(Math.round(v * fx));
  }
}

export function Financials({ c, p }: SectionProps) {
  const [span, setSpan] = useState<2 | 5 | 10 | 0>(2);
  const local = c.currency && c.currency !== 'GBP';
  const [cur, setCur] = useState<string>(local ? c.currency : 'GBP');
  const fx = cur === 'GBP' ? 1 : fxPerGbp(cur);
  const years = [...p.financials].reverse(); // newest first
  const shown = span ? years.slice(0, span) : years;

  const download = () => {
    const rows = FIN_TABLES.flatMap((t) => [[`— ${t.title} —`, ...years.map(() => '')], ...t.lines.map((l) => [l.label, ...years.map((y) => {
      const v = y.values[l.id];
      return typeof v === 'boolean' ? (v ? 'Yes' : 'No') : v ?? '';
    })])]);
    downloadBlob(toCsv(['Line', ...years.map((y) => y.yearEnd)], rows as (string | number)[][]), `${c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-financial-statements.csv`, 'text/csv;charset=utf-8');
  };

  return (
    <>
      <SectionTitle actions={years.length ? <Button onClick={download}><Download size={15} />Download all {years.length} years (CSV)</Button> : undefined}>Financials</SectionTitle>
      {!years.length ? (
        <Card><span data-section-empty /><EmptyState title="No financial statements">This company files micro-entity or dormant accounts, so we don't have full financials.</EmptyState></Card>
      ) : (
        <div className="space-y-[16px]">
          <FinancialSummary p={p} tourKey="financial-summary" />
          <InfoBar>
            <span className="flex items-center gap-[10px] flex-wrap">
              <span>All financials figures are in <strong data-fin-currency>{cur}</strong>{local && <>. Converted at the sample rate 1 GBP = {fxPerGbp(c.currency)} {c.currency} ({formatDate(TENDER.fxDate.value)})<SampleTag note={TENDER.fxPerGbp.note} /></>}</span>
              {local && (
                <span role="group" aria-label="Currency" className="inline-flex border border-primary rounded-btn overflow-hidden divide-x divide-primary ml-auto">
                  {[c.currency, 'GBP'].map((k) => (
                    <button key={k} aria-pressed={cur === k} onClick={() => setCur(k)} className={`h-[26px] px-[10px] text-[13px] font-semibold ${cur === k ? 'bg-primary text-white' : 'bg-white text-primary hover:bg-primary-light'}`}>{k}</button>
                  ))}
                </span>
              )}
            </span>
          </InfoBar>
          <div className="flex items-center gap-[10px] text-[14px] text-text" data-years-selector>
            <span>Years:</span>
            <div role="group" aria-label="Years shown" className="inline-flex border border-primary rounded-btn overflow-hidden divide-x divide-primary">
              {([2, 5, 10, 0] as const).map((n) => (
                <button key={n} aria-pressed={span === n} data-years={n || 'all'} onClick={() => setSpan(n)} className={`h-[28px] px-[12px] text-[13px] font-semibold ${span === n ? 'bg-primary text-white' : 'bg-white text-primary hover:bg-primary-light'}`}>{n || `All (${years.length})`}</button>
              ))}
            </div>
            <span>{years.length} years of accounts available, {formatDate(years[years.length - 1].yearEnd)} to {formatDate(years[0].yearEnd)}</span>
          </div>
          {FIN_TABLES.map((t) => (
            <Card key={t.id} title={t.title} bodyClass="p-0 overflow-x-auto">
              <table className="w-full text-[14px]" data-fin-table={t.id}>
                <thead>
                  <tr className="border-b border-card-border">
                    <th className="text-left py-[8px] px-[15px] min-w-[260px] w-[260px] sticky left-0 z-[1] bg-white" />
                    {shown.map((y) => <th key={y.yearEnd} className="text-right py-[8px] px-[15px] font-semibold text-ink whitespace-nowrap min-w-[120px]" data-year-col>{formatDate(y.yearEnd)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {t.lines.map((l) => (
                    <tr key={l.id} className={`border-b border-card-border last:border-0 ${l.subtotal ? 'bg-subtotal font-semibold' : ''}`}>
                      <th scope="row" className={`text-left font-inherit py-[7px] px-[15px] align-top sticky left-0 z-[1] ${l.subtotal ? 'bg-subtotal' : 'bg-white'}`}>
                        <Tip text={l.tip}><span className={`border-b border-dotted border-text cursor-help ${l.subtotal ? 'text-ink font-semibold' : 'text-text font-normal'}`}>{l.label}</span></Tip>
                        {(l.id === 'turnover' || l.id === 'netAssets') && <ProvenanceInfo dataset="accounts" label={l.label} />}
                      </th>
                      {shown.map((y) => <td key={y.yearEnd} className="text-right py-[7px] px-[15px] tabular-nums text-ink">{l.kind === 'bool' && y.values[l.id] ? <Check size={15} className="inline text-delta-up" /> : fmt(l, y.values[l.id], fx)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
