/**
 * Deterministic profile generator. Every profile is derived from the search-side
 * Company record (so the two views agree), plus a seeded RNG keyed on the company id.
 * Lumen Bank and Harrowmere Group use hand-tuned fixture facts. All names are fictional.
 */
import { fakerEN_GB as faker } from '@faker-js/faker';
import { Rng } from '../rng';
import { getCompanies, getCompany } from '../dataset';
import type { Company, Director } from '../types';
import { INDUSTRY_BY_ID, findGroup } from '../taxonomies/industries';
import { SIG } from '../taxonomies/signals';
import { INVESTORS, Stage } from '../taxonomies/misc';
import { formatMoney, addDays } from '../../lib/format';
import { LUMEN_ID, GROUP_DEMO_ID, LUMEN_INVESTORS, LUMEN_ROUNDS } from '../fixtures/lumen-bank';
import { buildFinancials, YearDriver } from './financials';
import { buildOwnership } from './ownership';
import { localiseProfile } from './localiseProfile';
import { finHistory } from '../finIndex';
import { riskOf } from '../riskIndex';
import { enrichNews } from '../news';
import { groupTree, isGroupMember, pscRegister } from '../groups';
import type {
  ActivityItem, Charge, Commodities, CompanyProfile, CorpNode, Filing, HsItem, Investor, NewsItem, Patent, Person,
  Seg, TimelineEvent, Transaction,
} from './types';

/** "Today" for profile pages (latest Lumen Bank activity is mid-November 2024). */
export const PROFILE_TODAY = '2024-11-15';

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const iso = (d: Date) => d.toISOString().slice(0, 10);
const between = (r: Rng, from: string, to: string) => iso(r.date(new Date(from), new Date(to)));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const FUNCTIONS: Record<string, string[]> = {
  Strategy: ['Chief Strategy Officer', 'Head of Strategy', 'Strategy Director', 'Corporate Development Manager'],
  Technology: ['Chief Technology Officer', 'Head of Engineering', 'Engineering Manager', 'Principal Engineer', 'Head of Data', 'Head of Platform'],
  Finance: ['Chief Financial Officer', 'Finance Director', 'Head of Treasury', 'Financial Controller', 'Head of Investor Relations'],
  Operations: ['Chief Operating Officer', 'Head of Operations', 'Operations Director', 'Head of Procurement'],
  Sales: ['Chief Revenue Officer', 'Head of Sales', 'Sales Director', 'Head of Partnerships'],
  Marketing: ['Chief Marketing Officer', 'Head of Brand', 'Marketing Director', 'Head of Growth'],
  Legal: ['General Counsel', 'Head of Legal', 'Company Secretary'],
  'Human Resources': ['Chief People Officer', 'Head of Talent', 'HR Director'],
  Product: ['Chief Product Officer', 'Head of Product', 'Product Director', 'Principal Product Manager'],
  'Risk & Compliance': ['Chief Risk Officer', 'Head of Compliance', 'Money Laundering Reporting Officer', 'Head of Financial Crime'],
  'Customer Service': ['Head of Customer Service', 'Customer Operations Director'],
};
const FN_NAMES = Object.keys(FUNCTIONS);

const HS: [string, string][] = [
  ['85', 'Electrical machinery and equipment and parts thereof'],
  ['84', 'Nuclear reactors, boilers, machinery and mechanical appliances; parts thereof'],
  ['49', 'Printed books, newspapers, pictures and other products of the printing industry'],
  ['39', 'Plastics and articles thereof'],
  ['90', 'Optical, photographic, measuring, checking and medical instruments'],
  ['48', 'Paper and paperboard; articles of paper pulp, of paper or of paperboard'],
  ['94', 'Furniture; bedding, mattresses, lamps and lighting fittings'],
  ['62', 'Articles of apparel and clothing accessories, not knitted or crocheted'],
  ['30', 'Pharmaceutical products'],
  ['73', 'Articles of iron or steel'],
];
const HS_SUB = ['Parts and accessories', 'Other articles of this heading', 'Cards incorporating an electronic integrated circuit', 'Printed matter, other', 'Assemblies and sub-assemblies'];

const NEWS_SOURCES = ['cityledger.co.uk', 'fintechwire.com', 'thebankingdesk.co.uk', 'startupdaily.uk', 'moneyweekly.co.uk', 'techpulse.news', 'thecapitalreview.com'];

const LOCATIONS: Record<string, { la: string; county: string; lep: string }> = {
  London: { la: 'City of London', county: 'London (Greater)', lep: 'London' },
  'South East': { la: 'Reading', county: 'Berkshire', lep: 'Thames Valley Berkshire' },
  'East of England': { la: 'Cambridge', county: 'Cambridgeshire', lep: 'Cambridgeshire and Peterborough' },
  'North East': { la: 'Newcastle upon Tyne', county: 'Tyne and Wear', lep: 'North East' },
  'North West': { la: 'Manchester', county: 'Greater Manchester', lep: 'Greater Manchester' },
  'Yorkshire and the Humber': { la: 'Leeds', county: 'West Yorkshire', lep: 'Leeds City Region' },
  'East Midlands': { la: 'Nottingham', county: 'Nottinghamshire', lep: 'D2N2' },
  'West Midlands': { la: 'Birmingham', county: 'West Midlands', lep: 'Greater Birmingham and Solihull' },
  'South West': { la: 'Bristol, City of', county: 'Bristol', lep: 'West of England' },
  Wales: { la: 'Cardiff', county: 'Cardiff', lep: 'Cardiff Capital Region' },
  Scotland: { la: 'City of Edinburgh', county: 'Edinburgh', lep: 'Edinburgh and South East Scotland' },
  Tayside: { la: 'Dundee City', county: 'Tayside', lep: 'Tay Cities' },
  'Northern Ireland': { la: 'Belfast', county: 'Antrim', lep: 'Belfast Region' },
};
const STREETS = ['Lantern Yard', 'Copper Row', 'Wharfside Place', 'Mill Lane', 'Kingfisher Court', 'Station Approach', 'Orchard Street', 'Bellfounders Walk'];
const POSTCODES: Record<string, string> = { London: 'EC2A 4BX', 'North West': 'M3 4LZ', Scotland: 'EH2 1QL', Wales: 'CF10 2EH' };

const TECH: [string, string[]][] = [
  ['Document Standards', ['HTML5', 'SVG', 'Open Graph', 'PDF']],
  ['Frameworks', ['React', 'Next.js', 'Tailwind CSS', 'Django', 'Ruby on Rails']],
  ['JavaScript Libraries and Functions', ['Lodash', 'Axios', 'D3', 'Moment.js', 'Core-js']],
  ['Mobile', ['Swift', 'Kotlin', 'Flutter', 'React Native']],
  ['Analytics and Tracking', ['Server-side analytics', 'Tag manager', 'Heatmaps']],
  ['Hosting', ['Cloud hosting', 'Content delivery network']],
];

const STAGE_ORDER: Stage[] = ['Seed', 'Venture', 'Growth', 'Established'];

const cache = new Map<string, CompanyProfile>();

export function getProfile(id: string): CompanyProfile | null {
  const hit = cache.get(id);
  if (hit) return hit;
  const c = getCompany(id);
  if (!c) return null;
  const p = c.country && c.country !== 'GB' ? localiseProfile(build(c), c) : build(c);
  // group members get the cross-border group tree (with % on each edge) and a PSC register
  if (isGroupMember(c.id)) p.corporateTree = groupTree(c.id);
  p.news = enrichNews(p.news);
  p.people.psc = pscRegister(c, p).filter((x) => x.kind === 'individual').map((x, i) => ({ id: `${c.id}-psc-${i}`, name: x.name, position: x.natures[0], fn: 'Ownership', linkedin: false, degree: null, appointed: x.notified, resigned: x.ceased }));
  cache.set(id, p);
  return p;
}

function build(c: Company): CompanyProfile {
  const isLumen = c.id === LUMEN_ID;
  const isGroup = c.id === GROUP_DEMO_ID;
  /** first company of each seeded country (gb1, ie1, de1 …) has data in every section, for parity demos */
  const showcase = /^[a-z]{2}-1$/.test(c.id);
  const seed = hash(c.id);
  const r = new Rng(seed);
  faker.seed(seed);
  const domain = c.website?.replace(/^https?:\/\/(www\.)?/, '') ?? `${c.name.toLowerCase().replace(/[^a-z0-9]+/g, '')}.co.uk`;
  const registeredName = isLumen ? 'Lumen Bank Holding Group Limited' : `${c.name.replace(/ (Ltd|UK|Group|Global|Limited)$/i, '')} ${isGroup ? 'Group Holdings Limited' : 'Limited'}`;
  const personName = () => `${faker.person.firstName()} ${faker.person.lastName()}`;
  const emailFor = (name: string) => `${name.toLowerCase().replace(/[^a-z ]/g, '').trim().replace(/\s+/g, '.')}@${domain}`;

  // ---------------- stage periods
  const stagePeriods = buildStages(c, r, isLumen);
  const stageAt = (date: string): Stage => {
    let s = stagePeriods[0].stage;
    for (const p of stagePeriods) if (p.from <= date) s = p.stage;
    return s;
  };

  // ---------------- people
  const degree = (): Person['degree'] => (r.chance(0.03) ? '1st' : r.chance(0.26) ? '2nd' : null);
  const fromDirector = (d: Director, i: number): Person => ({
    id: `${c.id}-dir-${i}`, name: d.name, position: 'Director', fn: 'Board', linkedin: r.chance(0.7), degree: degree(),
    age: 2024 - d.birthYear, appointed: d.appointed, resigned: d.resigned, email: r.chance(0.5) ? emailFor(d.name) : undefined,
  });
  const directors = c.directors.filter((d) => !d.resigned).map(fromDirector);
  const previousDirectors = c.directors.filter((d) => d.resigned).map((d, i) => fromDirector(d, i + 100));

  const keyCount = isLumen ? 60 : Math.max(3, Math.min(40, Math.round(Math.sqrt(c.employees ?? 6) * 1.6)));
  const keyPeople: Person[] = [];
  const ceoName = directors[0]?.name ?? c.founders[0]?.name ?? personName();
  keyPeople.push({ id: `${c.id}-kp-0`, name: ceoName, position: isLumen ? 'Global Chief Executive Officer' : 'Chief Executive Officer', fn: 'Strategy', linkedin: true, degree: isLumen ? '1st' : degree(), email: emailFor(ceoName) });
  for (let i = 1; i < keyCount; i++) {
    const fn = i < FN_NAMES.length + 1 ? FN_NAMES[i - 1] : r.pick(FN_NAMES);
    const name = i < directors.length && i < 4 ? directors[i].name : personName();
    keyPeople.push({
      id: `${c.id}-kp-${i}`, name, position: i < FN_NAMES.length + 1 ? FUNCTIONS[fn][0] : r.pick(FUNCTIONS[fn]), fn,
      linkedin: r.chance(0.85), degree: isLumen && i === 7 ? '1st' : degree(), email: r.chance(0.8) ? emailFor(name) : undefined,
    });
  }
  const prevCount = isLumen ? 80 : Math.round(keyCount * 0.6);
  const previousKeyPeople: Person[] = Array.from({ length: prevCount }, (_, i) => {
    const fn = r.pick(FN_NAMES);
    return { id: `${c.id}-pkp-${i}`, name: personName(), position: r.pick(FUNCTIONS[fn]), fn, linkedin: r.chance(0.6), degree: degree() };
  });
  const secretaries: Person[] = isLumen
    ? [{ id: `${c.id}-sec-0`, name: 'Harriet Okonjo-Bell', position: 'Secretary', fn: 'Legal', linkedin: false, degree: null, appointed: '2020-06-29' }]
    : r.chance(0.3) ? [{ id: `${c.id}-sec-0`, name: personName(), position: 'Secretary', fn: 'Legal', linkedin: false, degree: null, appointed: between(r, c.foundedDate, '2024-06-01') }] : [];
  const connections = {
    first: keyPeople.filter((p) => p.degree === '1st').length,
    second: isLumen ? 122 : keyPeople.filter((p) => p.degree === '2nd').length * 3 + r.int(0, 9),
  };

  // ---------------- transactions
  const lookupInvestor = (name: string, followOn: boolean): Investor => {
    const known = LUMEN_INVESTORS.find((x) => x.name === name);
    if (known) return { ...known, followOn };
    const h = hash(name);
    return { name, country: ['GB', 'GB', 'GB', 'US', 'DE', 'NL'][h % 6], hasProfile: h % 10 < 7, followOn };
  };
  const rounds = isLumen ? LUMEN_ROUNDS : c.fundraisings.map((f) => {
    const mult = f.stage === 'Seed' ? 3 + r.next() * 2 : f.stage === 'Venture' ? 4 + r.next() * 3 : 6 + r.next() * 4;
    return { ...f, preMoney: Math.round(f.amount * mult / 1000) * 1000 };
  });
  const seen = new Set<string>();
  const transactions: Transaction[] = rounds.map((f, i) => {
    const names = [...f.investors, ...(isLumen && i < 2 ? ['Business Angel(s)'] : [])];
    const undisclosed = !isLumen && r.chance(0.08);
    const investors = undisclosed ? [] : names.map((n) => { const inv = lookupInvestor(n, seen.has(n)); seen.add(n); return n === 'Business Angel(s)' ? { ...inv, country: 'GB', hasProfile: false } : inv; });
    const stakePct = Math.round((f.amount / (f.preMoney + f.amount)) * 1000) / 10;
    return {
      id: `${c.id}-tx-f${i}`, type: 'fundraising', label: `Equity fundraising for a ${Math.round(stakePct)}% stake`, stakePct, investors, undisclosed,
      announced: isLumen ? (i > 9 ? f.amount : undefined) ?? (r.chance(0.5) ? f.amount : undefined) : r.chance(0.6) ? f.amount : undefined,
      verified: isLumen || r.chance(0.85) ? f.amount : undefined,
      stage: f.stage === 'Seed' ? 'Seed' : f.stage === 'Venture' ? 'Venture' : stageAt(f.date) === 'Established' ? 'Established' : 'Growth',
      date: f.date, preMoney: f.preMoney,
    };
  });
  const grantInvestor = (): Investor => ({ name: 'Innovate Region Fund', country: 'GB', hasProfile: true });
  if (isLumen) {
    transactions.push({ id: `${c.id}-tx-g0`, type: 'grant', label: 'Received a grant', investors: [grantInvestor()], verified: 2_500, stage: 'Seed', date: '2016-01-20' });
    transactions.push({ id: `${c.id}-tx-g1`, type: 'grant', label: 'Received a grant', investors: [grantInvestor()], verified: 2_500, stage: 'Venture', date: '2017-10-05' });
  } else if (c.signals.includes('innovation:grant-received')) {
    for (let i = 0; i < r.int(1, 2); i++) {
      const date = between(r, c.foundedDate, PROFILE_TODAY);
      transactions.push({ id: `${c.id}-tx-g${i}`, type: 'grant', label: 'Received a grant', investors: [grantInvestor()], verified: r.int(5, 500) * 1000, stage: stageAt(date), date });
    }
  }
  if (c.signals.includes(SIG.mbo)) {
    const date = between(r, c.foundedDate, PROFILE_TODAY);
    transactions.push({ id: `${c.id}-tx-m`, type: 'mbo', label: 'Management buyout', investors: [{ name: 'Management team', country: 'GB', hasProfile: false }], announced: r.int(1, 30) * 100_000, stage: stageAt(date), date });
  }
  if (c.signals.includes(SIG.acquired)) {
    const buyer = r.pick(getCompanies()).name;
    const date = between(r, c.foundedDate, PROFILE_TODAY);
    transactions.push({ id: `${c.id}-tx-a`, type: 'acquisition', label: `Acquired by ${buyer}`, investors: [{ name: buyer, country: 'GB', hasProfile: true }], stage: stageAt(date), date });
  }
  if (c.signals.includes('innovation:academic-spinout')) {
    transactions.push({ id: `${c.id}-tx-s`, type: 'spinout', label: 'Spun out of a university', investors: [{ name: 'University of Eastmoor', country: 'GB', hasProfile: false }], stage: 'Seed', date: c.foundedDate });
  }
  transactions.sort((a, b) => (a.date < b.date ? 1 : -1));

  // ---------------- accelerators / high growth lists
  const accelerators = isLumen
    ? [{ name: 'Foundry Launchpad', start: '2015-09-01', end: '2015-12-11' }, { name: 'CityBridge FinTech Lab', start: '2016-05-09', end: '2016-08-19' }]
    : c.signals.includes(SIG.accelerator) ? [(() => { const s = between(r, c.foundedDate, PROFILE_TODAY); return { name: r.pick(['Foundry Launchpad', 'Northern Spark', 'Catalyst Works', 'Tidal Accelerator']), start: s, end: addDays(s, 90) }; })()] : [];
  const highGrowthLists = isLumen
    ? [{ name: 'UK Fast Growth 100', cohort: '2021', announced: '2021-11-10' }, { name: 'Challenger 50', cohort: '2023', announced: '2023-06-14' }]
    : c.signals.includes(SIG.highGrowth) ? [(() => { const a = between(r, '2019-01-01', PROFILE_TODAY); return { name: 'UK Fast Growth 100', cohort: a.slice(0, 4), announced: a }; })()] : [];

  // ---------------- filings (full list feeds the timeline; the section shows the latest 40 for Lumen)
  const allFilings: Filing[] = [];
  const F = (date: string, code: string, category: string, lead: string, rest: string, bullets?: string[]) =>
    allFilings.push({ id: `${c.id}-fl-${allFilings.length}`, date, code, category, lead, rest, bullets });
  F(c.foundedDate, 'NEWINC', 'Incorporation', 'Incorporation', 'of a private limited company');
  c.directors.forEach((d) => {
    if (d.appointed > c.foundedDate) F(d.appointed, 'AP01', 'Officers', `Appointment of ${d.name}`, 'as a director');
    if (d.resigned) F(d.resigned, 'TM01', 'Officers', `Termination of appointment of ${d.name}`, `as a director on ${d.resigned}`);
    if (r.chance(0.3)) F(between(r, d.appointed, d.resigned ?? PROFILE_TODAY), 'CH01', 'Officers', `Director's details changed for ${d.name}`, 'on change of service address');
  });
  const firstYear = Number(c.foundedDate.slice(0, 4)) + 1;
  for (let y = firstYear; y <= 2024; y++) {
    F(`${y}-02-${String(r.int(10, 28)).padStart(2, '0')}`, 'CS01', 'Annual Return / Confirmation Statement', 'Confirmation statement', `made on ${y}-02-05 with updates`);
    if (y > firstYear) F(`${y}-${isLumen ? '07' : '11'}-${String(r.int(1, 28)).padStart(2, '0')}`, 'AA', 'Accounts', isLumen ? 'Group of companies\' accounts' : 'Total exemption full accounts', `made up to 31 March ${y}`);
  }
  rounds.forEach((f) => {
    F(addDays(f.date, 7), 'RESOLUTIONS', 'Resolution', 'Resolutions', '', ['Resolution of allotment of securities', 'Resolution of removal of pre-emption rights', 'Resolution of adoption of Articles of Association']);
    F(addDays(f.date, 14), 'SH01', 'Capital', 'Statement of capital following an allotment of shares', `on ${f.date}`);
    if (r.chance(0.3)) F(addDays(f.date, 9), 'MA', 'Miscellaneous', 'Memorandum and Articles of Association', '');
  });
  if (r.chance(0.7)) F(between(r, c.foundedDate, '2020-01-01'), 'AD01', 'Address', 'Registered office address changed', `to ${r.int(1, 90)} ${r.pick(STREETS)}`);
  if (isLumen || r.chance(0.2)) F(between(r, '2019-01-01', '2023-01-01'), 'AA01', 'Accounts', 'Previous accounting period shortened', 'from 30 April to 31 March');
  const charges: Charge[] = !isLumen && (r.chance(0.12) || showcase || c.signals.includes('risk:ccj-registered'))
    ? Array.from({ length: r.int(1, 3) }, () => {
        const created = between(r, c.foundedDate, PROFILE_TODAY);
        F(addDays(created, 10), 'MR01', 'Mortgage', 'Registration of charge', `created on ${created}`);
        return { created, delivered: addDays(created, 10), status: r.chance(0.7) ? 'Outstanding' : 'Satisfied', entitled: r.pick(['Thameside Bank PLC', 'Northern Commercial Finance Limited', 'Quayline Lending Limited']), description: 'Contains fixed charge. Contains floating charge. Contains negative pledge.' };
      })
    : [];
  allFilings.sort((a, b) => (a.date < b.date ? 1 : -1));
  const filings = (isLumen ? allFilings.slice(0, 40) : allFilings.slice(0, 60)).filter((f) => f.date <= PROFILE_TODAY);

  // ---------------- news
  const news: NewsItem[] = [];
  const others = getCompanies();
  const headline = (date: string): string => {
    const y = date.slice(0, 4);
    return r.pick([
      `${c.name} reports record customer growth in ${y}`,
      `${c.name} launches new service for small businesses`,
      `${c.name} named among the UK's fastest-growing companies`,
      `Why ${c.name} is betting on ${r.pick(['automation', 'small businesses', 'the regions', 'open banking', 'sustainability'])}`,
      `${c.name} appoints ${personName()} as ${r.pick(['chief financial officer', 'chief operating officer', 'chair', 'head of product'])}`,
      `${c.name} expands into ${r.pick(['Manchester', 'Leeds', 'Edinburgh', 'Bristol', 'Dublin'])}`,
      `${c.name} ${r.pick(['posts', 'reports'])} ${r.pick(['strong', 'record', 'improved'])} annual results`,
      `${c.name} partners with ${r.pick(others).name}`,
      `${c.name} hits ${r.int(1, 9)} million ${isLumen ? 'customers' : 'users'}`,
      `Regulator sets out new rules affecting ${c.name} and its peers`,
    ]);
  };
  rounds.forEach((f, i) => news.push({ id: `${c.id}-n-f${i}`, headline: `${c.name} raises ${formatMoney(f.amount)} ${f.investors[0] ? `led by ${f.investors[0]}` : ''}`.trim(), source: r.pick(NEWS_SOURCES), date: addDays(f.date, 1), tagged: [c.id] }));
  const newsCount = isLumen ? 378 : Math.min(40, c.fundraisings.length * 2 + r.int(0, 6));
  const newsFrom = isLumen ? '2016-01-01' : c.foundedDate;
  while (news.length < newsCount) {
    const date = isLumen && news.length === rounds.length ? '2024-11-13' : between(r, r.chance(0.6) ? '2021-01-01' > newsFrom ? '2021-01-01' : newsFrom : newsFrom, PROFILE_TODAY);
    const tagged = [c.id, ...(r.chance(0.2) ? [r.pick(others).id] : [])].filter((x, i, a) => a.indexOf(x) === i);
    news.push({ id: `${c.id}-n-${news.length}`, headline: headline(date), source: r.pick(NEWS_SOURCES), date, tagged });
  }
  news.sort((a, b) => (a.date < b.date ? 1 : -1));

  // ---------------- timeline
  const timeline: TimelineEvent[] = [];
  const T = (e: Omit<TimelineEvent, 'id' | 'stage'>) => timeline.push({ ...e, id: `${c.id}-tl-${timeline.length}`, stage: stageAt(e.date) });
  const altEstablishmentDate = isLumen ? '2014-11-03' : addDays(c.foundedDate, -r.int(30, 200));
  T({ date: c.foundedDate, type: 'Incorporation', letter: 'I', significant: false, parts: ['Incorporated at Companies House as ', { t: registeredName, kind: 'company', id: c.id }] });
  T({ date: altEstablishmentDate, type: 'Establishment', letter: 'E', significant: true, parts: ['Established as a business, before incorporation'], detail: [['Date', altEstablishmentDate], ['Source', 'Company website']] });
  stagePeriods.slice(1).forEach((p) => T({ date: p.from, type: 'Stage of evolution', letter: null, significant: false, parts: ['Stage of evolution changed to ', { t: p.stage, kind: 'company', id: c.id }] }));
  transactions.forEach((t) => {
    if (t.type === 'fundraising') {
      const inv: Seg[] = t.investors.length ? t.investors.flatMap((x, i) => [...(i ? [', '] : []), { t: x.name, kind: 'investor' as const }]) : ['undisclosed investors'];
      T({
        date: t.date, type: 'New fundraising', letter: 'F', significant: true,
        parts: [`Secured an equity fundraising: announced ${formatMoney(t.announced ?? t.verified)} was verified for a ${Math.round(t.stakePct ?? 0)}% stake`],
        sub: [`${formatMoney(t.preMoney)} pre-money - with `, ...inv],
        detail: [['Amount', formatMoney(t.verified ?? t.announced)], ['Stake', `${t.stakePct}%`], ['Pre-money valuation', formatMoney(t.preMoney)], ['Stage', t.stage], ['Investors', t.investors.map((x) => x.name).join(', ') || 'Undisclosed']],
      });
    } else if (t.type === 'grant') {
      T({ date: t.date, type: 'Grant', letter: 'G', significant: true, parts: [`Received a grant of ${formatMoney(t.verified)} from `, { t: t.investors[0].name, kind: 'investor' }], detail: [['Amount', formatMoney(t.verified)], ['Awarded by', t.investors[0].name]] });
    }
  });
  accelerators.forEach((a) => T({ date: a.start, type: 'Accelerator', letter: 'A', significant: true, parts: ['Started the ', { t: a.name, kind: 'company' }, ' accelerator programme'], detail: [['Programme', a.name], ['Start', a.start], ['End', a.end]] }));
  highGrowthLists.forEach((h) => T({ date: h.announced, type: 'High growth list', letter: 'L', significant: true, parts: ['Named on the ', { t: `${h.name} (${h.cohort})`, kind: 'article' }, ' high growth list'], detail: [['List', h.name], ['Cohort', h.cohort]] }));
  c.directors.forEach((d) => {
    T({ date: d.appointed, type: 'Person added', letter: null, significant: false, parts: [{ t: d.name, kind: 'person', id: d.personId }, ' was appointed as a director'] });
    if (d.resigned) T({ date: d.resigned, type: 'Person removed', letter: null, significant: false, parts: [{ t: d.name, kind: 'person', id: d.personId }, ' resigned as a director'] });
  });
  allFilings.forEach((f) => {
    if (f.code === 'RESOLUTIONS') T({ date: f.date, type: 'Resolution', letter: 'R', significant: false, parts: ['Filed ', { t: 'RESOLUTIONS', kind: 'filing' }, ` on ${f.date}`] });
    if (f.code === 'SH01') T({ date: f.date, type: 'Capital', letter: 'C', significant: false, parts: ['Filed ', { t: 'SH01', kind: 'filing' }, ` on ${f.date}: statement of capital following an allotment of shares`] });
    if (f.code === 'AA') T({ date: f.date, type: 'Accounts', letter: null, significant: false, parts: ['Filed ', { t: 'AA', kind: 'filing' }, ` on ${f.date}: ${f.lead.toLowerCase()} ${f.rest}`] });
  });
  const newsForTimeline = isLumen ? news.filter((_, i) => i % 6 === 0).slice(0, Math.max(0, 150 - timeline.length)) : news;
  newsForTimeline.forEach((n) => T({ date: n.date, type: 'News', letter: null, significant: false, parts: ['Featured in ', { t: `"${n.headline}"`, kind: 'article' }, ` via ${n.source}`] }));
  timeline.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const timelineClean = timeline.filter((e) => e.date <= PROFILE_TODAY);

  // ---------------- recent activity
  const since = isLumen ? '2023-06-01' : addDays(PROFILE_TODAY, -730);
  const activity: ActivityItem[] = [];
  const A = (eventDate: string, type: ActivityItem['type'], parts: Seg[], lag = r.int(0, 9)) => {
    const latest = isLumen ? '2024-11-13' : PROFILE_TODAY;
    const added = addDays(eventDate, lag) > latest ? latest : addDays(eventDate, lag);
    activity.push({ id: `${c.id}-ac-${activity.length}`, added, type, parts, eventDate });
  };
  timelineClean.filter((e) => e.date >= since).forEach((e) => {
    if (e.type === 'News') A(e.date, 'News', [e.parts[1] as Seg]);
    else if (e.type === 'Person added') A(e.date, 'Officers/Directors', e.parts);
    else if (e.type === 'Person removed') A(e.date, 'Person removed', e.parts);
    else if (e.type === 'Resolution') A(e.date, 'Resolution', e.parts);
    else if (e.type === 'Capital') A(e.date, 'Capital', e.parts);
    else if (e.type === 'Accounts') A(e.date, 'Accounts/Financials', e.parts);
    else if (e.type === 'New fundraising') {
      A(e.date, 'Fundraising amount added', ['Fundraising amount added: ', ...e.parts], 2);
      A(e.date, 'Fundraising source added', ['Source added for fundraising on ', { t: e.date, kind: 'article' }], 5);
      A(e.date, 'Fundraising valuation changed', ['Pre-money valuation updated: ', ...(e.sub ?? []).slice(0, 1)], 8);
    }
  });
  keyPeople.slice(1, isLumen ? 14 : 3).forEach((p) => A(between(r, since, PROFILE_TODAY), 'Person added', [{ t: p.name, kind: 'person' }, ` was added as ${p.position}`]));
  for (let d = since; d <= PROFILE_TODAY; d = addDays(d, 92)) A(d, 'Credit rating', ['Credit rating updated to ', { t: isLumen ? 'A (92/100)' : r.pick(['B (61/100)', 'C (45/100)', 'A (81/100)']), kind: 'article' }], 3);
  activity.sort((a, b) => (a.added < b.added ? 1 : a.added > b.added ? -1 : 0));

  // ---------------- ownership
  const totalRaised = rounds.reduce((s, f) => s + f.amount, 0);
  const classes = isLumen
    ? [
        { name: 'ORDINARY', holders: 267, shares: 98_400_000 }, { name: 'ORDINARY A', holders: 42, shares: 21_300_000 },
        { name: 'ORDINARY B', holders: 36, shares: 17_850_000 }, { name: 'ORDINARY C', holders: 28, shares: 14_200_000 },
        { name: 'ORDINARY D', holders: 24, shares: 11_900_000 }, { name: 'ORDINARY E', holders: 19, shares: 10_100_000 },
        { name: 'ORDINARY F', holders: 14, shares: 8_300_000 }, { name: 'ORDINARY G', holders: 11, shares: 6_500_000 },
        { name: 'ORDINARY H', holders: 9, shares: 4_603_514 },
      ]
    : [{ name: 'ORDINARY', holders: r.int(3, 30), shares: r.int(1, 100) * 10_000 }, ...(rounds.length > 1 ? [{ name: 'ORDINARY A', holders: r.int(2, 10), shares: r.int(1, 40) * 10_000 }] : [])];
  const investorNames = rounds.flatMap((f) => f.investors);
  const anchors: [string, boolean][] = [
    ...c.founders.map((f) => [f.name, true] as [string, boolean]),
    ...[...new Set(investorNames)].slice(0, 6).map((n) => [n, false] as [string, boolean]),
  ];
  const ownershipFilings = buildOwnership(r, {
    classes,
    anchors,
    personName,
    companyNames: [...new Set([...investorNames, ...INVESTORS.slice(0, 6), `${c.name} Employee Benefit Trust`, 'Quayline Nominees Limited'])],
    dates: isLumen ? ['2022-04-12', '2023-02-27', '2024-02-29'] : ((n) => Array.from({ length: n }, (_, i) => `${2024 - n + 1 + i}-02-14`))(Math.min(20, Math.max(2, 2024 - Number(c.foundedDate.slice(0, 4))))),
  });
  const totalShares = classes.reduce((s, x) => s + x.shares, 0);
  const lastRound = rounds[rounds.length - 1];
  const pricePerShare = lastRound ? (lastRound.preMoney + lastRound.amount) / totalShares : Math.max(0.01, (c.netAssets ?? 100_000) / totalShares);

  // ---------------- corporate tree
  const corporateTree = buildTree(c, r, registeredName, isLumen, isGroup);

  // ---------------- commodities
  const commodities = isLumen || showcase || c.imports || c.exports ? buildCommodities(r, isLumen ? 5 : c.imports || showcase ? r.int(1, 6) : 0, isLumen ? 2 : c.exports || showcase ? r.int(1, 4) : 0) : null;

  // ---------------- financials
  // shared with the analysis grid and financial search criteria (see data/finIndex.ts)
  const drivers: YearDriver[] = finHistory(c);
  const financials = drivers.length
    ? buildFinancials(drivers, { totalRaised, exportShare: c.exports ? 0.08 : 0, bank: isLumen, auditors: isLumen ? 'Harrowgate & Finch LLP' : r.pick(['Pemberton Reeve LLP', 'Calder & Moss LLP', 'Ashby Rowe Audit LLP']), seniorAuditor: isLumen ? 'Philippa Arkwright' : personName(), consolidated: isLumen || isGroup })
    : [];

  const credit = {
    rating: isLumen ? 'A (92/100) Very low risk' : (r.next(), riskOf(c).rating),
    limit: isLumen ? 5_000_000 : riskOf(c).creditLimit,
    updated: isLumen ? '2024-10-02' : between(r, '2024-01-01', PROFILE_TODAY),
    auditors: financials.length ? String(financials[financials.length - 1].values.auditors) : '—',
    seniorAuditor: financials.length ? String(financials[financials.length - 1].values.seniorAuditor) : '—',
    accountsDate: financials.length ? financials[financials.length - 1].yearEnd : '—',
    accountType: isLumen || isGroup ? 'Group' : financials.length ? 'Full' : 'Micro-entity',
  };

  // ---------------- patents
  const patents: Patent[] = (c.signals.includes('innovation:patent-filed') || showcase) && !isLumen
    ? Array.from({ length: r.int(1, 4) }, (_, i) => ({
        title: `${cap(r.pick(['system', 'method', 'apparatus', 'device']))} for ${r.pick(['processing sensor data', 'secure payments', 'image recognition', 'battery management', 'route optimisation'])}`,
        applicationNo: `GB${r.int(2015, 2024)}${String(r.int(1000, 99999)).padStart(5, '0')}.${i}`,
        filed: between(r, c.foundedDate, PROFILE_TODAY), status: r.pick(['Granted', 'Pending', 'Published']), jurisdiction: r.pick(['GB', 'EP', 'US', 'WO']),
      }))
    : [];

  // ---------------- meta
  const loc = LOCATIONS[c.headOffice] ?? { la: c.headOffice, county: c.headOffice, lep: c.headOffice };
  const street = isLumen ? '1 Lantern Yard' : `${r.int(1, 120)} ${r.pick(STREETS)}`;
  const town = c.headOffice === 'London' ? 'London' : loc.la.replace(/, City of$/, '');
  const headOffice = [street, town, POSTCODES[c.headOffice] ?? `${town.slice(0, 2).toUpperCase()}${r.int(1, 20)} ${r.int(1, 9)}${String.fromCharCode(65 + r.int(0, 25))}${String.fromCharCode(65 + r.int(0, 25))}`, 'United Kingdom'];
  const sectors = [...new Set(c.industries.map((id) => findGroup(INDUSTRY_BY_ID.get(id)?.groups[0]?.split('/')[0] ?? '')?.label).filter(Boolean) as string[])];

  return {
    id: c.id,
    tradingName: c.name,
    registeredName,
    legalForm: c.companyType,
    smeStatus: (c.employees ?? 0) < 250 ? 'SME' : 'Large',
    incorporationDate: c.foundedDate,
    altEstablishmentDate,
    otherTradingNames: isLumen ? ['Lumen', 'Lumen Business'] : [],
    descriptionOwnWords: isLumen
      ? "We're a bank built for the way people live today: no branches, no jargon, just a brilliant app and real people to help when you need them."
      : `We ${c.description.replace(/^.*? develops /, 'build ').replace(/\.$/, '')}.`,
    sectors,
    technology: (isLumen ? TECH.slice(0, 4) : r.sample(TECH, r.int(2, 4))).map(([category, items]) => ({ category, items: isLumen ? items.slice(0, 3) : r.sample(items, r.int(1, 3)) })),
    contact: {
      website: c.website,
      phone: isLumen ? undefined : r.chance(0.5) ? `020 7946 0${String(r.int(0, 999)).padStart(3, '0')}` : undefined,
      emails: isLumen ? [] : r.chance(0.4) ? [`hello@${domain}`] : [],
      socials: c.socials,
      appStores: isLumen ? ['App Store', 'Google Play'] : c.industries.includes('mobile-apps') ? ['App Store'] : [],
    },
    addresses: { headOffice, registered: headOffice, trading: isLumen ? [['Unit 4, Quayside Works', 'Manchester', 'M3 4LZ', 'United Kingdom']] : [] },
    locationHierarchy: [
      { value: loc.la, type: 'Local Authority' }, { value: loc.county, type: 'County' }, { value: loc.lep, type: 'LEP' },
      { value: c.headOffice, type: 'Region' }, { value: 'United Kingdom', type: 'Country' },
    ],
    covidStatus: isLumen ? 'Resilient: no adverse COVID-19 impact reported' : r.pick(['Resilient: no adverse COVID-19 impact reported', 'Received a government-backed COVID-19 loan', 'Furloughed staff during 2020', 'No COVID-19 information']),
    activelyHiring: isLumen || r.chance(0.4),
    accelerators,
    highGrowthLists,
    stagePeriods,
    credit,
    connections,
    timeline: timelineClean,
    activity,
    transactions,
    people: { keyPeople, directors, secretaries, previousKeyPeople, previousDirectors, psc: [] },
    ownership: { filings: ownershipFilings, pricePerShare },
    corporateTree,
    commodities,
    financials,
    filings,
    news,
    patents,
    charges,
  };
}

function buildStages(c: Company, r: Rng, isLumen: boolean) {
  if (isLumen) return [{ stage: 'Seed' as Stage, from: '2015-02-05' }, { stage: 'Venture' as Stage, from: '2017-06-20' }, { stage: 'Growth' as Stage, from: '2019-04-11' }, { stage: 'Established' as Stage, from: '2022-03-08' }];
  const target = c.stage;
  const path: Stage[] = STAGE_ORDER.includes(target) ? STAGE_ORDER.slice(0, STAGE_ORDER.indexOf(target) + 1) : ['Seed', 'Venture', target];
  const start = new Date(c.foundedDate).getTime();
  const end = new Date(PROFILE_TODAY).getTime();
  return path.map((stage, i) => ({ stage, from: i === 0 ? c.foundedDate : iso(new Date(start + ((end - start) * (i + r.next() * 0.3)) / (path.length + 0.3))) }));
}

function buildTree(c: Company, r: Rng, registeredName: string, isLumen: boolean, isGroup: boolean): CorpNode {
  const node = (name: string, extra: Partial<CorpNode> = {}): CorpNode => ({
    id: `${c.id}-cn-${hash(name) % 100000}`, name, registeredName: name, country: 'GB', consolidated: false, children: [], ...extra,
  });
  if (isLumen) {
    return node('Lumen Bank', { registeredName, consolidated: true, current: true, companyId: c.id, children: [node('Lumen Bank UK Limited', { consolidated: false })] });
  }
  if (isGroup) {
    return node('Harrowmere Group', {
      registeredName, consolidated: true, current: true, companyId: c.id,
      children: [
        node('Harrowmere Estates Limited', { consolidated: true, children: [node('Harrowmere Estates (Leeds) Limited'), node('Harrowmere Estates (Bristol) Limited')] }),
        node('Harrowmere Logistics Limited', { consolidated: true, children: [node('Harrowmere Logistics B.V.', { country: 'NL' })] }),
        node('Harrowmere Lending Limited', { consolidated: true, children: [node('Harrowmere Lending Nominees Limited'), node('Harrowmere Lending Trustees Limited')] }),
      ],
    });
  }
  const self = node(c.name, { registeredName, current: true, companyId: c.id, consolidated: false });
  const roll = r.next();
  if (roll < 0.2) {
    self.consolidated = true;
    self.children = Array.from({ length: r.int(1, 3) }, (_, i) => node(`${c.name.replace(/ (Ltd|Limited)$/, '')} ${['Services', 'Trading', 'Holdings', 'International'][i]} Limited`));
    return self;
  }
  if (roll < 0.25 || c.isSubsidiary) {
    return node(`${c.name.replace(/ (Ltd|Limited)$/, '')} Holdings Limited`, { consolidated: true, children: [self] });
  }
  return self;
}

function buildCommodities(r: Rng, nImp: number, nExp: number): Commodities {
  const months: string[] = [];
  for (let d = new Date(Date.UTC(2020, 7, 1)); d <= new Date(Date.UTC(2023, 9, 1)); d.setUTCMonth(d.getUTCMonth() + 1)) months.push(iso(d).slice(0, 7));
  const make = (n: number, pool: [string, string][]): { items: HsItem[]; active: Set<string>[] } => {
    const chosen = r.sample(pool, n);
    const active: Set<string>[] = [];
    const items = chosen.map(([code, description]) => {
      const p = 0.08 + r.next() * 0.3;
      const set = new Set(months.filter(() => r.chance(p)));
      if (!set.size) set.add(r.pick(months));
      active.push(set);
      return {
        code, description, months: set.size,
        sub: r.sample(HS_SUB, r.int(1, 3)).map((s, i) => ({ code: `${code}${String(10 + i * 13).padStart(2, '0')}`, description: s, months: Math.max(1, Math.round(set.size * (0.4 + r.next() * 0.6))) })),
      };
    });
    return { items, active };
  };
  const imp = make(nImp, HS);
  const exp = make(nExp, HS);
  return {
    monthly: months.map((m) => ({ month: m, imports: imp.active.filter((s) => s.has(m)).length, exports: exp.active.filter((s) => s.has(m)).length })),
    imports: imp.items.sort((a, b) => b.months - a.months),
    exports: exp.items.sort((a, b) => b.months - a.months),
  };
}
