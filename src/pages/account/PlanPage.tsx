import { UsageMeter } from '../../export/BulkExportModal';
import type { ReactNode } from 'react';
import { PageShell, Panel } from '../../components/layout/PageShell';
import { TV } from '../../components/ui/Sample';
import { TENDER } from '../../config';
import { formatInt } from '../../lib/format';

const ordinal = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;

export function AllowanceFacts() {
  const rows: [string, ReactNode][] = [
    ['Standard exports (results, profiles, charts, reports)', <TV key="s" v={TENDER.standardExports} />],
    ['Bulk-export allowance', <TV key="a" v={TENDER.bulkAllowanceRows} render={(n) => `${formatInt(n)} rows per month`} />],
    ['Charge beyond the allowance', <TV key="o" v={TENDER.overagePer1000} render={(n) => `£${n.toFixed(2)} per 1,000 rows`} />],
    ['Allowance resets', <TV key="r" v={TENDER.allowanceResetDay} render={(n) => `On the ${ordinal(n)} of each month`} />],
    ['Exports run as a background job above', <TV key="b" v={TENDER.bulkThreshold} render={(n) => `${formatInt(n)} rows`} />],
    ['Large exports are split into files of', <TV key="f" v={TENDER.rowsPerFile} render={(n) => `${formatInt(n)} rows (zipped)`} />],
    ['Finished exports stay available for', <TV key="e" v={TENDER.exportExpiryDays} render={(n) => `${n} days`} />],
  ];
  return (
    <dl className="text-[14px]">
      {rows.map(([k, v]) => (
        <div key={k} className="flex py-[9px] border-b border-card-border last:border-0">
          <dt className="w-[50%] text-text">{k}</dt>
          <dd className="text-ink font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function PlanPage() {
  return (
    <PageShell
      title="Plan & allowances"
      crumbs={[{ label: 'Home', to: '/' }, { label: 'Account', to: '/account' }, { label: 'Plan & allowances' }]}
      intro="What is included for every user in your organisation. Values tagged Sample are placeholders for the client demo and are not commitments."
    >
      <div className="grid grid-cols-[2fr_1fr] gap-[20px] items-start">
        <Panel title="Exports and bulk downloads"><div className="mb-[14px]"><UsageMeter /></div><AllowanceFacts /></Panel>
        <Panel title="Licences">
          <p className="text-[14px] text-ink font-semibold"><TV v={TENDER.seats} render={(n) => `${n} named user licences`} /></p>
          <p className="text-[14px] text-text mt-[8px]">Full access for all users. No feature is restricted by role or licence tier; Administrators additionally see the Admin console.</p>
        </Panel>
        <Panel title="Fair use" className="col-span-2"><p className="text-[14px] text-text"><TV v={TENDER.fairUse} /></p></Panel>
      </div>
    </PageShell>
  );
}
