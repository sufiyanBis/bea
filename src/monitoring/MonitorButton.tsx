import { Link } from 'react-router-dom';
import { Bell, BellRing } from 'lucide-react';
import { useMonitoring, type Target } from './store';

/** Start monitoring a company, person, saved search or collection; once on, links to its rule. */
export function MonitorButton({ target, className = '' }: { target: Target; className?: string }) {
  const rule = useMonitoring((s) => s.rules.find((r) => r.target.kind === target.kind && r.target.id === target.id));
  const addRule = useMonitoring((s) => s.addRule);
  if (rule) {
    return (
      <Link to={`/monitoring#${rule.id}`} data-monitor={target.id} className={`inline-flex items-center gap-[6px] h-[30px] px-[12px] border border-primary rounded-btn text-[14px] font-semibold bg-primary text-white whitespace-nowrap ${className}`}>
        <BellRing size={15} />Monitoring{rule.paused ? ' (paused)' : ''}
      </Link>
    );
  }
  return (
    <button onClick={() => addRule(target)} data-monitor={target.id} aria-pressed="false" className={`inline-flex items-center gap-[6px] h-[30px] px-[12px] border border-primary rounded-btn text-[14px] font-semibold bg-white text-primary hover:bg-primary-light whitespace-nowrap ${className}`}>
      <Bell size={15} />Monitor
    </button>
  );
}
