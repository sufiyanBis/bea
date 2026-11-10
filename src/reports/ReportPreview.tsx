import ReactECharts from 'echarts-for-react';
import type { Company } from '../data/types';
import type { Report } from './model';
import type { Rendered } from './render';
import { BRAND_NAME, PROTOTYPE_NOTICE } from '../config';
import { BeamLogo } from '../components/chrome/BeamLogo';
import { SOURCE_BY_ID } from '../data/sources';
import { countryName } from '../data/countries/iso3166';
import { cellText } from '../export/pdf';
import { formatDate, formatInt } from '../lib/format';
import { formatMoneyLocal } from '../lib/money';
import { Flag } from '../components/ui/Flag';

/** Live, page-like preview of a report. */
export function ReportPreview({ report, rendered, companies }: { report: Report; rendered: Rendered[]; companies: Company[] }) {
  return (
    <div className={`bg-white shadow-[0_2px_12px_rgba(0,0,0,0.12)] mx-auto ${report.orientation === 'landscape' ? 'max-w-[1000px]' : 'max-w-[760px]'}`} data-report-preview aria-label="Report preview">
      {report.cover && (
        <div className="bg-primary text-white px-[36px] py-[34px]" data-report-cover>
          <div className="flex items-center gap-[10px] text-[13px]">
            {report.logo && <BeamLogo size={26} inverted className="text-primary" />}
            {BRAND_NAME}
          </div>
          <h2 className="text-[28px] font-light mt-[14px]">{report.title}</h2>
          {report.subtitle && <p className="text-[15px] mt-[4px]">{report.subtitle}</p>}
          <p className="text-[13px] mt-[16px]">Prepared {formatDate(report.date)} by {report.author} · {formatInt(companies.length)} companies</p>
          <p className="text-[12px] mt-[10px] bg-white/15 inline-block px-[8px] py-[2px] rounded-[3px]">{PROTOTYPE_NOTICE}</p>
        </div>
      )}
      <div className="px-[36px] py-[24px] space-y-[26px]">
        {rendered.map((o) => (
          <section key={o.block.id} data-preview-block={o.block.kind}>
            <h3 className="text-[17px] font-semibold text-ink mb-[10px] border-b border-card-border pb-[4px]">{o.block.title}</h3>
            {o.type === 'text' && <p className="text-[14px] text-text whitespace-pre-wrap">{o.body}</p>}
            {o.type === 'metrics' && (
              <div className="grid grid-cols-4 gap-[10px]">
                {o.items.map((i) => (
                  <div key={i.label} className="border border-card-border rounded-card p-[10px]">
                    <div className="text-[12px] text-text">{i.label}</div>
                    <div className="text-[20px] font-bold text-ink" data-metric={i.label}>{i.value}</div>
                    {i.error && <div className="text-[11px] text-[#C0392B]">{i.error}</div>}
                  </div>
                ))}
              </div>
            )}
            {o.type === 'chart' && <ReactECharts option={{ ...o.option, title: undefined }} notMerge style={{ height: 260 }} />}
            {o.type === 'table' && (
              <table className="w-full text-[12.5px] border-collapse">
                <thead><tr>{o.columns.map((c) => <th key={c.key} className="text-left px-[6px] py-[5px] bg-primary text-white font-semibold">{c.label}</th>)}</tr></thead>
                <tbody>{o.rows.map((r, i) => <tr key={i} className="odd:bg-[#F7F7FA]">{o.columns.map((c) => <td key={c.key} className="px-[6px] py-[4px]">{cellText(c, r[c.key])}</td>)}</tr>)}</tbody>
              </table>
            )}
            {o.type === 'summaries' && (
              <div className="space-y-[10px]">
                {o.items.map((c) => (
                  <article key={c.id} className="flex gap-[10px] border border-card-border rounded-card p-[10px]">
                    <img src={c.logo} alt="" className="w-[36px] h-[36px] border border-border rounded-[2px]" />
                    <div className="text-[13px]">
                      <div className="font-semibold text-ink text-[14px] flex items-center gap-[5px]">{c.name}<Flag code={c.country} className="text-[13px]" /></div>
                      <div className="text-text">{countryName(c.country)} · {c.stage} · raised {formatMoneyLocal(c, c.fundraisingTotal) || '—'} · {c.employees ? `${formatInt(c.employees)} employees` : 'employees n/a'}</div>
                      <p className="text-text mt-[2px]">{c.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
            {o.type === 'sources' && (
              <ul className="list-disc pl-[18px] text-[13px] text-text">{o.ids.map((id) => <li key={id}>{SOURCE_BY_ID[id]?.name}: {SOURCE_BY_ID[id]?.licence}</li>)}</ul>
            )}
          </section>
        ))}
      </div>
      <footer className="px-[36px] py-[10px] border-t border-card-border text-[11px] text-muted flex justify-between"><span>{PROTOTYPE_NOTICE}</span><span>{report.title}</span></footer>
    </div>
  );
}
