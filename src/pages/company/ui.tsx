import type { DatasetId } from '../../config/tender';
import { SourceFooter, useProvenance, SECTION_DATASET } from './provenance';
import { coverageFor } from '../../config/tender';
import { SampleTag } from '../../components/ui/Sample';
import { personIdFor } from '../../data/persons';
import { PersonName } from '../../components/people/PersonName';
import { ReactNode, useState } from 'react';
import { create } from 'zustand';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronDown, ChevronUp, Copy, Info, Linkedin, Share2, X } from 'lucide-react';
import type { Investor, Person, Seg } from '../../data/profile/types';
import { FlagDE, FlagGB } from '../../components/builder/icons';
import { pageCount, pageItems } from '../../query/sort';
import { CompactSelect } from '../../components/ui/CompactSelect';

// ---------------------------------------------------------------- layout
export function Card({ title, children, actions, seeAll, className = '', bodyClass = '', tourKey, info, source }: {
  title?: ReactNode; children: ReactNode; actions?: ReactNode; seeAll?: string; className?: string; bodyClass?: string; tourKey?: string; info?: string;
  /** dataset for the provenance footer; defaults to the section's dataset; false hides it */
  source?: DatasetId | false;
}) {
  return (
    <section className={`bg-surface border border-card-border rounded-card ${className}`} data-tour={tourKey}>
      {(title || actions || seeAll) && (
        <header className="flex items-center justify-between gap-3 px-[15px] pt-[13px] pb-[10px] border-b border-card-border">
          <h3 className="text-[15px] font-semibold text-ink flex items-center gap-[6px]">
            {title}
            {info && <Tip text={info}><Info size={14} className="text-muted" /></Tip>}
          </h3>
          <div className="flex items-center gap-[10px]">
            {actions}
            {seeAll && <SeeAll to={seeAll} />}
          </div>
        </header>
      )}
      <div className={`p-[15px] ${bodyClass}`}>{children}</div>
      {source !== false && <SourceFooter dataset={source || undefined} cardKey={typeof title === 'string' ? title : undefined} />}
    </section>
  );
}

export function SeeAll({ to }: { to: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-[4px] text-[14px] font-semibold text-primary hover:underline whitespace-nowrap">
      See all <ArrowRight size={14} />
    </Link>
  );
}

export function SectionTitle({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  const ctx = useProvenance();
  // "Data available from {year}": the later of the coverage declared for this dataset/country and incorporation
  const from = ctx ? Math.max(coverageFor(SECTION_DATASET[ctx.section], ctx.c.country).value.from, Number(ctx.p.incorporationDate.slice(0, 4))) : null;
  return (
    <div className="flex items-center justify-between mb-[14px]">
      <h2 className="text-[22px] font-normal text-ink flex items-center gap-[10px]" data-tour="section-title">
        {children}
        {from && <span className="inline-flex items-center text-[12px] font-semibold text-badge-blue-text bg-chip-blue rounded-full px-[9px] py-[2px]" data-available-from title="From the coverage matrix on Data sources & methodology">Data available from {from}<SampleTag className="!ml-[5px]" /></span>}
      </h2>
      {actions}
    </div>
  );
}

/** Label / value rows with 1px borders; label column ~45%. */
export function KeyValueTable({ rows, labelWidth = '45%' }: { rows: [ReactNode, ReactNode][]; labelWidth?: string }) {
  return (
    <table className="w-full text-[15px] border-collapse">
      <tbody>
        {rows.map(([k, v], i) => (
          <tr key={i} className="border-b border-card-border last:border-b-0 align-top">
            <th scope="row" className="text-left font-normal text-text py-[9px] pr-3" style={{ width: labelWidth }}>{k}</th>
            <td className="py-[9px] text-ink">{v ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="text-center py-[22px]">
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {children && <p className="text-[14px] text-muted mt-[4px]">{children}</p>}
    </div>
  );
}

export function InfoBar({ children }: { children: ReactNode }) {
  return <div className="bg-chip-blue border-l-4 border-bar-blue rounded-[3px] px-[14px] py-[10px] text-[14px] text-ink">{children}</div>;
}

// ---------------------------------------------------------------- chips & badges
export function Chip({ children, tone = 'grey', className = '' }: { children: ReactNode; tone?: 'grey' | 'blue' | 'purple'; className?: string }) {
  const t = tone === 'blue' ? 'bg-chip-blue text-ink' : tone === 'purple' ? 'bg-collections-btn text-primary' : 'bg-chip-grey text-ink';
  return <span className={`inline-flex items-center gap-[5px] px-[8px] py-[2px] rounded-[3px] text-[13px] ${t} ${className}`}>{children}</span>;
}

export function PairChip({ value, type }: { value: ReactNode; type: string }) {
  return (
    <span className="inline-flex text-[13px] rounded-[3px] overflow-hidden">
      <span className="bg-chip-blue text-ink px-[8px] py-[2px]">{value}</span>
      <span className="bg-chip-grey text-text px-[8px] py-[2px]">{type}</span>
    </span>
  );
}

export type BadgeTone = 'blue' | 'green' | 'pink' | 'red' | 'orange' | 'grey';
export function TypeBadge({ children, tone }: { children: ReactNode; tone: BadgeTone }) {
  const t: Record<BadgeTone, string> = {
    blue: 'bg-badge-blue text-badge-blue-text', green: 'bg-badge-green text-badge-green-text', pink: 'bg-badge-pink text-badge-pink-text',
    red: 'bg-badge-red text-badge-red-text', orange: 'bg-badge-orange text-badge-orange-text', grey: 'bg-chip-grey text-text',
  };
  return <span className={`inline-block px-[7px] py-[1px] rounded-[3px] text-[12px] font-semibold whitespace-nowrap ${t[tone]}`}>{children}</span>;
}

export const STAGE_TAG: Record<string, string> = { Established: 'bg-[#333] text-white', Growth: 'bg-bar-magenta text-white', Venture: 'bg-[#3F7DB6] text-white', Seed: 'bg-[#50A198] text-white', Exited: 'bg-bar-green text-white', Zombie: 'bg-[#E0662E] text-white', Dead: 'bg-[#ccc] text-ink' };
export function StageTag({ stage }: { stage: string }) {
  return <span className={`inline-block px-[7px] py-[1px] rounded-[3px] text-[12px] font-semibold ${STAGE_TAG[stage] ?? 'bg-chip-grey'}`}>{stage}</span>;
}

/** Big number in a pale-yellow ring with a yellow value tag overlapping its bottom edge. */
export function KpiCapsule({ value, tag, caption }: { value: ReactNode; tag: ReactNode; caption: string }) {
  return (
    <div className="flex flex-col items-center text-center w-[150px]">
      <div className="relative w-[96px] h-[96px] rounded-full border-[3px] border-[#F8F3A6] flex items-center justify-center">
        <span className="text-[30px] font-bold text-ink">{value}</span>
        <span className="absolute -bottom-[11px] left-1/2 -translate-x-1/2 bg-money-yellow text-ink text-[13px] font-semibold px-[8px] py-[1px] rounded-[3px] whitespace-nowrap">{tag}</span>
      </div>
      <span className="text-[13px] text-text mt-[18px]">{caption}</span>
    </div>
  );
}

/** Tiny SVG sparkline with point dots. */
export function Sparkline({ values, width = 90, height = 26, color }: { values: number[]; width?: number; height?: number; color?: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [3 + (i * (width - 6)) / (values.length - 1), height - 3 - ((v - min) / span) * (height - 6)]);
  const up = values[values.length - 1] >= values[values.length - 2];
  const c = color ?? (up ? '#2DB84B' : '#D7263D');
  return (
    <svg width={width} height={height} aria-hidden className="block">
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={c} strokeWidth={1.5} />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={2.2} fill={c} />)}
    </svg>
  );
}

export function Delta({ value, format }: { value: number; format: (n: number) => string }) {
  if (!value) return null;
  const up = value > 0;
  return (
    <span className={`inline-flex items-center gap-[2px] text-[13px] font-semibold ${up ? 'text-delta-up' : 'text-delta-down'}`}>
      {up ? <ChevronUp size={13} strokeWidth={3} /> : <ChevronDown size={13} strokeWidth={3} />}
      {format(Math.abs(value))}
    </span>
  );
}

export function SegmentedToggle<T extends string>({ value, options, onChange, size = 'md' }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; size?: 'sm' | 'md' }) {
  return (
    <div className="inline-flex border border-tab-active rounded-btn overflow-hidden" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`${size === 'sm' ? 'h-[26px] px-[10px] text-[13px]' : 'h-[30px] px-[14px] text-[14px]'} font-semibold ${value === o.value ? 'bg-tab-active text-white' : 'bg-white text-ink hover:bg-page'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- tooltips, copy, toast
export function Tip({ text, children, dark = true }: { text: ReactNode; children: ReactNode; dark?: boolean }) {
  return (
    <span className="relative inline-flex group/tip">
      {children}
      <span role="tooltip" className={`pointer-events-none absolute z-30 left-1/2 -translate-x-1/2 bottom-[calc(100%+6px)] w-max max-w-[300px] px-[9px] py-[6px] rounded-[4px] text-[12px] leading-snug font-normal opacity-0 group-hover/tip:opacity-100 transition-opacity ${dark ? 'bg-[#2b2b2b] text-white' : 'bg-white text-ink border border-border shadow'}`}>
        {text}
      </span>
    </span>
  );
}

export function CopyButton({ text, label = 'Copy email' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); } catch { /* clipboard may be blocked; still show feedback */ }
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  };
  return (
    <span className="relative inline-flex">
      <button onClick={copy} aria-label={label} className="text-muted hover:text-primary p-[2px]">{done ? <Check size={14} className="text-delta-up" /> : <Copy size={14} />}</button>
      {done && <span className="absolute left-1/2 -translate-x-1/2 -top-[26px] bg-[#2b2b2b] text-white text-[11px] px-[6px] py-[2px] rounded-[3px]" role="status">Copied</span>}
    </span>
  );
}

interface ToastState { msg: string | null; action?: { label: string; run: () => void }; show: (msg: string, action?: ToastState['action']) => void; hide: () => void }
let toastTimer: ReturnType<typeof setTimeout> | undefined;
export const useToast = create<ToastState>((set) => ({
  msg: null,
  show: (msg, action) => { clearTimeout(toastTimer); set({ msg, action }); toastTimer = setTimeout(() => set({ msg: null, action: undefined }), 5000); },
  hide: () => set({ msg: null, action: undefined }),
}));
export function Toasts() {
  const { msg, action, hide } = useToast();
  if (!msg) return null;
  return (
    <div role="status" className="fixed left-1/2 -translate-x-1/2 bottom-[24px] z-[80] bg-[#2b2b2b] text-white text-[14px] rounded-[4px] shadow-lg px-[16px] py-[10px] flex items-center gap-[14px] animate-fadein">
      {msg}
      {action && <button onClick={() => { action.run(); hide(); }} className="font-semibold text-tour-yellow hover:underline">{action.label}</button>}
      <button onClick={hide} aria-label="Dismiss" className="text-white/70 hover:text-white"><X size={14} /></button>
    </div>
  );
}

// ---------------------------------------------------------------- people, investors, flags
export function Flag({ country }: { country: string }) {
  if (country === 'GB') return <FlagGB />;
  if (country === 'DE') return <FlagDE />;
  const stripes: Record<string, string[]> = { US: ['#B22234', '#fff', '#B22234', '#fff', '#B22234'], NL: ['#AE1C28', '#fff', '#21468B'], SG: ['#EF3340', '#fff'], AE: ['#00732F', '#fff', '#000'] };
  const s = stripes[country] ?? ['#ccc', '#eee'];
  return (
    <svg viewBox={`0 0 18 ${s.length * 3}`} className="inline-block w-[18px] h-[12px] shrink-0" preserveAspectRatio="none" aria-label={country}>
      {s.map((c, i) => <rect key={i} y={i * 3} width="18" height="3" fill={c} />)}
      {country === 'US' && <rect width="8" height="7" fill="#3C3B6E" />}
    </svg>
  );
}

export function DegreeIcon({ degree }: { degree: Person['degree'] }) {
  if (!degree) return null;
  return (
    <span className="inline-flex items-center gap-[3px] text-[12px] text-muted ml-[6px]" title={`${degree} degree connection`}>
      <Share2 size={12} /> {degree}
    </span>
  );
}

export function PersonLink({ name, degree, className = '', personId }: { name: string; degree?: Person['degree']; className?: string; personId?: string }) {
  const ctx = useProvenance();
  const id = personId ?? (ctx ? personIdFor(ctx.c.id, name) : undefined);
  return (
    <span className="inline-flex items-center">
      {id ? <PersonName id={id} name={name} className={className} /> : <span className={`text-ink ${className}`}>{name}</span>}
      {degree !== undefined && <DegreeIcon degree={degree} />}
    </span>
  );
}

export function LinkedInIcon({ known = true }: { known?: boolean }) {
  return <Linkedin size={15} className={known ? 'text-ink' : 'text-[#C9C9C9]'} aria-label={known ? 'LinkedIn profile' : 'No LinkedIn profile'} />;
}

export function InvestorLine({ inv }: { inv: Investor }) {
  if (inv.name === 'Undisclosed investors') return <span className="text-muted">Undisclosed investors</span>;
  return (
    <div className="flex items-center gap-[6px] flex-wrap text-[14px]">
      <Flag country={inv.country} />
      <span className={`w-[7px] h-[7px] rounded-full ${inv.hasProfile ? 'bg-delta-up' : 'bg-[#BDBDBD]'}`} title={inv.hasProfile ? 'Has a profile' : 'No profile'} />
      <a href="#" onClick={(e) => e.preventDefault()} className="text-primary hover:underline">{inv.name}</a>
      {inv.managedBy && <span className="text-muted text-[13px]">managed by {inv.managedBy}</span>}
    </div>
  );
}

/** Render rich text segments with purple links. */
export function Segs({ parts }: { parts: Seg[] }) {
  return (
    <>
      {parts.map((p, i) =>
        typeof p === 'string' ? <span key={i}>{p}</span> : p.kind === 'company' && p.id ? (
          <Link key={i} to={`/companies/${p.id}`} className="text-primary underline underline-offset-2">{p.t}</Link>
        ) : p.kind === 'person' ? (
          <PersonLink key={i} name={p.t} personId={p.id} />
        ) : (
          <a key={i} href="#" onClick={(e) => e.preventDefault()} className="text-primary underline underline-offset-2">{p.t}{p.kind === 'filing' ? ' ⧉' : ''}</a>
        ),
      )}
    </>
  );
}

// ---------------------------------------------------------------- pager & sortable header
export function Pager({ total, page, size, onPage, onSize, sizes = [10, 20, 50, 100] }: { total: number; page: number; size: number; onPage: (p: number) => void; onSize?: (n: number) => void; sizes?: number[] }) {
  const pages = pageCount(total, size);
  const nav = 'h-[28px] px-[8px] text-[14px] rounded-btn';
  return (
    <nav className="flex items-center gap-[3px] text-[14px]" aria-label="Pagination">
      <button className={`${nav} ${page === 1 ? 'text-muted cursor-default' : 'text-primary hover:bg-primary-light'}`} disabled={page === 1} onClick={() => onPage(page - 1)}>Prev</button>
      {pageItems(page, pages).map((p, i) =>
        p === '…' ? <span key={`e${i}`} className="px-[4px] text-text">…</span> : (
          <button key={p} onClick={() => onPage(p)} aria-current={p === page ? 'page' : undefined} className={`min-w-[28px] h-[28px] px-[6px] rounded-btn ${p === page ? 'bg-tab-active text-white' : 'text-primary hover:bg-primary-light'}`}>{p}</button>
        ),
      )}
      <button className={`${nav} ${page === pages ? 'text-muted cursor-default' : 'text-primary hover:bg-primary-light'}`} disabled={page === pages} onClick={() => onPage(page + 1)}>Next</button>
      {onSize && (
        <>
          <span className="mx-[6px] h-[18px] w-px bg-border" />
          <span className="text-text mr-[4px]">Show</span>
          <CompactSelect ariaLabel="Rows per page" value={String(size)} onChange={(v) => onSize(Number(v))} options={sizes.map((s) => ({ value: String(s), label: String(s) }))} />
        </>
      )}
    </nav>
  );
}

export function SortTh({ label, active, dir, onClick, align = 'left', className = '' }: { label: ReactNode; active: boolean; dir: 'asc' | 'desc'; onClick: () => void; align?: 'left' | 'right'; className?: string }) {
  return (
    <th className={`py-[9px] px-[10px] text-[14px] font-semibold text-ink ${align === 'right' ? 'text-right' : 'text-left'} ${className}`} aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button onClick={onClick} className={`inline-flex items-center gap-[3px] hover:text-primary ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        {label}
        <span className="inline-flex flex-col -space-y-[5px]" aria-hidden>
          <ChevronUp size={10} strokeWidth={3} className={active && dir === 'asc' ? 'text-ink' : 'text-[#C4C4C4]'} />
          <ChevronDown size={10} strokeWidth={3} className={active && dir === 'desc' ? 'text-ink' : 'text-[#C4C4C4]'} />
        </span>
      </button>
    </th>
  );
}

export function useSort<K extends string>(initial: K, initialDir: 'asc' | 'desc' = 'asc') {
  const [key, setKey] = useState<K>(initial);
  const [dir, setDir] = useState<'asc' | 'desc'>(initialDir);
  const toggle = (k: K) => { if (k === key) setDir(dir === 'asc' ? 'desc' : 'asc'); else { setKey(k); setDir('asc'); } };
  return { key, dir, toggle };
}
