import { ExportMenu } from '../../export/ExportMenu';
import { chartRegistry, renderOffscreen } from './ChartCard';
import { useMemo, useState } from 'react';
import type { Company } from '../../data/types';
import { CountrySelect, countrySummary } from '../ui/CountrySelect';
import { useResults } from '../../store/resultsStore';
import type { StatsTab } from '../../store/resultsStore';
import { formatInt } from '../../lib/format';
import { ENTITY_LABELS } from '../builder/entity';
import { CompaniesStats } from './CompaniesStats';
import { FundraisingStats, MboStats } from './OtherStats';

const SUBTABS: { id: StatsTab; label: string }[] = [
  { id: 'companies', label: 'Companies' },
  { id: 'fundraisings', label: 'Fundraisings' },
  { id: 'mbos', label: 'MBOs/MBIs' },
];

export function StatsDashboard({ results: all }: { results: Company[] }) {
  const [countries, setCountries] = useState<string[]>([]);
  const counts = useMemo(() => { const m: Record<string, number> = {}; all.forEach((c) => (m[c.country] = (m[c.country] ?? 0) + 1)); return m; }, [all]);
  const results = useMemo(() => (countries.length ? all.filter((c) => countries.includes(c.country)) : all), [all, countries]);
  const sub = useResults((s) => s.statsTab);
  const setSub = useResults((s) => s.setStatsTab);
  const entity = useResults((s) => s.ranQuery?.entity ?? 'companies');

  return (
    <div className="max-w-content mx-auto">
      <div className="flex items-center gap-[4px]" role="tablist" data-tour="stats-subtabs">
        {SUBTABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={sub === t.id}
            onClick={() => setSub(t.id)}
            className={`h-[30px] px-[14px] text-[14px] rounded-btn border ${sub === t.id ? 'bg-tab-active border-tab-active text-white font-semibold' : 'bg-white border-border text-ink hover:bg-page'}`}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-[8px] text-[14px] text-text" data-stats-country>
          <ExportMenu label="Export all statistics" formats={['pdf', 'xlsx']} filename="statistics" tourKey="stats-export"
            build={() => ({ title: `Statistics for ${results.length.toLocaleString('en-GB')} companies`, sheets: [...chartRegistry.entries()].filter(([, v]) => v.csv).map(([k, v]) => ({ name: k.slice(0, 28), columns: v.csv!.headers.map((h, i) => ({ key: `c${i}`, label: h })), rows: v.csv!.rows.map((r) => Object.fromEntries(r.map((x, i) => [`c${i}`, x]))) })), charts: [...chartRegistry.entries()].filter(([, v]) => v.option).map(([k, v]) => ({ title: k, dataUrl: renderOffscreen(v.option!, 'png') })), toc: true, sources: ['companies-house', 'cro', 'national-registers', 'in-house'], viewPath: '/' })} />
          <span>Country</span>
          <CountrySelect mode="multi" value={countries} onChange={setCountries} label="Statistics countries" counts={counts} tourKey="stats-country" />
        </div>
      </div>
      <p className="mt-[16px] mb-[18px] text-[18px] text-ink font-light">
        Statistics for the {formatInt(results.length)} {ENTITY_LABELS[entity].plural} in your search results{countries.length ? ` in ${countrySummary(countries)}` : ''}
      </p>
      {results.length === 0 ? (
        <div className="bg-surface border border-border rounded-card py-[40px] text-center text-text">There are no results to summarise.</div>
      ) : sub === 'companies' ? (
        <CompaniesStats results={results} />
      ) : sub === 'fundraisings' ? (
        <FundraisingStats results={results} />
      ) : (
        <MboStats results={results} />
      )}
    </div>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return <h2 className="text-[20px] text-ink font-semibold mt-[28px] mb-[12px] first:mt-0">{children}</h2>;
}
