export type ColFormat = 'text' | 'int' | 'gbp' | 'money' | 'pct' | 'ratio' | 'date';

export interface ExportColumn {
  key: string;
  label: string;
  format?: ColFormat;
  /** currency code for format 'money' (default GBP) */
  currency?: string;
  width?: number;
  /**
   * Excel formula template for calculated columns, using {key} placeholders for other columns in the same row,
   * e.g. "{turnover}/{employees}". Written as a real Excel formula; the computed value is the cached result.
   */
  formula?: string;
  /** human-readable definition of a calculated column (listed on the Calculations sheet) */
  definition?: string;
}

export interface ExportSheet {
  name: string;
  columns: ExportColumn[];
  rows: Record<string, unknown>[];
  /** optional aggregate footer rows (label in first column) */
  footer?: Record<string, unknown>[];
}

export interface ExportSpec {
  title: string;
  subtitle?: string;
  author?: string;
  filtersUsed?: string[];
  sheets: ExportSheet[];
  /** chart images for PDF (and listed in Excel) */
  charts?: { title: string; dataUrl: string }[];
  /** free text blocks for PDF reports */
  text?: { heading?: string; body: string }[];
  /** ids from data/sources.ts behind the exported fields */
  sources?: string[];
  /** app path for the "View online" link */
  viewPath?: string;
  orientation?: 'portrait' | 'landscape';
  cover?: boolean;
  toc?: boolean;
  logoDataUrl?: string;
}

export type ExportFormat = 'xlsx' | 'pdf' | 'csv';
