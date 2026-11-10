import { PeopleResults } from './PeopleResults';
import type { Person } from '../../data/persons';
import { ExportMenu } from '../../export/ExportMenu';
import { resultsSpec } from '../../export/specs';
import { useAnalysis } from '../../analysis/analysisStore';
import { describeQuery } from '../../query/describe';
import { Link } from 'react-router-dom';
import { Columns3 } from 'lucide-react';
import { useCompare, comparePath } from '../../store/compareStore';
import { lazy, Suspense, useState } from 'react';
import { Download, ListPlus } from 'lucide-react';
import { useResults, ALL_COLUMNS } from '../../store/resultsStore';
import type { ResultsTab as TabId } from '../../store/resultsStore';
import { useUi } from '../../store/uiStore';
import { useResultSet, useSortedResults } from '../../query/useResultSet';
import { paginate } from '../../query/sort';
import { formatInt } from '../../lib/format';
import { downloadBlob, toCsv } from '../../lib/download';
import { ENTITY_LABELS } from '../builder/entity';
import { Button } from '../ui/Button';
import { ResultsTable } from './ResultsTable';
import { Pagination } from './Pagination';
import { ColumnEditor } from './ColumnEditor';
import { cellText } from './cells';
import { ActivityFeed } from '../feeds/ActivityFeed';
import { NewsList } from '../feeds/NewsList';

// ECharts and Leaflet are heavy; load them only when their tab is opened.
const AnalysisGrid = lazy(() => import('../../analysis/AnalysisGrid').then((m) => ({ default: m.AnalysisGrid })));
const StatsDashboard = lazy(() => import('../stats/StatsDashboard').then((m) => ({ default: m.StatsDashboard })));
const ResultsMap = lazy(() => import('../feeds/ResultsMap').then((m) => ({ default: m.ResultsMap })));
const Loading = () => <div className="py-[60px] text-center text-muted">Loading…</div>;

const TABS: { id: TabId; label: string }[] = [
  { id: 'results', label: 'Search Results' },
  { id: 'statistics', label: 'Statistics' },
  { id: 'activity', label: 'Recent Activity' },
  { id: 'news', label: 'Company News' },
  { id: 'map', label: 'Map' },
];

const RELATED = [
  'directors of these companies', 'investors in these companies', 'grants received by these companies',
  'accelerators attended by these companies', 'acquisitions made by these companies', 'patents filed by these companies',
  'news about these companies', 'senior hires at these companies', 'competitors of these companies', 'similar companies in Germany',
];

export function ResultsSection() {
  const tab = useResults((s) => s.tab);
  const setTab = useResults((s) => s.setTab);
  const entity = useResults((s) => s.ranQuery?.entity ?? 'companies');
  const results = useResultSet();

  if (entity === 'people') return <div className="max-w-wide mx-auto px-5 mt-[34px]" data-tour="results-area"><PeopleResults rows={results as unknown as Person[]} /></div>;
  return (
    <div className="max-w-wide mx-auto px-5 mt-[34px]" data-tour="results-area">
      <div className="flex items-end gap-[4px] border-b border-tab-active" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            data-tour={`tab-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`h-[38px] px-[18px] text-[15px] rounded-t-[3px] border border-b-0 ${tab === t.id ? 'bg-tab-active text-white border-tab-active font-semibold' : 'bg-white text-ink border-border hover:bg-page'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="pt-[20px]">
        <Suspense fallback={<Loading />}>
          {tab === 'results' && <ResultsTab />}
          {tab === 'statistics' && <StatsDashboard results={results} />}
          {tab === 'activity' && <ActivityFeed results={results} />}
          {tab === 'news' && <NewsList results={results} />}
          {tab === 'map' && <ResultsMap results={results} plural={ENTITY_LABELS[entity].plural} />}
        </Suspense>
      </div>
    </div>
  );
}

function ViewToggle() {
  const view = useAnalysis((s) => s.view);
  const setView = useAnalysis((s) => s.setView);
  return (
    <div role="group" aria-label="Results view" className="inline-flex border border-primary rounded-btn overflow-hidden divide-x divide-primary" data-tour="results-view">
      {([['list', 'List'], ['analyse', 'Analyse']] as const).map(([k, l]) => (
        <button key={k} aria-pressed={view === k} data-results-view={k} onClick={() => setView(k)} className={`h-[30px] px-[14px] text-[14px] font-semibold ${view === k ? 'bg-primary text-white' : 'bg-white text-primary hover:bg-primary-light'}`}>{l}</button>
      ))}
    </div>
  );
}

function CompareButton() {
  const ids = useCompare((s) => s.ids);
  return (
    <Link to={comparePath(ids)} aria-disabled={!ids.length} data-compare-button onClick={(e) => { if (!ids.length) e.preventDefault(); }}
      className={`inline-flex items-center gap-[6px] h-[30px] px-[12px] border border-primary rounded-btn text-[15px] font-semibold ${ids.length ? 'bg-primary text-white hover:bg-primary-hover' : 'bg-white text-primary opacity-60 cursor-default'}`}>
      <Columns3 size={15} />Compare ({ids.length})
    </Link>
  );
}

function ResultsActions({ all }: { all: ReturnType<typeof useSortedResults> }) {
  const open = useUi((s) => s.open);
  const setTarget = useResults((s) => s.setCollectionTarget);
  const exportCsv = () => {
    const cols = ALL_COLUMNS.map((c) => c.id);
    const csv = toCsv(
      [...ALL_COLUMNS.map((c) => c.label), 'Description', 'Companies House ID'],
      all.map((c) => [...cols.map((col) => cellText(c, col)), c.description, c.companiesHouseId]),
    );
    downloadBlob('﻿' + csv, `search-results-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8');
  };
  return (
    <div className="flex items-center gap-[10px]" data-tour="result-actions">
      <CompareButton />
      <ExportMenu label={`Export all ${all.length.toLocaleString('en-GB')} results`} tourKey="export-all" filename="search-results"
        build={() => resultsSpec(all, ['name', 'country', 'region', 'industry', 'stage', 'status', 'listed', 'registryId', 'founded', 'turnover', 'employees', 'fundraisingTotal', 'latestFundraising', 'website'], describeQuery(useResults.getState().ranQuery))} />
      <Button onClick={exportCsv}><Download size={15} />Export results to a CSV</Button>
      <Button onClick={() => { setTarget(all.map((c) => c.id)); open('collection-modal', 'modal'); }}><ListPlus size={16} />Add to collection</Button>
    </div>
  );
}

function ResultsTab() {
  const all = useSortedResults();
  const page = useResults((s) => s.page);
  const size = useResults((s) => s.pageSize);
  const entity = useResults((s) => s.ranQuery?.entity ?? 'companies');
  const [showMore, setShowMore] = useState(false);
  const rows = paginate(all, page, size);
  const view = useAnalysis((s) => s.view);
  const ranQuery = useResults((s) => s.ranQuery);

  return (
    <>
      <div className="flex items-start justify-between gap-6 mb-[16px]" data-tour="results-summary">
        <div className="text-[15px] text-text">
          <p>
            <strong className="text-ink font-semibold">{formatInt(all.length)} {ENTITY_LABELS[entity].plural}</strong> found or try a related search:
          </p>
          <p className="mt-[2px]">
            Search for{' '}
            <a href="#" onClick={(e) => e.preventDefault()} className="text-primary hover:underline font-semibold">fundraisings secured by these companies</a>{' '}
            <button onClick={() => setShowMore((v) => !v)} className="text-primary hover:underline">{showMore ? '(show fewer)' : `(+${RELATED.length} more ...)`}</button>
          </p>
          {showMore && (
            <ul className="mt-[6px] grid grid-cols-2 gap-x-[24px] gap-y-[2px]">
              {RELATED.map((r) => (
                <li key={r}>Search for <a href="#" onClick={(e) => e.preventDefault()} className="text-primary hover:underline">{r}</a></li>
              ))}
            </ul>
          )}
        </div>
        <ResultsActions all={all} />
      </div>
      <div className="flex items-center gap-[12px] mb-[12px]">
        <ViewToggle />
        {view === 'list' && <ColumnEditor />}
        <div className="flex-1" />
        {view === 'list' && <Pagination total={all.length} />}
      </div>
      {view === 'analyse' ? (
        <Suspense fallback={<Loading />}><AnalysisGrid rows={all} filtersUsed={describeQuery(ranQuery)} /></Suspense>
      ) : (
        <>
          <ResultsTable rows={rows} />
          <div className="flex items-center justify-between mt-[14px]">
            <ResultsActions all={all} />
            <Pagination total={all.length} />
          </div>
        </>
      )}
    </>
  );
}
