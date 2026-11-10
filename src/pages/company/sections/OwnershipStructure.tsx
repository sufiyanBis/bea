import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { SectionProps } from '../CompanyPage';
import { Card } from '../ui';
import { chainUp, ubos, subsidiaries, pscRegister, effectiveParentPct } from '../../../data/groups';
import { getCompany } from '../../../data/dataset';
import { countryName, flagOf } from '../../../data/countries/iso3166';
import { profilePath } from '../../../lib/nav';
import { formatDate, formatInt } from '../../../lib/format';
import { Flag } from '../../../components/ui/Flag';
import { PersonName, personPath } from '../../../components/people/PersonName';
import { SampleTag } from '../../../components/ui/Sample';

const th = 'py-[8px] px-[10px] text-left text-[13px] font-semibold text-ink border-b border-card-border';
const td = 'py-[8px] px-[10px] text-[14px] text-ink border-b border-card-border align-top';

/** Chain from the company up to its ultimate parent and on to the ultimate beneficial owners, % on every edge. */
function OwnershipChain({ c }: SectionProps) {
  const chain = chainUp(c.id);
  const top = chain[chain.length - 1].companyId;
  const owners = ubos(top);
  const topCo = getCompany(top)!;
  // layout: UBOs row on top, then companies from the ultimate parent down to this company
  const rows = [...chain].reverse();
  const W = 760, boxW = 260, boxH = 50, gap = 46;
  const uboRow = owners.length ? 1 : 0;
  const H = (rows.length + uboRow) * (boxH + gap) + 10;
  const cx = W / 2;
  const yOf = (i: number) => 10 + (i + uboRow) * (boxH + gap);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[760px] mx-auto" style={{ height: H }} role="group" data-ownership-chain
      aria-label={`Ownership chain: ${owners.map((o) => `${o.name} owns ${o.pct}% of ${topCo.name}`).join('; ')}${owners.length ? '; ' : ''}${rows.map((r) => getCompany(r.companyId)!.name).join(' owns ')}`}>
      {owners.map((o, i) => {
        const x = owners.length === 1 ? cx - boxW / 2 : i === 0 ? cx - boxW - 20 : cx + 20;
        return (
          <g key={o.personId}>
            <line x1={x + boxW / 2} y1={10 + boxH} x2={cx} y2={yOf(0)} stroke="#B61483" strokeWidth={1.5} />
            <text x={(x + boxW / 2 + cx) / 2 + 8} y={(10 + boxH + yOf(0)) / 2 + 4} fontSize={12} fill="#B61483" fontWeight={600}>{o.pct}%</text>
            <a href={personPath(o.personId)}>
              <rect x={x} y={10} width={boxW} height={boxH} rx={25} fill="#FBEAF3" stroke="#B61483" />
              <text x={x + boxW / 2} y={10 + 21} textAnchor="middle" fontSize={13} fontWeight={600} fill="#282828">{o.name}</text>
              <text x={x + boxW / 2} y={10 + 38} textAnchor="middle" fontSize={11} fill="#595959">Ultimate beneficial owner</text>
            </a>
          </g>
        );
      })}
      {rows.map((r, i) => {
        const co = getCompany(r.companyId)!;
        const y = yOf(i);
        const below = rows[i + 1];
        const isSelf = r.companyId === c.id;
        return (
          <g key={r.companyId}>
            {below && <><line x1={cx} y1={y + boxH} x2={cx} y2={y + boxH + gap} stroke="#4B4291" strokeWidth={1.5} markerEnd="url(#arrow)" />
              <text x={cx + 10} y={y + boxH + gap / 2 + 4} fontSize={12} fill="#4B4291" fontWeight={600}>{below.pctHeldByNext}% held</text></>}
            <a href={profilePath(co.id)}>
              <rect x={cx - boxW / 2} y={y} width={boxW} height={boxH} rx={4} fill={isSelf ? '#4B4291' : '#fff'} stroke="#4B4291" />
              <text x={cx} y={y + 21} textAnchor="middle" fontSize={13} fontWeight={600} fill={isSelf ? '#fff' : '#282828'}>{flagOf(co.country)} {co.name.length > 30 ? `${co.name.slice(0, 29)}…` : co.name}</text>
              <text x={cx} y={y + 38} textAnchor="middle" fontSize={11} fill={isSelf ? '#E7E5F5' : '#595959'}>{i === 0 && rows.length > 1 ? 'Ultimate parent · ' : isSelf ? 'This company · ' : 'Intermediate holding · '}{countryName(co.country)}</text>
            </a>
          </g>
        );
      })}
      <defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#4B4291" /></marker></defs>
    </svg>
  );
}

function HistoricOwnership({ p }: SectionProps) {
  const filings = p.ownership.filings;
  const [a, setA] = useState(Math.max(0, filings.length - 3));
  const [b, setB] = useState(filings.length - 1);
  const diff = useMemo(() => {
    const sum = (i: number) => { const m = new Map<string, number>(); filings[i]?.holdings.forEach((h) => m.set(h.shareholder, (m.get(h.shareholder) ?? 0) + h.shares)); return m; };
    const A = sum(a), B = sum(b);
    const totA = [...A.values()].reduce((s, x) => s + x, 0) || 1, totB = [...B.values()].reduce((s, x) => s + x, 0) || 1;
    return [...new Set([...A.keys(), ...B.keys()])].map((k) => ({ name: k, pa: ((A.get(k) ?? 0) / totA) * 100, pb: ((B.get(k) ?? 0) / totB) * 100, sa: A.get(k) ?? 0, sb: B.get(k) ?? 0 }))
      .filter((x) => Math.abs(x.pb - x.pa) >= 0.05 || !x.sa || !x.sb).sort((x, y) => Math.abs(y.pb - y.pa) - Math.abs(x.pb - x.pa)).slice(0, 25);
  }, [a, b, filings]);
  const sel = (v: number, set: (n: number) => void, label: string) => (
    <label className="inline-flex items-center gap-[6px]">{label}<select aria-label={label} value={v} onChange={(e) => set(Number(e.target.value))} className="h-[28px] border border-border rounded-btn px-2 bg-white">{filings.map((f, i) => <option key={f.date} value={i}>{formatDate(f.date)}</option>)}</select></label>
  );
  return (
    <Card title="Historic ownership" source="ownership" tourKey="historic-ownership">
      <ol className="flex items-end gap-[2px] h-[40px] mb-[10px]" aria-label="Ownership filings over time">
        {filings.map((f, i) => <li key={f.date} title={`${formatDate(f.date)}: ${f.holdings.length} holdings`} className={`flex-1 rounded-t-[2px] ${i === a || i === b ? 'bg-primary' : 'bg-[#D9D6EE]'}`} style={{ height: `${20 + Math.min(80, f.holdings.length / 4)}%` }} />)}
      </ol>
      <div className="flex items-center gap-[14px] text-[14px] mb-[8px]" data-compare-dates>{sel(a, setA, 'Compare')}{sel(b, setB, 'with')}<span className="text-text">{diff.length} changed holders (largest changes first)</span></div>
      <table className="w-full"><thead><tr><th className={th}>Shareholder</th><th className={`${th} text-right`}>{formatDate(filings[a].date)}</th><th className={`${th} text-right`}>{formatDate(filings[b].date)}</th><th className={`${th} text-right`}>Change</th></tr></thead>
        <tbody>{diff.map((d) => (
          <tr key={d.name}><td className={td}>{d.name}{!d.sa ? <span className="ml-[6px] text-[11px] font-semibold text-[#1E6B34]">NEW</span> : !d.sb ? <span className="ml-[6px] text-[11px] font-semibold text-[#9B1C1C]">EXITED</span> : null}</td>
            <td className={`${td} text-right tabular-nums`}>{d.pa.toFixed(2)}%</td><td className={`${td} text-right tabular-nums`}>{d.pb.toFixed(2)}%</td>
            <td className={`${td} text-right tabular-nums ${d.pb - d.pa > 0 ? 'text-delta-up' : 'text-delta-down'}`}>{d.pb - d.pa > 0 ? '+' : ''}{(d.pb - d.pa).toFixed(2)} pts</td></tr>
        ))}{!diff.length && <tr><td colSpan={4} className={`${td} text-text`}>No changes between these dates.</td></tr>}</tbody></table>
    </Card>
  );
}

export function OwnershipStructure(props: SectionProps) {
  const { c, p } = props;
  const pscs = useMemo(() => pscRegister(c, p), [c, p]);
  const subs = subsidiaries(c.id);
  const controlling = subs.filter((s) => s.effective > 50);
  const chain = chainUp(c.id);
  return (
    <div className="space-y-[16px] mb-[16px]" data-ownership-structure>
      <Card title={<>Ownership chain to ultimate beneficial owners<SampleTag /></>} source="ownership">
        {chain.length > 1 || ubos(c.id).length ? <OwnershipChain {...props} /> : <p className="text-[14px] text-text">{c.name} is not owned by another company in our data. {ubos(c.id).length ? '' : 'No individual is recorded with more than 25%; see the PSC register below.'}</p>}
        {chain.length > 1 && <p className="text-[13px] text-text mt-[8px]">Effective ownership by the ultimate parent: <strong className="text-ink">{effectiveParentPct(c.id).toFixed(1)}%</strong> (product of the % held at each level).</p>}
      </Card>
      <Card title="People with significant control and beneficial owners" source="ownership">
        <table className="w-full" data-psc-table>
          <thead><tr><th className={th}>Name</th><th className={th}>Type</th><th className={th}>Nature of control</th><th className={th}>Notified</th><th className={th}>Ceased</th></tr></thead>
          <tbody>{pscs.map((x, i) => (
            <tr key={i} className={x.ceased ? 'text-muted' : ''}>
              <td className={td}><span className="inline-flex items-center gap-[5px]"><Flag code={x.country} className="text-[13px]" />{x.personId ? <PersonName id={x.personId} name={x.name} /> : x.companyId ? <Link to={profilePath(x.companyId)} className="text-primary hover:underline">{x.name}</Link> : x.name}</span></td>
              <td className={`${td} capitalize`}>{x.kind}</td>
              <td className={td}><ul className="list-disc pl-[16px]">{x.natures.map((n) => <li key={n}>{n}</li>)}</ul></td>
              <td className={td}>{formatDate(x.notified)}</td>
              <td className={td}>{x.ceased ? formatDate(x.ceased) : '—'}</td>
            </tr>
          ))}{!pscs.length && <tr><td colSpan={5} className={`${td} text-text`}>No PSCs recorded: no person or entity holds more than 25%.</td></tr>}</tbody>
        </table>
      </Card>
      <div className="grid grid-cols-2 gap-[16px] items-start">
        <Card title={`Controlling interests (${controlling.length})`} source="ownership">
          {controlling.length ? <ul className="text-[14px] space-y-[6px]" data-controlling>{controlling.map((s) => { const co = getCompany(s.companyId)!; return <li key={s.companyId} className="flex items-center gap-[6px]"><Flag code={co.country} className="text-[13px]" /><Link to={profilePath(co.id)} className="text-primary hover:underline">{co.name}</Link><span className="text-text">· {s.effective.toFixed(1)}% effective control</span></li>; })}</ul>
            : <p className="text-[14px] text-text">{c.name} does not control other companies in our data.</p>}
        </Card>
        <Card title={`Subsidiaries (${subs.length})`} source="ownership">
          <table className="w-full" data-subsidiaries><thead><tr><th className={th}>Company</th><th className={th}>Country</th><th className={`${th} text-right`}>% held</th><th className={th}>Holding</th></tr></thead>
            <tbody>{subs.map((s) => { const co = getCompany(s.companyId)!; return <tr key={s.companyId}><td className={td}><Link to={profilePath(co.id)} className="text-primary hover:underline">{co.name}</Link></td><td className={td}><span className="inline-flex items-center gap-[5px]"><Flag code={co.country} className="text-[13px]" />{countryName(co.country)}</span></td><td className={`${td} text-right tabular-nums`}>{s.direct ? s.pct : s.effective.toFixed(1)}%</td><td className={td}>{s.direct ? 'Direct' : `Indirect via ${getCompany(s.parentId)?.name}`}</td></tr>; })}
              {!subs.length && <tr><td colSpan={4} className={`${td} text-text`}>No subsidiaries.</td></tr>}</tbody></table>
        </Card>
      </div>
      {p.ownership.filings.length > 1 && <HistoricOwnership {...props} />}
      <p className="text-[12px] text-muted">Ownership of {formatInt(p.ownership.filings.at(-1)?.holdings.length ?? 0)} holdings in the latest filing is shown below.</p>
    </div>
  );
}
