import { create } from 'zustand';
import type { Criterion, CriterionValue, Query } from '../criteria/types';
import { CRITERIA, defaultValue } from '../criteria/registry';
import { decodeQ, encodeQ, readQueryParam, writeQueryParam } from '../lib/urlState';
import { bus } from '../lib/eventBus';

interface State extends Query {
  countries: string[];
  /** uid of a just-added row whose picker should auto-open */
  justAdded: string | null;
  setEntity: (e: Query['entity']) => void;
  setCountries: (c: string[]) => void;
  setCombinator: (c: Query['combinator']) => void;
  addCriterion: (defId: string) => string;
  updateCriterion: (uid: string, patch: Partial<Pick<Criterion, 'op' | 'value'>>) => void;
  removeCriterion: (uid: string) => void;
  clearJustAdded: () => void;
  loadQuery: (q: Query) => void;
  reset: () => void;
}

let seq = 0;
const uid = () => `r${Date.now().toString(36)}${(seq++).toString(36)}`;

/** Default scope of a new search: UK and Ireland (spec 3.1). */
export const DEFAULT_COUNTRIES = ['GB', 'IE'];

function initial(): Query & { countries: string[] } {
  const param = readQueryParam();
  const q = param ? decodeQ<Query>(param) : null;
  if (q && Array.isArray(q.criteria)) {
    return { entity: q.entity ?? 'companies', countries: Array.isArray(q.countries) ? q.countries : DEFAULT_COUNTRIES, combinator: q.combinator ?? 'all', criteria: q.criteria.filter((c) => CRITERIA[c.defId]) };
  }
  return { entity: 'companies', countries: DEFAULT_COUNTRIES, combinator: 'all', criteria: [] };
}

export const useQuery = create<State>((set) => ({
  ...initial(),
  justAdded: null,
  setEntity: (entity) => set((s) => ({ entity, criteria: s.criteria.filter((c) => (entity === 'people') === c.defId.startsWith('p-')) })),
  setCountries: (countries) => { set({ countries }); bus.emit('countries:change'); },
  setCombinator: (combinator) => set({ combinator }),
  addCriterion: (defId) => {
    const def = CRITERIA[defId];
    const id = uid();
    set((s) => ({ criteria: [...s.criteria, { uid: id, defId, op: def.defaultOperator, value: defaultValue(def) }], justAdded: id }));
    bus.emit(`criterion:add:${defId}`);
    return id;
  },
  updateCriterion: (id, patch) =>
    set((s) => ({ criteria: s.criteria.map((c) => (c.uid === id ? { ...c, ...patch, value: (patch.value ?? c.value) as CriterionValue } : c)) })),
  removeCriterion: (id) => set((s) => ({ criteria: s.criteria.filter((c) => c.uid !== id) })),
  clearJustAdded: () => set({ justAdded: null }),
  loadQuery: (q) => set({ entity: q.entity, countries: q.countries ?? DEFAULT_COUNTRIES, combinator: q.combinator, criteria: q.criteria.map((c) => ({ ...c, uid: uid() })), justAdded: null }),
  reset: () => set({ entity: 'companies', countries: DEFAULT_COUNTRIES, combinator: 'all', criteria: [], justAdded: null }),
}));

export const selectQuery = (s: State): Query => ({ entity: s.entity, countries: s.countries, combinator: s.combinator, criteria: s.criteria });

/** Keep ?q= in sync with the builder, only while on the search page. */
export function syncQueryToUrl() {
  if (typeof window === 'undefined' || window.location.pathname !== '/') return;
  const q = selectQuery(useQuery.getState());
  const defaultScope = q.countries?.join() === DEFAULT_COUNTRIES.join();
  writeQueryParam(q.criteria.length || q.entity !== 'companies' || !defaultScope ? encodeQ(q) : null);
}
useQuery.subscribe(syncQueryToUrl);
