import { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import type { SectionProps } from '../CompanyPage';
import type { Investor, TxType } from '../../../data/profile/types';
import { formatLongDate, formatMoney } from '../../../lib/format';
import { formatMoneyLocal } from '../../../lib/money';
import { Card, InvestorLine, Pager, SectionTitle, StageTag } from '../ui';
import { TransactionsSummary } from '../shared';

const TABS: { id: TxType | 'all'; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'fundraising', label: 'Fundraisings' }, { id: 'grant', label: 'Grants' },
  { id: 'mbo', label: 'MBO/MBIs' }, { id: 'acquisition', label: 'Acquisitions' }, { id: 'spinout', label: 'Spinouts' },
];

export function Transactions({ c, p }: SectionProps) {
  const fm = (v?: number) => formatMoneyLocal(c, v);
  const [tab, setTab] = useState<TxType | 'all'>('all');
  const [page, setPage] = useState(1);
  const size = 10;
  const rows = p.transactions.filter((t) => tab === 'all' || t.type === tab);
  const shown = rows.slice((page - 1) * size, page * size);

  const investors = useMemo(() => {
    const m = new Map<string, { inv: Investor; n: number }>();
    p.transactions.filter((t) => t.type === 'fundraising').forEach((t) => t.investors.forEach((inv) => {
      const cur = m.get(inv.name);
      m.set(inv.name, { inv: { ...inv, followOn: cur ? true : inv.followOn }, n: (cur?.n ?? 0) + 1 });
    }));
    return [...m.values()].sort((a, b) => (a.inv.name === 'Business Angel(s)' ? 1 : b.inv.name === 'Business Angel(s)' ? -1 : b.n - a.n || a.inv.name.localeCompare(b.inv.name)));
  }, [p]);

  const th = 'py-[9px] px-[10px] text-left text-[14px] font-semibold text-ink border-b border-card-border';
  return (
    <>
      <SectionTitle>Transactions</SectionTitle>
      <div className="space-y-[16px]">
        <TransactionsSummary p={p} yTitle />
        <Card title="Events" tourKey="tx-events">
          <div className="flex items-center gap-[6px] mb-[12px]" role="tablist">
            {TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => { setTab(t.id); setPage(1); }}
                className={`h-[30px] px-[14px] rounded-full text-[14px] font-medium ${tab === t.id ? 'bg-tab-active text-white' : 'text-primary hover:bg-page'}`}>
                {t.label}
              </button>
            ))}
            <span className="ml-auto inline-flex gap-[2px] text-[#C9C9C9]"><ChevronLeft size={18} /><ChevronRight size={18} /></span>
          </div>
          <div className="flex items-center justify-between mb-[8px] text-[14px] text-text">
            <span>Showing <strong className="text-ink">{shown.length}</strong> of <strong className="text-ink">{rows.length}</strong></span>
            <Pager total={rows.length} page={page} size={size} onPage={setPage} />
          </div>
          <table className="w-full text-[14px]">
            <thead><tr><th className={th}>Transaction</th><th className={th}>Investor(s)</th><th className={th}>Amount</th><th className={th}>Stage</th><th className={th}>Date</th></tr></thead>
            <tbody>
              {shown.map((t) => (
                <tr key={t.id} className="border-b border-card-border last:border-0 align-top">
                  <td className="py-[10px] px-[10px] w-[24%]"><a href="#" onClick={(e) => e.preventDefault()} className="text-primary hover:underline">{t.label}</a></td>
                  <td className="py-[10px] px-[10px] space-y-[4px]">{t.undisclosed || !t.investors.length ? <span className="text-muted">Undisclosed investors</span> : t.investors.map((inv) => <InvestorLine key={inv.name} inv={inv} />)}</td>
                  <td className="py-[10px] px-[10px] w-[150px]">
                    {!t.announced && !t.verified ? '—' : (
                      <div className="flex flex-col items-start gap-[4px]">
                        {t.announced && <span className="bg-money-grey text-ink text-[12px] px-[6px] py-[1px] rounded-[3px]">{fm(t.announced)} announced</span>}
                        {t.verified && <span className="bg-money-yellow text-ink text-[12px] font-semibold px-[6px] py-[1px] rounded-[3px] inline-flex items-center gap-[3px]">{fm(t.verified)} verified <Check size={12} strokeWidth={3} /></span>}
                      </div>
                    )}
                  </td>
                  <td className="py-[10px] px-[10px] w-[110px]"><StageTag stage={t.stage} /></td>
                  <td className="py-[10px] px-[10px] w-[110px] text-ink">{formatLongDate(t.date).replace(/ (\d{4})$/, '\n$1').split('\n').map((l) => <div key={l}>{l}</div>)}</td>
                </tr>
              ))}
              {!shown.length && <tr><td colSpan={5} className="py-[20px] text-center text-muted">No {TABS.find((x) => x.id === tab)!.label.toLowerCase()} recorded.</td></tr>}
            </tbody>
          </table>
        </Card>
        <Card title="Fundraising investors">
          {investors.length ? (
            <table className="w-full text-[14px]">
              <thead><tr><th className={th}>Investor(s)</th><th className={`${th} text-right w-[160px]`}>Participation(s)</th></tr></thead>
              <tbody>
                {investors.map(({ inv, n }) => (
                  <tr key={inv.name} className="border-b border-card-border last:border-0">
                    <td className="py-[8px] px-[10px]">
                      <InvestorLine inv={inv} />
                      {inv.followOn && n > 1 && <div className="text-[12px] text-muted inline-flex items-center gap-[4px] mt-[2px] ml-[33px]"><RefreshCw size={11} />This was a follow-on investment</div>}
                    </td>
                    <td className="py-[8px] px-[10px] text-right text-ink">{n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-[14px] text-muted">No known fundraising investors.</p>}
        </Card>
      </div>
    </>
  );
}
