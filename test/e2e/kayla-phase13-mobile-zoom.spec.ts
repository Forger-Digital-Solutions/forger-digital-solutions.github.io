import { test, expect, type Page, type Route } from '@playwright/test';

/**
 * Phase 13 mobile-keyboard-safe layout + zoom/text-scaling proof.
 *
 * A desktop browser cannot open a real iOS/Android keyboard, so these tests
 * shrink the visual viewport to keyboard-open heights (labeled as such) and
 * assert the composer never becomes unreachable. Zoom uses real CSS zoom at
 * 200% plus 200% root text scaling.
 */

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

async function stub(page: Page) {
  await page.route(HEALTH_ROUTE, (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok', aiAvailable: true }) })
  );
  await page.route(CHAT_ROUTE, (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(ANSWER) })
  );
}

async function sendAndSettle(page: Page, text: string) {
  const before = await page.locator('.kayla-msg--kayla').count();
  await page.locator('#kayla-input').fill(text);
  await page.locator('#kayla-send').click();
  await expect.poll(async () => page.locator('.kayla-msg--kayla').count(), { timeout: 15_000 }).toBeGreaterThan(before);
  await expect(page.locator('.kayla-msg--kayla').last()).not.toHaveText(/^Thinking/, { timeout: 10_000 });
}

test.describe('keyboard-open viewport simulation', () => {
  // [width, full height, keyboard-open height]: composer must work at each.
  const cases: [number, number, number][] = [
    [320, 568, 300],
    [360, 640, 320],
    [390, 700, 340],
    [430, 750, 360]
  ];
  for (const [width, full, keyboard] of cases) {
    test(`${width}px wide: full (${full}px) then keyboard-open (${keyboard}px) keeps composer usable`, async ({ page }) => {
      await stub(page);
      await page.setViewportSize({ width, height: full });
      await page.goto('/');
      await page.locator('#kayla-launcher').click();
      await expect(page.locator('#kayla-panel')).toBeVisible();
      await sendAndSettle(page, 'Can I download CodeForge?');
      // Keyboard opens: visual viewport collapses to a short height.
      await page.setViewportSize({ width, height: keyboard });
      await expect(page.locator('#kayla-input')).toBeVisible();
      await expect(page.locator('#kayla-send')).toBeEnabled();
      // Transcript still scrolls; dialog stays on-screen; no sideways scroll.
      const scrollable = await page.locator('#kayla-conversation').evaluate((el) => el.scrollHeight >= el.clientHeight - 1);
      expect(scrollable).toBe(true);
      const panelBox = await page.locator('#kayla-panel').boundingBox();
      expect(panelBox!.y).toBeGreaterThanOrEqual(-1);
      expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(keyboard + 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      // Composer still sends in the collapsed viewport.
      await sendAndSettle(page, 'And GEMS?');
      await expect(page.locator('#kayla-input')).toBeFocused();
    });
  }
});

test.describe('zoom and text scaling', () => {
  test.beforeEach(async ({ page }) => { await stub(page); });

  test('200% browser zoom: no Kayla-caused page scroll, dialog closes, controls work', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => { document.body.style.zoom = '200%'; });
    await page.locator('#kayla-launcher').click();
    await expect(page.locator('#kayla-panel')).toBeVisible();
    await sendAndSettle(page, 'Can I download CodeForge?');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await expect(page.locator('.kayla-action-btn').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#kayla-panel')).toBeHidden();
  });

  test('200% root text scaling: transcript readable, panel fits, composer operable', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
    await page.locator('#kayla-launcher').click();
    await expect(page.locator('#kayla-panel')).toBeVisible();
    await sendAndSettle(page, 'Can I download CodeForge?');
    const panelOverflow = await page.evaluate(() => {
      const panel = document.getElementById('kayla-panel')!;
      return panel.scrollWidth - panel.clientWidth;
    });
    expect(panelOverflow).toBeLessThanOrEqual(1);
    const panelBox = await page.locator('#kayla-panel').boundingBox();
    expect(panelBox!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
    await expect(page.locator('#kayla-input')).toBeVisible();
    await expect(page.locator('#kayla-send')).toBeEnabled();
  });
});
