import type { ExportFormat, ExportSpec } from './types';
import { downloadBlob, toCsv } from '../lib/download';
import { bus } from '../lib/eventBus';
import { logger } from '../lib/logger';
import { cellText } from './pdf';

export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'export';

/** CSV of the first sheet (plus a Sources comment line). */
export function buildCsv(spec: ExportSpec): string {
  const s = spec.sheets[0];
  const body = toCsv(s.columns.map((c) => c.label), s.rows.map((r) => s.columns.map((c) => {
    const v = r[c.key];
    return typeof v === 'number' || v == null ? (v as number | null) : String(v);
  })));
  return body;
}

export async function buildBlob(spec: ExportSpec, format: ExportFormat): Promise<Blob> {
  if (format === 'xlsx') return (await import('./xlsx')).buildXlsx(spec);
  if (format === 'pdf') return (await import('./pdf')).buildPdf(spec);
  return new Blob(['﻿' + buildCsv(spec)], { type: 'text/csv;charset=utf-8' });
}

const EXT: Record<ExportFormat, string> = { xlsx: 'xlsx', pdf: 'pdf', csv: 'csv' };

/** One shared export entry point used by every surface. Emits `export:done` for usage tracking. */
export async function exportSpec(spec: ExportSpec, format: ExportFormat, filename = slugify(spec.title)): Promise<void> {
  const t0 = performance.now();
  let blob: Blob;
  try { blob = await buildBlob(spec, format); } catch (e) { logger.error('Export failed', { title: spec.title, format, message: String(e) }); throw e; }
  performance.measure?.(`export:${format}`, { start: t0, end: performance.now() });
  logger.debug(`export ${format} built in ${Math.round(performance.now() - t0)} ms`);
  const rows = spec.sheets.reduce((n, s) => n + s.rows.length, 0);
  downloadBlob(blob, `${filename}.${EXT[format]}`, blob.type);
  bus.emit('export:done', { title: spec.title, format, rows });
}

export { cellText };
