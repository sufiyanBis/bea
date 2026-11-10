import { useState } from 'react';
import { Panel, btnOutline, btnPrimary } from '../../components/layout/PageShell';
import { useMonitoring } from '../../monitoring/store';
import { simulateEvents } from '../../monitoring/simulate';
import { useAllowance } from '../../export/stores';
import { formatInt } from '../../lib/format';

/** Demo-only controls for presenting the tender gaps live. */
export function TenderExtras() {
  const { used, allowance, setUsed } = useAllowance();
  const rules = useMonitoring((s) => s.rules);
  const unread = useMonitoring((s) => s.alerts.filter((a) => !a.read).length);
  const [last, setLast] = useState<number | null>(null);
  return (
    <Panel title="Demo controls" className="mt-[18px]" bodyClass="p-[18px] space-y-[12px]">
      <div className="flex items-center gap-[12px] text-[14px] text-text" data-demo-allowance>
        <span>Bulk-export usage this month: <strong className="text-ink">{formatInt(used)}</strong> of {formatInt(allowance)} rows.</span>
        <button className={btnOutline} onClick={() => setUsed(allowance - 2_000)}>Set usage near the limit</button>
        <button className={btnOutline} onClick={() => setUsed(61_000)}>Reset to 61,000</button>
      </div>
      <div className="flex items-center gap-[12px] text-[14px] text-text" data-demo-simulate>
        <span>Monitoring: {rules.filter((r) => !r.paused).length} active rules, {unread} unread alerts.</span>
        <button className={btnPrimary} onClick={() => setLast(simulateEvents())} data-simulate-events>Simulate new events</button>
        {last != null && <span role="status">{last} new alerts generated. Open the bell in the header.</span>}
      </div>
    </Panel>
  );
}
