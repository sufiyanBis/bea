export function downloadBlob(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  downloadUrl(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export function downloadUrl(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
import { PROTOTYPE_NOTICE } from '../config/app';
import { load, save } from './storage';

/** Export setting: put the prototype notice as a first comment line in CSV files (default on). */
const CSV_NOTICE_KEY = 'nb.export.csvNotice';
export const csvNoticeEnabled = () => load<boolean>(CSV_NOTICE_KEY, true);
export const setCsvNotice = (on: boolean) => save(CSV_NOTICE_KEY, on);

export function toCsv(headers: string[], rows: (string | number | undefined | null)[][], opts: { notice?: boolean } = {}): string {
  const body = toCsvBody(headers, rows);
  return (opts.notice ?? csvNoticeEnabled()) ? `# ${PROTOTYPE_NOTICE} Exported ${new Date().toISOString().slice(0, 10)}.
${body}` : body;
}

function toCsvBody(headers: string[], rows: (string | number | undefined | null)[][]): string {
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(esc).join(',')).join('\n');
}
