import { ProvenanceInfo } from './provenance';
import { useEffect, useMemo, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { Award, Banknote, Gift, Landmark, Linkedin, Rocket, Sparkles, TrendingUp, Users } from 'lucide-react';
import type { Company } from '../../data/types';
import type { CompanyProfile, Person, TimelineEvent, Transaction } from '../../data/profile/types';
import { SIGNAL_LABEL, SIGNAL_TREE } from '../../data/taxonomies/signals';
import { STAGE_COLORS } from '../../data/taxonomies/misc';
import { SUMMARY_METRICS } from '../../data/profile/financials';
import { formatDate, formatInt, formatMoney } from '../../lib/format';
import { Checkbox } from '../../components/ui/Checkbox';
import { CompactSelect } from '../../components/ui/CompactSelect';
import { Card, CopyButton, Delta, DegreeIcon, KpiCapsule, LinkedInIcon, Pager, PersonLink, SegmentedToggle, SortTh, Sparkline, Tip, useSort } from './ui';
import { PROFILE_TODAY } from '../../data/profile/generateProfile';

// ---------------------------------------------------------------- signals
const SIGNAL_ICON: Record<string, typeof Banknote> = {
  'growth:equity-fundraising': Banknote, 'growth:debt-fundraising': Landmark, 'growth:accelerator': Rocket,
  'growth:10-scaleup': TrendingUp, 'growth:20-scaleup': TrendingUp, 'growth:high-growth-list': Award, 'innovation:grant-received': Gift,
};
const SIGNAL_HELP: Record<string, string> = {
  'growth:equity-fundraising': 'The company has raised equity investment.',
  'growth:debt-fundraising': 'The company has raised debt finance.',
  'growth:accelerator': 'The company has attended an accelerator programme.',
  'growth:10-scaleup': 'Turnover or headcount has grown more than 10% a year for three years.',
  'growth:20-scaleup': 'Turnover or headcount has grown more than 20% a year for three years.',
  'growth:high-growth-list': 'The company has appeared on a published high growth list.',
};

export function SignalsCard({ c }: { c: Company }) {
  const groups = SIGNAL_TREE.map((g) => ({ g, items: g.children!.filter((s) => c.signals.includes(s.id)) })).filter((x) => x.items.length);
  return (
    <Card title="Signals" info="Signals indicate whether a company has a particular characteristic, based on our data.">
      {groups.length === 0 ? <p className="text-[14px] text-muted">This company has no signals.</p> : (
        <div className="space-y-[12px]">
          {groups.map(({ g, items }) => (
            <div key={g.id} className="flex items-start gap-[14px]">
              <span className="w-[90px] shrink-0 text-[14px] text-ink underline underline-offset-4 pt-[5px]">{g.label}</span>
              <div className="flex flex-wrap items-center gap-x-[10px] gap-y-[8px]">
                {items.map((s, i) => {
                  const Icon = SIGNAL_ICON[s.id] ?? Sparkles;
                  return (
                    <span key={s.id} className="inline-flex items-center gap-[8px]">
                      {i > 0 && <span className="text-muted">•</span>}
                      <Tip text={SIGNAL_HELP[s.id] ?? SIGNAL_LABEL.get(s.id)}>
                        <span className="inline-flex items-center gap-[7px] text-[14px] text-ink cursor-default">
                          <span className="w-[30px] h-[30px] rounded-full bg-money-yellow flex items-center justify-center"><Icon size={15} className="text-ink" /></span>
                          {s.label}
                        </span>
                      </Tip>
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- mini timeline (custom SVG)
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(900);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export const MARKER_STYLE: Record<string, { fill: string; stroke: string; text: string; label: string }> = {
  F: { fill: '#F3E105', stroke: '#E0662E', text: '#282828', label: 'Fundraising' },
  G: { fill: '#E2F3EA', stroke: '#2F6B4F', text: '#2F6B4F', label: 'Grant' },
  E: { fill: '#fff', stroke: '#595959', text: '#282828', label: 'Establishment' },
  L: { fill: '#B61483', stroke: '#B61483', text: '#fff', label: 'High growth list' },
  A: { fill: '#DCEAF5', stroke: '#467BAD', text: '#2C5A82', label: 'Accelerator' },
  R: { fill: '#fff', stroke: '#2F6B4F', text: '#2F6B4F', label: 'Resolution' },
  C: { fill: '#E4E1F3', stroke: '#4B4291', text: '#4B4291', label: 'Capital' },
  I: { fill: '#282828', stroke: '#282828', text: '#fff', label: 'Incorporation' },
};
const STAGE_LINE: Record<string, string> = { ...STAGE_COLORS, Established: '#282828' };

export function MiniTimeline({ p, onSelect, compact = false }: { p: CompanyProfile; onSelect?: (e: TimelineEvent) => void; compact?: boolean }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<{ e: TimelineEvent; x: number; y: number } | null>(null);
  const startYear = Number((p.altEstablishmentDate < p.incorporationDate ? p.altEstablishmentDate : p.incorporationDate).slice(0, 4));
  const endYear = Number(PROFILE_TODAY.slice(0, 4)) + 1;
  const t0 = Date.UTC(startYear, 0, 1), t1 = Date.UTC(endYear, 0, 1);
  const padL = 34, padR = 30;
  const x = (iso: string) => padL + ((new Date(iso).getTime() - t0) / (t1 - t0)) * (width - padL - padR);
  const lineY = compact ? 58 : 70;

  const markers = useMemo(() => {
    const evs = p.timeline.filter((e) => e.letter).slice().reverse();
    const placed: { e: TimelineEvent; cx: number; level: number }[] = [];
    evs.forEach((e) => {
      const cx = x(e.date);
      let level = 0;
      while (placed.some((m) => m.level === level && Math.abs(m.cx - cx) < 15)) level++;
      placed.push({ e, cx, level });
    });
    return placed;
  }, [p, width]); // eslint-disable-line react-hooks/exhaustive-deps

  const ticks: number[] = [];
  const step = endYear - startYear > 12 ? 2 : 1;
  for (let y = startYear; y <= endYear; y += step) ticks.push(y);
  const periods = p.stagePeriods.map((s, i) => ({ ...s, to: p.stagePeriods[i + 1]?.from ?? PROFILE_TODAY }));
  const maxLevel = Math.max(0, ...markers.map((m) => m.level));
  const height = lineY + 34;
  const topPad = Math.max(0, 14 - (lineY - 22 - maxLevel * 15));

  return (
    <div ref={ref} className="relative w-full" data-tour="mini-timeline">
      <svg width={width} height={height + topPad} role="img" aria-label="Company timeline overview">
        <g transform={`translate(0 ${topPad})`}>
          {periods.map((s) => (
            <g key={s.stage + s.from}>
              <line x1={x(s.from)} x2={x(s.to)} y1={lineY} y2={lineY} stroke={STAGE_LINE[s.stage]} strokeWidth={4} />
              <text x={x(s.from) + 2} y={lineY - 22 - maxLevel * 15} fontSize={11} fontWeight={600} fill={STAGE_LINE[s.stage]} fontFamily="Public Sans">{s.stage}</text>
            </g>
          ))}
          {ticks.map((y) => (
            <g key={y}>
              <line x1={x(`${y}-01-01`)} x2={x(`${y}-01-01`)} y1={lineY + 4} y2={lineY + 9} stroke="#BDBDBD" />
              <text x={x(`${y}-01-01`)} y={lineY + 24} fontSize={11} textAnchor="middle" fill="#8A8A8A" fontFamily="Public Sans">Jan.{y}</text>
            </g>
          ))}
          {markers.map(({ e, cx, level }) => {
            const s = MARKER_STYLE[e.letter!];
            const cy = lineY - 12 - level * 15;
            return (
              <g
                key={e.id}
                className="cursor-pointer"
                onMouseEnter={() => setHover({ e, x: cx, y: cy + topPad })}
                onMouseLeave={() => setHover(null)}
                onClick={() => onSelect?.(e)}
                role="button"
                aria-label={`${s.label} on ${formatDate(e.date)}`}
              >
                <circle cx={cx} cy={cy} r={7} fill={s.fill} stroke={s.stroke} strokeWidth={1.5} />
                <text x={cx} y={cy + 3.5} fontSize={9} fontWeight={700} textAnchor="middle" fill={s.text} fontFamily="Public Sans">{e.letter}</text>
              </g>
            );
          })}
          <circle cx={x(PROFILE_TODAY)} cy={lineY} r={5} fill="#000" />
        </g>
      </svg>
      {hover && (
        <div className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full bg-[#2b2b2b] text-white text-[12px] rounded-[4px] px-[8px] py-[5px] max-w-[260px]" style={{ left: hover.x, top: hover.y - 10 }}>
          <div className="font-semibold">{MARKER_STYLE[hover.e.letter!].label} · {formatDate(hover.e.date)}</div>
          <div className="opacity-90">{hover.e.parts.map((x) => (typeof x === 'string' ? x : x.t)).join('')}</div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- transactions KPIs + valuation chart
export function txKpis(p: CompanyProfile) {
  const fr = p.transactions.filter((t) => t.type === 'fundraising');
  const gr = p.transactions.filter((t) => t.type === 'grant');
  const sum = (l: Transaction[]) => l.reduce((s, t) => s + (t.verified ?? t.announced ?? 0), 0);
  return { frCount: fr.length, frTotal: sum(fr), grCount: gr.length, grTotal: sum(gr) };
}

export function valuationOption(p: CompanyProfile, mode: 'valuation' | 'events', yTitle = false): EChartsOption {
  const pts = p.transactions.filter((t) => t.type === 'fundraising' && t.preMoney).slice().reverse().map((t) => [t.date, t.preMoney!] as [string, number]);
  const axisText = { fontFamily: 'Public Sans', color: '#595959', fontSize: 12 };
  const minYear = pts.length ? Number(pts[0][0].slice(0, 4)) : 2016;
  const base: EChartsOption = {
    grid: { left: yTitle ? 80 : 64, right: 20, top: 30, bottom: 30 },
    xAxis: { type: 'time', min: `${minYear}-01-01`, max: `${Number(PROFILE_TODAY.slice(0, 4)) + 1}-01-01`, axisLabel: { ...axisText, formatter: '{yyyy}' }, splitLine: { show: false } },
    tooltip: { trigger: mode === 'valuation' ? 'axis' : 'item' },
  };
  if (mode === 'events') {
    const types = ['Fundraising', 'Grant', 'MBO/MBI', 'Acquisition', 'Spinout'];
    const map: Record<string, number> = { fundraising: 0, grant: 1, mbo: 2, acquisition: 3, spinout: 4 };
    return {
      ...base,
      yAxis: { type: 'category', data: types, axisLabel: axisText },
      series: [{ type: 'scatter', symbolSize: 14, itemStyle: { color: '#F3E105', borderColor: '#E0662E', borderWidth: 1.5 },
        data: p.transactions.map((t) => ({ value: [t.date, map[t.type]], name: t.label })),
        tooltip: { formatter: (x: unknown) => { const d = x as { name: string; value: [string] }; return `${d.name}<br/>${formatDate(d.value[0])}`; } } }],
    };
  }
  return {
    ...base,
    legend: { data: ['Known value'], top: 0, right: 0, icon: 'circle', textStyle: axisText },
    yAxis: { type: 'value', name: yTitle ? 'Pre-money valuation' : '', nameLocation: 'middle', nameGap: 62, axisLabel: { ...axisText, formatter: (v: number) => formatMoney(v) || '£0' }, splitLine: { lineStyle: { color: '#EBEBEB' } } },
    series: [{ name: 'Known value', type: 'line', step: 'end', data: pts, symbol: 'circle', symbolSize: 8, lineStyle: { color: '#467BAD', width: 2 }, itemStyle: { color: '#467BAD' } }],
  };
}

export function TransactionsSummary({ p, seeAll, yTitle = false, title = 'Transactions' }: { p: CompanyProfile; seeAll?: string; yTitle?: boolean; title?: string }) {
  const [mode, setMode] = useState<'valuation' | 'events'>('valuation');
  const k = txKpis(p);
  const hasPts = p.transactions.some((t) => t.type === 'fundraising');
  return (
    <Card title={title} source="fundraisings" seeAll={seeAll} tourKey="transactions-summary">
      <div className="flex gap-[24px] items-start">
        <div className="flex gap-[10px] pt-[10px] shrink-0">
          <KpiCapsule value={k.frCount} tag={formatMoney(k.frTotal) || '£0'} caption="Fundraisings secured" />
          <KpiCapsule value={k.grCount} tag={formatMoney(k.grTotal) || '£0'} caption="Grants received" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-end mb-[4px]">
            <SegmentedToggle size="sm" value={mode} onChange={setMode} options={[{ value: 'valuation', label: 'Valuation' }, { value: 'events', label: 'Events' }]} />
          </div>
          {hasPts || mode === 'events'
            ? <ReactECharts option={valuationOption(p, mode, yTitle)} notMerge style={{ height: 240 }} />
            : <p className="text-[14px] text-muted py-[60px] text-center">No known valuations.</p>}
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- financial summary
export function FinancialSummary({ p, tourKey }: { p: CompanyProfile; tourKey?: string }) {
  const [mode, setMode] = useState<'graph' | 'table'>('graph');
  const years = p.financials;
  if (!years.length) {
    return <Card title="Financials" source="accounts"><p className="text-[14px] text-muted text-center py-[20px]">This company has not filed full financial statements.</p></Card>;
  }
  const last = years[years.length - 1].values, prev = years[years.length - 2]?.values;
  const fmt = (kind: 'money' | 'int', v: number) => (kind === 'int' ? formatInt(v) : (v < 0 ? '-' : '') + (formatMoney(Math.abs(v)) || '£0'));
  const facts: [string, string][] = [
    ['Latest credit rating', p.credit.rating], ['Latest credit limit', formatMoney(p.credit.limit) || '—'], ['Credit rating last updated', formatDate(p.credit.updated)],
    ['Latest auditors', p.credit.auditors], ['Senior auditor name', p.credit.seniorAuditor], ['Date of most recent accounts', formatDate(p.credit.accountsDate)], ['Latest account type', p.credit.accountType],
  ];
  return (
    <Card title="Financials" source="accounts" tourKey={tourKey} actions={<SegmentedToggle size="sm" value={mode} onChange={setMode} options={[{ value: 'graph', label: 'Graph' }, { value: 'table', label: 'Table' }]} />}>
      {mode === 'graph' ? (
        <div className="grid grid-cols-4 gap-x-[18px] gap-y-[18px]">
          {SUMMARY_METRICS.map((m) => {
            const v = last[m.id] as number;
            const series = years.map((y) => y.values[m.id] as number);
            return (
              <div key={m.id} className="min-w-0">
                <div className="text-[13px] text-text">{m.label}{(m.id === 'turnover' || m.id === 'netAssets') && <ProvenanceInfo dataset="accounts" label={m.label} />}</div>
                <div className="flex items-center gap-[10px]">
                  <span className="text-[18px] font-bold text-ink">{fmt(m.kind, v)}</span>
                  <Sparkline values={series.slice(-5)} width={70} />
                </div>
                {prev && <Delta value={v - (prev[m.id] as number)} format={(n) => fmt(m.kind, n)} />}
              </div>
            );
          })}
        </div>
      ) : (
        <table className="w-full text-[14px]">
          <thead><tr className="border-b border-card-border text-left"><th className="py-[6px] font-semibold text-ink">Metric</th>{years.slice(-2).map((y) => <th key={y.yearEnd} className="py-[6px] text-right font-semibold text-ink">{formatDate(y.yearEnd)}</th>)}</tr></thead>
          <tbody>
            {SUMMARY_METRICS.map((m) => (
              <tr key={m.id} className="border-b border-card-border last:border-0">
                <td className="py-[6px] text-text">{m.label}</td>
                {years.slice(-2).map((y) => <td key={y.yearEnd} className="py-[6px] text-right text-ink tabular-nums">{fmt(m.kind, y.values[m.id] as number)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="border-t border-card-border mt-[16px] pt-[14px] grid grid-cols-4 gap-x-[18px] gap-y-[12px]">
        {facts.map(([k, v]) => <div key={k}><div className="text-[13px] text-text">{k}{k === 'Latest credit rating' && <ProvenanceInfo dataset="credit" label="Credit rating" />}</div><div className="text-[14px] text-ink font-medium">{v}</div></div>)}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- key people
const employeeBand = (n?: number) => (n == null ? 'Unknown' : n > 1000 ? '>1000' : n > 250 ? '251-1000' : n > 50 ? '51-250' : n > 10 ? '11-50' : '1-10');

export function KeyPeopleCard({ c, p, compact = false, seeAll }: { c: Company; p: CompanyProfile; compact?: boolean; seeAll?: string }) {
  const people = p.people.keyPeople;
  const fns = ['All', ...[...new Set(people.map((x) => x.fn))].sort()];
  const [fn, setFn] = useState(compact ? 'Strategy' : 'All');
  const [mine, setMine] = useState(false);
  const [page, setPage] = useState(1);
  const sort = useSort<'name' | 'position' | 'fn'>('name');
  const size = compact ? 3 : 20;
  const filtered = people
    .filter((x) => (fn === 'All' || x.fn === fn) && (!mine || x.degree))
    .sort((a, b) => (sort.dir === 'asc' ? 1 : -1) * (sort.key === 'name' ? a.name.localeCompare(b.name) : sort.key === 'position' ? a.position.localeCompare(b.position) : a.fn.localeCompare(b.fn)));
  const rows = filtered.slice((page - 1) * size, page * size);
  const ceo = people[0];
  useEffect(() => setPage(1), [fn, mine]);

  return (
    <Card title={compact ? 'People' : 'Current key people'} source="officers" seeAll={seeAll} tourKey="key-people">
      <div className="flex items-start justify-between gap-[20px] pb-[14px] border-b border-card-border">
        <div>
          <div className="text-[13px] text-text">{ceo.position}</div>
          <div className="flex items-center gap-[6px]"><PersonLink name={ceo.name} className="text-[22px] font-medium" /><DegreeIcon degree={ceo.degree} /></div>
        </div>
        <div className="w-[420px] space-y-[8px]">
          <div className="flex items-center justify-between text-[14px]"><span className="text-text">Employee count <strong className="text-ink">{employeeBand(c.employees)}</strong></span><Linkedin size={16} className="text-ink" aria-label="LinkedIn" /></div>
          <div className="text-[13px] text-text">Key people connections</div>
          <div className="bg-page rounded-[3px] px-[10px] py-[6px] text-[14px] flex items-center gap-[8px]"><strong className="text-ink">{p.connections.first}</strong><Users size={14} className="text-muted" />1st degree connections with your colleague(s)</div>
          <div className="bg-page rounded-[3px] px-[10px] py-[6px] text-[14px] flex items-center gap-[8px]"><strong className="text-ink">{p.connections.second}</strong><Users size={14} className="text-muted" />2nd degree connections with your colleague(s)</div>
        </div>
      </div>
      <div className="flex items-center gap-[16px] py-[12px]">
        <label className="flex items-center gap-[8px] text-[14px] text-text">Function
          <CompactSelect ariaLabel="Filter by function" value={fn} onChange={setFn} options={fns.map((f) => ({ value: f, label: f }))} />
        </label>
        <Checkbox checked={mine} onChange={setMine} className="text-[14px] text-ink">Only show my connections</Checkbox>
        <span className="ml-auto text-[13px] text-muted">{filtered.length} people</span>
      </div>
      <PeopleTable rows={rows} sort={sort} />
      <div className="flex justify-end mt-[10px]"><Pager total={filtered.length} page={page} size={size} onPage={setPage} /></div>
    </Card>
  );
}

export function PeopleTable({ rows, sort }: { rows: Person[]; sort?: ReturnType<typeof useSort<'name' | 'position' | 'fn'>> }) {
  const th = 'py-[9px] px-[10px] text-left text-[14px] font-semibold text-ink';
  return (
    <table className="w-full text-[14px]">
      <thead className="border-b border-card-border">
        <tr>
          {sort ? <SortTh label="Name" active={sort.key === 'name'} dir={sort.dir} onClick={() => sort.toggle('name')} /> : <th className={th}>Name</th>}
          {sort ? <SortTh label="Position" active={sort.key === 'position'} dir={sort.dir} onClick={() => sort.toggle('position')} /> : <th className={th}>Position</th>}
          {sort ? <SortTh label="Function" active={sort.key === 'fn'} dir={sort.dir} onClick={() => sort.toggle('fn')} /> : <th className={th}>Function</th>}
          <th className={th}>Contact</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((x) => (
          <tr key={x.id} className="border-b border-card-border last:border-0 align-top">
            <td className="py-[9px] px-[10px]"><PersonLink name={x.name} degree={x.degree} /></td>
            <td className="py-[9px] px-[10px] text-ink">{x.position}</td>
            <td className="py-[9px] px-[10px] text-text">{x.fn}</td>
            <td className="py-[9px] px-[10px]">
              <span className="inline-flex items-center gap-[8px]">
                {x.email ? <><span className="text-ink truncate max-w-[230px]">{x.email}</span><CopyButton text={x.email} /></> : <span className="text-muted">—</span>}
                <LinkedInIcon known={x.linkedin} />
              </span>
            </td>
          </tr>
        ))}
        {!rows.length && <tr><td colSpan={4} className="py-[18px] text-center text-muted">No people match these filters.</td></tr>}
      </tbody>
    </table>
  );
}
