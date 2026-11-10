import { ReactNode, useEffect, useState } from 'react';
import { requestExport } from '../../export/requestExport';
import type { ExportSpec } from '../../export/types';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import { ChevronDown, Settings } from 'lucide-react';
import { Popover } from '../ui/Popover';
import { Checkbox } from '../ui/Checkbox';
import { useUi } from '../../store/uiStore';
import { downloadBlob, downloadUrl, toCsv } from '../../lib/download';
import { PROTOTYPE_NOTICE } from '../../config';

export interface CsvData { headers: string[]; rows: (string | number)[][] }
export interface Setting { label: string; value: boolean; onChange: (v: boolean) => void }

let seq = 0;
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Render an option off-screen and return a data URL / SVG string. */
export function renderOffscreen(option: EChartsOption, type: 'png' | 'svg', width = 900, height = 480): string {
  const el = document.createElement('div');
  const inst = echarts.init(el, undefined, { renderer: type === 'svg' ? 'svg' : 'canvas', width, height });
  inst.setOption({
    ...option, animation: false, backgroundColor: '#fff',
    graphic: [{ type: 'text', right: 10, bottom: 6, style: { text: PROTOTYPE_NOTICE, fill: '#8A8A8A', fontSize: 11 } }],
  } as EChartsOption);
  const out = type === 'svg' ? inst.renderToSVGString() : inst.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
  inst.dispose();
  return out;
}

export function DownloadMenu({ name, option, csv }: { name: string; option?: EChartsOption; csv?: CsvData }) {
  const [id] = useState(() => `dl-${seq++}`);
  const [el, setEl] = useState<HTMLButtonElement | null>(null);
  const toggle = useUi((s) => s.toggle);
  const close = useUi((s) => s.close);
  const file = slugify(name);

  const doPng = () => option && downloadUrl(renderOffscreen(option, 'png'), `${file}.png`);
  const doSvg = () => option && downloadBlob(renderOffscreen(option, 'svg'), `${file}.svg`, 'image/svg+xml');
  const doCsv = () => csv && downloadBlob(toCsv(csv.headers, csv.rows), `${file}.csv`, 'text/csv;charset=utf-8');
  const doDoc = (format: 'xlsx' | 'pdf') => requestExport(chartSpec(name, option, csv), format, file);

  const item = 'w-full text-left px-[14px] py-[6px] text-[14px] text-ink hover:bg-page disabled:text-muted';
  return (
    <>
      <button
        ref={setEl}
        onClick={() => toggle(id)}
        className="inline-flex items-center gap-[5px] h-[28px] px-[10px] border border-primary rounded-btn text-primary text-[14px] font-semibold bg-white hover:bg-primary-light"
      >
        Download <ChevronDown size={14} />
      </button>
      <Popover id={id} anchor={el} placement="bottom-end" width={130} caret={false} className="py-[4px]">
        <button className={item} disabled={!option} onClick={() => { doPng(); close(id); }}>PNG</button>
        <button className={item} disabled={!option} onClick={() => { doSvg(); close(id); }}>SVG</button>
        <button className={item} disabled={!csv} onClick={() => { doCsv(); close(id); }}>CSV</button>
        <button className={item} disabled={!csv} onClick={() => { doDoc('xlsx'); close(id); }}>Excel</button>
        <button className={item} onClick={() => { doDoc('pdf'); close(id); }}>PDF</button>
      </Popover>
    </>
  );
}

function SettingsMenu({ settings }: { settings: Setting[] }) {
  const [id] = useState(() => `set-${seq++}`);
  const [el, setEl] = useState<HTMLButtonElement | null>(null);
  const toggle = useUi((s) => s.toggle);
  return (
    <>
      <button ref={setEl} onClick={() => toggle(id)} aria-label="Chart settings" className="w-[28px] h-[28px] flex items-center justify-center border border-primary rounded-btn text-primary hover:bg-primary-light">
        <Settings size={15} />
      </button>
      <Popover id={id} anchor={el} placement="bottom-end" width={210} caret={false} className="py-[8px] px-[12px] space-y-[6px]">
        {settings.map((s) => (
          <Checkbox key={s.label} checked={s.value} onChange={s.onChange} className="text-[14px] text-ink">{s.label}</Checkbox>
        ))}
      </Popover>
    </>
  );
}

interface Props {
  title: string;
  children: ReactNode;
  controls?: ReactNode;
  settings?: Setting[];
  option?: EChartsOption;
  csv?: CsvData;
  footnote?: ReactNode;
  className?: string;
  tourKey?: string;
}

/** White panel: title, divider, top-right controls, body, footnote. */
/** Charts currently on screen, for "Export all statistics". */
export const chartRegistry = new Map<string, { option?: EChartsOption; csv?: CsvData }>();

/** One chart as an export: image for PDF, data table for Excel. */
export function chartSpec(name: string, option?: EChartsOption, csv?: CsvData): ExportSpec {
  return {
    title: name,
    charts: option ? [{ title: name, dataUrl: renderOffscreen(option, 'png') }] : [],
    sheets: csv ? [{ name: 'Data', columns: csv.headers.map((h, i) => ({ key: `c${i}`, label: h })), rows: csv.rows.map((r) => Object.fromEntries(r.map((v, i) => [`c${i}`, v]))) }] : [],
    sources: ['companies-house', 'cro', 'national-registers', 'in-house'],
    viewPath: '/',
  };
}

export function ChartCard({ title, children, controls, settings, option, csv, footnote, className = '', tourKey }: Props) {
  useEffect(() => { chartRegistry.set(title, { option, csv }); return () => { chartRegistry.delete(title); }; }, [title, option, csv]);
  const [asTable, setAsTable] = useState(false);
  return (
    <section className={`bg-surface border border-border rounded-card flex flex-col ${className}`} data-tour={tourKey}>
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-[8px] px-[20px] py-[14px] border-b border-border">
        <h3 className="flex-1 min-w-[240px] text-[16px] font-semibold text-ink leading-snug">{title}</h3>
        <div className="flex items-center gap-[8px] text-[14px] text-text shrink-0 ml-auto">
          {controls}
          {csv && <button onClick={() => setAsTable((v) => !v)} aria-pressed={asTable} data-view-table className="text-[13px] font-semibold text-primary hover:underline whitespace-nowrap">{asTable ? 'View as chart' : 'View as table'}</button>}
          {settings && <SettingsMenu settings={settings} />}
          {(option || csv) && <DownloadMenu name={title} option={option} csv={csv} />}
        </div>
      </header>
      <div className="px-[20px] py-[16px] flex-1">
        {asTable && csv ? (
          <div className="max-h-[420px] overflow-auto nb-scroll" tabIndex={0} role="region" aria-label={`${title} as a table`}>
            <table className="w-full text-[13px]" data-chart-table>
              <caption className="sr-only">{title}</caption>
              <thead><tr>{csv.headers.map((h) => <th key={h} scope="col" className="text-left px-[8px] py-[5px] border-b border-border font-semibold text-ink">{h}</th>)}</tr></thead>
              <tbody>{csv.rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} className="px-[8px] py-[4px] border-b border-card-border">{typeof v === 'number' ? v.toLocaleString('en-GB') : v}</td>)}</tr>)}</tbody>
            </table>
          </div>
        ) : children}
      </div>
      {footnote && <footer className="px-[20px] pb-[14px] text-[13px] text-muted">{footnote}</footer>}
    </section>
  );
}

export const FaqLink = ({ children = 'FAQ' }: { children?: ReactNode }) => (
  <a href="#" onClick={(e) => e.preventDefault()} className="text-primary underline underline-offset-2">{children}</a>
);
