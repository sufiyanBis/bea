import type { ExportColumn, ExportSpec } from './types';
import { BRAND_NAME, PROTOTYPE_NOTICE, publicUrl } from '../config';
import { SOURCE_BY_ID } from '../data/sources';
import { formatInt } from '../lib/format';
import { currencySymbol } from '../lib/money';

export function cellText(c: ExportColumn, v: unknown): string {
  if (v == null || v === '') return '—';
  if (typeof v !== 'number') return c.format === 'date' && typeof v === 'string' ? v.split('-').reverse().join('/') : String(v);
  if (!isFinite(v)) return '—';
  switch (c.format) {
    case 'gbp': case 'money': {
      const sym = c.format === 'gbp' ? '£' : currencySymbol(c.currency ?? 'GBP');
      const a = Math.abs(v);
      const s = a >= 1e9 ? `${(a / 1e9).toFixed(2)}b` : a >= 1e6 ? `${(a / 1e6).toFixed(2)}m` : a >= 1e3 ? `${(a / 1e3).toFixed(1)}k` : a.toFixed(0);
      return `${v < 0 ? '-' : ''}${sym}${s}`;
    }
    case 'int': return formatInt(Math.round(v));
    case 'pct': return `${v.toFixed(1)}%`;
    case 'ratio': return v.toFixed(2);
    default: return String(Math.round(v * 100) / 100);
  }
}

/** Beam logo mark (light source and beam) drawn as vectors; mirrors components/chrome/BeamLogo.tsx. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawBeamMark(doc: any, x: number, y: number, size: number, bg: [number, number, number]) {
  const k = size / 26, X = (u: number) => x + u * k, Y = (v: number) => y + v * k;
  doc.setFillColor(255); doc.roundedRect(x, y, size, size, 0.8, 0.8, 'F');
  doc.setFillColor(bg[0] + (255 - bg[0]) * 0.65, bg[1] + (255 - bg[1]) * 0.65, bg[2] + (255 - bg[2]) * 0.65);
  doc.triangle(X(8), Y(13), X(23), Y(5.5), X(23), Y(20.5), 'F');
  doc.setFillColor(...bg);
  doc.triangle(X(8), Y(13), X(23), Y(9.5), X(23), Y(16.5), 'F');
  doc.circle(X(7.5), Y(13), 3.2 * k, 'F');
}

export async function buildPdf(spec: ExportSpec): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const landscape = (spec.orientation ?? (spec.sheets.some((s) => s.columns.length > 6) ? 'landscape' : 'portrait')) === 'landscape';
  const doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  const purple: [number, number, number] = [75, 66, 145];
  const toc: { title: string; page: number }[] = [];

  if (spec.cover !== false) {
    doc.setFillColor(...purple); doc.rect(0, 0, W, 60, 'F');
    if (spec.logoDataUrl) { try { doc.addImage(spec.logoDataUrl, 'PNG', 16, 14, 18, 18); } catch { /* ignore bad logo */ } }
    else drawBeamMark(doc, 16, 19.5, 10, purple);
    doc.setTextColor(255); doc.setFontSize(12); doc.text(BRAND_NAME, spec.logoDataUrl ? 40 : 30, 26);
    doc.setFontSize(24); doc.text(doc.splitTextToSize(spec.title, W - 32), 16, 46);
    doc.setTextColor(40); doc.setFontSize(13);
    let y = 78;
    if (spec.subtitle) { doc.text(doc.splitTextToSize(spec.subtitle, W - 32), 16, y); y += 10; }
    doc.setFontSize(10); doc.setTextColor(90);
    doc.text(`Prepared ${new Date().toLocaleDateString('en-GB')}${spec.author ? ` by ${spec.author}` : ''}`, 16, y); y += 6;
    if (spec.filtersUsed?.length) { doc.text(doc.splitTextToSize(`Filters: ${spec.filtersUsed.join('; ')}`, W - 32), 16, y); y += 10; }
    if (spec.viewPath) { doc.textWithLink('View online', 16, y, { url: publicUrl(spec.viewPath) }); y += 6; }
    doc.setTextColor(155, 28, 28); doc.setFontSize(11); doc.text(PROTOTYPE_NOTICE, 16, H - 30);
    doc.addPage();
  }
  const tocPage = spec.toc ? doc.getNumberOfPages() : 0;
  if (spec.toc) doc.addPage();

  let first = true;
  const heading = (t: string) => {
    if (!first) doc.addPage();
    first = false;
    toc.push({ title: t, page: doc.getNumberOfPages() });
    doc.setTextColor(30); doc.setFontSize(15); doc.text(t, 14, 18);
  };

  for (const block of spec.text ?? []) {
    heading(block.heading ?? 'Notes');
    doc.setFontSize(11); doc.setTextColor(60); doc.text(doc.splitTextToSize(block.body, W - 28), 14, 28);
  }
  for (const ch of spec.charts ?? []) {
    heading(ch.title);
    try { const w = W - 28; doc.addImage(ch.dataUrl, 'PNG', 14, 24, w, w * 0.53); } catch { doc.text('(chart image unavailable)', 14, 30); }
  }
  for (const s of spec.sheets) {
    heading(s.name);
    autoTable(doc, {
      startY: 24,
      head: [s.columns.map((c) => c.label)],
      body: s.rows.map((r) => s.columns.map((c) => cellText(c, r[c.key]))),
      foot: s.footer?.map((f) => s.columns.map((c) => cellText(c, f[c.key]))),
      styles: { fontSize: s.columns.length > 8 ? 7 : 8.5, cellPadding: 1.6 },
      headStyles: { fillColor: purple },
      footStyles: { fillColor: [238, 237, 246], textColor: 30 },
      margin: { left: 14, right: 14, bottom: 22 },
    });
  }
  // sources appendix
  const srcs = (spec.sources?.length ? spec.sources : ['companies-house']).map((id) => SOURCE_BY_ID[id]).filter(Boolean);
  heading('Sources');
  autoTable(doc, { startY: 24, head: [['Source', 'Type', 'Licence']], body: srcs.map((s) => [s.name, s.type, s.licence]), styles: { fontSize: 8.5 }, headStyles: { fillColor: purple }, margin: { left: 14, right: 14, bottom: 22 } });

  if (spec.toc && tocPage) {
    doc.setPage(tocPage + 1);
    doc.setFontSize(15); doc.setTextColor(30); doc.text('Contents', 14, 18);
    doc.setFontSize(11);
    toc.forEach((t, i) => { doc.text(t.title, 18, 30 + i * 7); doc.text(String(t.page), W - 24, 30 + i * 7, { align: 'right' }); });
  }

  // footer on every page: page numbers, source footnote, prototype notice
  const n = doc.getNumberOfPages();
  const footnote = `Sources: ${srcs.map((s) => s.name).join(', ')}`;
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5); doc.setTextColor(120);
    doc.text(doc.splitTextToSize(footnote, W - 60)[0], 14, H - 12);
    doc.text(PROTOTYPE_NOTICE, 14, H - 7);
    doc.text(`Page ${i} of ${n}`, W - 14, H - 7, { align: 'right' });
  }
  return doc.output('blob');
}
