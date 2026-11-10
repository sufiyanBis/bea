import { COMPANY_COUNT, DATA_SEED } from '../config';
import { generateCompanies, generateSecondary } from './generate';
import { generateInternational, markUkListed } from './international';
import { lumenCompanies } from './fixtures/lumen-bank';
import { assignPersons, getPersons } from './persons';
import type { Company, Entity } from './types';

let companies: Company[] | null = null;
let de: Company[] | null = null;
let funds: Company[] | null = null;
let byId: Map<string, Company> | null = null;

/**
 * The two hand-built demo fixtures, the original 5,000 UK companies (unchanged since part 1),
 * then ~7,400 more across the UK, Ireland and 26 other countries.
 */
export function getCompanies(): Company[] {
  if (!companies) {
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    const names = new Set<string>();
    const fixtures = lumenCompanies();
    fixtures.forEach((c) => names.add(c.name.toLowerCase()));
    const uk = generateCompanies(COMPANY_COUNT, DATA_SEED, { names });
    markUkListed(uk, DATA_SEED + 99);
    companies = [...fixtures, ...uk, ...generateInternational(DATA_SEED + 1000, names)];
    // shared persons table: directors reused across companies (renames directors, keeps gender and birth year)
    assignPersons(companies, new Set(fixtures.map((c) => c.id)));
    if (typeof performance !== 'undefined') performance.mark?.('dataset:ready', { detail: { ms: performance.now() - t0 } });
  }
  return companies;
}

/** The original part 1 dataset (fixtures + first 5,000 UK companies), used by calibration tests. */
export function getOriginalUk(): Company[] {
  return getCompanies().slice(0, COMPANY_COUNT + 2);
}

export function getDataset(entity: Entity): Company[] {
  if (entity === 'people') { getCompanies(); return getPersons() as unknown as Company[]; }
  if (entity === 'de') return (de ??= generateSecondary('de', 400, DATA_SEED + 1));
  if (entity === 'funds') return (funds ??= generateSecondary('funds', 250, DATA_SEED + 2));
  return getCompanies();
}

export function getCompany(id: string): Company | undefined {
  if (!byId) {
    byId = new Map();
    for (const e of ['companies', 'de', 'funds'] as Entity[]) getDataset(e).forEach((c) => byId!.set(c.id, c));
  }
  return byId.get(id);
}
