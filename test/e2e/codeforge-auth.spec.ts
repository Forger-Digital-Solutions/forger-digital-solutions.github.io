import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('CodeForge GitHub identity entry point', () => {
  test('renders a GitHub-only sign-in journey with safe callback states', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/codeforge/sign-in');

    await expect(page.getByRole('heading', { name: 'Continue to CodeForge.' })).toBeVisible();
    const start = page.getByRole('link', { name: 'Continue to CodeForge with GitHub' });
    await expect(start).toBeVisible();
    const startUrl = new URL(await start.getAttribute('href')!);
    expect(startUrl.pathname).toBe('/v1/auth/browser/start');
    expect(startUrl.searchParams.get('return')).toBe('https://forgerdigitalsolutions.com/codeforge/sign-in');
    expect(await page.locator('body').textContent()).not.toMatch(/client_secret|access_token|gho_|ghp_/i);

    for (const [state, message] of [
      ['success', 'GitHub account connected. Your CodeForge browser session is active.'],
      ['denied', 'GitHub authorization was canceled. Nothing was changed.'],
      ['invalid', 'That sign-in link is no longer valid. Start again.'],
      ['error', 'CodeForge could not complete the connection. No credential was placed in this page.'],
    ] as const) {
      await page.goto(`/codeforge/sign-in?auth=${state}`);
      await expect(page.getByRole('status')).toContainText(message);
    }
  });

  test('remains usable on a narrow viewport and passes the critical-shell accessibility audit', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/codeforge/sign-in?auth=denied');
    await expect(page.getByRole('heading', { name: 'Continue to CodeForge.' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

    const results = await new AxeBuilder({ page }).include('#main-content').analyze();
    expect(results.violations).toEqual([]);
  });
});
