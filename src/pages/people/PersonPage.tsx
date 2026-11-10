import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, type SimulationNodeDatum, type SimulationLinkDatum } from 'd3-force';
import { AlertTriangle, Columns3, List, Share2 } from 'lucide-react';
import { PageShell, Panel, btnOutline, th, td } from '../../components/layout/PageShell';
import { SampleTag } from '../../components/ui/Sample';
import { Flag } from '../../components/ui/Flag';
import { getPerson, currentAppointments, previousAppointments, isInsolvent, type Person } from '../../data/persons';
import { getCompany } from '../../data/dataset';
import type { Company } from '../../data/types';
import { countryName } from '../../data/countries/iso3166';
import { profilePath } from '../../lib/nav';
import { formatDate } from '../../lib/format';
import { useCompare, comparePath, MAX_COMPARE } from '../../store/compareStore';
import { ExportMenu } from '../../export/ExportMenu';
import type { ExportSpec } from '../../export/types';
import { personPath, PersonName } from '../../components/people/PersonName';
import { MonitorButton } from '../../monitoring/MonitorButton';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const TODAY = '2024-11-15';

function CompanyCell({ c }: { c?: Company }) {
  if (!c) return <span>—</span>;
  return <Link to={profilePath(c.id)} className="inline-flex items-center gap-[6px] text-primary hover:underline font-semibold"><Flag code={c.country} className="text-[13px]" />{c.name}</Link>;
}

export function personSpec(p: Person): ExportSpec {
  const row = (a: Person['appointments'][number]) => { const c = getCompany(a.companyId); return { company: c?.name ?? a.companyId, country: c ? countryName(c.country) : '', role: a.role, appointed: a.appointed, resigned: a.resigned ?? null, status: c?.chStatus ?? '' }; };
  const cols = [{ key: 'company', label: 'Company', width: 36 }, { key: 'country', label: 'Country' }, { key: 'role', label: 'Role' }, { key: 'appointed', label: 'Appointed', format: 'date' as const }, { key: 'resigned', label: 'Resigned', format: 'date' as const }, { key: 'status', label: 'Company status' }];
  return {
    title: `${p.name}: appointments`, subtitle: `Born ${MONTHS[p.birthMonth - 1]} ${p.birthYear} · resident in ${countryName(p.country)}`, viewPath: personPath(p.id), sources: ['companies-house', 'cro', 'national-registers'],
    sheets: [
      { name: 'Current appointments', columns: cols, rows: currentAppointments(p).map(row) },
      { name: 'Previous appointments', columns: cols, rows: previousAppointments(p).map(row) },
      { name: 'Other positions', columns: [{ key: 'kind', label: 'Position' }, { key: 'company', label: 'Company', width: 36 }, { key: 'detail', label: 'Detail', width: 40 }, { key: 'since', label: 'Since', format: 'date' }], rows: p.positions.map((x) => ({ kind: x.kind, company: getCompany(x.companyId)?.name ?? x.companyId, detail: x.detail, since: x.since })) },
    ],
  };
}

export default function PersonPage() {
  const { id = '' } = useParams();
  const p = getPerson(id);
  const setCompare = useCompare((s) => s.set);
  const navigate = useNavigate();
  const [listView, setListView] = useState(false);
  if (!p) {
    return <PageShell title="Person not found"><p className="text-text">We couldn't find a person with the id “{id}”. <Link to="/" className="text-primary underline">Back to search</Link></p></PageShell>;
  }
  const cur = currentAppointments(p), prev = previousAppointments(p);
  const insolvent = p.appointments.map((a) => getCompany(a.companyId)).filter((c): c is Company => !!c && isInsolvent(c));
  return (
    <PageShell
      title={p.name}
      wide
      crumbs={[{ label: 'Home', to: '/' }, { label: 'People' }, { label: p.name }]}
      actions={
        <div className="flex items-center gap-[8px]">
          <button className={btnOutline} data-person-compare onClick={() => { setCompare(cur.map((a) => a.companyId).slice(0, MAX_COMPARE)); navigate(comparePath(cur.map((a) => a.companyId).slice(0, MAX_COMPARE))); }} disabled={!cur.length}><Columns3 size={15} />Compare their companies</button>
          <MonitorButton target={{ kind: 'person', id: p.id, label: p.name }} />
          <ExportMenu label="Export" build={() => personSpec(p)} filename={`person-${p.id}`} />
        </div>
      }
    >
      <div className="grid grid-cols-4 gap-[12px] mb-[16px]" data-person-header>
        {[
          ['Born', `${MONTHS[p.birthMonth - 1]} ${p.birthYear}`],
          ['Country of residence', <span key="c" className="inline-flex items-center gap-[6px]"><Flag code={p.country} />{countryName(p.country)}</span>],
          ['Current appointments', String(cur.length)],
          ['Previous appointments', String(prev.length)],
        ].map(([k, v]) => <div key={String(k)} className="bg-white border border-card-border rounded-card p-[14px]"><div className="text-[13px] text-text">{k}</div><div className="text-[20px] font-semibold text-ink">{v}</div></div>)}
      </div>
      {(p.disqualified || insolvent.length > 0) && (
        <div className="mb-[16px] bg-[#FDF3F2] border border-[#F3C9C5] rounded-card px-[16px] py-[12px] text-[14px]" data-person-flags>
          <div className="flex items-center gap-[8px] font-semibold text-[#9B1C1C]"><AlertTriangle size={16} />Flags<SampleTag note="Sample flags generated for the client demo." /></div>
          <ul className="list-disc pl-[22px] mt-[4px] text-ink">
            {p.disqualified && <li>Disqualified director from {formatDate(p.disqualified.from)} to {formatDate(p.disqualified.to)}: {p.disqualified.reason}</li>}
            {insolvent.map((c) => <li key={c.id}>Appointment at a company that entered insolvency: <CompanyCell c={c} /> ({c.chStatus})</li>)}
          </ul>
        </div>
      )}
      <div className="grid grid-cols-2 gap-[16px] items-start">
        <Panel title={`Current appointments (${cur.length})`} bodyClass="">
          <table className="w-full border-collapse" data-current-appointments>
            <thead><tr>{['Company', 'Role', 'Appointed', 'Company status'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>{cur.map((a) => { const c = getCompany(a.companyId); return <tr key={a.companyId}><td className={td}><CompanyCell c={c} /></td><td className={td}>{a.role}</td><td className={td}>{formatDate(a.appointed)}</td><td className={td}>{c?.chStatus}</td></tr>; })}
              {!cur.length && <tr><td colSpan={4} className={`${td} text-text`}>No current appointments.</td></tr>}</tbody>
          </table>
        </Panel>
        <Panel title={`Previous appointments (${prev.length})`} bodyClass="">
          <table className="w-full border-collapse" data-previous-appointments>
            <thead><tr>{['Company', 'Role', 'Appointed', 'Resigned', 'Company status'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>{prev.map((a) => { const c = getCompany(a.companyId); return <tr key={a.companyId}><td className={td}><CompanyCell c={c} /></td><td className={td}>{a.role}</td><td className={td}>{formatDate(a.appointed)}</td><td className={td}>{formatDate(a.resigned!)}</td><td className={td}>{c?.chStatus}</td></tr>; })}
              {!prev.length && <tr><td colSpan={5} className={`${td} text-text`}>No previous appointments.</td></tr>}</tbody>
          </table>
        </Panel>
        <Panel title="Other positions" className="col-span-2" bodyClass="">
          <table className="w-full border-collapse" data-other-positions>
            <thead><tr>{['Position', 'Company', 'Detail', 'Since'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>{p.positions.map((x, i) => <tr key={i}><td className={`${td} font-semibold`}>{x.kind === 'PSC' ? 'Person with significant control' : x.kind}</td><td className={td}><CompanyCell c={getCompany(x.companyId)} /></td><td className={td}>{x.detail}</td><td className={td}>{formatDate(x.since)}</td></tr>)}
              {!p.positions.length && <tr><td colSpan={4} className={`${td} text-text`}>No shareholdings, PSC interests or secretary roles recorded.</td></tr>}</tbody>
          </table>
        </Panel>
        <Panel title="Appointments timeline" className="col-span-2"><AppointmentsGantt p={p} /></Panel>
        <Panel title="Network: companies and co-directors" className="col-span-2"
          actions={<button className="inline-flex items-center gap-[5px] text-[14px] text-primary font-semibold" onClick={() => setListView((v) => !v)} aria-pressed={listView} data-network-toggle>{listView ? <><Share2 size={14} />View as graph</> : <><List size={14} />View as list</>}</button>}>
          <Network p={p} listView={listView} />
        </Panel>
      </div>
    </PageShell>
  );
}

function AppointmentsGantt({ p }: { p: Person }) {
  const rows = p.appointments.map((a) => ({ a, c: getCompany(a.companyId) })).sort((x, y) => x.a.appointed.localeCompare(y.a.appointed));
  const option = useMemo(() => ({
    tooltip: { formatter: (params: { data: number[] }) => { const r = rows[params.data[0]]; return `${r.c?.name}<br/>${formatDate(r.a.appointed)} to ${r.a.resigned ? formatDate(r.a.resigned) : 'present'}`; } },
    grid: { left: 200, right: 30, top: 10, bottom: 30 },
    xAxis: { type: 'time', min: `${Math.min(...rows.map((r) => Number(r.a.appointed.slice(0, 4))))}-01-01`, max: TODAY },
    yAxis: { type: 'category', data: rows.map((r) => r.c?.name ?? ''), inverse: true, axisLabel: { width: 180, overflow: 'truncate' } },
    series: [{
      type: 'custom',
      renderItem: (_: unknown, api: { value: (i: number) => number; coord: (v: [number, number]) => [number, number]; size: (v: [number, number]) => [number, number] }) => {
        const i = api.value(0);
        const start = api.coord([api.value(1), i]);
        const end = api.coord([api.value(2), i]);
        const h = api.size([0, 1])[1] * 0.5;
        return { type: 'rect', shape: { x: start[0], y: start[1] - h / 2, width: Math.max(2, end[0] - start[0]), height: h }, style: { fill: rows[i].a.resigned ? '#B9B4DA' : '#4B4291' } };
      },
      encode: { x: [1, 2], y: 0 },
      data: rows.map((r, i) => [i, +new Date(r.a.appointed), +new Date(r.a.resigned ?? TODAY)]),
    }],
    aria: { enabled: true, description: `Appointments of ${p.name}: ${rows.map((r) => `${r.c?.name} from ${r.a.appointed} to ${r.a.resigned ?? 'present'}`).join('; ')}` },
  }), [rows, p.name]);
  return <><ReactECharts option={option} notMerge style={{ height: Math.max(120, rows.length * 34 + 50) }} /><p className="text-[12px] text-muted">Dark bars are current appointments; light bars are previous ones.</p></>;
}

interface N extends SimulationNodeDatum { id: string; kind: 'self' | 'company' | 'person'; label: string; to: string }

function Network({ p, listView }: { p: Person; listView: boolean }) {
  const navigate = useNavigate();
  const { nodes, links, groups } = useMemo(() => {
    const nodes: N[] = [{ id: p.id, kind: 'self', label: p.name, to: personPath(p.id) }];
    const links: SimulationLinkDatum<N>[] = [];
    const seen = new Set([p.id]);
    const groups: { company: Company; people: { id: string; name: string }[] }[] = [];
    for (const a of p.appointments) {
      const c = getCompany(a.companyId);
      if (!c || nodes.length >= 60) continue;
      nodes.push({ id: c.id, kind: 'company', label: c.name, to: profilePath(c.id) });
      links.push({ source: p.id, target: c.id });
      const co: { id: string; name: string }[] = [];
      for (const d of c.directors) {
        if (!d.personId || d.personId === p.id) continue;
        co.push({ id: d.personId, name: d.name });
        if (nodes.length >= 60) continue;
        if (!seen.has(d.personId)) { seen.add(d.personId); nodes.push({ id: d.personId, kind: 'person', label: d.name, to: personPath(d.personId) }); }
        links.push({ source: c.id, target: d.personId });
      }
      groups.push({ company: c, people: co });
    }
    const sim = forceSimulation(nodes).force('link', forceLink<N, SimulationLinkDatum<N>>(links).id((n) => n.id).distance(70)).force('charge', forceManyBody().strength(-220)).force('center', forceCenter(450, 210)).force('collide', forceCollide(28)).stop();
    for (let i = 0; i < 300; i++) sim.tick();
    // fit the layout into a fixed 900×460 canvas so labels stay readable
    const xs = nodes.map((n) => n.x ?? 0), ys = nodes.map((n) => n.y ?? 0);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    nodes.forEach((n) => { n.x = 70 + ((n.x! - x0) / Math.max(1, x1 - x0)) * 760; n.y = 40 + ((n.y! - y0) / Math.max(1, y1 - y0)) * 380; });
    return { nodes, links, groups };
  }, [p]);

  if (listView) {
    return (
      <ul className="space-y-[10px] text-[14px]" data-network-list aria-label="Network as a list">
        {groups.map((g) => (
          <li key={g.company.id}>
            <CompanyCell c={g.company} />
            <span className="text-text"> · co-directors: </span>
            {g.people.length ? g.people.map((x, i) => <span key={x.id}>{i > 0 && ', '}<PersonName id={x.id} name={x.name} /></span>) : <span className="text-muted">none</span>}
          </li>
        ))}
      </ul>
    );
  }
  const vb = '0 0 900 460';
  const color = { self: '#E0662E', company: '#4B4291', person: '#467BAD' };
  return (
    <div>
      <svg viewBox={vb} className="w-full h-[460px]" role="group" aria-label={`Network graph of ${p.name}: ${nodes.length - 1} companies and co-directors. Use View as list for an accessible version.`} data-network-graph>
        {links.map((l, i) => { const s = l.source as N, t = l.target as N; return <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="#C9C9C9" strokeWidth={1.2} />; })}
        {nodes.map((n) => (
          <g key={n.id} transform={`translate(${n.x},${n.y})`} role="link" tabIndex={0} aria-label={`${n.kind === 'company' ? 'Company' : 'Person'}: ${n.label}`} onClick={() => navigate(n.to)} onKeyDown={(e) => e.key === 'Enter' && navigate(n.to)} className="cursor-pointer focus:outline-none [&:focus>circle]:stroke-[#282828] [&:focus>rect]:stroke-[#282828]" data-node={n.kind}>
            {n.kind === 'company' ? <rect x={-9} y={-9} width={18} height={18} rx={3} fill={color.company} stroke="#fff" strokeWidth={2} /> : <circle r={n.kind === 'self' ? 12 : 8} fill={color[n.kind]} stroke="#fff" strokeWidth={2} />}
            <text y={n.kind === 'self' ? 26 : 22} textAnchor="middle" fontSize={11} fill="#282828">{n.label.length > 22 ? `${n.label.slice(0, 21)}…` : n.label}</text>
          </g>
        ))}
      </svg>
      <p className="text-[12px] text-muted flex gap-[14px]"><span><span className="inline-block w-[10px] h-[10px] rounded-full bg-[#E0662E] mr-[4px]" />{p.name}</span><span><span className="inline-block w-[10px] h-[10px] bg-primary mr-[4px]" />Companies</span><span><span className="inline-block w-[10px] h-[10px] rounded-full bg-[#467BAD] mr-[4px]" />Co-directors (two hops, up to 60 nodes)</span></p>
    </div>
  );
}
