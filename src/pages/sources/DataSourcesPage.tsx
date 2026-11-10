import { Fragment, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { ArrowRight, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { PageShell, Panel, btnPrimary, th, td } from '../../components/layout/PageShell';
import { SampleTag, TV } from '../../components/ui/Sample';
import { CountrySelect } from '../../components/ui/CountrySelect';
import { Flag } from '../../components/ui/Flag';
import { Modal } from '../../components/ui/Modal';
import { useUi } from '../../store/uiStore';
import { useIssues, type IssueStatus } from '../../store/issuesStore';
import { coverageFor, DATASETS, TENDER, type DatasetId } from '../../config/tender';
import { SOURCES, SOURCE_BY_ID, QA_STEPS, JURISDICTION_LIMITS, datasetLabel, sourceCoverage, type DataSource } from '../../data/sources';
import { countryName } from '../../data/countries/iso3166';
import { formatDate } from '../../lib/format';
import { Rng } from '../../data/rng';

const TABS = [
  { id: 'sources', label: 'Sources' },
  { id: 'coverage', label: 'Coverage matrix' },
  { id: 'freshness', label: 'Freshness & timeliness' },
  { id: 'qa', label: 'Quality assurance' },
  { id: 'limitations', label: 'Limitations' },
  { id: 'corrections', label: 'Corrections' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export default function DataSourcesPage() {
  const { hash } = useLocation();
  const navigate = useNavigate();
  const key = decodeURIComponent(hash.replace(/^#/, ''));
  const tab: TabId = (TABS.find((t) => t.id === key)?.id ?? (SOURCE_BY_ID[key] ? 'sources' : 'sources'));
  const setTab = (t: TabId) => navigate({ hash: t }, { replace: true });

  return (
    <PageShell
      title="Data sources & methodology"
      wide
      crumbs={[{ label: 'Home', to: '/' }, { label: 'News & Reports' }, { label: 'Data sources & methodology' }]}
      intro={<>Where our data comes from, how deep and how fresh it is, how we check it and how to get it corrected. Registries are named as examples; partners are generic placeholders. Figures tagged <SampleTag /> are placeholders for the client demo, not commitments.</>}
    >
      <div role="tablist" aria-label="Data sources sections" className="flex items-center gap-[4px] border-b border-border mb-[18px]">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            data-ds-tab={t.id}
            onClick={() => setTab(t.id)}
            className={`h-[38px] px-[16px] text-[15px] -mb-px border-b-2 ${tab === t.id ? 'border-primary text-primary font-semibold' : 'border-transparent text-ink hover:text-primary'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'sources' && <SourcesTab focus={SOURCE_BY_ID[key] ? key : null} />}
        {tab === 'coverage' && <CoverageTab />}
        {tab === 'freshness' && <FreshnessTab />}
        {tab === 'qa' && <QaTab />}
        {tab === 'limitations' && <LimitationsTab />}
        {tab === 'corrections' && <CorrectionsTab />}
      </div>
    </PageShell>
  );
}

// ------------------------------------------------------------------ Sources
const jurisLabel = (s: DataSource) => (s.jurisdictions[0] === '*' ? 'Global' : s.jurisdictions.length > 3 ? `${s.jurisdictions.length} countries` : s.jurisdictions.map(countryName).join(', '));

function SourcesTab({ focus }: { focus: string | null }) {
  const [country, setCountry] = useState<string[]>([]);
  const [dataset, setDataset] = useState<DatasetId | ''>('');
  const [sort, setSort] = useState<{ key: 'name' | 'type'; dir: 1 | -1 }>({ key: 'name', dir: 1 });
  const [open, setOpen] = useState<string | null>(focus);
  useEffect(() => {
    if (!focus) return;
    setOpen(focus);
    setTimeout(() => document.getElementById(`src-${focus}`)?.scrollIntoView({ block: 'center' }), 50);
  }, [focus]);

  const rows = useMemo(() => SOURCES
    .filter((s) => !country.length || s.jurisdictions.includes('*') || country.some((c) => s.jurisdictions.includes(c)))
    .filter((s) => !dataset || s.datasetsCovered.includes(dataset))
    .sort((a, b) => a[sort.key].localeCompare(b[sort.key]) * sort.dir), [country, dataset, sort]);

  const sortBtn = (k: 'name' | 'type', label: string) => (
    <button onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? (s.dir === 1 ? -1 : 1) : 1 }))} className="inline-flex items-center gap-[4px] hover:text-primary" aria-label={`Sort by ${label}`}>
      {label}{sort.key === k && <span aria-hidden>{sort.dir === 1 ? '▲' : '▼'}</span>}
    </button>
  );

  return (
    <>
      <div className="flex items-center gap-[12px] mb-[12px] text-[14px] text-text">
        <span>Jurisdiction</span>
        <CountrySelect mode="single" allowAll value={country} onChange={setCountry} label="Jurisdiction" />
        <label className="inline-flex items-center gap-[8px]">Dataset
          <select value={dataset} onChange={(e) => setDataset(e.target.value as DatasetId)} className="h-[28px] border border-border rounded-btn px-2 bg-white text-ink">
            <option value="">All datasets</option>
            {DATASETS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </label>
        <span className="ml-auto">{rows.length} sources</span>
      </div>
      <Panel bodyClass="">
        <table className="w-full border-collapse" data-sources-table>
          <thead><tr><th className={`${th} w-[30px]`} /><th className={th} aria-sort={sort.key === 'name' ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>{sortBtn('name', 'Source')}</th><th className={th} aria-sort={sort.key === 'type' ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>{sortBtn('type', 'Type')}</th><th className={th}>Jurisdictions</th><th className={th}>Datasets</th><th className={th}>Update frequency</th><th className={th}>Licence</th></tr></thead>
          <tbody>
            {rows.map((s) => {
              const cov = sourceCoverage(s);
              const isOpen = open === s.id;
              return (
                <Fragment key={s.id}>
                  <tr id={`src-${s.id}`} data-source-row={s.id} className={isOpen ? 'bg-primary-light/50' : ''}>
                    <td className={td}>
                      <button aria-expanded={isOpen} aria-controls={`card-${s.id}`} aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${s.name}`} onClick={() => setOpen(isOpen ? null : s.id)} className="text-primary">
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </td>
                    <td className={`${td} font-semibold`}>{s.name}</td>
                    <td className={`${td} capitalize`}>{s.type}</td>
                    <td className={td}>{jurisLabel(s)}</td>
                    <td className={td}>{s.datasetsCovered.map(datasetLabel).join(', ')}</td>
                    <td className={td}>{cov.value.frequency}<SampleTag /></td>
                    <td className={`${td} text-[13px] text-text`}>{s.licence}</td>
                  </tr>
                  {isOpen && (
                    <tr id={`card-${s.id}`}><td colSpan={7} className="px-[18px] py-[14px] border-b border-card-border bg-[#FCFCFC]"><SourceCard s={s} /></td></tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </>
  );
}

function SourceCard({ s }: { s: DataSource }) {
  const cov = sourceCoverage(s);
  const kv = (k: string, v: React.ReactNode) => <div className="flex py-[6px] border-b border-card-border last:border-0"><dt className="w-[200px] text-text shrink-0">{k}</dt><dd className="text-ink">{v}</dd></div>;
  return (
    <div className="grid grid-cols-2 gap-[24px] text-[14px]" data-source-card={s.id}>
      <dl>
        {kv('Type', <span className="capitalize">{s.type}</span>)}
        {kv('Jurisdictions', s.jurisdictions[0] === '*' ? 'Global' : <span className="flex flex-wrap gap-[6px]">{s.jurisdictions.map((j) => <span key={j} className="inline-flex items-center gap-[4px]"><Flag code={j} />{countryName(j)}</span>)}</span>)}
        {kv('Website', s.url ? <a href={s.url} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-[4px]">{s.url.replace(/^https?:\/\//, '')}<ExternalLink size={12} /></a> : 'Not public')}
        {kv('Licence', s.licence)}
        {kv('Datasets covered', s.datasetsCovered.map(datasetLabel).join(', '))}
        {kv('Update frequency', <TV v={cov} render={(c) => c.frequency} />)}
        {kv('Filing to availability', <TV v={cov} render={(c) => (c.lagDays ? `typically ${c.lagDays} day${c.lagDays > 1 ? 's' : ''}` : 'same day')} />)}
        {kv('Historic depth from', <TV v={cov} render={(c) => String(c.from)} />)}
      </dl>
      <dl>
        {kv('Quality assurance', s.qaProcess)}
        {kv('Known limitations', <ul className="list-disc pl-[18px] space-y-[2px]">{s.knownLimitations.map((l) => <li key={l}>{l}</li>)}</ul>)}
        {kv('Correction process', s.correctionProcess)}
      </dl>
    </div>
  );
}

// ------------------------------------------------------------------ Coverage
const depthColor = (years: number) => {
  // light tints only, so dark text keeps AA contrast in every cell
  const t = Math.max(0, Math.min(1, years / 20)) * 0.42;
  const a = [238, 237, 246], b = [75, 66, 145];
  const c = a.map((x, i) => Math.round(x + (b[i] - x) * t));
  return { bg: `rgb(${c.join(',')})`, fg: '#1F1F1F' };
};

function CoverageTab() {
  const [others, setOthers] = useState<string[]>(['US', 'DE', 'FR']);
  const cols = ['GB', 'IE', ...others.filter((o) => o !== 'GB' && o !== 'IE')];
  const now = 2024;
  return (
    <>
      <div className="flex items-center gap-[12px] mb-[12px] text-[14px] text-text">
        <span>Compare with</span>
        <CountrySelect mode="multi" allowAll={false} value={others} onChange={setOthers} label="Other countries" />
        <span className="ml-auto inline-flex items-center gap-[8px]">Depth
          {[0, 5, 10, 15, 20].map((y) => <span key={y} className="inline-flex items-center gap-[3px]"><span className="w-[14px] h-[14px] rounded-[2px] border border-border" style={{ background: depthColor(y).bg }} />{y}y</span>)}
        </span>
      </div>
      <Panel title={<>Coverage by dataset and country<SampleTag /></>} bodyClass="overflow-x-auto">
        <table className="w-full border-collapse" data-coverage-matrix>
          <thead><tr><th className={th}>Dataset</th>{cols.map((c) => <th key={c} className={th}><span className="inline-flex items-center gap-[5px]"><Flag code={c} />{countryName(c)}</span></th>)}</tr></thead>
          <tbody>
            {DATASETS.map((d) => (
              <tr key={d.id}>
                <th scope="row" className={`${td} text-left font-semibold whitespace-nowrap`}>{d.label}</th>
                {cols.map((c) => {
                  const v = coverageFor(d.id, c).value;
                  const col = depthColor(now - v.from);
                  return <td key={c} className="px-[10px] py-[8px] border-b border-card-border text-[13px] whitespace-nowrap" style={{ background: col.bg, color: col.fg }} data-cell={`${d.id}:${c}`}>from {v.from} · {v.frequency.toLowerCase()}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <p className="text-[13px] text-muted mt-[10px]">This matrix is the declaration of historic depth and update frequency per dataset and jurisdiction that the tender asks bidders to make. All values are placeholders until confirmed by the bid team.</p>
    </>
  );
}

// ------------------------------------------------------------------ Freshness
function FreshnessTab() {
  const [ds, setDs] = useState<DatasetId>('accounts');
  const base = coverageFor(ds, 'GB').value.lagDays;
  const bins = useMemo(() => {
    const r = new Rng(ds.length * 97 + base);
    const counts = new Array(15).fill(0);
    for (let i = 0; i < 2000; i++) {
      const v = Math.round(r.logNormal(Math.max(0.6, base), 0.55));
      counts[Math.min(14, v)]++;
    }
    return counts;
  }, [ds, base]);
  const option = {
    grid: { left: 50, right: 20, top: 30, bottom: 40 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', name: 'Days from filing to availability', nameLocation: 'middle', nameGap: 28, data: bins.map((_, i) => (i === 14 ? '14+' : String(i))) },
    yAxis: { type: 'value', name: 'Records (sample)' },
    series: [{ type: 'bar', data: bins, itemStyle: { color: '#467BAD' }, barWidth: '70%' }],
    aria: { enabled: true, description: `Illustrative distribution of filing-to-availability lag for ${datasetLabel(ds)} in the UK, centred on ${base} days.` },
  };
  return (
    <div className="grid grid-cols-[1fr_1.2fr] gap-[20px] items-start">
      <Panel title={<>Update frequency and typical lag<SampleTag /></>} bodyClass="">
        <table className="w-full border-collapse">
          <thead><tr><th className={th}>Dataset</th><th className={th}>Frequency (UK)</th><th className={th}>Typical lag UK</th><th className={th}>Typical lag Ireland</th></tr></thead>
          <tbody>
            {DATASETS.map((d) => {
              const gb = coverageFor(d.id, 'GB').value, ie = coverageFor(d.id, 'IE').value;
              return (
                <tr key={d.id} className={ds === d.id ? 'bg-primary-light/60' : ''}>
                  <td className={td}><button onClick={() => setDs(d.id)} className="text-primary hover:underline text-left" aria-pressed={ds === d.id}>{d.label}</button></td>
                  <td className={td}>{gb.frequency}</td>
                  <td className={td}>{gb.lagDays ? `${gb.lagDays} days` : 'same day'}</td>
                  <td className={td}>{ie.lagDays ? `${ie.lagDays} days` : 'same day'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
      <Panel title={<>Lag distribution: {datasetLabel(ds)} (illustrative)<SampleTag /></>}>
        <ReactECharts option={option} style={{ height: 320 }} />
        <p className="text-[13px] text-muted">Illustrative only: generated sample data to show how timeliness would be reported, not measured performance.</p>
      </Panel>
    </div>
  );
}

// ------------------------------------------------------------------ QA
function QaTab() {
  return (
    <>
      <ol className="grid grid-cols-6 gap-[10px]" aria-label="Quality assurance pipeline" data-qa-steps>
        {QA_STEPS.map((s, i) => (
          <li key={s.id} className="relative bg-white border border-card-border rounded-card p-[14px]">
            <div className="flex items-center gap-[8px] mb-[8px]">
              <span className="w-[24px] h-[24px] rounded-full bg-primary text-white text-[13px] font-bold flex items-center justify-center">{i + 1}</span>
              <h3 className="text-[15px] font-semibold text-ink">{s.label}</h3>
            </div>
            <ul className="list-disc pl-[16px] text-[13px] text-text space-y-[4px]">{s.checks.map((c) => <li key={c}>{c}</li>)}</ul>
            {i < QA_STEPS.length - 1 && <ArrowRight size={18} aria-hidden className="absolute -right-[14px] top-[18px] text-primary bg-page rounded-full z-[1]" />}
          </li>
        ))}
      </ol>
      <p className="text-[14px] text-text mt-[14px]">Sampled audit: <TV v={TENDER.qaSampleRate} />.</p>
    </>
  );
}

// ------------------------------------------------------------------ Limitations
function LimitationsTab() {
  return (
    <div className="grid grid-cols-2 gap-[20px] items-start">
      <Panel title="By dataset">
        <dl className="space-y-[12px] text-[14px]">
          {DATASETS.map((d) => {
            const items = SOURCES.filter((s) => s.datasetsCovered.includes(d.id)).flatMap((s) => s.knownLimitations.map((l) => `${l} (${s.name})`));
            return (
              <div key={d.id}>
                <dt className="font-semibold text-ink">{d.label}</dt>
                <dd><ul className="list-disc pl-[18px] text-text">{(items.length ? items.slice(0, 4) : ['No known limitations recorded.']).map((l) => <li key={l}>{l}</li>)}</ul></dd>
              </div>
            );
          })}
        </dl>
      </Panel>
      <Panel title="By jurisdiction">
        <ul className="space-y-[10px] text-[14px]">
          {JURISDICTION_LIMITS.map((j) => <li key={j.country} className="flex gap-[8px]"><Flag code={j.country} /><span><strong className="text-ink">{countryName(j.country)}.</strong> <span className="text-text">{j.text}</span></span></li>)}
          <li className="text-text">Other countries: depth and timeliness vary; see the coverage matrix.</li>
        </ul>
      </Panel>
    </div>
  );
}

// ------------------------------------------------------------------ Corrections
const STATUS_TONE: Record<IssueStatus, string> = { Received: 'bg-chip-blue text-badge-blue-text', 'In review': 'bg-[#FFF2CC] text-[#7A5B00]', Corrected: 'bg-[#DCF3E1] text-[#1E6B34]', Rejected: 'bg-[#FDE2E1] text-[#9B1C1C]' };

function CorrectionsTab() {
  const issues = useIssues((s) => s.issues);
  const open = useUi((s) => s.open);
  const steps = [
    ['Report', 'Use ⚠ Report issue on any company profile, or the button here. You get a reference straight away.'],
    ['Triage', 'An analyst checks the report within one working day and tags the dataset and source.'],
    ['Investigate', 'We compare against the source document. Register errors are referred to the registry.'],
    ['Correct', 'Our errors are fixed and republished; the record keeps a correction note.'],
    ['Notify', 'You see the outcome here, and users monitoring the company get an alert.'],
  ];
  return (
    <div className="space-y-[18px]">
      <div className="grid grid-cols-[1fr_auto] gap-[20px] items-start">
        <Panel title="How corrections work">
          <ol className="grid grid-cols-5 gap-[10px] text-[13px]">
            {steps.map(([t, d], i) => <li key={t} className="border border-card-border rounded-card p-[10px]"><div className="font-semibold text-ink mb-[4px]">{i + 1}. {t}</div><p className="text-text">{d}</p></li>)}
          </ol>
          <p className="text-[14px] text-text mt-[12px]">Target turnaround from report to published correction: <strong className="text-ink"><TV v={TENDER.correctionTurnaround} /></strong></p>
        </Panel>
        <button className={btnPrimary} data-report-error onClick={() => open('report-error', 'modal')}>Report an error</button>
      </div>
      <Panel title="My reported issues" bodyClass="">
        <table className="w-full border-collapse" data-issues-table>
          <thead><tr><th className={th}>Reference</th><th className={th}>Company</th><th className={th}>Section</th><th className={th}>Issue</th><th className={th}>Reported</th><th className={th}>Status</th><th className={th}>Outcome</th></tr></thead>
          <tbody>
            {issues.map((i) => (
              <tr key={i.id}>
                <td className={`${td} font-mono text-[13px]`}>{i.id.toUpperCase()}</td>
                <td className={td}>{i.companyName}</td>
                <td className={td}>{i.section}</td>
                <td className={td}>{i.description}</td>
                <td className={td}>{formatDate(i.reported)}</td>
                <td className={td}><span className={`px-[8px] py-[2px] rounded-full text-[12px] font-semibold whitespace-nowrap ${STATUS_TONE[i.status]}`}>{i.status}</span></td>
                <td className={`${td} text-text text-[13px]`}>{i.resolution ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <ReportErrorModal />
    </div>
  );
}

function ReportErrorModal() {
  const close = useUi((s) => s.close);
  const report = useIssues((s) => s.report);
  const [company, setCompany] = useState('');
  const [section, setSection] = useState('Details');
  const [text, setText] = useState('');
  return (
    <Modal id="report-error" width={500} label="Report an error">
      <form onSubmit={(e) => { e.preventDefault(); report({ companyName: company || 'General', section, description: text }); setCompany(''); setText(''); close('report-error'); }}>
        <div className="px-[22px] py-[16px] border-b border-border"><h2 className="text-[18px] text-ink font-semibold">Report an error</h2></div>
        <div className="px-[22px] py-[18px] space-y-[12px] text-[14px]">
          <label className="block text-ink">Company (optional)
            <input data-autofocus value={company} onChange={(e) => setCompany(e.target.value)} className="mt-[4px] block w-full h-[34px] border border-border rounded-btn px-3" />
          </label>
          <label className="block text-ink">Area
            <select value={section} onChange={(e) => setSection(e.target.value)} className="mt-[4px] block w-full h-[34px] border border-border rounded-btn px-2 bg-white">
              {['Details', 'People', 'Ownership', 'Financials', 'Filings', 'News', 'Other'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="block text-ink">What's wrong?
            <textarea required value={text} onChange={(e) => setText(e.target.value)} rows={4} className="mt-[4px] block w-full border border-border rounded-btn px-3 py-2" />
          </label>
        </div>
        <div className="flex justify-end gap-[10px] px-[22px] py-[14px] border-t border-border">
          <button type="button" onClick={() => close('report-error')} className="h-[30px] px-[15px] border border-primary text-primary rounded-btn font-semibold">Cancel</button>
          <button type="submit" className={btnPrimary}>Submit</button>
        </div>
      </form>
    </Modal>
  );
}
