import { test, expect } from '@playwright/test';

/**
 * R4.2H-R2 regression guards.
 *
 * The homepage first-visit support dialog was accidentally unmounted during the
 * Phase 28 content reconciliation and stayed missing in production until the
 * R4.2H-R2 live visual audit caught it; the ecosystem's Maintenance domain also
 * pointed at /forged (the CodeForge storefront) instead of the ForgerEMS page.
 * These tests certify the mounted dialog's trigger/dedupe/dismissal behavior
 * and the corrected ecosystem destination so neither can silently regress.
 */

// Fresh visit: clear any prior dismissal, then reload so the dialog script
// reads storage after the reset (storage must persist across subsequent
// reloads inside a test, so no addInitScript here).
async function freshHomepage(page: import('@playwright/test').Page) {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
}

const scrollToTrigger = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: Math.floor(max * 0.75), behavior: 'instant' });
  });

test('support dialog is mounted on the homepage and never pops at the top', async ({ page }) => {
  await freshHomepage(page);
  const dialog = page.locator('#fds-support-dialog');
  await expect(dialog).toHaveCount(1);
  await page.waitForTimeout(500);
  await expect(dialog).not.toBeVisible();
});

test('support dialog opens at the scroll trigger, dedupes for 24h after dismissal', async ({ page }) => {
  await freshHomepage(page);
  const dialog = page.locator('#fds-support-dialog');
  await scrollToTrigger(page);
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.sdialog__title')).toContainText('Help Forge What Comes Next');
  await dialog.locator('[data-sdialog-close]').click();
  await expect(dialog).not.toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem('fds_support_dismissed_at'))).toBeTruthy();

  await page.reload({ waitUntil: 'networkidle' });
  await scrollToTrigger(page);
  await expect(dialog).not.toBeVisible();
});

test('support dialog dismisses via ESC', async ({ page }) => {
  await freshHomepage(page);
  const dialog = page.locator('#fds-support-dialog');
  await scrollToTrigger(page);
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});

test('ecosystem Maintenance domain links to the ForgerEMS project page', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  const link = page.locator('.eco-domain--maintenance');
  await expect(link).toHaveAttribute('href', '/projects/forgerems');
});
