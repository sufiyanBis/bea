import { create } from 'zustand';
import type { Query } from '../criteria/types';
import type { Sort } from '../query/sort';
import { bus } from '../lib/eventBus';
import { load, save } from '../lib/storage';

export type ResultsTab = 'results' | 'statistics' | 'activity' | 'news' | 'map';
export type StatsTab = 'companies' | 'fundraisings' | 'mbos';

export const ALL_COLUMNS = [
  { id: 'name', label: 'Name', locked: true },
  { id: 'industries', label: 'Industries' },
  { id: 'headOffice', label: 'Head Office' },
  { id: 'fundraisingTotal', label: 'Fundraising Total' },
  { id: 'latestFundraisingDate', label: 'Latest Fundraising' },
  { id: 'turnover', label: 'Turnover' },
  { id: 'employees', label: 'Employees' },
  { id: 'stage', label: 'Stage of evolution' },
  { id: 'foundedDate', label: 'Founded' },
  { id: 'website', label: 'Website' },
  { id: 'chStatus', label: 'Companies House status' },
  { id: 'signals', label: 'Signals' },
  { id: 'creditRating', label: 'Credit rating' },
  { id: 'ultimateParent', label: 'Ultimate parent' },
  { id: 'nextAccountsDue', label: 'Next accounts due' },
] as const;
export type ColumnId = (typeof ALL_COLUMNS)[number]['id'];
const DEFAULT_COLS: ColumnId[] = ['name', 'industries', 'headOffice', 'fundraisingTotal', 'latestFundraisingDate'];

interface State {
  hasSearched: boolean;
  ranQuery: Query | null;
  sort: Sort;
  page: number;
  pageSize: number;
  columns: ColumnId[];
  tab: ResultsTab;
  statsTab: StatsTab;
  profileId: string | null;
  /** company ids the collection modal will add */
  collectionTarget: string[];
  setCollectionTarget: (ids: string[]) => void;
  runSearch: (q: Query) => void;
  clear: () => void;
  setSort: (s: Sort) => void;
  setPage: (p: number) => void;
  setPageSize: (n: number) => void;
  setColumns: (c: ColumnId[]) => void;
  setTab: (t: ResultsTab) => void;
  setStatsTab: (t: StatsTab) => void;
  openProfile: (id: string | null) => void;
}

export const useResults = create<State>((set) => ({
  hasSearched: false,
  ranQuery: null,
  sort: { key: 'name', dir: 'asc' },
  page: 1,
  pageSize: 20,
  columns: load<ColumnId[]>('nb.columns', DEFAULT_COLS),
  tab: 'results',
  statsTab: 'companies',
  profileId: null,
  collectionTarget: [],
  setCollectionTarget: (collectionTarget) => set({ collectionTarget }),
  runSearch: (q) => {
    set({ hasSearched: true, ranQuery: JSON.parse(JSON.stringify(q)), page: 1, tab: 'results' });
    bus.emit('search:run');
  },
  clear: () => set({ hasSearched: false, ranQuery: null, page: 1, tab: 'results' }),
  setSort: (sort) => set({ sort, page: 1 }),
  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize, page: 1 }),
  setColumns: (columns) => { set({ columns }); save('nb.columns', columns); },
  setTab: (tab) => { set({ tab }); bus.emit(`tab:${tab}`); },
  setStatsTab: (statsTab) => set({ statsTab }),
  openProfile: (profileId) => set({ profileId }),
}));
