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
    // The return target must always be same-origin with the page serving the
    // button (production in prod, the dev server in dev) — the security
    // property is that the cloud service can never redirect elsewhere.
    const pageOrigin = new URL(page.url()).origin;
    expect(startUrl.searchParams.get('return')).toBe(new URL('/codeforge/sign-in', pageOrigin).href);
    expect(await page.locator('body').textContent()).not.toMatch(/client_secret|access_token|gho_|ghp_/i);

    // The return target is derived from the page's own origin, never from
    // request parameters — a foreign `return`/`redirect`/`next` query input
    // must not be able to steer the callback elsewhere.
    for (const param of ['return', 'redirect', 'next', 'callback']) {
      await page.goto(`/codeforge/sign-in?${param}=${encodeURIComponent('https://evil.example/steal')}`);
      const href = await page.getByRole('link', { name: 'Continue to CodeForge with GitHub' }).getAttribute('href');
      expect(new URL(href!).searchParams.get('return')).toBe(new URL('/codeforge/sign-in', pageOrigin).href);
    }

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

  test('emits the canonical production return target when scripting is unavailable', async ({ browser }) => {
    // The shipped href is the build-time canonical value; the inline script
    // then rebinds it to the serving origin. With JavaScript disabled the
    // static fallback must still be a safe production URL, not a stub.
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/codeforge/sign-in');
    const href = await page.getByRole('link', { name: 'Continue to CodeForge with GitHub' }).getAttribute('href');
    const startUrl = new URL(href!);
    expect(startUrl.pathname).toBe('/v1/auth/browser/start');
    expect(startUrl.searchParams.get('return')).toBe('https://forgerdigitalsolutions.com/codeforge/sign-in');
    await ctx.close();
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
