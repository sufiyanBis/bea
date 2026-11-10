import type { Company } from '../data/types';
import type { CompanyProfile, FinYear } from '../data/profile/types';
import { getCompanies } from '../data/dataset';
import { getProfile } from '../data/profile/generateProfile';
import { countryName } from '../data/countries/iso3166';
import { INDUSTRY_BY_ID } from '../data/taxonomies/industries';
import { SIGNAL_LABEL } from '../data/taxonomies/signals';

export type Kind = 'money' | 'int' | 'pct' | 'ratio' | 'text' | 'date';
export type Cell = number | string | null;
export interface Row {
  id: string;
  section: string;
  label: string;
  kind: Kind;
  better?: 'high' | 'low';
  values: Cell[];
  median?: Cell;
  /** names to highlight (shared directors) */
  highlight?: Set<string>;
}
export interface Entry { c: Company; p: CompanyProfile }

/** Financial year a year-end belongs to, aligned to the nearest calendar year (31/03/2024 → FY2023, 31/12/2023 → FY2023). */
export const fyOf = (yearEnd: string) => { const y = Number(yearEnd.slice(0, 4)); const m = Number(yearEnd.slice(5, 7)); return m <= 6 ? y - 1 : y; };
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const yearEndLabel = (yearEnd: string) => `${Number(yearEnd.slice(8, 10))} ${MONTH[Number(yearEnd.slice(5, 7)) - 1]}`;

export function entries(ids: string[]): Entry[] {
  return ids.map((id) => ({ c: getCompanies().find((x) => x.id === id), p: getProfile(id) })).filter((e): e is Entry => !!e.c && !!e.p);
}

/** Up to 3 most recent financial years present in any of the companies. */
export function alignedYears(es: Entry[]): number[] {
  const set = new Set<number>();
  es.forEach((e) => e.p.financials.forEach((y) => set.add(fyOf(y.yearEnd))));
  return [...set].sort((a, b) => b - a).slice(0, 3);
}
const yearFor = (p: CompanyProfile, fy: number): FinYear | undefined => p.financials.find((y) => fyOf(y.yearEnd) === fy);

/** Note shown when the companies' year-ends differ. */
export function periodNote(es: Entry[]): string | null {
  const ends = es.map((e) => (e.p.financials.length ? yearEndLabel(e.p.financials[e.p.financials.length - 1].yearEnd) : null));
  const distinct = new Set(ends.filter(Boolean));
  if (distinct.size <= 1) return null;
  return `Year-ends differ (${es.map((e, i) => (ends[i] ? `${e.c.name}: ${ends[i]}` : `${e.c.name}: no accounts`)).join('; ')}). Figures are aligned to the nearest financial year.`;
}

const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : null);
const median = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

export const FIN_METRICS: { id: string; label: string; kind: Kind; better: 'high' | 'low' }[] = [
  { id: 'turnover', label: 'Turnover', kind: 'money', better: 'high' },
  { id: 'grossProfit', label: 'Gross profit', kind: 'money', better: 'high' },
  { id: 'operatingProfit', label: 'Operating profit', kind: 'money', better: 'high' },
  { id: 'ebitda', label: 'EBITDA', kind: 'money', better: 'high' },
  { id: 'preTaxProfit', label: 'Pre-tax profit', kind: 'money', better: 'high' },
  { id: 'profitAfterTax', label: 'Profit after tax', kind: 'money', better: 'high' },
  { id: 'totalAssets', label: 'Total assets', kind: 'money', better: 'high' },
  { id: 'totalLiabilities', label: 'Total liabilities', kind: 'money', better: 'low' },
  { id: 'netAssets', label: 'Net assets', kind: 'money', better: 'high' },
  { id: 'cash', label: 'Cash', kind: 'money', better: 'high' },
  { id: 'employees', label: 'Employees', kind: 'int', better: 'high' },
];

/** Industry median from the whole dataset for fields that exist on every company record. */
function industryMedian(industry: string | undefined, get: (c: Company) => number | undefined): number | null {
  if (!industry) return null;
  return median(getCompanies().filter((c) => c.industries.includes(industry)).map(get).filter((v): v is number => v != null && v > 0));
}

export function buildRows(es: Entry[]): { rows: Row[]; years: number[]; industry?: string } {
  const years = alignedYears(es);
  const industry = es[0]?.c.industries[0];
  const rows: Row[] = [];
  const R = (r: Omit<Row, 'values'> & { get: (e: Entry) => Cell }) => rows.push({ ...r, values: es.map(r.get) });

  // Overview
  R({ id: 'country', section: 'Overview', label: 'Country', kind: 'text', get: (e) => countryName(e.c.country) });
  R({ id: 'registry', section: 'Overview', label: 'Registry ID', kind: 'text', get: (e) => `${e.c.registry.idLabel}: ${e.c.registry.id}` });
  R({ id: 'legal-form', section: 'Overview', label: 'Legal form', kind: 'text', get: (e) => e.c.companyType });
  R({ id: 'founded', section: 'Overview', label: 'Founded', kind: 'date', get: (e) => e.c.foundedDate });
  R({ id: 'stage', section: 'Overview', label: 'Stage of evolution', kind: 'text', get: (e) => e.c.stage });
  R({ id: 'industries', section: 'Overview', label: 'Industries', kind: 'text', get: (e) => e.c.industries.slice(0, 3).map((i) => INDUSTRY_BY_ID.get(i)?.label ?? i).join(', ') });
  R({ id: 'employees-latest', section: 'Overview', label: 'Employees', kind: 'int', better: 'high', get: (e) => e.c.employees ?? null, median: industryMedian(industry, (c) => c.employees) });
  R({ id: 'listed', section: 'Overview', label: 'Listed or private', kind: 'text', get: (e) => (e.c.listed ? `Listed (${e.c.ticker})` : 'Private') });

  // Financials per aligned year
  for (const m of FIN_METRICS) {
    years.forEach((fy) => R({
      id: `fin-${m.id}-${fy}`, section: 'Financials', label: `${m.label} · FY${fy}`, kind: m.kind, better: m.better,
      get: (e) => num(yearFor(e.p, fy)?.values[m.id]),
      median: fy === years[0] && m.id === 'turnover' ? industryMedian(industry, (c) => c.turnover) : undefined,
    }));
  }

  // Ratios (latest aligned year)
  const fy = years[0];
  const ratio = (e: Entry, a: string, b: string) => { const y = yearFor(e.p, fy)?.values; const x = num(y?.[a]), d = num(y?.[b]); return x != null && d ? (x / d) * 100 : null; };
  R({ id: 'gross-margin', section: 'Ratios', label: 'Gross margin (%)', kind: 'pct', better: 'high', get: (e) => ratio(e, 'grossProfit', 'turnover') });
  R({ id: 'op-margin', section: 'Ratios', label: 'Operating margin (%)', kind: 'pct', better: 'high', get: (e) => ratio(e, 'operatingProfit', 'turnover') });
  R({ id: 'growth', section: 'Ratios', label: 'Turnover growth (%)', kind: 'pct', better: 'high', get: (e) => { const a = num(yearFor(e.p, fy)?.values.turnover), b = num(yearFor(e.p, fy - 1)?.values.turnover); return a != null && b ? ((a - b) / b) * 100 : null; } });
  R({ id: 'current-ratio', section: 'Ratios', label: 'Current ratio', kind: 'ratio', better: 'high', get: (e) => num(yearFor(e.p, fy)?.values.currentRatio) });
  R({ id: 'gearing', section: 'Ratios', label: 'Gearing (%)', kind: 'pct', better: 'low', get: (e) => num(yearFor(e.p, fy)?.values.gearing) });
  R({ id: 'roce', section: 'Ratios', label: 'Return on capital employed (%)', kind: 'pct', better: 'high', get: (e) => num(yearFor(e.p, fy)?.values.roce) });

  // Funding
  R({ id: 'raised', section: 'Funding', label: 'Total raised', kind: 'money', better: 'high', get: (e) => e.c.fundraisingTotal || null, median: industryMedian(industry, (c) => c.fundraisingTotal) });
  R({ id: 'last-round', section: 'Funding', label: 'Last round', kind: 'text', get: (e) => { const f = e.c.fundraisings[e.c.fundraisings.length - 1]; return f ? `${f.date.slice(0, 7)} · ${f.stage}` : null; } });
  R({ id: 'last-round-amount', section: 'Funding', label: 'Last round amount', kind: 'money', better: 'high', get: (e) => e.c.fundraisings[e.c.fundraisings.length - 1]?.amount ?? null });
  R({ id: 'investors', section: 'Funding', label: 'Number of investors', kind: 'int', better: 'high', get: (e) => new Set(e.c.fundraisings.flatMap((f) => f.investors)).size || null });

  // Ownership
  R({ id: 'parent', section: 'Ownership', label: 'Ultimate parent', kind: 'text', get: (e) => (e.p.corporateTree.current ? 'None (top of group)' : e.p.corporateTree.name) });
  R({ id: 'psc', section: 'Ownership', label: 'People with significant control', kind: 'int', get: (e) => e.p.people.psc.length });
  R({ id: 'largest', section: 'Ownership', label: 'Largest shareholder', kind: 'text', get: (e) => {
    const f = e.p.ownership.filings[e.p.ownership.filings.length - 1];
    if (!f) return null;
    const by = new Map<string, number>();
    f.holdings.forEach((h) => by.set(h.shareholder, (by.get(h.shareholder) ?? 0) + h.shares));
    const total = [...by.values()].reduce((s, v) => s + v, 0);
    const [name, shares] = [...by.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
    return name ? `${name} (${((shares! / total) * 100).toFixed(1)}%)` : null;
  } });

  // People (shared directors highlighted)
  const dirSets = es.map((e) => new Set(e.c.directors.filter((d) => !d.resigned).map((d) => d.personId ?? d.name)));
  const shared = new Set<string>();
  dirSets.forEach((s, i) => s.forEach((n) => { if (dirSets.some((o, j) => j !== i && o.has(n))) shared.add(n); }));
  const sharedNames = new Set(es.flatMap((e) => e.c.directors.filter((d) => !d.resigned && shared.has(d.personId ?? d.name)).map((d) => d.name)));
  R({ id: 'directors', section: 'People', label: 'Current directors', kind: 'int', get: (e) => e.c.directors.filter((d) => !d.resigned).length });
  R({ id: 'director-names', section: 'People', label: 'Directors', kind: 'text', highlight: sharedNames, get: (e) => e.c.directors.filter((d) => !d.resigned).map((d) => d.name).join(', ') });
  R({ id: 'key-people', section: 'People', label: 'Key people', kind: 'int', get: (e) => e.p.people.keyPeople.length });

  // Risk
  const RISK = ['risk:late-filing', 'risk:negative-net-assets', 'risk:ccj-registered', 'risk:going-concern-warning', 'risk:director-resignations'];
  R({ id: 'credit', section: 'Risk', label: 'Credit rating', kind: 'text', get: (e) => e.p.credit.rating });
  R({ id: 'credit-limit', section: 'Risk', label: 'Credit limit', kind: 'money', better: 'high', get: (e) => e.p.credit.limit || null });
  R({ id: 'status', section: 'Risk', label: 'Register status', kind: 'text', get: (e) => e.c.chStatus });
  R({ id: 'insolvency', section: 'Risk', label: 'Insolvency or risk flags', kind: 'text', get: (e) => e.c.signals.filter((s) => RISK.includes(s)).map((s) => SIGNAL_LABEL.get(s) ?? s).join(', ') || 'None' });

  // Signals
  R({ id: 'signals', section: 'Signals', label: 'Signals', kind: 'text', get: (e) => e.c.signals.filter((s) => !RISK.includes(s)).map((s) => SIGNAL_LABEL.get(s) ?? s).join(', ') || 'None' });

  return { rows, years, industry: industry ? INDUSTRY_BY_ID.get(industry)?.label : undefined };
}

/** Index of best and worst value in a numeric row (null when not comparable). */
export function bestWorst(r: Row): { best: number; worst: number } | null {
  if (!r.better) return null;
  const nums = r.values.map((v, i) => [v, i] as const).filter((x): x is readonly [number, number] => typeof x[0] === 'number');
  if (nums.length < 2) return null;
  const sorted = [...nums].sort((a, b) => a[0] - b[0]);
  if (sorted[0][0] === sorted[sorted.length - 1][0]) return null;
  const lo = sorted[0][1], hi = sorted[sorted.length - 1][1];
  return r.better === 'high' ? { best: hi, worst: lo } : { best: lo, worst: hi };
}

export const isDifferent = (r: Row) => new Set(r.values.map((v) => (v == null ? '—' : String(v)))).size > 1;
