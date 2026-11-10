import type { Company } from '../data/types';
import type { CriterionDef, CriterionValue, DateRange, Operator, Option, PickerNode, Range } from './types';
import { INDUSTRY_BY_ID } from '../data/taxonomies/industries';
import { SIGNAL_TREE, SIGNAL_LABEL } from '../data/taxonomies/signals';
import {
  CH_STATUSES, REGIONS, STAGES, TRACKING, COMPANY_TYPES, LEGAL_FORMS, TARGET_MARKETS, SOCIALS, SIGNIFICANT_EVENTS, SIC_CODES,
} from '../data/taxonomies/misc';
import { slug } from '../data/taxonomies/industries';
import { useCollections } from '../store/collectionsStore';
import { DATA_TODAY } from '../data/generate';
import { allCountries, countryName } from '../data/countries/iso3166';
import { COUNTRY_PROFILES } from '../data/countries/profiles';
import { PEOPLE_DEFS, PEOPLE_PICKER_TREE } from './people';
import { RISK_DEFS, RISK_GROUPS, RISK_PEOPLE } from './risk';

// ---------- operator sets
const SET_OPS: Operator[] = [{ value: 'any', label: 'any' }, { value: 'all', label: 'all' }, { value: 'none', label: 'none' }];
const IS_OPS: Operator[] = [{ value: 'is', label: 'is' }, { value: 'is not', label: 'is not' }];
const TEXT_OPS: Operator[] = [{ value: 'contains', label: 'contains' }, { value: 'does not contain', label: 'does not contain' }];
const RANGE_OPS: Operator[] = [{ value: 'between', label: 'is between' }];
const DATE_OPS: Operator[] = [{ value: 'between', label: 'is between' }];
const BOOL_OPS: Operator[] = [{ value: 'yes', label: 'yes' }, { value: 'no', label: 'no' }];
const EVENT_OPS: Operator[] = [{ value: 'yes', label: 'has occurred' }, { value: 'no', label: 'has not occurred' }];

const opts = (list: readonly string[]): (() => Option[]) => () => list.map((l) => ({ id: l, label: l }));

// ---------- predicate helpers
const arr = (v: CriterionValue) => (Array.isArray(v) ? v : []);
const str = (v: CriterionValue) => (typeof v === 'string' ? v.trim().toLowerCase() : '');

function setMatch(have: string[], op: string, wanted: string[]): boolean {
  if (op === 'all') return wanted.every((w) => have.includes(w));
  if (op === 'none') return !wanted.some((w) => have.includes(w));
  return wanted.some((w) => have.includes(w));
}
function isMatch(have: string | string[], op: string, wanted: string[]): boolean {
  const h = Array.isArray(have) ? have : [have];
  const hit = wanted.some((w) => h.includes(w));
  return op === 'is not' ? !hit : hit;
}
function textMatch(hay: string | string[], op: string, needle: string): boolean {
  const h = (Array.isArray(hay) ? hay.join(' | ') : hay).toLowerCase();
  const hit = h.includes(needle);
  return op === 'does not contain' ? !hit : hit;
}
function inRange(n: number | undefined, v: CriterionValue): boolean {
  const r = (v ?? {}) as Range;
  if (n == null) return false;
  if (r.min != null && n < r.min) return false;
  if (r.max != null && n > r.max) return false;
  return true;
}
function inDates(d: string | undefined, v: CriterionValue): boolean {
  const r = (v ?? {}) as DateRange;
  if (!d) return false;
  if (r.from && d < r.from) return false;
  if (r.to && d > r.to) return false;
  return true;
}
const currentDirectors = (c: Company) => c.directors.filter((d) => !d.resigned);
const STOP = new Set(['that', 'helps', 'their', 'develops', 'with', 'from', 'this', 'and', 'for', 'the']);

// ---------- definitions
const defs: CriterionDef[] = [];
const add = (d: CriterionDef) => { defs.push(d); return d.id; };

function textDef(id: string, label: string, get: (c: Company) => string | string[], extra: Partial<CriterionDef> = {}) {
  return add({ id, label, phrase: label, valueType: 'text', layout: 'one-line', operators: TEXT_OPS, defaultOperator: 'contains',
    predicate: (c, op, v) => textMatch(get(c), op, str(v)), ...extra });
}
function listDef(id: string, label: string, list: readonly string[] | (() => Option[]), get: (c: Company) => string | string[], extra: Partial<CriterionDef> = {}) {
  return add({ id, label, phrase: label, valueType: 'list-popover', layout: 'one-line', operators: IS_OPS, defaultOperator: 'is',
    options: typeof list === 'function' ? list : opts(list), predicate: (c, op, v) => isMatch(get(c), op, arr(v)), ...extra });
}
function rangeDef(id: string, label: string, get: (c: Company) => number | undefined, unit: '£' | '' | 'years' = '', extra: Partial<CriterionDef> = {}) {
  return add({ id, label, phrase: label, valueType: 'range', layout: 'one-line', operators: RANGE_OPS, defaultOperator: 'between', unit,
    predicate: (c, _op, v) => inRange(get(c), v), ...extra });
}
function boolDef(id: string, label: string, get: (c: Company) => boolean, ops = BOOL_OPS, extra: Partial<CriterionDef> = {}) {
  return add({ id, label, phrase: label, valueType: 'boolean', layout: 'one-line', operators: ops, defaultOperator: 'yes',
    predicate: (c, op) => (op === 'yes' ? get(c) : !get(c)), ...extra });
}

// Top-level
const name = textDef('name', 'Name', (c) => c.name);
const regionOptions = (): Option[] => [
  ...REGIONS.map((r) => ({ id: r, label: r, hint: 'United Kingdom' })),
  ...COUNTRY_PROFILES.filter((p) => p.code !== 'GB').flatMap((p) => p.regions.map((r) => ({ id: r.name, label: r.name, hint: countryName(p.code) }))),
];
const location = listDef('location', 'Location', regionOptions, (c) => c.headOffice, { label: 'Region', phrase: 'Head office region' });
const country = listDef('country', 'Country', () => allCountries().map((c) => ({ id: c.code, label: `${c.flag} ${c.name}` })), (c) => c.country, { phrase: 'Head office country', dividerAfter: 2 });
const city = textDef('city', 'City', (c) => c.city, { phrase: 'Head office city' });
const collections = listDef(
  'collections', 'Collections contained in include',
  () => useCollections.getState().collections.map((c) => ({ id: c.id, label: c.name, hint: `${c.companyIds.length}` })),
  () => [],
  {
    phrase: 'Collections contained in include', operators: [{ value: 'is', label: 'any of' }, { value: 'is not', label: 'none of' }],
    predicate: (c, op, v) => {
      const cols = useCollections.getState().collections.filter((col) => arr(v).includes(col.id));
      const hit = cols.some((col) => col.companyIds.includes(c.id));
      return op === 'is not' ? !hit : hit;
    },
  },
);
const stage = listDef('stage', 'Current stage of evolution', STAGES, (c) => c.stage);
const signals = add({
  id: 'signals', label: 'Signals', phrase: 'signals are', connector: 'of', valueType: 'tree-popover', layout: 'two-line',
  operators: SET_OPS, defaultOperator: 'any', tree: SIGNAL_TREE,
  options: () => [...SIGNAL_LABEL].map(([id, label]) => ({ id, label })),
  predicate: (c, op, v) => setMatch(c.signals, op, arr(v)),
});

// Tracking
const tracking = listDef('tracking-status', 'Tracking status', TRACKING, (c) => c.trackingStatus);

// Companies House
const chId = textDef('ch-id', 'Registry ID (e.g. Companies House number)', (c) => c.companiesHouseId, {
  operators: [{ value: 'contains', label: 'is' }, { value: 'does not contain', label: 'is not' }],
});
const chStatus = listDef('ch-status', 'Companies House status', CH_STATUSES, (c) => c.chStatus);

// Company type and structure
const allTypes = () => [...new Set([...COMPANY_TYPES, ...COUNTRY_PROFILES.flatMap((p) => p.legalForms.map((f) => f.type))])].map((t) => ({ id: t, label: t }));
const allForms = () => [...new Set([...LEGAL_FORMS, ...COUNTRY_PROFILES.flatMap((p) => p.legalForms.map((f) => f.form))])].map((t) => ({ id: t, label: t }));
const companyType = listDef('company-type', 'Company type', allTypes, (c) => c.companyType);
const legalForm = listDef('legal-form', 'Legal form', allForms, (c) => c.legalForm);
const isSub = boolDef('is-subsidiary', 'Is subsidiary', (c) => c.isSubsidiary);
const listing = listDef('listing-status', 'Listed / Private', ['Listed', 'Private'], (c) => (c.listed ? 'Listed' : 'Private'), { phrase: 'Company is' });
const exchange = listDef('stock-exchange', 'Stock exchange', () => [...new Set(COUNTRY_PROFILES.flatMap((p) => p.exchanges.map((e) => e.name)))].sort().map((e) => ({ id: e, label: e })), (c) => c.exchange ?? '');

// What the company does
const imports = boolDef('imports', 'Imports', (c) => c.imports, [{ value: 'yes', label: 'does' }, { value: 'no', label: 'does not' }], { phrase: 'Company imports goods' });
const exportsD = boolDef('exports', 'Exports', (c) => c.exports, [{ value: 'yes', label: 'does' }, { value: 'no', label: 'does not' }], { phrase: 'Company exports goods' });
const targetMarkets = listDef('target-markets', 'Target markets', TARGET_MARKETS, (c) => c.targetMarkets, { phrase: 'Target markets', operators: [{ value: 'is', label: 'include' }, { value: 'is not', label: 'exclude' }] });
const industries = add({
  id: 'industries', label: 'Industries and buzzwords', phrase: 'Industries and buzzwords are', connector: 'of',
  valueType: 'tree-modal', layout: 'two-line', operators: SET_OPS, defaultOperator: 'any',
  options: () => [...INDUSTRY_BY_ID.values()].map((i) => ({ id: i.id, label: i.label })),
  predicate: (c, op, v) => setMatch(c.industries, op, arr(v)),
});
const sic = listDef('sic', 'SIC codes (2007)', () => SIC_CODES.map((s) => ({ id: s.code, label: `${s.code} - ${s.label}` })), (c) => c.sicCodes, { phrase: 'SIC codes (2007)', operators: [{ value: 'is', label: 'include' }, { value: 'is not', label: 'exclude' }] });
const description = textDef('description', 'Description', (c) => c.description);
const similar = add({
  id: 'description-similar', label: 'Description is similar to', phrase: 'Description is similar to', valueType: 'text', layout: 'one-line',
  operators: [{ value: 'similar', label: '' }], defaultOperator: 'similar',
  predicate: (c, _op, v) => {
    const words = str(v).split(/\W+/).filter((w) => w.length > 3 && !STOP.has(w));
    if (!words.length) return true;
    const d = c.description.toLowerCase();
    return words.filter((w) => d.includes(w)).length >= Math.max(1, Math.ceil(words.length / 2));
  },
});
const bizDesc = textDef('business-description', 'Business description (from filings)', (c) => c.businessDescription);

// People
const age = (birth: number) => DATA_TODAY.getUTCFullYear() - birth;
const directorName = textDef('director-name', 'Director name', (c) => c.directors.map((d) => d.name));
const previousDirectors = textDef('previous-directors', 'Previous directors', (c) => c.directors.filter((d) => d.resigned).map((d) => d.name), { phrase: 'Previous director name' });
const directorAge = rangeDef('director-age', 'Director age', () => undefined, 'years', {
  predicate: (c, _op, v) => currentDirectors(c).some((d) => inRange(age(d.birthYear), v)),
});
const directorGender = listDef('director-gender', 'Director gender', ['Male', 'Female', 'Unknown'], (c) => currentDirectors(c).map((d) => d.gender), {
  operators: [{ value: 'is', label: 'includes' }, { value: 'is not', label: 'excludes' }],
});
const numDirectors = rangeDef('num-directors', 'Number of directors', (c) => currentDirectors(c).length);
const founderName = textDef('founder-name', 'Founder name', (c) => c.founders.map((f) => f.name));
const founderGender = listDef('founder-gender', 'Founder gender', ['Male', 'Female', 'Unknown'], (c) => c.founders.map((f) => f.gender), {
  operators: [{ value: 'is', label: 'includes' }, { value: 'is not', label: 'excludes' }],
});
const shareholderName = textDef('shareholder-name', 'Shareholder name', (c) => c.shareholders);
const numShareholders = rangeDef('num-shareholders', 'Number of shareholders', (c) => c.shareholders.length);
const employeeCount = rangeDef('employee-count', 'Employee count', (c) => c.employees);
const seniorHires = rangeDef('senior-hires', 'Senior hires', (c) => c.seniorHires, '', { trackedOnly: true });

// Funding received
const totalRaised = rangeDef('total-raised', 'Total amount raised', (c) => (c.fundraisingTotal || undefined), '£');
const latestFund = add({
  id: 'latest-fundraising', label: 'Latest fundraising date', phrase: 'Latest fundraising date', valueType: 'date-range', layout: 'one-line',
  operators: DATE_OPS, defaultOperator: 'between', predicate: (c, _op, v) => inDates(c.latestFundraisingDate, v),
});
const numFund = rangeDef('num-fundraisings', 'Number of fundraisings', (c) => c.fundraisings.length);
const investor = textDef('investor-name', 'Investor name', (c) => c.fundraisings.flatMap((f) => f.investors));

// Significant events (15)
const eventIds = SIGNIFICANT_EVENTS.map((ev) => boolDef(`event-${slug(ev)}`, ev, (c) => c.events.some((e) => e.type === ev), EVENT_OPS));

// Financials
const turnover = rangeDef('turnover', 'Turnover', (c) => c.turnover, '£', { trackedOnly: true });
const employees = rangeDef('employees', 'Employees', (c) => c.employees, '', { trackedOnly: true });
const netAssets = rangeDef('net-assets', 'Net assets', (c) => c.netAssets, '£', { trackedOnly: true });

// Online presence
const hasWebsite = boolDef('has-website', 'Has website', (c) => !!c.website);
const socialProfiles = listDef('social-profiles', 'Social profiles', SOCIALS, (c) => c.socials, { operators: [{ value: 'is', label: 'include' }, { value: 'is not', label: 'exclude' }] });

// Legacy (6)
const legacy = [
  ['legacy-sector', 'Sector (legacy)'], ['legacy-tags', 'Tags (legacy)'], ['legacy-employee-band', 'Employee band (legacy)'],
  ['legacy-growth-score', 'Growth score (legacy)'], ['legacy-region', 'Region (legacy)'], ['legacy-status', 'Archived status (legacy)'],
].map(([id, label]) => textDef(id, label, (c) => `${c.name} ${c.description}`, { legacy: true }));

export const CRITERIA: Record<string, CriterionDef> = Object.fromEntries([...defs, ...PEOPLE_DEFS, ...RISK_DEFS].map((d) => [d.id, d]));

const C = (id: string): PickerNode => ({ kind: 'criterion', id });
const G = (id: string, label: string, children: PickerNode[], legacyFlag = false): PickerNode => ({ kind: 'group', id, label, children, legacy: legacyFlag });

export const PICKER_TREE: PickerNode[] = [
  C(name), G('location', 'Location', [C(country), C(location), C(city)]), C(collections), C(stage), C(signals),
  G('tracking', 'Tracking', [C(tracking)]),
  G('companies-house', 'Companies House', [C(chId), C(chStatus)]),
  G('company-type', 'Company type and structure', [C(listing), C(exchange), C(companyType), C(legalForm), C(isSub)]),
  G('what-the-company-does', 'What the company does', [
    G('commodity', 'Commodity trade activity', [C(imports), C(exportsD)]),
    C(targetMarkets), C(industries), C(sic), C(description), C(similar), C(bizDesc),
  ]),
  G('people', 'People', [C(directorName), ...RISK_PEOPLE.map(C), C(previousDirectors), C(directorAge), C(directorGender), C(numDirectors), C(founderName), C(founderGender), C(shareholderName), C(numShareholders), C(employeeCount), C(seniorHires)]),
  G('funding', 'Funding received', [C(totalRaised), C(latestFund), C(numFund), C(investor)]),
  G('events', 'Significant events', eventIds.map(C)),
  G('financials', 'Financials', [C(turnover), C(employees), C(netAssets)]),
  ...RISK_GROUPS,
  G('online', 'Online presence', [C(hasWebsite), C(socialProfiles)]),
  G('legacy', 'Legacy criteria', legacy.map(C), true),
];

/** Picker tree for the entity in the sentence header. */
export const pickerTreeFor = (entity: string): PickerNode[] => (entity === 'people' ? PEOPLE_PICKER_TREE : PICKER_TREE);

/** Is the criterion value "empty" (row ignored by the query)? */
export function isEmptyValue(def: CriterionDef, v: CriterionValue): boolean {
  switch (def.valueType) {
    case 'boolean': return false;
    case 'text': return !str(v);
    case 'range': { const r = (v ?? {}) as Range; return r.min == null && r.max == null; }
    case 'date-range': { const r = (v ?? {}) as DateRange; return !r.from && !r.to; }
    default: return arr(v).length === 0;
  }
}

export function defaultValue(def: CriterionDef): CriterionValue {
  switch (def.valueType) {
    case 'text': return '';
    case 'range': return { min: null, max: null };
    case 'date-range': return { from: null, to: null };
    case 'boolean': return null;
    default: return [];
  }
}

/** 0 = "None selected", 1 = the label, more = "N selected". */
export function selectionLabel(def: CriterionDef, v: CriterionValue): string {
  const ids = arr(v);
  if (ids.length === 0) return 'None selected';
  if (ids.length === 1) return def.options?.().find((o) => o.id === ids[0])?.label ?? ids[0];
  return `${ids.length} selected`;
}
