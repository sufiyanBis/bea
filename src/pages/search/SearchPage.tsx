import { useEffect } from 'react';
import { Breadcrumb } from '../../components/chrome/Breadcrumb';
import { PageActions } from '../../components/chrome/PageActions';
import { GlobalSearch } from '../../components/chrome/GlobalSearch';
import { QueryBuilder } from '../../components/builder/QueryBuilder';
import { EmptyState } from '../../components/empty/EmptyState';
import { ResultsSection } from '../../components/results/ResultsSection';
import { useResults } from '../../store/resultsStore';
import { useQuery, selectQuery, syncQueryToUrl } from '../../store/queryStore';
import { readQueryParam } from '../../lib/urlState';

let restoredFromUrl = false;

export function SearchPage() {
  const hasSearched = useResults((s) => s.hasSearched);

  useEffect(() => {
    // A shared ?q= link restores the builder (in queryStore) and shows its results, once per page load.
    if (!restoredFromUrl) {
      restoredFromUrl = true;
      if (readQueryParam()) useResults.getState().runSearch(selectQuery(useQuery.getState()));
    }
    // "People search" from the header opens the builder on Find [people]
    if (new URLSearchParams(window.location.search).get('find') === 'people') useQuery.getState().setEntity('people');
    // Coming back from a profile page: put the current search back in the URL.
    syncQueryToUrl();
  }, []);

  return (
    <>
      <div className="max-w-content mx-auto px-5">
        <Breadcrumb />
        <div className="flex items-end justify-between gap-6 mt-[14px]">
          <h1 className="text-[44px] font-light text-ink leading-[1.1] tracking-[-0.01em] whitespace-nowrap">Advanced search</h1>
          <PageActions />
        </div>
        <div className="mt-[16px] mb-[24px]"><GlobalSearch wide /></div>
        <QueryBuilder />
        {!hasSearched && <EmptyState />}
      </div>
      {hasSearched && <ResultsSection />}
    </>
  );
}
