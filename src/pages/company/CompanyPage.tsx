import { ComponentType, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { getCompany } from '../../data/dataset';
import { getProfile } from '../../data/profile/generateProfile';
import type { CompanyProfile } from '../../data/profile/types';
import type { Company } from '../../data/types';
import { bus } from '../../lib/eventBus';
import { profilePath, pushRecentProfile } from '../../lib/nav';
import { Breadcrumb } from '../../components/chrome/Breadcrumb';
import { GlobalSearch } from '../../components/chrome/GlobalSearch';
import { CompanyHeader } from './CompanyHeader';
import { SECTIONS, SectionId, isSection, sectionEnabled } from './sections';
import { Toasts } from './ui';
import { setTitle } from '../../lib/title';
import { ProvenanceProvider } from './provenance';
import { Summary } from './sections/Summary';
import { Details } from './sections/Details';
import { Timeline } from './sections/Timeline';
import { RecentActivity } from './sections/RecentActivity';
import { Transactions } from './sections/Transactions';
import { People } from './sections/People';
import { Ownership } from './sections/Ownership';
import { CorporateStructure } from './sections/CorporateStructure';
import { CommodityTrade } from './sections/CommodityTrade';
import { Financials } from './sections/Financials';
import { FilingHistory } from './sections/FilingHistory';
import { News } from './sections/News';
import { SimilarCompanies } from './sections/SimilarCompanies';
import { Patents, ChargesMortgages } from './sections/PatentsCharges';
import '../../print.css';

export interface SectionProps { c: Company; p: CompanyProfile }

const VIEWS: Record<SectionId, ComponentType<SectionProps>> = {
  summary: Summary, details: Details, timeline: Timeline, 'recent-activity': RecentActivity, transactions: Transactions,
  people: People, ownership: Ownership, 'corporate-structure': CorporateStructure, 'commodity-trade': CommodityTrade,
  patents: Patents, financials: Financials, 'charges-mortgages': ChargesMortgages, 'filing-history': FilingHistory,
  news: News, 'similar-companies': SimilarCompanies,
};

export default function CompanyPage() {
  const { id = '', section } = useParams();
  const c = getCompany(id);
  const p = c ? getProfile(id) : null;
  const [printing, setPrinting] = useState(false);
  const current: SectionId = isSection(section) ? section : 'summary';

  // scroll to top + tell the tour on every section change
  useEffect(() => {
    window.scrollTo(0, 0);
    if (c) { bus.emit(`section:${current}`); pushRecentProfile(c.id); setTitle(`${c.name} | ${SECTIONS.find((s) => s.id === current)!.label}`); }
    return () => setTitle("Advanced search");
  }, [c, current]);

  // PDF: render every section stacked, print, then restore
  useEffect(() => {
    if (!printing) return;
    const t = setTimeout(() => { window.print(); setPrinting(false); }, 300);
    return () => clearTimeout(t);
  }, [printing]);

  if (!c || !p) {
    return (
      <div className="max-w-content mx-auto px-5 py-[60px] text-center">
        <h1 className="text-[24px] text-ink font-light">Company not found</h1>
        <p className="text-text mt-2">We couldn't find a company with the id “{id}”. <Link to="/" className="text-primary underline">Back to Advanced search</Link></p>
      </div>
    );
  }
  if (section && !isSection(section)) return <Navigate to={profilePath(c.id)} replace />;
  if (!sectionEnabled(current, p)) return <Navigate to={profilePath(c.id)} replace />;

  const View = VIEWS[current];
  return (
    <div className="pb-[30px]" data-profile={c.id}>
      <CompanyHeader c={c} p={p} onPrint={() => setPrinting(true)} />
      <div className="max-w-[1440px] mx-auto px-[20px] no-print">
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-6">
          <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Companies', to: '/' }, { label: c.name, to: profilePath(c.id) }, { label: SECTIONS.find((s) => s.id === current)!.label }]} />
          <GlobalSearch />
          <div />
        </div>
      </div>
      <div className="max-w-[1440px] mx-auto px-[20px] pt-[16px] flex gap-[24px] items-start">
        <SectionNav c={c} p={p} current={current} />
        <div className="flex-1 min-w-0" data-section={current}>
          {printing ? (
            <div className="space-y-[30px]">
              {SECTIONS.filter((s) => sectionEnabled(s.id, p)).map((s) => { const V = VIEWS[s.id]; return <div key={s.id} className="print-section"><ProvenanceProvider value={{ c, p, section: s.id }}><V c={c} p={p} /></ProvenanceProvider></div>; })}
            </div>
          ) : (
            <ProvenanceProvider value={{ c, p, section: current }}><View c={c} p={p} /></ProvenanceProvider>
          )}
        </div>
      </div>
      <Toasts />
    </div>
  );
}

function SectionNav({ c, p, current }: { c: Company; p: CompanyProfile; current: SectionId }) {
  return (
    <nav aria-label="Profile sections" className="w-[195px] shrink-0 sticky top-[156px] self-start bg-surface border border-card-border rounded-card py-[8px] px-[6px] no-print" data-section-nav>
      <ul>
        {SECTIONS.map((s) => {
          const enabled = sectionEnabled(s.id, p);
          const active = s.id === current;
          return (
            <li key={s.id}>
              {enabled ? (
                <Link
                  to={profilePath(c.id, s.id)}
                  data-tour={`nav-${s.id}`}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center h-[31px] px-[12px] rounded-full text-[15px] font-medium ${active ? 'bg-tab-active text-white' : 'text-primary hover:bg-[#F0F0F0]'}`}
                >
                  {s.label}
                </Link>
              ) : (
                <span data-tour={`nav-${s.id}`} aria-disabled="true" title="No data available for this company" className="flex items-center h-[31px] px-[12px] text-[15px] font-medium text-nav-disabled cursor-not-allowed">
                  {s.label}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
