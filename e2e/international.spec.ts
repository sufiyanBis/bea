import { test, expect } from '@playwright/test';
import { watchErrors, seedSeen } from './helpers';

const SECTIONS = ['summary', 'details', 'timeline', 'recent-activity', 'transactions', 'people', 'ownership', 'corporate-structure', 'commodity-trade', 'patents', 'financials', 'charges-mortgages', 'filing-history', 'news', 'similar-companies'];
const TEN = ['gb', 'ie', 'us', 'de', 'fr', 'nl', 'se', 'in', 'jp', 'au'];

test('profile parity: one company from each of 10 countries has every section enabled and populated', async ({ page }) => {
  test.setTimeout(300_000);
  const errors = watchErrors(page);
  await seedSeen(page);
  for (const cc of TEN) {
    const id = `${cc}-1`;
    await page.goto(`/companies/${id}`);
    await page.locator('[data-section-nav]').waitFor();
    for (const s of SECTIONS) {
      await expect(page.locator(`[data-section-nav] [data-tour="nav-${s}"]`), `${id} ${s} enabled`).not.toHaveAttribute('aria-disabled', 'true');
    }
    for (const s of SECTIONS) {
      await page.locator(`[data-section-nav] [data-tour="nav-${s}"]`).click();
      await expect(page.locator(`[data-section="${s}"]`)).toBeVisible();
      await expect(page.locator(`[data-section="${s}"] [data-section-empty]`), `${id} ${s} not empty`).toHaveCount(0);
    }
    // country-aware header
    await expect(page.locator(`[data-company-header] [data-flag="${cc.toUpperCase()}"]`)).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('country dropdown: UK and Ireland first, ~249 countries, typeahead, scopes the search', async ({ page }) => {
  const errors = watchErrors(page);
  await seedSeen(page);
  await page.goto('/');
  const trigger = page.locator('[data-tour="country-scope"]');
  await expect(trigger).toContainText('United Kingdom, Ireland');
  await trigger.click();
  const opts = page.getByRole('listbox', { name: 'Countries' }).getByRole('option');
  expect(await opts.count()).toBe(250); // "All countries" + 249
  await expect(opts.nth(1)).toHaveAttribute('data-country', 'GB');
  await expect(opts.nth(2)).toHaveAttribute('data-country', 'IE');
  // typeahead + keyboard: replace scope with Germany only
  await opts.nth(1).click(); // untick UK
  await opts.nth(2).click(); // untick Ireland
  const box = page.getByRole('combobox', { name: 'Search countries' });
  await box.fill('germ');
  await box.press('Enter');
  await page.keyboard.press('Escape');
  await expect(trigger).toContainText('Germany');
  await page.getByRole('button', { name: /^view all .* companies in Germany/ }).click();
  const rows = page.locator('[data-company-link]');
  await rows.first().waitFor();
  await expect(page.locator('[role="row"] [data-flag="DE"]').first()).toBeVisible();
  await expect(page.locator('[role="row"] [data-flag="GB"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('statistics: companies by country chart and country chip; map defaults to UK and Ireland', async ({ page }) => {
  const errors = watchErrors(page);
  await seedSeen(page);
  await page.goto('/');
  await page.locator('[data-tour="country-scope"]').click();
  await page.locator('[data-country="ALL"]').click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^view all .* companies in All countries/ }).click();
  await page.getByRole('tab', { name: /Statistics/ }).click();
  await expect(page.locator('[data-tour="stats-by-country"]')).toBeVisible();
  await expect(page.locator('[data-tour="stats-by-country"]')).toContainText('United Kingdom');
  await page.locator('[data-tour="stats-country"]').click();
  await page.locator('[role="option"][data-country="FR"]').click();
  await page.keyboard.press('Escape');
  await expect(page.getByText(/in your search results in France/)).toBeVisible();
  await page.getByRole('tab', { name: /Map/ }).click();
  await expect(page.locator('[data-map-view="ukie"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-map-view="all"]').click();
  expect(errors).toEqual([]);
});
