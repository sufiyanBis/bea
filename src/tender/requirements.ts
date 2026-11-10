/**
 * Single source of truth for the tender traceability page (/tender-coverage) and docs/DEMO_SCRIPT.md.
 * `show` is the deep link the "Show me" button opens; `tour` optionally starts a short guided tour there.
 */
export type Priority = 'Critical' | 'High' | 'Medium';
export type Status = 'Done' | 'Partial' | 'Planned';

export interface Requirement {
  id: string;
  area: string;
  requirement: string;
  priority: Priority;
  milestone: string;
  status: Status;
  show: string;
  /** what to click / say during the demo */
  demo: string;
  tour?: string;
}

const R = (r: Requirement) => r;

export const REQUIREMENTS: Requirement[] = [
  // ---- Global / CMA clarification
  R({ id: 'g-banner', area: 'Global', requirement: 'Prototype labelling on every screen and every export', priority: 'Critical', milestone: 'M1', status: 'Done', show: '/', demo: 'Point at the grey banner above the header and the footer notice.' }),
  R({ id: 'g-config', area: 'Global', requirement: 'Every service claim comes from one config file and shows a "Sample" tag', priority: 'Critical', milestone: 'M1', status: 'Done', show: '/plan', demo: 'Every figure on Plan & allowances carries a yellow Sample tag.' }),
  R({ id: 'g-deploy', area: 'Global', requirement: 'No hardcoded domain; works under any sub-path; noindex', priority: 'Critical', milestone: 'M1', status: 'Done', show: '/tender-coverage', demo: 'Explain VITE_PUBLIC_BASE_URL / VITE_BASE_PATH (see docs/DEPLOY.md).' }),
  R({ id: 'cma-full-access', area: 'CMA clarification', requirement: 'All 30 users receive full functionality; admins only add the Admin console', priority: 'Critical', milestone: 'M7', status: 'Done', show: '/account', demo: 'Account page: "Licences: 30 of 30 assigned · Full access for all users".' }),
  R({ id: 'cma-allowance', area: 'CMA clarification', requirement: 'Bulk-export allowance and charges clearly defined', priority: 'Critical', milestone: 'M6', status: 'Done', show: '/plan', demo: 'Plan & allowances: allowance, overage charge, reset date, fair use.' }),
  R({ id: 'cma-intl-depth', area: 'CMA clarification', requirement: 'International companies have the same profile depth as UK and Irish companies', priority: 'Critical', milestone: 'M2', status: 'Done', show: '/companies/de-1', demo: 'Open a German and a US company; every section in the left nav is populated.' }),

  // ---- 3.1 International
  R({ id: 'intl-dropdown', area: 'International coverage', requirement: 'Country dropdown of all countries with UK and Ireland first', priority: 'Critical', milestone: 'M2', status: 'Done', show: '/', demo: 'Open the "in [United Kingdom, Ireland]" selector in the search sentence.' }),
  R({ id: 'intl-criteria', area: 'International coverage', requirement: 'Country and Listed / Private search criteria', priority: 'Critical', milestone: 'M2', status: 'Done', show: '/', demo: 'Add criteria → Location → Country.' }),
  R({ id: 'intl-data', area: 'International coverage', requirement: 'UK, Irish and global, public and private companies', priority: 'Critical', milestone: 'M2', status: 'Done', show: '/', demo: 'Statistics tab → Companies by country.' }),
  R({ id: 'intl-fields', area: 'International coverage', requirement: 'Country-aware registry IDs, legal forms, local currency with GBP equivalent', priority: 'Critical', milestone: 'M2', status: 'Done', show: '/companies/de-1/details', demo: 'Profile Details card shows e.g. "Handelsregister HRB …" and "€12.4m (≈£10.6m)".' }),
  R({ id: 'intl-map', area: 'International coverage', requirement: 'World map and country statistics', priority: 'Critical', milestone: 'M2', status: 'Done', show: '/', demo: 'Run a search for all countries, then open the Map tab.' }),

  // ---- 3.2 Provenance
  R({ id: 'prov-sources', area: 'Real data & provenance', requirement: 'Sources, licences and methodology explained', priority: 'Critical', milestone: 'M3', status: 'Done', show: '/data-sources', demo: 'Sources tab: expand Companies House.' }),
  R({ id: 'prov-coverage', area: 'Real data & provenance', requirement: 'Historic depth and update frequency per dataset and country', priority: 'Critical', milestone: 'M3', status: 'Done', show: '/data-sources#coverage', demo: 'Coverage matrix: UK vs Ireland vs Germany.' }),
  R({ id: 'prov-fresh', area: 'Real data & provenance', requirement: 'Filing-to-availability times', priority: 'Critical', milestone: 'M3', status: 'Done', show: '/data-sources#freshness', demo: 'Freshness tab: lag distribution chart.' }),
  R({ id: 'prov-qa', area: 'Real data & provenance', requirement: 'Quality assurance process', priority: 'Critical', milestone: 'M3', status: 'Done', show: '/data-sources#qa', demo: 'QA tab: six-step pipeline.' }),
  R({ id: 'prov-limits', area: 'Real data & provenance', requirement: 'Known limitations and correction process', priority: 'Critical', milestone: 'M3', status: 'Done', show: '/data-sources#corrections', demo: 'Corrections tab: report an error, see "My reported issues".' }),
  R({ id: 'prov-field', area: 'Real data & provenance', requirement: 'Field-level provenance on the company profile', priority: 'Critical', milestone: 'M3', status: 'Done', show: '/companies/lumen-bank/financials', demo: 'Card footers show source and dates; click ⓘ next to Turnover.' }),

  // ---- 3.3 Comparison
  R({ id: 'cmp-page', area: 'Comparison', requirement: 'Compare UK and international companies side by side', priority: 'Critical', milestone: 'M4', status: 'Done', show: '/compare?ids=gb-1,ie-1,de-1,us-1', demo: 'Compare UK, Irish, German and US companies.' }),
  R({ id: 'cmp-currency', area: 'Comparison', requirement: 'Currency conversion and period alignment', priority: 'Critical', milestone: 'M4', status: 'Done', show: '/compare?ids=gb-1,ie-1,de-1,us-1', demo: 'Switch GBP → EUR; note the FX date and period note.' }),
  R({ id: 'cmp-diff', area: 'Comparison', requirement: 'Differences only, best and worst highlighting, industry median', priority: 'Critical', milestone: 'M4', status: 'Done', show: '/compare?ids=gb-1,ie-1,de-1,us-1', demo: 'Toggle "Show differences only".' }),

  // ---- 3.4 Reports & exports
  R({ id: 'rep-grid', area: 'Reports & exports', requirement: 'Manipulate data for calculations (analysis grid, calculated columns)', priority: 'Critical', milestone: 'M5', status: 'Done', show: '/', demo: 'Results → Analyse → add column "turnover / employees".' }),
  R({ id: 'rep-builder', area: 'Reports & exports', requirement: 'Customised reports', priority: 'Critical', milestone: 'M5', status: 'Done', show: '/reports/rep-demo', demo: 'Open a saved report, Run again, then preview.' }),
  R({ id: 'rep-excel-pdf', area: 'Reports & exports', requirement: 'Excel and PDF exports everywhere', priority: 'Critical', milestone: 'M6', status: 'Done', show: '/', demo: 'Export results to Excel; open the Read me and Sources sheets.' }),
  R({ id: 'rep-bulk', area: 'Reports & exports', requirement: 'Bulk download and analysis', priority: 'Critical', milestone: 'M6', status: 'Done', show: '/downloads', demo: 'Export all results → job with progress → zip on Downloads.' }),

  // ---- 3.5 Admin
  R({ id: 'adm-users', area: 'Administrator reporting', requirement: 'Add and remove users (30 licences)', priority: 'Critical', milestone: 'M7', status: 'Done', show: '/admin/users', demo: 'Try Add user at 30/30, remove one, then add.' }),
  R({ id: 'adm-usage', area: 'Administrator reporting', requirement: 'Active users, last login, sessions, connection times and views over custom periods', priority: 'Critical', milestone: 'M7', status: 'Done', show: '/admin/usage', demo: 'Pick "Last quarter", drill into a user session log.' }),
  R({ id: 'adm-audit', area: 'Administrator reporting', requirement: 'Audit log', priority: 'Critical', milestone: 'M7', status: 'Done', show: '/admin/audit', demo: 'Filter by "User removed".' }),

  // ---- 3.6 People
  R({ id: 'ppl-profile', area: 'People across companies', requirement: "Individuals' current and previous directorships and other positions", priority: 'Critical', milestone: 'M8', status: 'Done', show: '/people/p4', demo: 'Open a person from a profile; current/previous appointments and Gantt.' }),
  R({ id: 'ppl-network', area: 'People across companies', requirement: 'Network of co-directors', priority: 'Critical', milestone: 'M8', status: 'Done', show: '/people/p4', demo: 'Person page → Network graph → View as list.' }),
  R({ id: 'ppl-search', area: 'People across companies', requirement: 'People search and "previous directors" criterion', priority: 'Critical', milestone: 'M8', status: 'Done', show: '/?find=people', demo: 'Find [people] where number of current appointments ≥ 3.' }),

  // ---- Phase 2
  R({ id: 'own-ubo', area: 'Ultimate & beneficial ownership', requirement: 'Ownership chain to ultimate parent and UBOs; PSC nature of control', priority: 'High', milestone: 'M9', status: 'Done', show: '/companies/de-1/ownership', demo: 'Ownership chain diagram and PSC table.' }),
  R({ id: 'own-history', area: 'Ultimate & beneficial ownership', requirement: 'Historic ownership and subsidiaries', priority: 'High', milestone: 'M9', status: 'Done', show: '/companies/lumen-bank/ownership', demo: 'Compare two filing dates.' }),
  R({ id: 'risk-criteria', area: 'Searchable risk & financial data', requirement: 'Search by credit, insolvency, ownership, people, financials and filing dates', priority: 'High', milestone: 'M10', status: 'Done', show: '/', demo: 'Add criteria → Risk → Insolvency status.' }),
  R({ id: 'hist-depth', area: 'Historical depth', requirement: 'Up to 20 years of history with "available from" declarations', priority: 'High', milestone: 'M11', status: 'Done', show: '/companies/c144/financials', demo: 'Years: All; note the "Data available from" badge.' }),
  R({ id: 'news-cats', area: 'News & monitoring', requirement: 'News categories with source links', priority: 'High', milestone: 'M12', status: 'Done', show: '/news', demo: 'Filter by "Insolvency & administration".' }),
  R({ id: 'news-alerts', area: 'News & monitoring', requirement: 'Monitoring and alerts', priority: 'High', milestone: 'M12', status: 'Done', show: '/tender-coverage', demo: 'Monitor a company, Simulate new events below, then open the bell.' }),
  R({ id: 'a11y', area: 'Help & accessibility', requirement: 'WCAG 2.2 AA, keyboard operation, accessibility statement', priority: 'Medium', milestone: 'M13', status: 'Done', show: '/accessibility', demo: 'Tab through a search; show "View as table" on a chart.' }),
  R({ id: 'help', area: 'Help & accessibility', requirement: 'Help centre, training materials and support arrangements', priority: 'Medium', milestone: 'M13', status: 'Done', show: '/help', demo: 'Download the PDF user guide; open Support SLAs.' }),
  R({ id: 'prod', area: 'Production readiness', requirement: 'CI, error handling, security headers, governance documentation', priority: 'High', milestone: 'M14', status: 'Done', show: '/governance', demo: 'Service & governance page; docs/ folder.' }),
];
