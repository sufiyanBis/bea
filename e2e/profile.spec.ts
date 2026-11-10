import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const t = (k: string) => `[data-tour="${k}"]`;
const SECTIONS = ['summary', 'details', 'timeline', 'recent-activity', 'transactions', 'people', 'ownership', 'corporate-structure', 'commodity-trade', 'financials', 'filing-history', 'news', 'similar-companies'];

async function fresh(page: Page, tourSeen = true) {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  if (tourSeen) await page.addInitScript(() => { try { localStorage.setItem('nb.tourSeen', 'true'); } catch { /* */ } });
  return errors;
}

test('entry points: navbar item and the results "Profile" button open the right company', async ({ page }) => {
  const errors = await fresh(page);
  await page.goto('/');
  await page.locator(t('nav-company-profile')).click();
  await page.getByRole('link', { name: /Lumen Bank/ }).first().click();
  await expect(page).toHaveURL(/\/companies\/lumen-bank$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Lumen Bank');

  // search, then use the button beside a result row
  await page.goto('/');
  await page.getByRole('button', { name: /view all/ }).click();
  const firstLink = page.locator('[data-company-link]').first();
  const name = (await firstLink.textContent())!.trim();
  await page.locator('[data-view-profile]').first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
  // the company name link works too, and Back returns to the search with results intact
  await page.goBack();
  await expect(page.locator(t('results-summary'))).toBeVisible();
  await page.locator('[data-company-link]').nth(1).click();
  await expect(page).toHaveURL(/\/companies\/[a-z]+-?\d+/);
  expect(errors).toEqual([]);
});

test('every section renders; disabled nav items are not links; deep links and back/forward work', async ({ page }) => {
  const errors = await fresh(page);
  for (const s of SECTIONS) {
    await page.goto(`/companies/lumen-bank/${s === 'summary' ? '' : s}`);
    await expect(page.locator(`[data-section="${s}"]`)).toBeVisible();
    await expect(page.locator(t(`nav-${s}`))).toHaveAttribute('aria-current', 'page');
  }
  await expect(page.locator(t('nav-patents'))).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator(t('nav-charges-mortgages'))).toHaveAttribute('aria-disabled', 'true');
  // disabled section via URL falls back to summary
  await page.goto('/companies/lumen-bank/patents');
  await expect(page).toHaveURL(/\/companies\/lumen-bank$/);
  // back/forward between sections
  await page.locator(t('nav-people')).click();
  await page.locator(t('nav-news')).click();
  await page.goBack();
  await expect(page.locator('[data-section="people"]')).toBeVisible();
  await page.goForward();
  await expect(page.locator('[data-section="news"]')).toBeVisible();
  // unknown company
  await page.goto('/companies/does-not-exist');
  await expect(page.getByText('Company not found')).toBeVisible();
  expect(errors).toEqual([]);
});

test('header actions: collections popover, CSV, share copy, report toast', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const errors = await fresh(page);
  await page.goto('/companies/lumen-bank');
  await expect(page.locator(t('profile-collections'))).toHaveText(/In 19 collections/);
  await page.locator(t('profile-collections')).click();
  await page.getByRole('dialog').getByText('Challenger banks to watch').click();
  await expect(page.locator(t('profile-collections'))).toHaveText(/In 18 collections/);
  await page.keyboard.press('Escape');

  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'CSV', exact: true }).click()]);
  expect(dl.suggestedFilename()).toBe('lumen-bank-profile.csv');

  await page.getByRole('button', { name: 'Share' }).click();
  await page.getByRole('dialog', { name: 'Share this profile' }).getByRole('button', { name: 'Copy' }).click();
  await expect(page.getByRole('dialog', { name: 'Share this profile' })).toContainText('Copied');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Report an issue' }).click();
  await page.getByRole('dialog', { name: 'Report an issue' }).getByRole('textbox').fill('Head office has moved.');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Thanks' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('section interactions: timeline, ownership, tree, filings, similar', async ({ page }) => {
  const errors = await fresh(page);
  // timeline: filter + significant event drawer
  await page.goto('/companies/lumen-bank/timeline');
  await expect(page.locator('article[id^="ev-"]').first()).toBeVisible();
  await page.getByRole('button', { name: 'Event details' }).first().click();
  await expect(page.getByRole('dialog', { name: 'Event details' })).toBeVisible();
  await page.keyboard.press('Escape');

  // ownership: totals, expand a class, show changes
  await page.goto('/companies/lumen-bank/ownership');
  await expect(page.locator('[data-total-row]')).toContainText('193,153,514');
  await expect(page.locator('[data-total-row]')).toContainText('£3.28b');
  await page.getByRole('button', { name: 'View remaining 252 shareholders in this class' }).click();
  await expect(page.getByRole('button', { name: /View remaining 252/ })).toHaveCount(0);
  await page.getByText('Show changes from last filing').click();
  await expect(page.locator('th', { hasText: 'Change' }).last()).toBeVisible();
  await expect(page.getByText('New', { exact: true }).first()).toBeVisible();

  // corporate tree: group demo collapses
  await page.goto('/companies/harrowmere-group/corporate-structure');
  const nodes = page.locator('[data-node]');
  await expect(nodes).toHaveCount(9);
  await page.getByRole('button', { name: 'Collapse Corporate Structure' }).click();
  await expect(nodes).toHaveCount(4);
  await page.getByRole('button', { name: 'Show/Hide Legend' }).click();
  await expect(page.locator('[data-legend]')).toHaveCount(0);

  // filings only update on "Update Results"
  await page.goto('/companies/lumen-bank/filing-history');
  await expect(page.getByText(/Showing 20 of 40 documents/)).toBeVisible();
  await page.getByRole('button', { name: 'Clear all' }).click();
  await page.getByText('Officers', { exact: true }).click();
  await expect(page.getByText(/of 40 documents/)).toBeVisible();
  await page.getByRole('button', { name: 'Update Results' }).click();
  await expect(page.getByText(/of 40 documents/)).toHaveCount(0);
  await expect(page.locator('td.font-mono').first()).toHaveText(/AP01|TM01|CH01/);

  // similar: not similar + undo
  await page.goto('/companies/lumen-bank/similar-companies');
  await expect(page.getByText('Showing 20 similar companies.')).toBeVisible();
  await page.getByRole('button', { name: 'Not similar' }).first().click();
  await expect(page.getByText('Showing 19 similar companies.')).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('Showing 20 similar companies.')).toBeVisible();
  // financial statements download
  await page.goto('/companies/lumen-bank/financials');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Download all \d+ years/ }).click()]);
  expect(dl.suggestedFilename()).toContain('financial-statements');
  expect(errors).toEqual([]);
});

test('tour 2 walks the profile end to end', async ({ page }) => {
  const errors = await fresh(page);
  await page.goto('/');
  await page.getByRole('button', { name: /Platform tours/ }).click();
  await page.getByRole('button', { name: /Explore a company profile/ }).click();
  await expect(page).toHaveURL(/\/companies\/lumen-bank$/);
  const tip = page.locator('[data-tour-tooltip]');
  let n = 0;
  const shot = () => page.screenshot({ path: `e2e-shots/profile/tour2-${String(++n).padStart(2, '0')}.png` });
  const nav = async (to: string) => {
    await expect(page.locator('[data-tour-beacon]')).toBeVisible();
    await page.waitForTimeout(200);
    await shot();
    await page.locator(t(`nav-${to}`)).click();
    await expect(page.locator(`[data-section="${to}"]`)).toBeVisible();
  };
  const next = async (text: string) => {
    await expect(tip).toContainText(text);
    await page.waitForTimeout(200);
    await shot();
    await tip.getByRole('button', { name: 'Next' }).click();
  };
  await nav('details');
  await next('descriptions, company status, location');
  await nav('timeline');
  await next("since Lumen Bank's incorporation");
  await nav('recent-activity');
  await nav('transactions');
  await next('lists all private fundraisings');
  await nav('people');
  await nav('ownership');
  await next('confirmation statements (CS01 forms)');
  await nav('corporate-structure');
  await nav('commodity-trade');
  await next('commodities imported and exported');
  await nav('financials');
  await next('research and due diligence');
  await nav('filing-history');
  await next('official company filings');
  await nav('news');
  await nav('similar-companies');
  await next('20 most similar counterparts');
  const final = page.locator(t('tour-final'));
  await expect(final).toContainText('Your tour is finished!');
  await page.waitForTimeout(350);
  await shot();
  await final.getByRole('button', { name: 'Book a demo' }).click();
  await expect(page.getByRole('dialog', { name: 'Book a demo' })).toBeVisible();
  expect(errors).toEqual([]);
});
