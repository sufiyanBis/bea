import { test, expect } from '@playwright/test';
import ExcelJS from 'exceljs';
import { watchErrors, seedSeen } from './helpers';

test('analyse view: calculated column turnover / employees, grouping, aggregates, Excel export with a real formula', async ({ page }) => {
  const errors = watchErrors(page);
  await seedSeen(page);
  await page.goto('/');
  await page.getByRole('button', { name: /^view all .* companies in/ }).click();
  await page.locator('[data-results-view="analyse"]').click();
  const grid = page.locator('[data-analysis-grid]');
  await expect(grid).toBeVisible();
  // invalid formula shows an inline error
  await page.locator('[data-calc-formula]').fill('turnover / (employees');
  await expect(page.locator('[data-formula-error]')).toContainText('Missing ")"');
  await expect(page.locator('[data-calc-add]')).toBeDisabled();
  // valid calculated column
  await page.locator('[data-calc-label]').fill('Turnover per employee');
  await page.locator('[data-calc-formula]').fill('turnover / employees');
  await page.locator('[data-calc-add]').click();
  await expect(grid.getByRole('columnheader', { name: /Turnover per employee/ })).toBeVisible();
  // aggregate footer and grouping
  await page.locator('[data-aggregate]').selectOption('median');
  await expect(page.locator('[data-aggregate-row]')).toContainText('Median of');
  await page.locator('[data-group-by]').selectOption('country');
  await expect(page.locator('[data-group-row]').first()).toBeVisible();
  await page.locator('[data-group-by]').selectOption('');
  // per-column filter
  await page.locator('[data-col-filter="name"]').fill('lumen');
  await expect(page.getByRole('link', { name: /Lumen Bank/ })).toBeVisible();
  // Excel export (filtered to stay under the bulk threshold; bulk exports are covered in exports.spec): calculated column is a real Excel formula
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('[data-analysis-export="xlsx"]').click()]);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(await dl.path());
  expect(wb.worksheets.map((w) => w.name)).toEqual(['Read me', 'Data', 'Calculations', 'Sources']);
  const ws = wb.getWorksheet('Data')!;
  const header = ws.getRow(2).values as string[];
  const calcCol = header.findIndex((h) => typeof h === 'string' && h.startsWith('Turnover per employee'));
  expect(calcCol).toBeGreaterThan(0);
  const cell = ws.getRow(3).getCell(calcCol);
  expect(cell.formula).toMatch(/^IFERROR\(\([A-Z]+3\/[A-Z]+3\),""\)$/);
  expect(String(wb.getWorksheet('Read me')!.getCell('B1').value)).toContain('Prototype for client demo');
  expect(errors).toEqual([]);
});

test('report builder: demo report previews, runs again, a new report saves, re-runs and exports', async ({ page }) => {
  const errors = watchErrors(page);
  await seedSeen(page);
  await page.goto('/reports');
  await page.getByRole('link', { name: 'UK & Ireland AI scale-ups' }).click();
  const preview = page.locator('[data-report-preview]');
  await expect(preview.locator('[data-report-cover]')).toContainText('UK & Ireland AI scale-ups');
  await expect(preview.locator('[data-metric="Companies"]')).not.toHaveText('—');
  await page.locator('[data-run-again]').click();
  await expect(page.locator('[data-report-status]')).toContainText('Ran again');
  // new report from a collection
  await page.goto('/reports/new');
  await page.locator('[data-scope="collection"]').check();
  await page.locator('[data-scope-collection]').selectOption('col-watchlist');
  await expect(page.locator('[data-scope-count]')).toContainText('5 companies');
  await page.locator('[data-report-step="2"]').click();
  await page.locator('[data-add-block="text"]').click();
  await expect(page.locator('[data-block="text"]')).toBeVisible();
  // keyboard reorder: move the new text block up
  await page.getByRole('button', { name: 'Move Commentary up' }).click();
  await page.locator('[data-report-step="3"]').click();
  await page.locator('[data-report-title]').fill('Watchlist review');
  await page.locator('[data-save-report]').click();
  await expect(page).toHaveURL(/\/reports\/rep-/);
  await expect(page.locator('[data-report-cover]')).toContainText('Watchlist review');
  const [pdf] = await Promise.all([page.waitForEvent('download'), page.locator('[data-report-export="pdf"]').click()]);
  expect(pdf.suggestedFilename()).toBe('watchlist-review.pdf');
  await page.goto('/reports');
  await expect(page.locator('[data-reports-table]')).toContainText('Watchlist review');
  await page.locator('[data-duplicate]').first().click();
  await expect(page.locator('[data-reports-table]')).toContainText('(copy)');
  expect(errors).toEqual([]);
});
