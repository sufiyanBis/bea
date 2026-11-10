import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { Ban, Eye, EyeOff } from 'lucide-react';
import type { Company } from '../../data/types';
import * as S from '../../stats/compute';
import { STAGE_COLORS } from '../../data/taxonomies/misc';
import { formatInt, formatMoney } from '../../lib/format';
import { useResults } from '../../store/resultsStore';
import { Link } from 'react-router-dom';
import { profilePath } from '../../lib/nav';
import { ChartCard, FaqLink } from './ChartCard';
import { HBarList, KpiPill, LegendList, InlineSelect, donutOption, hbarOption } from './primitives';
import { SectionTitle } from './StatsDashboard';
import { Button } from '../ui/Button';
import { countryByCode } from '../../data/countries/iso3166';

const FONT = 'Public Sans';
const axisText = { fontFamily: FONT, color: '#595959', fontSize: 12 };
const nameText = { fontFamily: FONT, color: '#282828', fontSize: 13, fontWeight: 600 as const };

export const C = {
  blue: '#467BAD', green: '#34C345', teal: '#4DA29D', magenta: '#B61483', mint: '#4CD3A0', orange: '#E0662E',
  male: '#467BAD', female: '#F3E105', unknown: '#999999',
};
const BALANCE_COLORS: Record<S.Balance, string> = {
  'All Female': '#C98A1E', 'Majority Female': '#F3E105', 'Equal Split': '#E0662E', 'Majority Male': '#34C345', 'All Male': '#467BAD',
};
const AGE_COLORS = ['#0B1F3A', '#1F3D6B', '#3D6699', '#6F95C2', '#A8C2E0', '#DCE7F4'];

export function CompaniesStats({ results }: { results: Company[] }) {
  return (
    <>
      <SectionTitle>Overview</SectionTitle>
      <div className="grid grid-cols-2 gap-[18px]">
        <TrackingCard results={results} />
        <FinancialsCard results={results} />
      </div>
      <div className="mt-[18px] space-y-[18px]">
        <FoundationsCard results={results} />
        <ActiveCard results={results} />
      </div>

      <div className="mt-[18px]"><CountryCard results={results} /></div>

      <SectionTitle>Classification</SectionTitle>
      <div className="grid grid-cols-2 gap-[18px] items-start">
        <IndustryRankingCard results={results} />
        <StageCard results={results} />
      </div>
      <div className="mt-[18px]"><EsgCard results={results} /></div>

      <SectionTitle>Transactions</SectionTitle>
      <div className="grid grid-cols-2 gap-[18px] items-start">
        <TopRaisedCard results={results} />
        <TopTurnoverCard results={results} />
      </div>

      <SectionTitle>People</SectionTitle>
      <div className="grid grid-cols-2 gap-[18px] items-start">
        <GenderCard results={results} />
        <BalanceCard results={results} />
      </div>
      <div className="mt-[18px]"><AgeCard results={results} /></div>
    </>
  );
}

// ---------------- Overview
function TrackingCard({ results }: { results: Company[] }) {
  const t = S.trackingCounts(results);
  const icons = {
    Tracked: <Eye size={16} className="text-bar-green" />,
    'Ceased tracking': <EyeOff size={16} className="text-[#E0662E]" />,
    'Not tracked': <Ban size={16} className="text-[#D7263D]" />,
  } as const;
  const keys = Object.keys(t) as (keyof typeof t)[];
  return (
    <ChartCard
      title="Tracking status"
      option={hbarOption('Tracking status', keys, keys.map((k) => t[k]), C.blue)}
      csv={{ headers: ['Tracking status', 'Companies'], rows: keys.map((k) => [k, t[k]]) }}
      footnote={<>Read our <FaqLink /> to find out about our tracking statuses.</>}
    >
      <HBarList
        labelWidth={170}
        items={keys.map((k) => ({ key: k, label: <span className="inline-flex items-center gap-[8px]">{icons[k]}{k}</span>, value: t[k], text: formatInt(t[k]) }))}
      />
    </ChartCard>
  );
}

function FinancialsCard({ results }: { results: Company[] }) {
  const f = S.financialSummary(results);
  const kpis: [string, string][] = [
    [formatMoney(f.totalTurnover) || '£0', 'Total turnover in latest financials'],
    [formatMoney(f.averageTurnover) || '£0', 'Average turnover'],
    [formatInt(f.fullFinancials), 'Number of companies reporting full financials'],
    [`${f.fullFinancialsPct.toFixed(1)}%`, 'Percentage of companies reporting full financials'],
    [formatInt(f.totalEmployees), 'Estimated total employees'],
    [formatInt(f.averageEmployees), 'Estimated average employees'],
  ];
  return (
    <ChartCard
      title="Summary of financials"
      csv={{ headers: ['Metric', 'Value'], rows: kpis.map(([v, k]) => [k, v]) }}
      footnote={<>Financial figures come from the latest filed accounts. See the <FaqLink /> for estimates.</>}
    >
      <div className="grid grid-cols-3 gap-y-[18px] gap-x-[10px] py-[4px]">
        {kpis.map(([v, k]) => <KpiPill key={k} value={v} caption={k} />)}
      </div>
    </ChartCard>
  );
}

function FoundationsCard({ results }: { results: Company[] }) {
  const [mode, setMode] = useState<'fc' | 'net'>('fc');
  const [labels, setLabels] = useState(false);
  const data = useMemo(() => S.foundationsAndCessations(results), [results]);
  const option: EChartsOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 70, right: 20, top: 20, bottom: 90 },
    xAxis: {
      type: 'category', data: data.map((d) => d.label), name: 'Quarter', nameLocation: 'middle', nameGap: 72, nameTextStyle: nameText,
      axisLabel: { ...axisText, rotate: 45, interval: 0 }, axisTick: { alignWithLabel: true },
    },
    yAxis: { type: 'value', name: mode === 'fc' ? 'Foundations and Cessations' : 'Net change in companies', nameLocation: 'middle', nameGap: 48, nameTextStyle: nameText, axisLabel: axisText, splitLine: { lineStyle: { color: '#EBEBEB' } } },
    series: mode === 'fc'
      ? [
          { name: 'Foundations', type: 'bar', stack: 'fc', data: data.map((d) => d.foundations), itemStyle: { color: C.green }, label: { show: labels, position: 'top', fontSize: 10 } },
          { name: 'Cessations', type: 'bar', stack: 'fc', data: data.map((d) => -d.cessations), itemStyle: { color: C.orange }, label: { show: labels, position: 'bottom', fontSize: 10, formatter: (p: { value: unknown }) => String(Math.abs(Number(p.value))) } },
        ]
      : [{
          name: 'Net change', type: 'bar',
          data: data.map((d) => ({ value: d.net, itemStyle: { color: d.net >= 0 ? C.green : C.orange } })),
          label: { show: labels, position: 'top', fontSize: 10 },
        }],
  };
  return (
    <ChartCard
      title="Company foundations and cessations over time"
      settings={[{ label: 'Show data labels', value: labels, onChange: setLabels }]}
      option={option}
      csv={{ headers: ['Quarter', 'Foundations', 'Cessations', 'Net change'], rows: data.map((d) => [d.label, d.foundations, d.cessations, d.net]) }}
      footnote={<>Foundations are based on incorporation dates; cessations on dissolution dates. See the <FaqLink />.</>}
    >
      <div className="flex items-center gap-[22px] text-[14px] text-ink mb-[6px]" role="radiogroup">
        {([['fc', 'Foundations and cessations'], ['net', 'Net change in companies']] as const).map(([v, l]) => (
          <label key={v} className="inline-flex items-center gap-[7px] cursor-pointer">
            <input type="radio" name="fc-mode" checked={mode === v} onChange={() => setMode(v)} className="accent-primary" /> {l}
          </label>
        ))}
      </div>
      <ReactECharts option={option} notMerge style={{ height: 380 }} />
    </ChartCard>
  );
}

function ActiveCard({ results }: { results: Company[] }) {
  const data = useMemo(() => S.activeOverTime(results), [results]);
  const option: EChartsOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 70, right: 20, top: 20, bottom: 90 },
    xAxis: { type: 'category', data: data.map((d) => d.label), boundaryGap: false, axisLabel: { ...axisText, rotate: 45, interval: 1 }, name: 'Quarter', nameLocation: 'middle', nameGap: 72, nameTextStyle: nameText },
    yAxis: { type: 'value', min: 0, name: 'Active Companies', nameLocation: 'middle', nameGap: 52, nameTextStyle: nameText, axisLabel: { ...axisText, formatter: (v: number) => v.toLocaleString('en-GB') }, splitLine: { lineStyle: { color: '#EBEBEB' } } },
    series: [{ name: 'Active companies', type: 'line', data: data.map((d) => d.value), showSymbol: false, lineStyle: { color: C.blue, width: 2 }, itemStyle: { color: C.blue } }],
  };
  return (
    <ChartCard
      title="Active companies over time"
      option={option}
      csv={{ headers: ['Quarter', 'Active companies'], rows: data.map((d) => [d.label, d.value]) }}
      footnote={<>A company is active between its incorporation and dissolution dates. See the <FaqLink />.</>}
    >
      <ReactECharts option={option} notMerge style={{ height: 360 }} />
    </ChartCard>
  );
}

// ---------------- Classification
function IndustryRankingCard({ results }: { results: Company[] }) {
  const [measure, setMeasure] = useState<'pct' | 'raw'>('pct');
  const [type, setType] = useState<'industry' | 'buzzword'>('industry');
  const [all, setAll] = useState(false);
  const ranking = useMemo(() => S.industryRanking(results, type), [results, type]);
  const shown = all ? ranking : ranking.slice(0, 10);
  const n = results.length;
  const text = (v: number) => (measure === 'pct' ? `${((v / n) * 100).toFixed(1)}% (${formatInt(v)} ${v === 1 ? 'company' : 'companies'})` : formatInt(v));
  return (
    <ChartCard
      title="Industry ranking"
      controls={
        <span className="inline-flex items-center gap-[6px]">
          <InlineSelect label="Measure" value={measure} onChange={setMeasure} options={[{ value: 'pct', label: 'percentage (raw)' }, { value: 'raw', label: 'raw count' }]} />
          per
          <InlineSelect label="Classification" value={type} onChange={setType} options={[{ value: 'industry', label: 'industry' }, { value: 'buzzword', label: 'buzzword' }]} />
        </span>
      }
      option={hbarOption('Industry ranking', shown.map((s) => s.label), shown.map((s) => s.value), C.magenta)}
      csv={{ headers: [type === 'industry' ? 'Industry' : 'Buzzword', 'Companies', 'Percentage'], rows: ranking.map((r) => [r.label, r.value, ((r.value / n) * 100).toFixed(1)]) }}
      footnote="Companies can belong to more than one industry, so percentages can add up to more than 100%."
    >
      <HBarList variant="stacked" color={C.magenta} max={n} items={shown.map((r) => ({ key: r.label, label: r.label, value: r.value, text: text(r.value) }))} />
      {ranking.length > 10 && (
        <Button variant="outline" size="sm" className="mt-[14px]" onClick={() => setAll((v) => !v)}>{all ? 'Show top 10' : 'Show all'}</Button>
      )}
    </ChartCard>
  );
}

function StageCard({ results }: { results: Company[] }) {
  const stages = S.stageCounts(results);
  const option = donutOption(stages.map((s) => ({ name: s.stage, value: s.value, color: STAGE_COLORS[s.stage] })));
  return (
    <ChartCard
      title="Current Stage of Evolution"
      option={option}
      csv={{ headers: ['Stage', 'Companies'], rows: stages.map((s) => [s.stage, s.value]) }}
      footnote={<>Read our <FaqLink /> to learn how we define each stage of evolution.</>}
    >
      <ReactECharts option={option} notMerge style={{ height: 330 }} />
      <LegendList items={stages.map((s) => ({ label: s.stage, value: s.value, color: STAGE_COLORS[s.stage] }))} />
    </ChartCard>
  );
}

function EsgCard({ results }: { results: Company[] }) {
  const { environmental, social } = S.esgSignals(results);
  const max = Math.max(1, ...environmental.map((x) => x.value), ...social.map((x) => x.value));
  const all = [...environmental, ...social];
  return (
    <ChartCard
      title="ESG signals by number of companies"
      option={hbarOption('ESG signals', all.map((x) => x.label), all.map((x) => x.value), C.teal)}
      csv={{ headers: ['Group', 'Signal', 'Companies'], rows: [...environmental.map((x) => ['Environmental', x.label, x.value]), ...social.map((x) => ['Social & Governance', x.label, x.value])] }}
      footnote={<>Signals are derived from accolades, filings and director data. See the <FaqLink />.</>}
    >
      <h4 className="text-[14px] font-semibold text-ink mb-[8px]">Environmental signals</h4>
      <HBarList labelWidth={300} color={C.teal} max={max} items={environmental.map((x) => ({ key: x.id, label: x.label, value: x.value, text: formatInt(x.value) }))} />
      <h4 className="text-[14px] font-semibold text-ink mt-[18px] mb-[8px]">Social &amp; Governance signals</h4>
      <HBarList labelWidth={300} color={C.blue} max={max} items={social.map((x) => ({ key: x.id, label: x.label, value: x.value, text: formatInt(x.value) }))} />
    </ChartCard>
  );
}

// ---------------- Transactions
function CompanyLink({ c }: { c: Company }) {
  return <Link to={profilePath(c.id)} className="text-primary hover:underline text-left truncate max-w-full block">{c.name}</Link>;
}

function TopRaisedCard({ results }: { results: Company[] }) {
  const [by, setBy] = useState<'fundraisingTotal' | 'fundraisingCount'>('fundraisingTotal');
  const top = S.topBy(results, by);
  const withRaise = results.filter((c) => c.fundraisings.length > 0).length;
  const fmt = (v: number) => (by === 'fundraisingTotal' ? formatMoney(v) : `${v} fundraisings`);
  return (
    <ChartCard
      title={`Total amount raised through fundraisings by ${by === 'fundraisingTotal' ? 'most amount raised' : 'most fundraisings'}`}
      controls={<span className="inline-flex items-center gap-[6px]">Show <InlineSelect label="Order by" value={by} onChange={setBy} options={[{ value: 'fundraisingTotal', label: 'most amount raised' }, { value: 'fundraisingCount', label: 'most fundraisings' }]} /></span>}
      option={hbarOption('Top companies by amount raised', top.map((t) => t.company.name), top.map((t) => t.value), C.blue)}
      csv={{ headers: ['Company', by === 'fundraisingTotal' ? 'Amount raised (£)' : 'Fundraisings'], rows: top.map((t) => [t.company.name, t.value]) }}
      footnote={`Based on ${formatInt(withRaise)} companies with an associated fundraising.`}
    >
      <HBarList variant="stacked" color={C.blue} items={top.map((t) => ({ key: t.company.id, label: <CompanyLink c={t.company} />, value: t.value, text: fmt(t.value) }))} />
    </ChartCard>
  );
}

function TopTurnoverCard({ results }: { results: Company[] }) {
  const top = S.topBy(results, 'turnover');
  const withT = results.filter((c) => c.turnover != null).length;
  return (
    <ChartCard
      title="Latest turnover from company accounts by highest turnover"
      option={hbarOption('Top companies by turnover', top.map((t) => t.company.name), top.map((t) => t.value), C.mint)}
      csv={{ headers: ['Company', 'Turnover (£)'], rows: top.map((t) => [t.company.name, t.value]) }}
      footnote={`Based on ${formatInt(withT)} companies with a reported turnover.`}
    >
      <HBarList variant="stacked" color={C.mint} items={top.map((t) => ({ key: t.company.id, label: <CompanyLink c={t.company} />, value: t.value, text: formatMoney(t.value) }))} />
    </ChartCard>
  );
}

// ---------------- Countries (part 3: international coverage)
function CountryCard({ results }: { results: Company[] }) {
  const rows = useMemo(() => {
    const m = new Map<string, number>();
    results.forEach((c) => m.set(c.country, (m.get(c.country) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [results]);
  const top = rows.slice(0, 15);
  const option = hbarOption('Companies by country', top.map(([k]) => countryByCode(k).name), top.map(([, v]) => v), C.blue);
  return (
    <ChartCard
      title="Companies by country"
      tourKey="stats-by-country"
      option={option}
      csv={{ headers: ['Country', 'ISO code', 'Companies'], rows: rows.map(([k, v]) => [countryByCode(k).name, k, v]) }}
      footnote={`${rows.length} countries in these results${rows.length > 15 ? '; the 15 largest are shown, the CSV has all of them' : ''}.`}
    >
      <HBarList items={top.map(([k, v]) => ({ key: k, label: <span className="inline-flex items-center gap-[6px]"><span aria-hidden>{countryByCode(k).flag}</span>{countryByCode(k).name}</span>, value: v, text: formatInt(v) }))} />
    </ChartCard>
  );
}

// ---------------- People
function GenderCard({ results }: { results: Company[] }) {
  const [when, setWhen] = useState<'current' | 'all'>('current');
  const [who, setWho] = useState<'directors' | 'founders'>('directors');
  const g = S.genderBreakdown(results, who, when);
  const items = [
    { name: 'Male', value: g.Male, color: C.male },
    { name: 'Female', value: g.Female, color: C.female },
    { name: 'Unknown', value: g.Unknown, color: C.unknown },
  ];
  const option = donutOption(items);
  return (
    <ChartCard
      title={`Gender of ${who === 'directors' ? 'Directors' : 'Founders'}`}
      controls={
        <span className="inline-flex items-center gap-[6px]">
          <InlineSelect label="Period" value={when} onChange={setWhen} options={[{ value: 'current', label: 'current breakdown' }, { value: 'all', label: 'all-time breakdown' }]} />
          of
          <InlineSelect label="People" value={who} onChange={setWho} options={[{ value: 'directors', label: 'directors' }, { value: 'founders', label: 'founders' }]} />
        </span>
      }
      option={option}
      csv={{ headers: ['Gender', 'People'], rows: items.map((i) => [i.name, i.value]) }}
      footnote="Gender is inferred from first names and may be marked Unknown."
    >
      <ReactECharts option={option} notMerge style={{ height: 320 }} />
    </ChartCard>
  );
}

function BalanceCard({ results }: { results: Company[] }) {
  const [who, setWho] = useState<'directors' | 'founders'>('founders');
  const b = S.genderBalance(results, who);
  const items = S.BALANCE.map((k) => ({ name: k, value: b[k], color: BALANCE_COLORS[k] }));
  const option = donutOption(items);
  return (
    <ChartCard
      title="Gender balance of companies (based on directors)"
      controls={<span className="inline-flex items-center gap-[6px]">Show current balance of <InlineSelect label="People" value={who} onChange={setWho} options={[{ value: 'founders', label: 'founders' }, { value: 'directors', label: 'directors' }]} /></span>}
      option={option}
      csv={{ headers: ['Balance', 'Companies'], rows: items.map((i) => [i.name, i.value]) }}
      footnote={`Each company is classified by the gender split of its current ${who}. Companies where no gender could be determined are excluded.`}
    >
      <ReactECharts option={option} notMerge style={{ height: 320 }} />
    </ChartCard>
  );
}

function AgeCard({ results }: { results: Company[] }) {
  const [markers, setMarkers] = useState(true);
  const data = useMemo(() => S.directorAgesOverTime(results), [results]);
  const option: EChartsOption = {
    tooltip: { trigger: 'axis', valueFormatter: (v) => `${Number(v).toFixed(1)}%` },
    legend: {
      top: 0, icon: 'rect', itemWidth: 12, itemHeight: 12, textStyle: { fontFamily: FONT, color: '#595959' },
      data: S.AGE_BANDS.map((b, i) => ({ name: b, itemStyle: { color: AGE_COLORS[i], borderColor: '#9fb4cf', borderWidth: i === 5 ? 1 : 0 } })),
    },
    grid: { left: 60, right: 24, top: 40, bottom: 40 },
    xAxis: { type: 'category', boundaryGap: false, data: data.map((d) => d.label), axisLabel: axisText },
    yAxis: { type: 'value', max: 100, axisLabel: { ...axisText, formatter: '{value}%' }, splitLine: { lineStyle: { color: '#EBEBEB' } } },
    series: S.AGE_BANDS.map((band, i) => ({
      name: band, type: 'line', stack: 'age', areaStyle: { color: AGE_COLORS[i], opacity: 1 },
      lineStyle: { color: AGE_COLORS[i], width: 1 }, itemStyle: { color: '#fff', borderColor: AGE_COLORS[Math.min(i, 3)], borderWidth: 1.5 },
      symbol: 'circle', symbolSize: 6, showSymbol: markers, color: AGE_COLORS[i],
      data: data.map((d) => +d.pct[i].toFixed(2)),
    })),
  };
  return (
    <ChartCard
      title="Directors age over time"
      settings={[{ label: 'Show point markers', value: markers, onChange: setMarkers }]}
      option={option}
      csv={{ headers: ['Year', ...S.AGE_BANDS], rows: data.map((d) => [d.label, ...d.pct.map((p) => p.toFixed(1))]) }}
      footnote="Share of active directors in each age band at the end of each year."
    >
      <ReactECharts option={option} notMerge style={{ height: 380 }} />
    </ChartCard>
  );
}
