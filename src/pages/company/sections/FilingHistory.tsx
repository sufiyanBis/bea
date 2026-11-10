import { personIdFor } from '../../../data/persons';
import { PersonName } from '../../../components/people/PersonName';
import { PROTOTYPE_NOTICE } from '../../../config';
import { useState } from 'react';
import { Check, X } from 'lucide-react';
import type { SectionProps } from '../CompanyPage';
import type { Filing } from '../../../data/profile/types';
import { formatShortMonthDate } from '../../../lib/format';
import { Checkbox } from '../../../components/ui/Checkbox';
import { Button } from '../../../components/ui/Button';
import { Card, Pager, SectionTitle } from '../ui';

export const FILING_CATEGORIES = [
  'Accounts', 'Address', 'Annual Return / Confirmation Statement', 'Capital', 'Change of Name', 'Gazette Notice', 'Historical', 'Incorporation',
  'Insolvency', 'Liquidation', 'Miscellaneous', 'Mortgage', 'Officers', 'PSC', 'Resolution', 'Restoration',
];

/** Placeholder PDF of the filing, generated in the browser and opened in a new tab. */
export async function openFilingPdf(f: Filing, companyName: string, registeredName: string, registryName = 'Companies House') {
  const win = window.open('', '_blank');
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  doc.setFontSize(10); doc.text(`${registryName} filing (sample document generated for this demo)`, 14, 14);
  doc.setFontSize(18); doc.text(f.code, 14, 30);
  doc.setFontSize(12);
  doc.text(registeredName, 14, 42);
  doc.text(`Trading as ${companyName}`, 14, 49);
  doc.text(`Filed: ${f.date}`, 14, 60);
  doc.text(`Category: ${f.category}`, 14, 67);
  doc.text(doc.splitTextToSize(`${f.lead} ${f.rest}`.trim(), 180), 14, 80);
  (f.bullets ?? []).forEach((b, i) => doc.text(`• ${b}`, 18, 96 + i * 7));
  doc.setFontSize(8); doc.setTextColor(110); doc.text(PROTOTYPE_NOTICE, 14, 287);
  const url = URL.createObjectURL(doc.output('blob'));
  if (win) win.location.href = url; else window.open(url, '_blank');
}

/** "Appointment of Jane Doe" → person name links to the person profile. */
function FilingLead({ lead, companyId }: { lead: string; companyId: string }) {
  const m = /^(Appointment of |Termination of appointment of |Director's details changed for )(.+)$/.exec(lead);
  const id = m ? personIdFor(companyId, m[2]) : undefined;
  if (!m || !id) return <>{lead}</>;
  return <>{m[1]}<PersonName id={id} name={m[2]} /></>;
}

export function FilingHistory({ c, p }: SectionProps) {
  const [pending, setPending] = useState<string[]>(FILING_CATEGORIES);
  const [applied, setApplied] = useState<string[]>(FILING_CATEGORIES);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const rows = p.filings.filter((f) => applied.includes(f.category));
  const shown = rows.slice((page - 1) * size, page * size);

  return (
    <>
      <SectionTitle>Filing History</SectionTitle>
      <div className="flex gap-[16px] items-start">
        <aside className="w-[175px] shrink-0 bg-surface border border-card-border rounded-card p-[12px]" data-tour="filing-filter">
          <div className="text-[14px] font-semibold text-ink mb-[6px]">Filter by type</div>
          <div className="flex flex-col gap-[3px] mb-[8px] text-[13px]">
            <button onClick={() => setPending(FILING_CATEGORIES)} className="inline-flex items-center gap-[4px] min-h-[24px] px-[2px] text-primary hover:underline"><Check size={13} />Select all</button>
            <button onClick={() => setPending([])} className="inline-flex items-center gap-[4px] min-h-[24px] px-[2px] text-primary hover:underline"><X size={13} />Clear all</button>
          </div>
          <div className="space-y-[5px]">
            {FILING_CATEGORIES.map((cat) => (
              <div key={cat}><Checkbox checked={pending.includes(cat)} onChange={(on) => setPending((s) => (on ? [...s, cat] : s.filter((x) => x !== cat)))} className="text-[13px] text-ink items-start [&>span:first-of-type]:mt-[2px]">
                {cat}
              </Checkbox></div>
            ))}
          </div>
          <Button className="mt-[12px] w-full" onClick={() => { setApplied(pending); setPage(1); }}>Update Results</Button>
        </aside>
        <div className="flex-1 min-w-0">
          <Card>
            <div className="flex items-center justify-between mb-[8px] text-[14px] text-text">
              <span>Showing <strong className="text-ink">{shown.length}</strong> of <strong className="text-ink">{rows.length}</strong> documents filed</span>
              <Pager total={rows.length} page={page} size={size} onPage={setPage} onSize={(n) => { setSize(n); setPage(1); }} />
            </div>
            <table className="w-full text-[14px]">
              <thead className="border-b border-card-border"><tr>
                {['Date', 'Description', 'Type', ''].map((h) => <th key={h} className="py-[9px] px-[10px] text-left font-semibold text-ink">{h}</th>)}
              </tr></thead>
              <tbody>
                {shown.map((f) => {
                  const [md, y] = formatShortMonthDate(f.date).split(', ');
                  return (
                    <tr key={f.id} className="border-b border-card-border last:border-0 align-top">
                      <td className="py-[9px] px-[10px] w-[90px] text-ink"><div>{md},</div><div>{y}</div></td>
                      <td className="py-[9px] px-[10px] text-text">
                        <strong className="text-ink"><FilingLead lead={f.lead} companyId={c.id} /></strong> {f.rest}
                        {f.bullets && <ul className="list-disc pl-[18px] mt-[4px]">{f.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
                      </td>
                      <td className="py-[9px] px-[10px] w-[110px] font-mono text-[13px] text-ink">{f.code}</td>
                      <td className="py-[9px] px-[10px] w-[90px]"><button onClick={() => openFilingPdf(f, c.name, p.registeredName, c.registry.name)} className="text-primary hover:underline whitespace-nowrap">View PDF</button></td>
                    </tr>
                  );
                })}
                {!shown.length && <tr><td colSpan={4} className="py-[24px] text-center text-muted">No documents match these types.</td></tr>}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </>
  );
}
