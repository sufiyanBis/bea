import { Check, FlaskConical } from 'lucide-react';
import { useMemo } from 'react';
import { getCompanies } from '../../data/dataset';
import { countrySummary } from '../ui/CountrySelect';
import { formatInt } from '../../lib/format';
import { useQuery } from '../../store/queryStore';
import { useResults } from '../../store/resultsStore';
import { DE_PRESET } from '../../query/presets';
import { Button } from '../ui/Button';
import { FlagDE } from '../builder/icons';

export function EmptyState() {
  const runSearch = useResults((s) => s.runSearch);
  const loadQuery = useQuery((s) => s.loadQuery);
  const entity = useQuery((s) => s.entity);
  const countries = useQuery((s) => s.countries);
  const total = useMemo(() => getCompanies().filter((c) => !countries.length || countries.includes(c.country)).length, [countries]);

  const viewAll = () => runSearch({ entity, countries, combinator: 'all', criteria: [] });
  const loadDe = () => {
    loadQuery(DE_PRESET);
    runSearch(DE_PRESET);
  };

  return (
    <>
      <div className="text-center py-[34px]">
        <p className="text-[20px] text-ink font-light">Please search to see results</p>
        <p className="text-[15px] text-text mt-[4px]">
          or{' '}
          <button onClick={viewAll} className="text-primary underline underline-offset-2 hover:text-primary-hover">
            view all {formatInt(total)} companies in {countrySummary(countries)}
          </button>
        </p>
      </div>

      <section className="bg-surface border border-border rounded-card px-[28px] py-[24px]">
        <h2 className="text-[20px] text-ink font-semibold">Discover International data: introducing Germany DE</h2>
        <p className="text-[15px] text-text mt-[4px]">You can now search German legal entities alongside UK companies, using the same filters you already know.</p>
        <div className="grid grid-cols-3 gap-[18px] mt-[18px]">
          <div className="border border-border rounded-card p-[16px] flex flex-col gap-[12px]">
            <p className="text-[14px] text-text">
              <span className="font-semibold text-ink">Tip:</span> switch the <span className="font-semibold">Find</span> dropdown at the top of the query builder to search German entities.
            </p>
            <div className="border border-border rounded-btn shadow-sm bg-white text-[14px] text-ink w-[230px] overflow-hidden" aria-hidden>
              <div className="px-3 py-[6px] flex items-center justify-between">companies <Check size={13} className="text-primary" /></div>
              <div className="px-3 py-[6px] bg-page flex items-center gap-[6px]"><FlaskConical size={13} className="text-primary" />German legal entities <FlagDE /></div>
              <div className="px-3 py-[6px]">funds</div>
            </div>
          </div>
          <div className="border border-border rounded-card p-[16px] flex flex-col gap-[14px] items-start">
            <p className="text-[16px] text-ink font-semibold">Don&apos;t know where to start?</p>
            <p className="text-[14px] text-text">Try a ready-made search of German software and AI businesses.</p>
            <Button onClick={loadDe}>Search for German Legal Entities</Button>
          </div>
          <div className="border border-border rounded-card p-[16px]">
            <p className="text-[14px] text-text leading-relaxed">
              Be part of our journey as we go global,{' '}
              <a href="#" onClick={(e) => e.preventDefault()} className="font-semibold text-primary underline underline-offset-2">talk to our product team</a>{' '}
              and guide the future of our international data expansion.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
