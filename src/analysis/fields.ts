import type { Company } from '../data/types';
import type { ColFormat } from '../export/types';
import { countryName } from '../data/countries/iso3166';
import { INDUSTRY_BY_ID } from '../data/taxonomies/industries';
import { finGrowth, finSeries, finValue, type FinField } from '../data/finIndex';
import { riskOf } from '../data/riskIndex';
import { parentEdge, ultimateParentId } from '../data/groups';
import { getCompany } from '../data/dataset';

export type FieldKind = 'text' | 'money' | 'int' | 'pct' | 'date' | 'ratio';
export interface FieldDef {
  id: string;
  label: string;
  kind: FieldKind;
  get: (c: Company) => string | number | null;
  /** yearly history for GROWTH / CAGR */
  series?: FinField;
  groupable?: boolean;
}

const n = (v: number | undefined | null) => (v == null || !isFinite(v) ? null : v);

/** Every company field available to the analysis grid, formulas, reports and exports. */
export const FIELDS: FieldDef[] = [
  { id: 'name', label: 'Name', kind: 'text', get: (c) => c.name },
  { id: 'country', label: 'Country', kind: 'text', get: (c) => countryName(c.country), groupable: true },
  { id: 'region', label: 'Region', kind: 'text', get: (c) => c.headOffice, groupable: true },
  { id: 'city', label: 'City', kind: 'text', get: (c) => c.city },
  { id: 'industry', label: 'Primary industry', kind: 'text', get: (c) => INDUSTRY_BY_ID.get(c.industries[0])?.label ?? null, groupable: true },
  { id: 'stage', label: 'Stage of evolution', kind: 'text', get: (c) => c.stage, groupable: true },
  { id: 'status', label: 'Register status', kind: 'text', get: (c) => c.chStatus, groupable: true },
  { id: 'listed', label: 'Listed or private', kind: 'text', get: (c) => (c.listed ? 'Listed' : 'Private'), groupable: true },
  { id: 'ticker', label: 'Ticker', kind: 'text', get: (c) => c.ticker ?? null },
  { id: 'legalForm', label: 'Legal form', kind: 'text', get: (c) => c.legalForm, groupable: true },
  { id: 'registryId', label: 'Registry ID', kind: 'text', get: (c) => c.registry.id },
  { id: 'currency', label: 'Reporting currency', kind: 'text', get: (c) => c.currency, groupable: true },
  { id: 'founded', label: 'Founded', kind: 'date', get: (c) => c.foundedDate },
  { id: 'turnover', label: 'Turnover', kind: 'money', get: (c) => n(finValue(c, 'turnover') ?? c.turnover), series: 'turnover' },
  { id: 'operatingProfit', label: 'Operating profit', kind: 'money', get: (c) => n(finValue(c, 'operatingProfit')), series: 'operatingProfit' },
  { id: 'preTaxProfit', label: 'Pre-tax profit', kind: 'money', get: (c) => n(finValue(c, 'preTaxProfit')), series: 'preTaxProfit' },
  { id: 'totalAssets', label: 'Total assets', kind: 'money', get: (c) => n(finValue(c, 'totalAssets')), series: 'totalAssets' },
  { id: 'netAssets', label: 'Net assets', kind: 'money', get: (c) => n(finValue(c, 'netAssets') ?? c.netAssets), series: 'netAssets' },
  { id: 'cash', label: 'Cash', kind: 'money', get: (c) => n(finValue(c, 'cash')), series: 'cash' },
  { id: 'employees', label: 'Employees', kind: 'int', get: (c) => n(finValue(c, 'employees') ?? c.employees), series: 'employees' },
  { id: 'turnoverGrowth1y', label: 'Turnover growth 1y (%)', kind: 'pct', get: (c) => n(finGrowth(c, 'turnover', 1)) },
  { id: 'turnoverGrowth3y', label: 'Turnover growth 3y (%)', kind: 'pct', get: (c) => n(finGrowth(c, 'turnover', 3)) },
  { id: 'fundraisingTotal', label: 'Total raised', kind: 'money', get: (c) => n(c.fundraisingTotal || null) },
  { id: 'fundraisings', label: 'Number of fundraisings', kind: 'int', get: (c) => c.fundraisings.length },
  { id: 'latestFundraising', label: 'Latest fundraising', kind: 'date', get: (c) => c.latestFundraisingDate ?? null },
  { id: 'directors', label: 'Current directors', kind: 'int', get: (c) => c.directors.filter((d) => !d.resigned).length },
  { id: 'shareholders', label: 'Shareholders', kind: 'int', get: (c) => c.shareholders.length },
  { id: 'signals', label: 'Number of signals', kind: 'int', get: (c) => c.signals.length },
  { id: 'creditBand', label: 'Credit rating band', kind: 'text', get: (c) => riskOf(c).band, groupable: true },
  { id: 'riskScore', label: 'Risk score', kind: 'int', get: (c) => riskOf(c).score },
  { id: 'creditLimit', label: 'Credit limit', kind: 'money', get: (c) => riskOf(c).creditLimit },
  { id: 'insolvency', label: 'Insolvency status', kind: 'text', get: (c) => riskOf(c).insolvency ?? 'None', groupable: true },
  { id: 'ccjCount', label: 'CCJs', kind: 'int', get: (c) => riskOf(c).ccjCount },
  { id: 'accountsOverdue', label: 'Accounts overdue', kind: 'text', get: (c) => (riskOf(c).accountsOverdue ? 'Yes' : 'No'), groupable: true },
  { id: 'nextAccountsDue', label: 'Next accounts due', kind: 'date', get: (c) => riskOf(c).nextAccountsDue },
  { id: 'ultimateParent', label: 'Ultimate parent', kind: 'text', get: (c) => (parentEdge(c.id) ? getCompany(ultimateParentId(c.id))?.name ?? null : null) },
  { id: 'ultimateParentCountry', label: 'Ultimate parent country', kind: 'text', get: (c) => (parentEdge(c.id) ? countryName(getCompany(ultimateParentId(c.id))!.country) : null), groupable: true },
  { id: 'website', label: 'Website', kind: 'text', get: (c) => c.website?.replace(/^https?:\/\/(www\.)?/, '') ?? null },
];

export const FIELD_BY_ID: Record<string, FieldDef> = Object.fromEntries(FIELDS.map((f) => [f.id, f]));
export const FIELD_IDS = new Set(FIELDS.map((f) => f.id));

export const fieldSeries = (c: Company, id: string) => { const f = FIELD_BY_ID[id]; return f?.series ? finSeries(c, f.series) : undefined; };

export const kindToFormat = (k: FieldKind): ColFormat => (k === 'money' ? 'gbp' : k);
