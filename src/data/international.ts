import {
  Faker, en, base,
  fakerEN_GB, fakerEN_IE, fakerEN_US, fakerDE, fakerFR, fakerNL, fakerES, fakerIT, fakerSV, fakerDA, fakerNB_NO, fakerFI,
  fakerDE_CH, fakerNL_BE, fakerDE_AT, fakerPL, fakerPT_PT, fakerEN_IN, fakerEN_AU, fakerEN_CA, fakerPT_BR, fakerEN_ZA, fakerEN_HK,
} from '@faker-js/faker';
import { Rng } from './rng';
import type { Company } from './types';
import { generateCompanies } from './generate';
import { COUNTRY_PROFILES, CountryProfile, profileOf } from './countries/profiles';

/** Romanised name lists where faker has no Latin-script locale (all names fictional combinations). */
const custom = (male: string[], female: string[], last: string[]) =>
  new Faker({ locale: [{ person: { first_name: { male, female, generic: [...male, ...female] }, last_name: { generic: last } } }, en, base] });

const fakerJP = custom(
  ['Haruto', 'Ren', 'Sota', 'Yuto', 'Kaito', 'Takumi', 'Daiki', 'Kenta', 'Shota', 'Riku', 'Hiroshi', 'Kazuki'],
  ['Yui', 'Aoi', 'Hina', 'Sakura', 'Mei', 'Rin', 'Yuna', 'Haruka', 'Misaki', 'Nanami', 'Emi', 'Kaori'],
  ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato', 'Yoshida', 'Yamada', 'Sasaki', 'Matsumoto', 'Inoue'],
);
const fakerAE = custom(
  ['Omar', 'Khalid', 'Ahmed', 'Yousef', 'Rashid', 'Faisal', 'Hamad', 'Saeed', 'Tariq', 'Majid'],
  ['Fatima', 'Mariam', 'Aisha', 'Noura', 'Layla', 'Hessa', 'Reem', 'Shamma', 'Amna', 'Sara'],
  ['Al Mansoori', 'Al Hashimi', 'Al Suwaidi', 'Al Nuaimi', 'Al Falasi', 'Al Ketbi', 'Al Marri', 'Al Shamsi', 'Haddad', 'Nasser'],
);
const fakerIL = custom(
  ['Noam', 'Itai', 'Yonatan', 'Eitan', 'Omer', 'Ariel', 'Daniel', 'Amit', 'Guy', 'Tomer'],
  ['Noa', 'Tamar', 'Maya', 'Shira', 'Yael', 'Michal', 'Adi', 'Talia', 'Roni', 'Liat'],
  ['Cohen', 'Levi', 'Mizrahi', 'Peretz', 'Biton', 'Friedman', 'Avraham', 'Shapiro', 'Katz', 'Ben-David', 'Golan', 'Segal'],
);
const fakerSG = custom(
  ['Wei Jie', 'Jun Hao', 'Darren', 'Marcus', 'Zhi Hao', 'Ravi', 'Hafiz', 'Kelvin', 'Ethan', 'Jonathan'],
  ['Hui Min', 'Jia Hui', 'Priya', 'Nur Aisyah', 'Rachel', 'Shu Ting', 'Michelle', 'Mei Ling', 'Siti', 'Charlotte'],
  ['Tan', 'Lim', 'Lee', 'Ng', 'Ong', 'Wong', 'Goh', 'Chua', 'Koh', 'Teo', 'Nair', 'Rahman'],
);

const FAKERS: Record<string, Faker> = {
  GB: fakerEN_GB, IE: fakerEN_IE, US: fakerEN_US, DE: fakerDE, FR: fakerFR, NL: fakerNL, ES: fakerES, IT: fakerIT, SE: fakerSV,
  DK: fakerDA, NO: fakerNB_NO, FI: fakerFI, CH: fakerDE_CH, BE: fakerNL_BE, AT: fakerDE_AT, PL: fakerPL, PT: fakerPT_PT, IN: fakerEN_IN,
  SG: fakerSG, JP: fakerJP, AU: fakerEN_AU, CA: fakerEN_CA, AE: fakerAE, IL: fakerIL, BR: fakerPT_BR, ZA: fakerEN_ZA, HK: fakerEN_HK, NZ: fakerEN_AU,
};

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const weighted = <T,>(r: Rng, items: T[], w: (t: T) => number) => r.weighted(items.map((x) => [x, w(x)] as const));

function ticker(name: string, r: Rng, code: string): string {
  const letters = name.replace(/[^A-Za-z]/g, '').toUpperCase();
  const t = (letters.slice(0, 2) + letters.slice(-2 + r.int(0, 1))).slice(0, r.int(3, 4)) || 'XYZ';
  return code === 'JP' || code === 'HK' ? String(r.int(1000, 9999)) : t;
}

/** Turn a generated (UK-shaped) company into a company of `p`'s jurisdiction. Uses its own Rng. */
export function localise(c: Company, p: CountryProfile, r: Rng): Company {
  const region = weighted(r, p.regions, (x) => x.w);
  const form = weighted(r, p.legalForms, (x) => x.weight);
  const base = c.name.replace(/ (Ltd|UK|Group|Global)$/, '');
  const name = /^(Limited|Holdings Limited)$/.test(form.form) ? `${base} ${form.form}` : `${base} ${form.form}`;
  const listed = !!form.listedOnly && r.chance(0.85);
  const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const id = p.registry.id(r);
  const exchange = listed ? r.pick(p.exchanges) : undefined;
  return {
    ...c,
    name,
    country: p.code,
    currency: p.currency,
    headOffice: region.name,
    city: region.city,
    lat: region.lat + (r.next() - 0.5) * 0.35,
    lng: region.lng + (r.next() - 0.5) * 0.5,
    legalForm: form.form,
    companyType: form.type,
    listed,
    exchange: exchange?.name,
    ticker: listed ? `${exchange!.code}: ${ticker(base, r, p.code)}` : undefined,
    companiesHouseId: id,
    registry: { name: p.registry.name, idLabel: p.registry.idLabel, id },
    registryStatus: c.chStatus === 'Active' ? p.activeLabel : c.chStatus,
    website: c.website ? `https://www.${slug || 'company'}.${p.tld}` : undefined,
    description: c.description.replace(`${c.name} `, `${name} `),
    // listed companies are larger
    turnover: listed ? Math.round((c.turnover ?? 20_000_000) * (8 + r.next() * 20)) : c.turnover,
    employees: listed ? Math.round((c.employees ?? 200) * (10 + r.next() * 30)) : c.employees,
    hasFullFinancials: listed || c.hasFullFinancials,
  };
}

/** A few UK companies are listed PLCs (the original 5,000 stay untouched apart from these flags). */
export function markUkListed(list: Company[], seed: number) {
  const r = new Rng(seed);
  const p = profileOf('GB');
  for (const c of list) {
    if (c.legalForm === 'PLC' && r.chance(0.7)) {
      const ex = r.pick(p.exchanges);
      c.listed = true;
      c.exchange = ex.name;
      c.ticker = `${ex.code}: ${ticker(c.name, r, 'GB')}`;
    }
  }
}

/**
 * Everything beyond the original 5,000 UK companies: 1,000 more UK, 1,800 Irish and ~4,600 across 26 other countries.
 * Each country uses its own seed, Rng stream and locale faker, so adding a country never shifts another.
 */
export function generateInternational(seed: number, names: Set<string>): Company[] {
  const out: Company[] = [];
  for (const p of COUNTRY_PROFILES) {
    const count = p.code === 'GB' ? p.count - 5000 : p.count;
    if (count <= 0) continue;
    const cSeed = seed + hash(p.code) % 100_000;
    const prefix = `${p.code.toLowerCase()}-`;
    const list = generateCompanies(count, cSeed, { idPrefix: prefix, names, fk: FAKERS[p.code] });
    const r = new Rng(cSeed + 17);
    const local = p.code === 'GB' ? list : list.map((c) => {
      const l = localise(c, p, r);
      // the legal-form suffix can make two base names collide ("Acme" / "Acme Ltd" -> "Acme GmbH")
      let name = l.name;
      if (names.has(name.toLowerCase())) name = `${c.name} ${c.legalForm === l.legalForm ? '' : l.legalForm}`.trim();
      if (names.has(name.toLowerCase())) name = `${l.name.replace(` ${l.legalForm}`, '')} ${l.city} ${l.legalForm}`;
      names.add(name.toLowerCase());
      return { ...l, name, description: l.description.replace(l.name, name) };
    });
    if (p.code === 'GB') markUkListed(local, cSeed + 1);
    makeShowcase(local[0], r);
    out.push(...local);
  }
  return out;
}

/** The first company of each country (gb-1, ie-1, de-1 …) has data in every profile section, for parity demos. */
function makeShowcase(c: Company, r: Rng) {
  // old enough to have several years of accounts
  if (Number(c.foundedDate.slice(0, 4)) > 2018) c.foundedDate = `${2008 + r.int(0, 8)}${c.foundedDate.slice(4)}`;
  c.hasFullFinancials = true;
  c.turnover ??= Math.round(r.logNormal(18_000_000, 0.8));
  c.employees ??= r.int(60, 900);
  c.netAssets ??= Math.round(c.turnover * 0.3);
  if (!c.fundraisings.length) {
    const date = `${Math.max(Number(c.foundedDate.slice(0, 4)) + 1, 2016)}-0${r.int(1, 9)}-1${r.int(0, 9)}`;
    c.fundraisings = [{ date: date > '2024-09-30' ? '2024-03-12' : date, amount: 2_500_000 + r.int(0, 40) * 50_000, stage: 'Venture', investors: ['Harbourline Ventures', 'Kestrel Capital'] }];
    c.fundraisingTotal = c.fundraisings[0].amount;
    c.latestFundraisingDate = c.fundraisings[0].date;
  }
  c.imports = true;
  c.exports = true;
}
