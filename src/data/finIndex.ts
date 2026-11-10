/**
 * Light-weight financial history per company (up to 20 years, limited by incorporation date).
 * The company profile builds its full statements from these drivers, and the analysis grid, formulas and
 * financial search criteria read the same numbers, so every surface agrees. Deterministic per company id.
 */
import type { Company } from './types';
import type { YearDriver } from './profile/financials';
import { Rng } from './rng';

export const LUMEN_DRIVERS: YearDriver[] = [
  ['2016-03-31', 0.4e6, -9e6, 0.2e6, 40e6, 14e6, 30e6, 45],
  ['2017-03-31', 2.1e6, -21e6, 0.4e6, 210e6, 38e6, 150e6, 120],
  ['2018-03-31', 9.5e6, -38e6, 0.8e6, 520e6, 61e6, 330e6, 240],
  ['2019-03-31', 38e6, -55e6, 1.2e6, 980e6, 84e6, 610e6, 410],
  ['2020-03-31', 95e6, -48e6, 2e6, 1.6e9, 120e6, 0.9e9, 640],
  ['2021-03-31', 160e6, -31e6, 3e6, 3.4e9, 260e6, 2.1e9, 1050],
  ['2022-03-31', 290e6, 18e6, 4e6, 6.2e9, 430e6, 3.8e9, 1720],
  ['2023-03-31', 466e6, 77e6, 5.5e6, 9.3e9, 655e6, 5.6e9, 2480],
  ['2024-03-31', 880e6, 192e6, 7e6, 13.0e9, 862e6, 7.62e9, 3145],
].map(([yearEnd, turnover, operatingProfit, amortDep, totalAssets, netAssets, cash, employees]) => ({ yearEnd, turnover, operatingProfit, amortDep, totalAssets, netAssets, cash, employees } as YearDriver));

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const cache = new Map<string, YearDriver[]>();

/** Oldest → newest. Empty when the company has no full financials. */
export function finHistory(c: Company): YearDriver[] {
  const hit = cache.get(c.id);
  if (hit) return hit;
  let out: YearDriver[] = [];
  if (c.id === 'lumen-bank') out = LUMEN_DRIVERS;
  else if (c.turnover || c.hasFullFinancials) {
    const r = new Rng(hash(c.id) ^ 0x2545f491);
    const yEnd = r.pick(['03-31', '12-31']);
    const last = yEnd === '12-31' ? 2023 : 2024;
    const founded = Number(c.foundedDate.slice(0, 4));
    // accounts from the first full year after incorporation (never before it), up to 20 years
    const n = Math.min(20, last - founded);
    if (n < 1) { cache.set(c.id, []); return []; }
    const T0 = c.turnover ?? Math.round(r.logNormal(2_000_000, 1));
    const E0 = Math.max(1, c.employees ?? Math.round(T0 / 120_000));
    const trend = -0.05 + r.next() * 0.35;
    const margin = -0.3 + r.next() * 0.5;
    const assetRatio = 0.9 + r.next() * 0.7;
    let T = T0, E = E0;
    const rev: YearDriver[] = [];
    for (let i = 0; i < n; i++) {
      const TA = Math.round(T * assetRatio * (0.95 + r.next() * 0.1));
      rev.push({
        yearEnd: `${last - i}-${yEnd}`, turnover: Math.round(T), operatingProfit: Math.round(T * (margin + (r.next() - 0.5) * 0.08)), amortDep: Math.round(T * 0.02),
        totalAssets: TA, netAssets: Math.round(i === 0 && c.netAssets != null ? c.netAssets : TA * (0.25 + r.next() * 0.1)), cash: Math.round(TA * (0.2 + r.next() * 0.1)),
        employees: Math.max(1, Math.round(E)),
      });
      const g = trend + (r.next() - 0.5) * 0.2;
      T = T / (1 + g);
      E = E / (1 + g * 0.6);
      if (T < 20_000) break;
    }
    out = rev.reverse();
  }
  cache.set(c.id, out);
  return out;
}

export type FinField = 'turnover' | 'operatingProfit' | 'preTaxProfit' | 'totalAssets' | 'netAssets' | 'employees' | 'cash';

const valueOf = (d: YearDriver, f: FinField): number => (f === 'preTaxProfit' ? Math.round(d.operatingProfit * 0.94 - d.totalAssets * 0.004) : d[f as keyof YearDriver] as number);

/** Value of a field in the latest year, or in a specific calendar year of the year-end. */
export function finValue(c: Company, f: FinField, year?: number): number | undefined {
  const h = finHistory(c);
  if (!h.length) return undefined;
  const d = year ? h.find((y) => Number(y.yearEnd.slice(0, 4)) === year) : h[h.length - 1];
  return d ? valueOf(d, f) : undefined;
}

/** Series of a field, oldest → newest. */
export const finSeries = (c: Company, f: FinField) => finHistory(c).map((d) => valueOf(d, f));

/** Percentage growth over `years` (1 = year-on-year). */
export function finGrowth(c: Company, f: FinField, years: number): number | undefined {
  const s = finSeries(c, f);
  if (s.length <= years) return undefined;
  const a = s[s.length - 1], b = s[s.length - 1 - years];
  return b ? ((a - b) / Math.abs(b)) * 100 : undefined;
}

/** Compound annual growth rate (%) over `years`. */
export function finCagr(c: Company, f: FinField, years: number): number | undefined {
  const s = finSeries(c, f);
  if (s.length <= years) return undefined;
  const a = s[s.length - 1], b = s[s.length - 1 - years];
  return a > 0 && b > 0 ? (Math.pow(a / b, 1 / years) - 1) * 100 : undefined;
}

/** First year with accounts (for "data available from"). */
export const finFirstYear = (c: Company) => { const h = finHistory(c); return h.length ? Number(h[0].yearEnd.slice(0, 4)) : undefined; };
