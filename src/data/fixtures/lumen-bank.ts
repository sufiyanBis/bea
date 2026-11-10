/**
 * Hand-tuned demo company for the profile page. Entirely fictional: every name,
 * person, investor and address here is invented.
 */
import type { Company, Director, Fundraising } from '../types';
import { Rng } from '../rng';
import { makeLogo } from '../logo';
import { SIG } from '../taxonomies/signals';

export const LUMEN_ID = 'lumen-bank';
export const GROUP_DEMO_ID = 'harrowmere-group';

/** Fictional investors used by the fixture (country = ISO code for the flag). */
export const LUMEN_INVESTORS: { name: string; country: string; hasProfile: boolean; managedBy?: string }[] = [
  { name: 'Harbourline Ventures', country: 'GB', hasProfile: true },
  { name: 'Kestrel Capital', country: 'GB', hasProfile: true },
  { name: 'Brightwater Partners', country: 'US', hasProfile: true },
  { name: 'Oakhurst Growth', country: 'GB', hasProfile: true, managedBy: 'Oakhurst Asset Management' },
  { name: 'Fenwick Seed Fund', country: 'GB', hasProfile: false },
  { name: 'Larchmont Angels', country: 'GB', hasProfile: false },
  { name: 'Northgate Equity', country: 'US', hasProfile: true },
  { name: 'Silverbirch VC', country: 'DE', hasProfile: true },
  { name: 'Tideway Investors', country: 'GB', hasProfile: true },
  { name: 'Cobalt Square Capital', country: 'SG', hasProfile: true, managedBy: 'Cobalt Square Holdings' },
  { name: 'Marlow Street Ventures', country: 'GB', hasProfile: false },
  { name: 'Redcliffe Partners', country: 'US', hasProfile: true },
  { name: 'Ashgrove Capital', country: 'GB', hasProfile: true },
  { name: 'Pennant Growth Equity', country: 'US', hasProfile: true },
  { name: 'Wyvern Angels', country: 'GB', hasProfile: false },
  { name: 'Thistle Ventures', country: 'GB', hasProfile: true },
  { name: 'Halcyon Seed', country: 'NL', hasProfile: false },
  { name: 'Granary Capital', country: 'GB', hasProfile: true },
  { name: 'Juniper Lane Ventures', country: 'US', hasProfile: true, managedBy: 'Juniper Lane Advisers' },
  { name: 'Beacon Hill Fund', country: 'GB', hasProfile: true },
  { name: 'Meridian Sovereign Fund', country: 'AE', hasProfile: true },
  { name: 'Crowdmark Community Round', country: 'GB', hasProfile: false },
  { name: 'Ironbridge Credit', country: 'GB', hasProfile: true },
  { name: 'Vantage Peak Partners', country: 'US', hasProfile: true },
];

const I = (...idx: number[]) => idx.map((i) => LUMEN_INVESTORS[i].name);

/** 16 fundraisings, ~£1.42b in total, with the pre-money valuation at each round. */
export const LUMEN_ROUNDS: (Fundraising & { preMoney: number; announced?: number })[] = [
  { date: '2016-03-14', amount: 1_500_000, stage: 'Seed', investors: I(4, 5), preMoney: 5_500_000 },
  { date: '2016-11-02', amount: 2_000_000, stage: 'Seed', investors: I(4, 14, 5), preMoney: 7_000_000 },
  { date: '2017-06-20', amount: 4_500_000, stage: 'Venture', investors: I(0, 4), preMoney: 18_000_000 },
  { date: '2018-01-15', amount: 7_000_000, stage: 'Venture', investors: I(0, 1, 21), preMoney: 32_000_000 },
  { date: '2018-09-04', amount: 12_000_000, stage: 'Venture', investors: I(1, 2), preMoney: 60_000_000 },
  { date: '2019-04-11', amount: 20_000_000, stage: 'Growth', investors: I(2, 3, 0), preMoney: 110_000_000 },
  { date: '2019-12-03', amount: 35_000_000, stage: 'Growth', investors: I(3, 6), preMoney: 190_000_000 },
  { date: '2020-07-22', amount: 60_000_000, stage: 'Growth', investors: I(6, 7, 21), preMoney: 340_000_000 },
  { date: '2021-02-17', amount: 85_000_000, stage: 'Growth', investors: I(8, 9, 2), preMoney: 520_000_000 },
  { date: '2021-08-30', amount: 110_000_000, stage: 'Growth', investors: I(9, 11), preMoney: 760_000_000 },
  { date: '2022-03-08', amount: 150_000_000, stage: 'Growth', investors: I(12, 13, 20), preMoney: 1_150_000_000 },
  { date: '2022-10-19', amount: 120_000_000, stage: 'Growth', investors: I(13, 15), preMoney: 1_420_000_000 },
  { date: '2023-04-25', amount: 180_000_000, stage: 'Growth', investors: I(20, 16, 17), preMoney: 1_780_000_000 },
  { date: '2023-11-14', amount: 210_000_000, stage: 'Growth', investors: I(18, 22), preMoney: 2_150_000_000 },
  { date: '2024-05-08', amount: 150_000_000, stage: 'Growth', investors: I(19, 23, 20), preMoney: 2_700_000_000 },
  { date: '2024-10-29', amount: 272_500_000, stage: 'Growth', investors: I(23, 12), preMoney: 3_007_500_000 },
];

const d = (name: string, gender: 'Male' | 'Female', birthYear: number, appointed: string, resigned?: string): Director => ({ name, gender, birthYear, appointed, resigned });

/** 10 current and 8 previous directors. */
export const LUMEN_DIRECTORS: Director[] = [
  d('Adaeze Whitcombe', 'Female', 1978, '2015-02-05'),
  d('Tobias Renshaw', 'Male', 1974, '2015-02-05'),
  d('Priya Castellane', 'Female', 1981, '2018-01-22'),
  d('Hamish Oduya', 'Male', 1969, '2019-06-03'),
  d('Margot Lindqvist', 'Female', 1965, '2020-09-14'),
  d('Rafael Ashdown', 'Male', 1972, '2021-03-01'),
  d('Celeste Navarro-Pike', 'Female', 1983, '2022-05-16'),
  d('Desmond Ferrabee', 'Male', 1961, '2022-11-07'),
  d('Ingrid Mbeki-Hale', 'Female', 1976, '2023-09-12'),
  d('Laurence Quaye', 'Male', 1970, '2024-02-19'),
  d('Oliver Dunmore', 'Male', 1980, '2015-02-05', '2017-08-31'),
  d('Fiona Galbraith', 'Female', 1975, '2016-06-01', '2019-03-15'),
  d('Kwame Ellery', 'Male', 1968, '2017-02-13', '2020-12-01'),
  d('Sasha Petrakis', 'Female', 1979, '2018-05-21', '2021-07-30'),
  d('Bernard Hollins', 'Male', 1958, '2019-01-07', '2022-04-11'),
  d('Yusuf Aldridge', 'Male', 1971, '2020-02-03', '2023-06-30'),
  d('Helena Croft', 'Female', 1966, '2021-01-18', '2024-01-31'),
  d('Nikhil Barrowman', 'Male', 1977, '2022-02-14', '2024-11-04'),
];

export function lumenCompanies(): Company[] {
  const r = new Rng(424242);
  const total = LUMEN_ROUNDS.reduce((s, f) => s + f.amount, 0);
  const lumen: Company = {
    id: LUMEN_ID,
    name: 'Lumen Bank',
    logo: makeLogo('Lumen Bank', r),
    description: 'Lumen Bank is a digital challenger bank offering current accounts, savings and lending to UK consumers and small businesses through its mobile app.',
    businessDescription: 'The principal activity of the group is the provision of retail and business banking services.',
    industries: ['application-software', 'banking', 'fintech', 'payments', 'mobile-apps'],
    headOffice: 'London',
    lat: 51.5205,
    lng: -0.0822,
    companiesHouseId: '09412278',
    chStatus: 'Active',
    stage: 'Established',
    trackingStatus: 'Tracked',
    signals: [SIG.equity, SIG.debt, SIG.accelerator, SIG.scale10, SIG.scale20, SIG.highGrowth, 'innovation:grant-received', 'social:gender-equality-of-directors'],
    foundedDate: '2015-02-05',
    fundraisingTotal: total,
    latestFundraisingDate: LUMEN_ROUNDS[LUMEN_ROUNDS.length - 1].date,
    fundraisings: LUMEN_ROUNDS.map(({ date, amount, stage, investors }) => ({ date, amount, stage, investors })),
    turnover: 880_000_000,
    hasFullFinancials: true,
    netAssets: 862_000_000,
    employees: 3145,
    directors: LUMEN_DIRECTORS,
    founders: [{ name: 'Adaeze Whitcombe', gender: 'Female' }, { name: 'Tobias Renshaw', gender: 'Male' }, { name: 'Oliver Dunmore', gender: 'Male' }],
    shareholders: [],
    events: [
      { type: 'Accelerator attendance', date: '2015-09-01' },
      { type: 'Grant received', date: '2016-01-20' },
      { type: 'Award won', date: '2021-11-10' },
      { type: 'Product launch', date: '2017-03-06' },
    ],
    website: 'https://www.lumenbank.co.uk',
    socials: ['Facebook', 'Glassdoor', 'Instagram', 'Pinterest', 'X / Twitter', 'LinkedIn'],
    companyType: 'Private limited company',
    legalForm: 'Ltd',
    isSubsidiary: false,
    targetMarkets: ['B2C', 'B2B'],
    imports: true,
    exports: true,
    sicCodes: ['64191', '64999', '62012'],
    seniorHires: 4,
    country: 'GB',
    city: 'London',
    currency: 'GBP',
    listed: false,
    registry: { name: 'Companies House', idLabel: 'Company number', id: '09412278' },
    registryStatus: 'Active',
  };

  const group: Company = {
    ...lumen,
    id: GROUP_DEMO_ID,
    name: 'Harrowmere Group',
    logo: makeLogo('Harrowmere Group', r),
    description: 'Harrowmere Group is the holding company of a fictional family of property, logistics and lending businesses across the UK and Europe.',
    industries: ['commercial-property', 'logistics-services', 'alternative-finance'],
    headOffice: 'North West',
    lat: 53.48,
    lng: -2.24,
    website: 'https://www.harrowmeregroup.co.uk',
    sicCodes: ['70100'],
    businessDescription: 'The principal activity of the company is that of a holding company.',
    companiesHouseId: '08870311',
    registry: { name: 'Companies House', idLabel: 'Company number', id: '08870311' },
    city: 'Manchester',
    stage: 'Established',
    fundraisings: [],
    fundraisingTotal: 0,
    latestFundraisingDate: undefined,
    turnover: 1_240_000_000,
    employees: 4210,
    directors: [d('Rowena Gallagher', 'Female', 1963, '2013-07-19'), d('Conrad Islington', 'Male', 1959, '2013-07-19'), d('Esther Mulvaney', 'Female', 1972, '2016-04-04'), d('Ivor Penhaligon', 'Male', 1966, '2014-02-10', '2019-05-31')],
    founders: [{ name: 'Rowena Gallagher', gender: 'Female' }, { name: 'Conrad Islington', gender: 'Male' }],
    events: [],
    socials: ['LinkedIn'],
    signals: [SIG.debt],
    foundedDate: '2013-07-19',
    imports: false,
    exports: false,
  };
  return [lumen, group];
}
