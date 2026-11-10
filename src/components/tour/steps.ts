import type { Placement } from '@floating-ui/react';
import { useQuery } from '../../store/queryStore';
import { useResults } from '../../store/resultsStore';
import { useUi } from '../../store/uiStore';
import { getDataset } from '../../data/dataset';
import { run } from '../../query/run';
import { formatInt } from '../../lib/format';
import { DEMO_QUERY } from '../../query/presets';
import { go, LUMEN_ID, profilePath } from '../../lib/nav';

export interface TourStep {
  id: string;
  /** data-tour key of the anchor element; null = centred final modal */
  target: string | null;
  placement?: Placement;
  text?: string | (() => string);
  /** 'next' shows a Next button; 'action' waits for advanceOn; 'final' is the closing modal */
  mode: 'next' | 'action' | 'final';
  advanceOn?: string;
  beacon?: boolean;
  /** where on the target the beacon sits */
  beaconAt?: 'right' | 'left' | 'center';
  /** if the target is missing (user went off-script), point here instead with this hint */
  recover?: { target: string; text: string; placement?: Placement };
  /** auto-advance when this is already true (e.g. the group is already expanded) */
  doneIf?: () => boolean;
  onEnter?: () => void;
}

export interface Tour { id: string; title: string; subtitle: string; steps: TourStep[]; final?: { title: string; body: string } }

const exists = (key: string) => !!document.querySelector(`[data-tour="${key}"]`);
const REOPEN_PICKER = { target: 'add-criteria', text: 'Re-open the criteria list to carry on with the tour.', placement: 'bottom-start' as Placement };

const resultCount = () => {
  const q = useResults.getState().ranQuery;
  return q ? run(q, getDataset(q.entity)).length : 0;
};

const BUILD: TourStep[] = [
  {
    id: 'start', target: 'add-criteria', placement: 'bottom-start', mode: 'action', advanceOn: 'picker:open', beacon: true, beaconAt: 'left',
    text: "We're going to build a simple company search. Click here to add criteria to refine your search.",
    onEnter: () => {
      if (window.location.pathname !== '/') go('/');
      useUi.getState().closeAllPopovers();
      useQuery.getState().reset();
      useResults.getState().clear();
      window.scrollTo({ top: 0 });
    },
  },
  { id: 'lots', target: 'criteria-picker', placement: 'right-start', mode: 'next', text: 'As you can see, there are lots of filters to choose from!', recover: REOPEN_PICKER },
  {
    id: 'wtcd', target: 'group-what-the-company-does', placement: 'right', mode: 'action', advanceOn: 'group:expand:what-the-company-does', beacon: true, beaconAt: 'left',
    text: "For our first step, we want to refine our search by 'what the company does'.",
    recover: REOPEN_PICKER, doneIf: () => exists('criterion-industries'),
  },
  {
    id: 'industries', target: 'criterion-industries', placement: 'right', mode: 'action', advanceOn: 'modal:open:industries', beacon: true, beaconAt: 'left',
    text: "Click on 'Industries and buzzwords' to refine by our market-leading industry classification system. We created our own industry taxonomy to reveal what companies are actually doing, and it doesn't rely on Standard Industrial Classification (SIC) codes.",
    recover: REOPEN_PICKER,
  },
  {
    id: 'software', target: 'ind-group-software', placement: 'right', mode: 'action', advanceOn: 'industries:group:software', beacon: true, beaconAt: 'left',
    text: "Pick the 'Software' group to narrow the list.",
    recover: { target: 'row-industries', text: "Click the value under 'Industries and buzzwords' to reopen the picker.", placement: 'bottom-start' },
  },
  {
    id: 'ai', target: 'ind-item-artificial-intelligence', placement: 'right', mode: 'action', advanceOn: 'item:check:artificial-intelligence', beacon: true, beaconAt: 'left',
    text: "Tick 'Artificial Intelligence'.",
    recover: { target: 'ind-group-software', text: "Select the 'Software' group again.", placement: 'right' },
  },
  {
    id: 'ind-confirm', target: 'ind-confirm', placement: 'top-end', mode: 'action', advanceOn: 'modal:confirm', beacon: true, beaconAt: 'center',
    text: 'Click Confirm to add this filter to your search.',
  },
  {
    id: 'add-2', target: 'add-criteria', placement: 'bottom-start', mode: 'action', advanceOn: 'picker:open', beacon: true, beaconAt: 'left',
    text: "Now that you've added a filter that will show only companies that work in AI, it's time to refine the search even further.",
  },
  {
    id: 'ch-group', target: 'group-companies-house', placement: 'right', mode: 'action', advanceOn: 'group:expand:companies-house', beacon: true, beaconAt: 'left',
    text: "Open the 'Companies House' group.", recover: REOPEN_PICKER, doneIf: () => exists('criterion-ch-status'),
  },
  {
    id: 'ch-status', target: 'criterion-ch-status', placement: 'right', mode: 'action', advanceOn: 'popover:open:ch-status', beacon: true, beaconAt: 'left',
    text: "Choose 'Companies House status' so we only see companies that are still trading.", recover: REOPEN_PICKER,
  },
  {
    id: 'active', target: 'list-item-active', placement: 'right', mode: 'action', advanceOn: 'item:check:Active', beacon: true, beaconAt: 'left',
    text: "Tick 'Active'.", recover: { target: 'value-ch-status', text: 'Click here to reopen the status list.', placement: 'bottom-start' },
  },
  {
    id: 'ok', target: 'list-ok', placement: 'right', mode: 'action', advanceOn: 'popover:ok', beacon: true, beaconAt: 'center',
    text: 'Click OK to apply it.', recover: { target: 'value-ch-status', text: 'Click here to reopen the status list.', placement: 'bottom-start' },
  },
  {
    id: 'add-3', target: 'add-criteria', placement: 'bottom-start', mode: 'action', advanceOn: 'picker:open', beacon: true, beaconAt: 'left',
    text: "Let's add one more filter.",
  },
  {
    id: 'signals', target: 'criterion-signals', placement: 'right', mode: 'action', advanceOn: 'popover:open:signals', beacon: true, beaconAt: 'left',
    text: "Next up, you can choose one of our 'Signals'. We have five Signals (Growth, Innovation, Risk, Environmental, and Social & Governance) that indicate whether a company has a particular characteristic.",
    recover: REOPEN_PICKER,
  },
  {
    id: 'growth', target: 'tree-expand-growth', placement: 'left', mode: 'action', advanceOn: 'tree:expand:growth', beacon: true, beaconAt: 'center',
    text: "Expand 'Growth'.", recover: { target: 'value-signals', text: 'Click here to reopen the signals list.', placement: 'bottom-start' },
    doneIf: () => exists('tree-item-growth:equity-fundraising'),
  },
  {
    id: 'equity', target: 'tree-item-growth:equity-fundraising', placement: 'right', mode: 'action', advanceOn: 'item:check:growth:equity-fundraising', beacon: true, beaconAt: 'left',
    text: "Tick 'Equity fundraising'.", recover: { target: 'value-signals', text: 'Click here to reopen the signals list.', placement: 'bottom-start' },
  },
  {
    id: 'scale20', target: 'tree-item-growth:20-scaleup', placement: 'right', mode: 'action', advanceOn: 'item:check:growth:20-scaleup', beacon: true, beaconAt: 'left',
    text: "And tick '20% scaleup'.", recover: { target: 'value-signals', text: 'Click here to reopen the signals list.', placement: 'bottom-start' },
  },
  {
    id: 'tree-confirm', target: 'tree-confirm', placement: 'top-end', mode: 'action', advanceOn: 'tree:confirm', beacon: true, beaconAt: 'center',
    text: 'Click Confirm.', recover: { target: 'value-signals', text: 'Click here to reopen the signals list.', placement: 'bottom-start' },
  },
  {
    id: 'search', target: 'search-button', placement: 'bottom-end', mode: 'action', advanceOn: 'search:run', beacon: true, beaconAt: 'center',
    text: "Congratulations, you've successfully built your first search! Click here to reveal your results.",
  },
  {
    id: 'results', target: 'results-summary', placement: 'top-start', mode: 'next',
    text: () => `Here are the ${formatInt(resultCount())} active AI companies in the UK and Ireland that have received equity fundraising and had a growth rate above 20%. Scroll down to take a look at the top 20 in alphabetical order.`,
  },
  {
    id: 'stats-tab', target: 'tab-statistics', placement: 'bottom-start', mode: 'action', advanceOn: 'tab:statistics', beacon: true, beaconAt: 'center',
    text: "Now, click the 'Statistics' tab to reveal aggregate statistic and trend data across this company grouping. This is individual to every search you do.",
  },
  {
    id: 'stats', target: 'stats-subtabs', placement: 'top-start', mode: 'next',
    text: "Look around at our 'Statistics' that are specific to the search you just built. This is data you won't find elsewhere.",
  },
  { id: 'final', target: null, mode: 'final' },
];

const RESULTS: TourStep[] = [
  {
    id: 'table', target: 'results-table', placement: 'top-start', mode: 'next',
    text: 'This is your results table. Each row shows a company, its industries, head office and fundraising history, with a one-line description underneath.',
    onEnter: () => {
      if (window.location.pathname !== '/') go('/');
      const r = useResults.getState();
      if (!r.hasSearched) {
        useQuery.getState().loadQuery(DEMO_QUERY);
        r.runSearch(DEMO_QUERY);
      }
      r.setTab('results');
    },
  },
  { id: 'sort', target: 'sort-fundraisingTotal', placement: 'top', mode: 'next', text: 'Click a column heading with arrows to sort. Click again to reverse the order.' },
  { id: 'cols', target: 'column-editor', placement: 'bottom-start', mode: 'next', text: 'Use Edit table columns to show turnover, employees, stage of evolution and more. Drag to reorder.' },
  { id: 'export', target: 'result-actions', placement: 'bottom-end', mode: 'next', text: 'Export every result to a CSV, or save them all to a collection to track later.' },
];

/** Section tip (Next) then a beacon on the next nav item, which advances when clicked. */
const tip = (section: string, text: string, target = 'section-title', placement: Placement = 'bottom-start'): TourStep =>
  ({ id: `${section}-tip`, target, placement, mode: 'next', text });
const navTo = (from: string, to: string, text?: string): TourStep =>
  ({ id: `${from}-to-${to}`, target: `nav-${to}`, placement: 'right', mode: 'action', advanceOn: `section:${to}`, beacon: true, beaconAt: 'right', text });

const PROFILE: TourStep[] = [
  {
    ...navTo('summary', 'details', "Welcome to a company profile. Use the menu on the left to explore each section, starting with 'Details'."),
    onEnter: () => { useUi.getState().closeAllPopovers(); go(profilePath(LUMEN_ID)); },
  },
  tip('details', 'Here, you can find descriptions, company status, location, company names and other key pieces of information. Click to find out more.'),
  navTo('details', 'timeline'),
  tip('timeline', "This is a detailed company timeline. Scroll down to see all the key events since Lumen Bank's incorporation."),
  navTo('timeline', 'recent-activity'),
  navTo('recent-activity', 'transactions'),
  tip('transactions', "The Transactions tab lists all private fundraisings, grants, MBOs, acquisitions and spinouts. At the top of the page there's a summary of these events and an interactive valuation chart to track the company's growth over time."),
  navTo('transactions', 'people'),
  navTo('people', 'ownership'),
  tip('ownership', 'The Ownership tab pulls through the latest shareholder filings from Companies House confirmation statements (CS01 forms).'),
  navTo('ownership', 'corporate-structure'),
  navTo('corporate-structure', 'commodity-trade'),
  tip('commodity-trade', 'The handy graph at the top of the page offers insights into the number of commodities imported and exported dating back several years.'),
  navTo('commodity-trade', 'financials'),
  tip('financials', 'The Financials tab is particularly useful for company research and due diligence.'),
  navTo('financials', 'filing-history'),
  tip('filing-history', "The filing history tab gives access to official company filings on Companies House, saving valuable research time. These filings offer a transparent view of a company's legal and financial activities, supporting informed decision-making.", 'filing-filter', 'right-start'),
  navTo('filing-history', 'news'),
  navTo('news', 'similar-companies'),
  tip('similar-companies', 'Our machine learning algorithm analyses company descriptions and matches companies with their 20 most similar counterparts on the platform.'),
  { id: 'final', target: null, mode: 'final' },
];

export const TOURS: Tour[] = [
  { id: 'build-search', title: 'Build your first search', subtitle: 'Query builder, filters and statistics', steps: BUILD },
  {
    id: 'company-profile', title: 'Explore a company profile', subtitle: 'Every section of the Lumen Bank profile', steps: PROFILE,
    final: { title: 'Your tour is finished!', body: 'Want to look around yourself? Book a tour with one of our team members to build a bespoke search and see live data for yourself.' },
  },
  { id: 'results-table', title: 'Explore the results table', subtitle: 'Sorting, columns, export and collections', steps: RESULTS },
];
