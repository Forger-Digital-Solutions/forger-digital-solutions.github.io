import { test, expect, type Page } from '@playwright/test';

/**
 * Visitor-counter behavior, proven in a real browser with the counting API
 * intercepted. The production contract: one browser counts at most one visit
 * per 24-hour window; every other load reads the current value without
 * incrementing; failure keeps the counter hidden.
 */

const HIT = '**/api/v1/hit/**';
const GET = '**/api/v1/get/**';
const COUNTER_VALUE = 41; // small on purpose: no locale separator ambiguity

const counterLocator = (page: Page) => page.getByLabel('Visitor count');

async function installCounterRoutes(
  context: ReturnType<Page['context']>,
  counts: { hits: number; gets: number },
  options: { hitStatus?: number; hitDelayMs?: number } = {}
) {
  await context.route(HIT, async (route) => {
    counts.hits += 1;
    if (options.hitDelayMs) await new Promise((r) => setTimeout(r, options.hitDelayMs));
    if (options.hitStatus && options.hitStatus !== 200) {
      await route.fulfill({ status: options.hitStatus, body: 'counter unavailable' });
      return;
    }
    await route.fulfill({ json: { key: 'fds_website_visits', value: COUNTER_VALUE } });
  });
  await context.route(GET, async (route) => {
    counts.gets += 1;
    await route.fulfill({ json: { key: 'fds_website_visits', value: COUNTER_VALUE } });
  });
}

test.describe('visitor counter semantics', () => {
  test('first eligible visit increments exactly once and displays the value', async ({ page }) => {
    const counts = { hits: 0, gets: 0 };
    await installCounterRoutes(page.context(), counts);
    await page.goto('/');
    await expect(counterLocator(page)).toContainText(String(COUNTER_VALUE));
    await page.waitForTimeout(600);
    expect(counts.hits).toBe(1);
    expect(counts.gets).toBe(0);
  });

  test('reload and navigation inside the window read without incrementing', async ({ page }) => {
    const counts = { hits: 0, gets: 0 };
    await installCounterRoutes(page.context(), counts);
    await page.goto('/');
    await expect(counterLocator(page)).toContainText(String(COUNTER_VALUE));

    await page.reload();
    await expect(counterLocator(page)).toContainText(String(COUNTER_VALUE));

    await page.goto('/projects');
    await page.goBack();
    await expect(counterLocator(page)).toContainText(String(COUNTER_VALUE));
    await page.waitForTimeout(600);

    expect(counts.hits).toBe(1);
    expect(counts.gets).toBeGreaterThanOrEqual(1);
  });

  test('a second same-browser tab does not increment again', async ({ browser }) => {
    const counts = { hits: 0, gets: 0 };
    const context = await browser.newContext();
    await installCounterRoutes(context, counts, { hitDelayMs: 150 });

    const first = await context.newPage();
    const second = await context.newPage();
    await Promise.all([first.goto('/'), second.goto('/')]);

    await expect(counterLocator(first)).toContainText(String(COUNTER_VALUE), { timeout: 10_000 });
    await expect(counterLocator(second)).toContainText(String(COUNTER_VALUE), { timeout: 10_000 });
    await first.waitForTimeout(3_400); // let the follower's fallback window close

    expect(counts.hits).toBe(1);
    await context.close();
  });

  test('backend failure keeps the counter hidden with no placeholder or fake zero', async ({ page }) => {
    const counts = { hits: 0, gets: 0 };
    await installCounterRoutes(page.context(), counts, { hitStatus: 503 });
    await page.goto('/');
    await page.waitForTimeout(1_200);
    const counter = counterLocator(page);
    await expect(counter).toBeHidden();
    await expect(counter).not.toContainText('0');
    expect(counts.gets).toBe(0);
  });

  test('an expired 24-hour window allows exactly one more increment', async ({ page }) => {
    const counts = { hits: 0, gets: 0 };
    await installCounterRoutes(page.context(), counts);
    await page.goto('/');
    await expect(counterLocator(page)).toContainText(String(COUNTER_VALUE));
    expect(counts.hits).toBe(1);

    // Shift the page's clock 25 hours forward: the stored last-hit timestamp
    // is now outside the dedup window, so exactly one more hit may happen.
    await page.addInitScript(() => {
      const realNow = Date.now;
      Date.now = () => realNow() + 25 * 60 * 60 * 1000;
    });

    await page.reload();
    await expect(counterLocator(page)).toContainText(String(COUNTER_VALUE));
    await page.waitForTimeout(600);
    expect(counts.hits).toBe(2);

    await page.reload();
    await expect(counterLocator(page)).toContainText(String(COUNTER_VALUE));
    await page.waitForTimeout(600);
    expect(counts.hits).toBe(2);
  });
});
