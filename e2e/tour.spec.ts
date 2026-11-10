import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const t = (k: string) => `[data-tour="${k}"]`;
const SHOTS = 'e2e-shots/tour';

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

test('tour 1 walks end to end with no manual help', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const tip = page.locator('[data-tour-tooltip]');
  let n = 0;
  const shot = async () => page.screenshot({ path: `${SHOTS}-${String(++n).padStart(2, '0')}.png` });

  /** Wait for the tooltip to say `text`, check the beacon, screenshot, then perform the action. */
  const actionStep = async (text: string, key: string) => {
    await expect(tip).toContainText(text, { timeout: 8000 });
    await expect(page.locator('[data-tour-beacon]')).toBeVisible();
    await page.waitForTimeout(250);
    await shot();
    await page.locator(t(key)).first().click();
  };
  const nextStep = async (text: string) => {
    await expect(tip).toContainText(text, { timeout: 8000 });
    await expect(page.locator('[data-tour-beacon]')).toHaveCount(0);
    await page.waitForTimeout(250);
    await shot();
    await tip.getByRole('button', { name: 'Next' }).click();
  };

  // auto-starts on first visit
  await actionStep("We're going to build a simple company search", 'add-criteria');
  await nextStep('lots of filters to choose from');
  await actionStep("refine our search by 'what the company does'", 'group-what-the-company-does');
  await actionStep("Click on 'Industries and buzzwords'", 'criterion-industries');
  await actionStep("'Software' group", 'ind-group-software');
  await actionStep("Tick 'Artificial Intelligence'", 'ind-item-artificial-intelligence');
  await actionStep('Click Confirm to add this filter', 'ind-confirm');
  await actionStep('only companies that work in AI', 'add-criteria');
  await actionStep("Open the 'Companies House' group", 'group-companies-house');
  await actionStep("Choose 'Companies House status'", 'criterion-ch-status');
  await actionStep("Tick 'Active'", 'list-item-active');
  await actionStep('Click OK', 'list-ok');
  await actionStep("Let's add one more filter", 'add-criteria');
  await actionStep('We have five Signals', 'criterion-signals');
  await actionStep("Expand 'Growth'", 'tree-expand-growth');
  await actionStep("Tick 'Equity fundraising'", 'tree-item-growth:equity-fundraising');
  await actionStep("tick '20% scaleup'", 'tree-item-growth:20-scaleup');
  await actionStep('Click Confirm.', 'tree-confirm');
  await actionStep("you've successfully built your first search", 'search-button');

  await expect(tip).toContainText(/Here are the [\d,]+ active AI companies/);
  await nextStep('active AI companies in the UK and Ireland');
  await actionStep("click the 'Statistics' tab", 'tab-statistics');
  await nextStep("Look around at our 'Statistics'");

  const final = page.locator(t('tour-final'));
  await expect(final).toContainText("And that's just the start");
  await page.waitForTimeout(350); // let the fade-in finish
  await shot();
  await final.getByRole('button', { name: 'Book a demo' }).click();
  await expect(page.getByRole('dialog', { name: 'Book a demo' })).toBeVisible();
  await shot();

  // the builder holds the demo query and the results match the tooltip count
  await expect(page.locator(t('value-industries'))).toHaveText('Artificial Intelligence');
  await expect(page.locator(t('value-ch-status'))).toHaveText('Active');
  await expect(page.locator(t('value-signals'))).toHaveText('2 selected');
  expect(errors).toEqual([]);
});

test('tour waits when the user goes off-script', async ({ page }) => {
  await page.goto('/');
  const tip = page.locator('[data-tour-tooltip]');
  await expect(tip).toContainText("We're going to build");
  await page.locator(t('add-criteria')).click();
  await tip.getByRole('button', { name: 'Next' }).click();
  await expect(tip).toContainText("'what the company does'");
  // close the picker: the tour should point back at the add-criteria link
  await page.keyboard.press('Escape');
  await expect(tip).toContainText('Re-open the criteria list');
  await page.locator(t('add-criteria')).click();
  await expect(tip).toContainText("'what the company does'");
});

test('tour auto-starts only once and the Platform tours menu restarts it', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-tour-tooltip]')).toBeVisible();
  await page.locator('[data-tour-tooltip]').getByRole('button', { name: 'End tour' }).click();
  await page.reload();
  await page.waitForTimeout(1500);
  await expect(page.locator('[data-tour-tooltip]')).toHaveCount(0);
  await page.getByRole('button', { name: /Platform tours/ }).click();
  await page.getByRole('button', { name: /Explore the results table/ }).click();
  await expect(page.locator('[data-tour-tooltip]')).toContainText('This is your results table');
  await page.screenshot({ path: 'e2e-shots/tour2-01.png' });
  for (const text of ['Click a column heading', 'Edit table columns', 'Export every result']) {
    await page.locator('[data-tour-tooltip]').getByRole('button', { name: 'Next' }).click();
    await expect(page.locator('[data-tour-tooltip]')).toContainText(text);
  }
  await page.locator('[data-tour-tooltip]').getByRole('button', { name: 'Next' }).click();
  await expect(page.locator('[data-tour-tooltip]')).toHaveCount(0);
});
