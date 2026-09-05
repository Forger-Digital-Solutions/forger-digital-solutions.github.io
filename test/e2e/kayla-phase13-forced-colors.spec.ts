import { test, expect, type Page, type Route } from '@playwright/test';

/**
 * Phase 13 forced-colors (Windows High Contrast) execution proof.
 *
 * Runs the real widget under `forcedColors: active` and asserts every
 * critical control stays visible, distinguishable, and operable. No
 * `forced-color-adjust: none` exists in the codebase, so the browser maps
 * the design onto system colors instead of flattening meaning away.
 */

test.use({ forcedColors: 'active' });

const CHAT_ROUTE = '**/api/kayla/chat*';
const HEALTH_ROUTE = '**/api/kayla/health*';

function ndjson(...objects: unknown[]): string {
  return objects.map((value) => JSON.stringify(value)).join('\n') + '\n';
}

const ANSWER = {
  content: 'CodeForge is publicly available and free. The current public version is v0.2.0.',
  actions: [{ type: 'OPEN_APP', label: 'View CodeForge', href: '/projects/codeforge' }],
  mode: 'local',
  done: true,
  routeMode: 'deterministic',
  sourceLinks: [{ label: 'CodeForge', kind: 'project', route: '/projects/codeforge' }]
};

async function visibleAndSized(page: Page, selector: string): Promise<void> {
  const box = await page.locator(selector).first().boundingBox();
  await expect(page.locator(selector).first(), selector).toBeVisible();
  expect(box, `${selector} has no rendered size`).toBeTruthy();
  expect(box!.width).toBeGreaterThan(0);
  expect(box!.height).toBeGreaterThan(0);
}

test.describe('forced-colors mode', () => {
  test('dialog, transcript, composer, and actions stay visible and operable', async ({ page }) => {
    await page.route(HEALTH_ROUTE, (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok', aiAvailable: true }) })
    );
    await page.route(CHAT_ROUTE, (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(ANSWER) })
    );
    await page.goto('/');
    await page.locator('#kayla-launcher').click();
    await expect(page.locator('#kayla-panel')).toBeVisible();
    for (const selector of ['#kayla-panel', '#kayla-conversation', '#kayla-input', '#kayla-send', '#kayla-launcher', '.kayla-close']) {
      await visibleAndSized(page, selector);
    }
    const before = await page.locator('.kayla-msg--kayla').count();
    await page.locator('#kayla-input').fill('Can I download CodeForge?');
    await page.locator('#kayla-send').click();
    await expect.poll(async () => page.locator('.kayla-msg--kayla').count(), { timeout: 15_000 }).toBeGreaterThan(before);
    await expect(page.locator('.kayla-msg--kayla').last()).not.toHaveText(/^Thinking/, { timeout: 10_000 });
    await expect(page.locator('.kayla-msg--kayla').last()).toContainText('CodeForge');
    await visibleAndSized(page, '.kayla-action-btn');
    await visibleAndSized(page, '.kayla-source-link');
    // Focus indicator must remain perceivable: an outline is rendered.
    await page.locator('#kayla-send').focus();
    const outline = await page.locator('#kayla-send').evaluate((el) => getComputedStyle(el).outlineWidth);
    expect(parseFloat(outline)).toBeGreaterThan(0);
    // Action buttons remain distinguishable from plain text (bordered).
    const border = await page.locator('.kayla-action-btn').first().evaluate((el) => getComputedStyle(el).borderWidth);
    expect(parseFloat(border)).toBeGreaterThan(0);
    // Error state also survives forced colors.
    await page.unroute(CHAT_ROUTE);
    await page.route(CHAT_ROUTE, (route: Route) => route.abort('failed'));
    await page.locator('#kayla-input').fill('again?');
    await page.locator('#kayla-send').click();
    await expect(page.locator('.kayla-msg--kayla').last()).toContainText(/unavailable/i, { timeout: 10_000 });
    await visibleAndSized(page, '#kayla-input');
  });
});
