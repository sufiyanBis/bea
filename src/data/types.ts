import type { Stage, Tracking } from './taxonomies/misc';

export type Gender = 'Male' | 'Female' | 'Unknown';

export interface Fundraising {
  date: string; // ISO
  amount: number;
  stage: 'Seed' | 'Venture' | 'Growth';
  investors: string[];
}
export interface Director {
  /** stable id in the shared persons table (set by the persons pass) */
  personId?: string;
  name: string;
  gender: Gender;
  birthYear: number;
  appointed: string;
  resigned?: string;
}
export interface CompanyEvent { type: string; date: string }

export interface Company {
  id: string;
  name: string;
  logo: string;
  description: string;
  businessDescription: string;
  /** taxonomy item ids (both industries and buzzwords) */
  industries: string[];
  /** level 1 of the country's location hierarchy (UK: region; DE: Bundesland; US: state …) */
  headOffice: string;
  /** ISO 3166-1 alpha-2 */
  country: string;
  city: string;
  /** ISO 4217 of the company's reporting currency (money fields are stored in GBP) */
  currency: string;
  listed: boolean;
  ticker?: string;
  exchange?: string;
  registry: { name: string; idLabel: string; id: string };
  /** local wording of the register status (chStatus is the normalised status) */
  registryStatus: string;
  lat: number;
  lng: number;
  /** registry identifier (Companies House number for UK companies); same as registry.id */
  companiesHouseId: string;
  chStatus: string;
  stage: Stage;
  trackingStatus: Tracking;
  signals: string[];
  foundedDate: string;
  ceasedDate?: string;
  fundraisingTotal: number;
  latestFundraisingDate?: string;
  fundraisings: Fundraising[];
  turnover?: number;
  hasFullFinancials: boolean;
  netAssets?: number;
  employees?: number;
  directors: Director[];
  founders: { name: string; gender: Gender }[];
  shareholders: string[];
  events: CompanyEvent[];
  website?: string;
  socials: string[];
  companyType: string;
  legalForm: string;
  isSubsidiary: boolean;
  targetMarkets: string[];
  imports: boolean;
  exports: boolean;
  sicCodes: string[];
  collectionIds?: never;
  seniorHires: number;
}

export type Entity = 'companies' | 'de' | 'funds' | 'people';
