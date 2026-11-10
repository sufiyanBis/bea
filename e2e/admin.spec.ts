import { test, expect } from '@playwright/test';
import { watchErrors, seedSeen } from './helpers';

test('admin: 30-seat limit, remove then add a user, usage reports with drill-down, audit log', async ({ page }) => {
  const errors = watchErrors(page);
  await seedSeen(page);
  await page.goto('/admin/users');
  await expect(page.locator('[data-seat-counter]')).toHaveText('30 of 30 licences assigned · Full access for all users');
  await page.locator('[data-add-user]').click();
  await expect(page.locator('[data-seats-full]')).toContainText('All 30 licences are assigned');
  await expect(page.locator('[data-submit-user]')).toBeDisabled();
  await page.keyboard.press('Escape');
  // remove a user (confirm dialog), then the seat is free
  await page.locator('[data-remove-user="theo.marchetti@example.org"]').click();
  await page.locator('[data-confirm-remove]').click();
  await expect(page.locator('[data-seat-counter]')).toContainText('29 of 30');
  await page.locator('[data-add-user]').click();
  await page.locator('[data-new-name]').fill('Nadia Quill');
  await page.locator('[data-new-email]').fill('nadia.quill@example.org');
  await page.locator('[data-submit-user]').click();
  await expect(page.locator('[data-user-row="nadia.quill@example.org"]')).toContainText('Invited');
  await expect(page.locator('[data-seat-counter]')).toContainText('30 of 30');
  // usage reports over a custom period
  await page.locator('[data-admin-tab="usage"]').click();
  await page.locator('[data-preset="quarter"]').click();
  await expect(page.locator('[data-kpi="sessions"]')).not.toContainText(/^Sessions0$/);
  await page.locator('[data-preset="custom"]').click();
  await page.locator('[data-range-from]').fill('2026-01-01');
  await page.locator('[data-range-to]').fill('2026-06-30');
  await expect(page.locator('[data-range-picker]')).toContainText('01/01/2026 to 30/06/2026');
  await page.locator('[data-drill="rajesh.kanwar@example.org"]').click();
  await expect(page.locator('[data-drill-panel="sessions"] tbody tr').first()).toBeVisible();
  await page.locator('[data-drill-tab="views"]').click();
  await expect(page.locator('[data-drill-panel="views"]')).toContainText(/\d{2}\/\d{2}\/2026/);
  // usage report export
  const [dl] = await Promise.all([page.waitForEvent('download'), (async () => { await page.getByRole('button', { name: 'Export report' }).click(); await page.locator('[data-export-format="xlsx"]').click(); })()]);
  expect(dl.suggestedFilename()).toBe('usage-report.xlsx');
  // audit log has the changes
  await page.locator('[data-admin-tab="audit"]').click();
  await expect(page.locator('[data-audit-table]')).toContainText('Theo Marchetti');
  await expect(page.locator('[data-audit-table]')).toContainText('Nadia Quill');
  await page.locator('[data-audit-filter]').selectOption('User removed');
  await expect(page.locator('[data-audit-table] tbody tr').first()).toContainText('User removed');
  expect(errors).toEqual([]);
});

const MEMBER_ROUTES = ['/', '/companies/lumen-bank', '/companies/de-1/financials', '/compare?ids=gb-1,de-1', '/comparisons', '/reports', '/reports/rep-demo', '/reports/new',
  '/downloads', '/data-sources', '/account', '/plan', '/tender-coverage'];

test('a Member sees every feature (no gating) and a 403 only on the Admin console', async ({ page }) => {
  const errors = watchErrors(page);
  await seedSeen(page);
  // sign out, then sign in as a Member through the form
  await page.goto('/');
  await page.locator('[data-user-menu]').click();
  await page.locator('[data-sign-out]').click();
  await expect(page).toHaveURL(/\/sign-in/);
  await page.locator('[data-email]').fill('priya.ramanathan@example.org');
  await page.locator('[data-password]').fill('anything');
  await page.locator('[data-sign-in-submit]').click();
  await expect(page.locator('[data-user-menu]')).toContainText('Priya');
  for (const r of MEMBER_ROUTES) {
    await page.goto(r);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-not-found], [data-forbidden]'), r).toHaveCount(0);
    await expect(page.getByText(/upgrade|not included in your plan|locked/i), r).toHaveCount(0);
    await expect(page.locator('[data-locked], [aria-disabled="true"][data-feature]'), r).toHaveCount(0);
  }
  await page.locator('[data-user-menu]').click();
  await expect(page.getByRole('link', { name: 'Admin console' })).toHaveCount(0);
  await page.goto('/admin/users');
  await expect(page.locator('[data-forbidden]')).toContainText('Admin console only');
  expect(errors).toEqual([]);
});
