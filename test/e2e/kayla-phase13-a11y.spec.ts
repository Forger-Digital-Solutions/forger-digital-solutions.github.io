import { test, expect, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Phase 13 automated accessibility audit (axe-core 4.13, WCAG 2.2 AA tags).
 *
 * Covers Kayla in every meaningful UI state. Any axe exclusion must be
 * narrowed with a documented reason — there are currently none.
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

async function stubHealth(page: Page) {
  await page.route(HEALTH_ROUTE, (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok', aiAvailable: true }) })
  );
}

/**
 * `color-contrast` occasionally reports a transient false positive on the
 * homepage's GEMS-ecosystem node labels under CPU contention (parallel
 * workers), previously the suite's one flaky result. Root-caused by direct
 * reproduction, not assumed: the DOM/CSS state axe read was byte-for-byte
 * identical between a violating and a clean run (same opacity, no active
 * transitions or animations, same computed colors) in both dev and a
 * production build — ruling out a page-timing or reveal-animation race. An
 * immediate re-scan of the exact same, unchanged page cleared the violation
 * 13/13 times in a repeated-contention test. That is only possible if the
 * first scan's reported colors did not reflect the page's real, settled
 * state — a one-off race inside axe-core's own rule evaluation, not a
 * property of the UI. A single confirmation scan tells that apart from a
 * genuine, stable defect (which reproduces on every scan, as every other
 * violation in this suite always has) without weakening the check, hiding
 * the element from axe, or retrying blindly until something goes green.
 */
async function scanOnce(page: Page) {
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
}

async function audit(page: Page, state: string) {
  let results = await scanOnce(page);
  if (results.violations.some((v) => v.id === 'color-contrast')) {
    results = await scanOnce(page);
  }
  expect(results.violations, `${state}: ${JSON.stringify(results.violations.map((v) => ({ id: v.id, nodes: v.nodes.length })), null, 2)}`).toEqual([]);
}

async function openWidget(page: Page) {
  await page.goto('/');
  await page.locator('#kayla-launcher').click();
  await expect(page.locator('#kayla-panel')).toBeVisible();
}

async function sendAndSettle(page: Page, text: string) {
  const before = await page.locator('.kayla-msg--kayla').count();
  await page.locator('#kayla-input').fill(text);
  await page.locator('#kayla-send').click();
  await expect.poll(async () => page.locator('.kayla-msg--kayla').count(), { timeout: 15_000 }).toBeGreaterThan(before);
  await expect(page.locator('.kayla-msg--kayla').last()).not.toHaveText(/^Thinking/, { timeout: 10_000 });
}

test.describe('axe audit across Kayla states', () => {
  test.beforeEach(async ({ page }) => { await stubHealth(page); });

  test('homepage with Kayla closed', async ({ page }) => {
    await page.goto('/');
    await audit(page, 'closed');
  });

  test('Kayla opened, empty transcript', async ({ page }) => {
    await openWidget(page);
    await audit(page, 'open');
  });

  test('transcript populated with answer, actions, and sources', async ({ page }) => {
    await page.route(CHAT_ROUTE, (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(ANSWER) })
    );
    await openWidget(page);
    await sendAndSettle(page, 'Can I download CodeForge?');
    await audit(page, 'populated');
  });

  test('loading state', async ({ page }) => {
    await page.route(CHAT_ROUTE, () => new Promise(() => {}));
    await openWidget(page);
    await page.locator('#kayla-input').fill('slow question');
    await page.locator('#kayla-send').click();
    await expect(page.locator('.kayla-msg--streaming')).toBeVisible();
    await audit(page, 'loading');
  });

  test('error state', async ({ page }) => {
    await page.route(CHAT_ROUTE, (route: Route) => route.abort('failed'));
    await openWidget(page);
    await sendAndSettle(page, 'hello?');
    await expect(page.locator('.kayla-msg--kayla').last()).toContainText(/unavailable/i);
    await audit(page, 'error');
  });

  test('rate-limited state', async ({ page }) => {
    await page.route(CHAT_ROUTE, (route: Route) =>
      route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: 'slow', errorType: 'RATE_LIMITED' }) })
    );
    await openWidget(page);
    await sendAndSettle(page, 'first');
    await audit(page, 'rate-limited');
  });

  test('mobile viewport with answer on screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 700 });
    await page.route(CHAT_ROUTE, (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(ANSWER) })
    );
    await openWidget(page);
    await sendAndSettle(page, 'Can I download CodeForge?');
    await audit(page, 'mobile');
  });

  test('reduced-motion mode', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route(CHAT_ROUTE, (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(ANSWER) })
    );
    await openWidget(page);
    await sendAndSettle(page, 'Can I download CodeForge?');
    await audit(page, 'reduced-motion');
  });
});

test.describe('extended keyboard-only journey', () => {
  test.beforeEach(async ({ page }) => { await stubHealth(page); });

  test('open, ask, act, back, reopen, second turn, error, recover, close — no mouse', async ({ page }) => {
    test.setTimeout(120_000);
    let calls = 0;
    await page.route(CHAT_ROUTE, (route: Route) => {
      calls++;
      if (calls === 3) return route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: 'slow', errorType: 'RATE_LIMITED' }) });
      return route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(ANSWER) });
    });
    const focusedId = () => page.evaluate(() => document.activeElement?.id || '');
    const tabToAction = async (label: string) => {
      for (let i = 0; i < 30; i++) {
        await page.keyboard.press('Tab');
        const text = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          return el?.classList?.contains('kayla-action-btn') ? (el.textContent || '') : '';
        });
        if (text.includes(label)) return;
      }
      throw new Error(`never tabbed to action ${label}`);
    };

    // 1-2. Open without mouse; focus lands in the composer.
    await page.goto('/');
    await page.locator('#kayla-launcher').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#kayla-panel')).toBeVisible();
    expect(await focusedId()).toBe('kayla-input');
    // 3-4. Deterministic question; answer arrives; focus recovered.
    await page.keyboard.type('Can I download CodeForge?');
    await page.keyboard.press('Enter');
    await expect(page.locator('.kayla-msg--kayla').last()).not.toHaveText(/^Thinking/, { timeout: 10_000 });
    expect(await focusedId()).toBe('kayla-input');
    // 5-6. Activate action by keyboard; browser Back.
    await tabToAction('View CodeForge');
    await page.keyboard.press('Enter');
    await page.waitForURL(/\/projects\/codeforge/);
    await page.goBack();
    // 7-8. Reopen keyboard-only; second turn settles.
    await page.locator('#kayla-launcher').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#kayla-panel')).toBeVisible();
    await page.keyboard.type('What can I actually download?');
    await page.keyboard.press('Enter');
    await expect(page.locator('.kayla-msg--kayla').last()).not.toHaveText(/^Thinking/, { timeout: 10_000 });
    expect(await focusedId()).toBe('kayla-input');
    // 9-10. Third turn hits 429 keyboard-only; composer recovers for a retry.
    await page.keyboard.type('one more question');
    await page.keyboard.press('Enter');
    await expect(page.locator('.kayla-msg--kayla').last()).toContainText(/try again/i, { timeout: 10_000 });
    expect(await focusedId()).toBe('kayla-input');
    // 11. Close; focus returns to the opener.
    await page.keyboard.press('Escape');
    await expect(page.locator('#kayla-panel')).toBeHidden();
    expect(await focusedId()).toBe('kayla-launcher');
    expect(calls).toBe(3);
  });
});

test.describe('the color-contrast confirmation re-scan does not hide a real defect', () => {
  test('a genuinely, stably low-contrast element still fails audit()', async ({ page }) => {
    await stubHealth(page);
    await page.goto('/');
    // A real defect that will never clear on any re-scan (near-identical,
    // fully opaque, static colors — nothing transient about it), proving the
    // one confirmation re-scan in audit() cannot turn a real violation into
    // a pass.
    await page.evaluate(() => {
      const el = document.createElement('div');
      el.textContent = 'Regression fixture: deliberately unreadable text.';
      Object.assign(el.style, {
        position: 'fixed', top: '0', left: '0', zIndex: '99999',
        color: '#101214', background: '#0c0e10', padding: '4px'
      });
      document.body.appendChild(el);
    });
    await expect(audit(page, 'injected low-contrast fixture')).rejects.toThrow(/color-contrast/);
  });
});
