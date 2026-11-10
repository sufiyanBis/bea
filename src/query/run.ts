import type { Company } from '../data/types';
import type { Query } from '../criteria/types';
import { CRITERIA, isEmptyValue } from '../criteria/registry';

/** Criteria that actually constrain the query (known def, non-empty value). */
export function activeCriteria(q: Query) {
  return q.criteria.filter((c) => {
    const def = CRITERIA[c.defId];
    return def && !isEmptyValue(def, c.value);
  });
}

/** Countries only constrain the main companies dataset. */
export const countryScope = (q: Query) => ((q.entity === 'companies' || q.entity === 'people') && q.countries?.length ? [...q.countries].sort() : []);

export function queryHash(q: Query): string {
  return JSON.stringify([q.entity, countryScope(q), q.combinator, activeCriteria(q).map((c) => [c.defId, c.op, c.value])]);
}

const cache = new Map<string, Company[]>();

export function run(q: Query, dataset: Company[]): Company[] {
  const key = queryHash(q) + '#' + dataset.length;
  const hit = cache.get(key);
  if (hit) return hit;
  const crit = activeCriteria(q).map((c) => ({ c, def: CRITERIA[c.defId] }));
  const scope = countryScope(q);
  if (scope.length) {
    const set = new Set(scope);
    dataset = dataset.filter((co) => set.has(co.country));
  }
  let out: Company[];
  if (!crit.length) out = dataset;
  else if (q.combinator === 'any') out = dataset.filter((co) => crit.some(({ c, def }) => def.predicate(co, c.op, c.value)));
  else out = dataset.filter((co) => crit.every(({ c, def }) => def.predicate(co, c.op, c.value)));
  if (typeof performance !== 'undefined') performance.mark?.('search:run', { detail: { results: out.length, criteria: crit.length } });
  if (cache.size > 30) cache.delete(cache.keys().next().value!);
  cache.set(key, out);
  return out;
}
