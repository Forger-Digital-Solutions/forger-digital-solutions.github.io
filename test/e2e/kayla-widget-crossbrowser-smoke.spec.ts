import { test, expect, type Page, type Route } from '@playwright/test';

/**
 * Cross-browser smoke coverage (Phase 8, Part 26).
 *
 * kayla-widget.spec.ts is Chromium-only and deep: 16 cases pinning specific
 * regressions (focus traps, Astro CSS scoping) that only reproduce with a
 * real layout engine. Running all of it on every engine would triple CI time
 * for coverage this suite does not need — a critical-shell smoke pass is
 * enough to catch an engine-specific rendering or event-handling regression
 * without re-certifying Chromium-specific findings on Firefox and WebKit.
 *
 * This file is scoped to the firefox/webkit projects in playwright.config.ts;
 * chromium keeps running the full suite.
 */

const CHAT_ROUTE = '**/api/kayla/chat*';
const HEALTH_ROUTE = '**/api/kayla/health*';

function ndjson(...objects: unknown[]): string {
  return objects.map((value) => JSON.stringify(value)).join('\n') + '\n';
}

const CANONICAL_ANSWER = {
  content: 'CodeForge is publicly available and free. The current public version is v0.2.0.',
  actions: [{ type: 'OPEN_DOWNLOAD', label: 'Download CodeForge', href: 'https://github.com/Forger-Digital-Solutions/CodeForge/releases/latest' }],
  mode: 'local',
  done: true,
  routeMode: 'deterministic',
  sourceLinks: [{ label: 'CodeForge', kind: 'project', route: '/projects/codeforge' }]
};

async function stubHealth(page: Page) {
  await page.route(HEALTH_ROUTE, (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok', aiAvailable: true }) })
  );
}

async function stubChat(page: Page, body: string) {
  await page.route(CHAT_ROUTE, (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/x-ndjson; charset=utf-8', body })
  );
}

test.describe('Critical-shell smoke', () => {
  test.beforeEach(async ({ page }) => { await stubHealth(page); });

  test('open panel, close panel, focus restoration', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#kayla-panel')).toBeHidden();
    await page.locator('#kayla-launcher').click();
    await expect(page.locator('#kayla-panel')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('#kayla-panel')).toBeHidden();
    const focusedId = await page.evaluate(() => document.activeElement?.id);
    expect(focusedId).toBe('kayla-launcher');
  });

  test('send a message, render the answer, dynamic bubble is styled', async ({ page }) => {
    await stubChat(page, ndjson(CANONICAL_ANSWER));
    await page.goto('/');
    await page.locator('#kayla-launcher').click();
    await expect(page.locator('#kayla-panel')).toBeVisible();

    await page.locator('#kayla-input').fill('Can I download CodeForge?');
    await page.locator('#kayla-send').click();
    const bubble = page.locator('.kayla-msg--kayla').last();
    await expect(bubble).not.toHaveText(/^Thinking/, { timeout: 10_000 });
    await expect(bubble).toContainText('CodeForge is publicly available and free.');

    // Runtime-created elements getting no CSS (Astro style scoping) was a
    // real Chromium-suite regression; a bounded check here catches the same
    // failure mode on a different engine without re-running the deep suite.
    const background = await bubble.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(background).not.toBe('rgba(0, 0, 0, 0)');
    expect(background).not.toBe('transparent');
  });

  test('no horizontal overflow at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await stubChat(page, ndjson(CANONICAL_ANSWER));
    await page.goto('/');
    await page.locator('#kayla-launcher').click();
    await page.locator('#kayla-input').fill('Can I download CodeForge?');
    await page.locator('#kayla-send').click();
    await expect(page.locator('.kayla-msg--kayla').last()).not.toHaveText(/^Thinking/, { timeout: 10_000 });

    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(overflow, 'page scrolls horizontally at 390px').toBe(false);
  });
});
