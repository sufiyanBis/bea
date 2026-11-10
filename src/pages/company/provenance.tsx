import { createContext, ReactNode, useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import type { Company } from '../../data/types';
import type { CompanyProfile, Filing } from '../../data/profile/types';
import { coverageFor, type DatasetId } from '../../config/tender';
import { sourceFor, type DataSource } from '../../data/sources';
import { addDays, formatDate } from '../../lib/format';
import { PROFILE_TODAY } from '../../data/profile/generateProfile';
import { Popover } from '../../components/ui/Popover';
import { useUi } from '../../store/uiStore';
import { SampleTag } from '../../components/ui/Sample';
import { openFilingPdf } from './sections/FilingHistory';
import type { SectionId } from './sections';

/** Which dataset backs each profile section (drives the default card footer). */
export const SECTION_DATASET: Record<SectionId, DatasetId> = {
  summary: 'company-details', details: 'company-details', timeline: 'filings', 'recent-activity': 'filings', transactions: 'fundraisings',
  people: 'officers', ownership: 'ownership', 'corporate-structure': 'ownership', 'commodity-trade': 'trade', patents: 'company-details',
  financials: 'accounts', 'charges-mortgages': 'filings', 'filing-history': 'filings', news: 'news', 'similar-companies': 'company-details',
};

interface Ctx { c: Company; p: CompanyProfile; section: SectionId }
const ProvenanceCtx = createContext<Ctx | null>(null);
export const ProvenanceProvider = ({ value, children }: { value: Ctx; children: ReactNode }) => <ProvenanceCtx.Provider value={value}>{children}</ProvenanceCtx.Provider>;
export const useProvenance = () => useContext(ProvenanceCtx);

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

/** Filing categories that evidence each dataset (to date the provenance). */
const EVIDENCE: Partial<Record<DatasetId, RegExp>> = {
  accounts: /Accounts/, officers: /Officers/, filings: /./, ownership: /Capital|Annual|PSC/, 'company-details': /Incorporation|Annual|Address/,
};

export interface Provenance {
  source: DataSource;
  filed: string;
  available: string;
  lastCheckedDays: number;
  filing?: Filing;
  confidence: 'Verified' | 'Estimated' | 'Modelled';
}

/** Deterministic provenance for a dataset on a company (sample dates derived from the company's filings). */
export function provenanceFor(c: Company, p: CompanyProfile, dataset: DatasetId, key = ''): Provenance {
  const source = sourceFor(dataset, c.country);
  const lag = coverageFor(dataset, c.country).value.lagDays;
  const re = EVIDENCE[dataset];
  const filing = re ? p.filings.find((f) => re.test(f.category)) : undefined;
  const h = hash(`${c.id}:${dataset}:${key}`);
  const filed = filing?.date ?? addDays(PROFILE_TODAY, -(h % 60) - 5);
  const available = addDays(filed, Math.max(0, lag));
  const confidence = dataset === 'credit' ? 'Modelled' : dataset === 'fundraisings' && h % 4 === 0 ? 'Estimated' : 'Verified';
  return { source, filed, available: available > PROFILE_TODAY ? PROFILE_TODAY : available, lastCheckedDays: (h % 6) + 1, filing, confidence };
}

const ago = (d: number) => (d === 1 ? 'yesterday' : `${d} days ago`);

/** "Source: Companies House · Filed 04/11/2024 · Available 05/11/2024 · Last checked 2 days ago" */
export function SourceFooter({ dataset, cardKey }: { dataset?: DatasetId; cardKey?: string }) {
  const ctx = useProvenance();
  if (!ctx) return null;
  const ds = dataset ?? SECTION_DATASET[ctx.section];
  const pv = provenanceFor(ctx.c, ctx.p, ds, cardKey);
  return (
    <footer data-source-footer className="flex flex-wrap items-center gap-x-[6px] gap-y-[2px] px-[15px] py-[7px] border-t border-card-border text-[12px] text-muted bg-[#FCFCFC] rounded-b-card">
      <span>Source:</span>
      <Link to={`/data-sources#${pv.source.id}`} className="text-primary hover:underline">{pv.source.name}</Link>
      <span aria-hidden>·</span><span>Filed {formatDate(pv.filed)}</span>
      <span aria-hidden>·</span><span>Available {formatDate(pv.available)}</span>
      <span aria-hidden>·</span><span>Last checked {ago(pv.lastCheckedDays)}</span>
      <SampleTag note="Sample provenance for the client demo." className="!ml-[2px]" />
    </footer>
  );
}

let seq = 0;
const TONE = { Verified: 'bg-[#DCF3E1] text-[#1E6B34]', Estimated: 'bg-[#FFF2CC] text-[#7A5B00]', Modelled: 'bg-chip-blue text-badge-blue-text' } as const;

/** ⓘ next to a key value: source, document link, filing and availability dates, confidence. */
export function ProvenanceInfo({ dataset, label }: { dataset: DatasetId; label: string }) {
  const ctx = useProvenance();
  const [id] = useState(() => `prov-${seq++}`);
  const [el, setEl] = useState<HTMLButtonElement | null>(null);
  const toggle = useUi((s) => s.toggle);
  if (!ctx) return null;
  const pv = provenanceFor(ctx.c, ctx.p, dataset, label);
  const doc = pv.filing ?? ctx.p.filings[0];
  return (
    <>
      <button
        ref={setEl}
        type="button"
        data-provenance={label}
        aria-label={`Where does ${label} come from?`}
        aria-haspopup="dialog"
        onClick={(e) => { e.stopPropagation(); toggle(id); }}
        className="inline-flex items-center justify-center w-[24px] h-[24px] ml-[2px] align-middle rounded-full text-muted hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <Info size={13} />
      </button>
      <Popover id={id} anchor={el} width={300} className="p-[14px] text-[13px]" placement="bottom-start">
        <div role="document" aria-label={`Provenance of ${label}`}>
          <div className="flex items-center justify-between mb-[8px]">
            <span className="font-semibold text-ink text-[14px]">{label}</span>
            <span className={`px-[7px] py-[1px] rounded-full text-[11px] font-semibold ${TONE[pv.confidence]}`} data-confidence>{pv.confidence}</span>
          </div>
          <dl className="space-y-[5px]">
            <div className="flex"><dt className="w-[95px] text-muted">Source</dt><dd><Link to={`/data-sources#${pv.source.id}`} className="text-primary hover:underline">{pv.source.name}</Link></dd></div>
            <div className="flex"><dt className="w-[95px] text-muted">Document</dt><dd>{doc ? <button className="text-primary hover:underline text-left" onClick={() => openFilingPdf(doc, ctx.c.name, ctx.p.registeredName, ctx.c.registry.name)}>{doc.code}: {doc.lead} (PDF)</button> : '—'}</dd></div>
            <div className="flex"><dt className="w-[95px] text-muted">Filed</dt><dd>{formatDate(pv.filed)}</dd></div>
            <div className="flex"><dt className="w-[95px] text-muted">Available</dt><dd>{formatDate(pv.available)}</dd></div>
            <div className="flex"><dt className="w-[95px] text-muted">Last checked</dt><dd>{ago(pv.lastCheckedDays)}</dd></div>
          </dl>
          <p className="mt-[8px] text-[12px] text-muted">Sample provenance generated for the client demo.<SampleTag /></p>
        </div>
      </Popover>
    </>
  );
}
