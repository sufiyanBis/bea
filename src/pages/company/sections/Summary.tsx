import { Flag } from '../../../components/ui/Flag';
import { countryName } from '../../../data/countries/iso3166';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Facebook, Info, Instagram, Link2, Linkedin, Plus, Tag, Twitter, Users } from 'lucide-react';
import type { SectionProps } from '../CompanyPage';
import type { Company } from '../../../data/types';
import { useCollectionsFor } from '../../../store/collectionsStore';
import { INDUSTRY_BY_ID } from '../../../data/taxonomies/industries';
import { SIGNAL_LABEL } from '../../../data/taxonomies/signals';
import { getCompany } from '../../../data/dataset';
import { getProfile } from '../../../data/profile/generateProfile';
import { similarIds } from '../../../data/profile/similarity';
import { formatDate, formatInt } from '../../../lib/format';
import { profilePath } from '../../../lib/nav';
import { FlagGB } from '../../../components/builder/icons';
import { Card, Chip, Delta, PairChip, SectionTitle, Sparkline, Tip } from '../ui';
import { FinancialSummary, KeyPeopleCard, MiniTimeline, SignalsCard, TransactionsSummary } from '../shared';
import { go } from '../../../lib/nav';

export function Summary({ c, p }: SectionProps) {
  const base = profilePath(c.id);
  return (
    <>
      <SectionTitle>Summary</SectionTitle>
      <div className="space-y-[16px]">
        <Briefing c={c} />
        <SignalsCard c={c} />
        <Card title="Timeline" source="filings" seeAll={`${base}/timeline`}>
          <MiniTimeline p={p} compact onSelect={() => go(`${base}/timeline`)} />
        </Card>
        <TransactionsSummary p={p} seeAll={`${base}/transactions`} />
        <DetailsSummary c={c} p={p} />
        <FinancialSummary p={p} />
        <KeyPeopleCard c={c} p={p} compact seeAll={`${base}/people`} />
        <Card title="Company news" source="news" seeAll={`${base}/news`}>
          <p className="text-[14px] text-muted mb-[6px]">Showing recent {Math.min(3, p.news.length)} of {formatInt(p.news.length)} news entries</p>
          {p.news.slice(0, 3).map((n) => (
            <div key={n.id} className="py-[10px] border-b border-card-border last:border-0">
              <a href="#" onClick={(e) => e.preventDefault()} className="text-[15px] font-medium text-ink hover:text-primary hover:underline">{n.headline}</a>
              <div className="text-[13px] text-muted">{formatDate(n.date)} • via {n.source}</div>
            </div>
          ))}
          {!p.news.length && <p className="text-[14px] text-muted">No news for this company yet.</p>}
        </Card>
        <Card title="Similar companies" seeAll={`${base}/similar-companies`}>
          <div className="grid grid-cols-3 gap-[16px]">
            {similarIds(c.id).slice(0, 3).map((id) => <SimilarCard key={id} id={id} />)}
          </div>
        </Card>
      </div>
    </>
  );
}

export function SocialIcons({ socials }: { socials: string[] }) {
  const icon = (s: string) => {
    if (s === 'Facebook') return <Facebook size={16} />;
    if (s === 'Instagram') return <Instagram size={16} />;
    if (s === 'LinkedIn') return <Linkedin size={16} />;
    if (s.startsWith('X')) return <Twitter size={16} />;
    return <span className="font-bold text-[14px]">{s[0]}</span>;
  };
  if (!socials.length) return <span className="text-muted">—</span>;
  return (
    <div className="flex gap-[6px]">
      {socials.map((s) => (
        <a key={s} href="#" onClick={(e) => e.preventDefault()} aria-label={s} title={s} className="w-[34px] h-[34px] border border-border rounded-btn flex items-center justify-center text-ink hover:border-primary hover:text-primary">
          {icon(s)}
        </a>
      ))}
    </div>
  );
}

function Briefing({ c }: { c: Company }) {
  const cols = useCollectionsFor(c.id);
  const [more, setMore] = useState(false);
  const labels = c.industries.map((id) => INDUSTRY_BY_ID.get(id)?.label ?? id);
  return (
    <Card title="Briefing" tourKey="briefing">
      <div className="flex gap-[20px]">
        <div className="flex-1 min-w-0 space-y-[10px]">
          <div className="flex flex-wrap items-center gap-x-[8px] gap-y-[4px] text-[14px] text-ink">
            <span className="inline-flex items-center gap-[5px]"><Eye size={15} className="text-bar-green" />{c.trackingStatus}</span><span className="text-muted">•</span>
            <span className="inline-flex items-center gap-[5px]"><Flag code={c.country} />{c.city !== c.headOffice ? `${c.city}, ` : ''}{c.headOffice}, {countryName(c.country)}</span><span className="text-muted">•</span>
            <span>{c.stage} stage</span>
            {c.website && <><span className="text-muted">•</span><a href={c.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-[4px] text-primary hover:underline"><Link2 size={14} />Website</a></>}
          </div>
          <p className="text-[15px] text-text line-clamp-2">{c.description}</p>
          <div className="flex flex-wrap items-center gap-[6px]">
            <span className="text-[14px] text-ink mr-[4px]">Industries</span>
            {labels.map((l) => <Chip key={l}>{l}</Chip>)}
          </div>
        </div>
        <div className="w-[300px] shrink-0 border-l border-card-border pl-[20px]">
          <div className="text-[14px] font-semibold text-ink mb-[8px]">In collections</div>
          {cols.length === 0 && <p className="text-[13px] text-muted">Not in any collections yet.</p>}
          <div className="flex flex-col gap-[6px]">
            {(more ? cols : cols.slice(0, 4)).map((col) => (
              <span key={col.id} className="inline-flex items-center gap-[6px] text-[13px] bg-chip-grey rounded-[3px] px-[8px] py-[3px] max-w-full">
                <Users size={13} className="text-muted shrink-0" />
                <span className="text-text shrink-0">{col.owner}</span>
                <a href="#" onClick={(e) => e.preventDefault()} className="underline text-ink truncate">{col.name}</a>
                {col.tag && <Tag size={12} className="text-muted shrink-0" />}
              </span>
            ))}
          </div>
          {cols.length > 4 && <button onClick={() => setMore((v) => !v)} className="mt-[8px] text-[13px] text-primary hover:underline">{more ? 'Show less' : `Show more (${cols.length - 4})`}</button>}
        </div>
      </div>
    </Card>
  );
}

function DetailsSummary({ c, p }: SectionProps) {
  const [trading, setTrading] = useState(false);
  const base = profilePath(c.id);
  const ind = c.industries.map((id) => INDUSTRY_BY_ID.get(id)!).filter(Boolean);
  const kv = (k: string, v: React.ReactNode) => (
    <div className="mb-[12px]"><div className="text-[13px] text-text mb-[3px]">{k}</div><div className="text-[14px] text-ink">{v}</div></div>
  );
  return (
    <Card title="Details" seeAll={`${base}/details`}>
      <div className="grid grid-cols-2 gap-[28px]">
        <div>
          {kv('Location', <span className="flex gap-[6px]"><Chip tone="blue">{p.locationHierarchy[0].value}</Chip><Chip>{p.locationHierarchy[0].type}</Chip></span>)}
          {kv('Head office address', <>
            <div>{p.addresses.headOffice.map((l) => <div key={l}>{l}</div>)}</div>
            <div className="text-muted text-[13px] mt-[4px]">Same as registered address</div>
            {p.addresses.trading.length > 0 && (
              <button onClick={() => setTrading((v) => !v)} className="mt-[4px] inline-flex items-center gap-[4px] text-[13px] text-primary hover:underline">
                <Plus size={13} />{trading ? 'Hide' : `${p.addresses.trading.length} trading address${p.addresses.trading.length > 1 ? 'es' : ''}`}
              </button>
            )}
            {trading && p.addresses.trading.map((a, i) => <div key={i} className="mt-[4px] text-[13px]">{a.join(', ')}</div>)}
          </>)}
          <div className="border-t border-card-border my-[12px]" />
          {kv('Website', c.website ? <a href={c.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">{c.website.replace(/^https?:\/\//, '')}</a> : '—')}
          {kv('Socials', <SocialIcons socials={p.contact.socials} />)}
        </div>
        <div>
          {kv('Industries', <span className="flex flex-wrap gap-x-[6px]">{ind.filter((i) => i.type === 'industry').map((i, k) => <span key={i.id} className="inline-flex items-center gap-[3px]">{k > 0 && <span className="text-muted mr-[3px]">•</span>}<a href="#" onClick={(e) => e.preventDefault()} className="text-primary hover:underline">{i.label}</a><Tip text={`Companies classified under ${i.label}`}><Info size={12} className="text-muted" /></Tip></span>)}</span>)}
          {kv('Buzzwords', ind.filter((i) => i.type === 'buzzword').map((i) => i.label).join(' • ') || '—')}
          {kv('Target markets', c.targetMarkets.join(' • '))}
          {kv('Technology', <span className="flex flex-col">{p.technology.map((t) => <span key={t.category}>{t.category} <span className="text-muted">({t.items.length})</span></span>)}</span>)}
          <div className="border-t border-card-border my-[12px]" />
          {kv('Corporate structure', <>
            <div>{p.corporateTree.current && p.corporateTree.children.length ? 'This company is the ultimate parent.' : p.corporateTree.current ? 'This company has no known parent or subsidiaries.' : 'This company is a subsidiary.'}</div>
            <Link to={`${base}/corporate-structure`} className="text-primary hover:underline">See {countTree(p.corporateTree)} {countTree(p.corporateTree) === 1 ? 'company' : 'companies'} in corporate structure</Link>
          </>)}
        </div>
      </div>
    </Card>
  );
}

export const countTree = (n: { children: { children: unknown[] }[] }): number => 1 + n.children.reduce((s, c) => s + countTree(c as never), 0);

export function SimilarCard({ id }: { id: string }) {
  const s = getCompany(id);
  const sp = getProfile(id);
  if (!s || !sp) return null;
  const sig = s.signals.find((x) => x.startsWith('growth:'));
  const emp = sp.financials.map((y) => y.values.employees as number);
  return (
    <article className="border border-primary/25 rounded-card p-[14px] flex flex-col min-h-[330px]">
      <div className="flex items-center gap-[10px]">
        <img src={s.logo} alt="" className="w-[40px] h-[40px] border border-border rounded-[3px]" />
        <Link to={profilePath(s.id)} className="text-[18px] font-medium text-primary hover:underline leading-tight">{s.name}</Link>
      </div>
      <div className="flex items-center gap-[6px] text-[13px] text-text mt-[8px]"><Flag code={s.country} />{countryName(s.country)}</div>
      <p className="text-[14px] text-text mt-[8px] line-clamp-3">{s.description}</p>
      {sig && <span className="mt-[8px] self-start"><Chip tone="purple">{SIGNAL_LABEL.get(sig)}</Chip></span>}
      <div className="mt-auto pt-[12px] space-y-[8px]">
        <div className="text-[13px] text-text">Industries</div>
        <div className="flex flex-wrap gap-[4px]">{s.industries.slice(0, 3).map((i) => <Chip key={i}>{INDUSTRY_BY_ID.get(i)?.label}</Chip>)}</div>
        {emp.length > 1 && (
          <div className="flex items-center gap-[10px] text-[13px]">
            <span className="text-text">Employee Count <strong className="text-ink">{formatInt(emp[emp.length - 1])}</strong></span>
            <Sparkline values={emp} width={56} height={20} />
            <Delta value={emp[emp.length - 1] - emp[emp.length - 2]} format={formatInt} />
          </div>
        )}
      </div>
    </article>
  );
}
