import { test, expect, type Page, type Route } from '@playwright/test';

/**
 * Phase 13 large-answer stress + hostile-text rendering regression.
 *
 * Server response bounds are enforced handler-side; these journeys prove the
 * browser stays usable when answers are large but valid, and that hostile
 * markup in ANY text channel (user input, answer body, action label, source
 * label) is rendered as inert text — never executed, never linked.
 */

const CHAT_ROUTE = '**/api/kayla/chat*';
const HEALTH_ROUTE = '**/api/kayla/health*';

function ndjson(...objects: unknown[]): string {
  return objects.map((value) => JSON.stringify(value)).join('\n') + '\n';
}

async function stubHealth(page: Page) {
  await page.route(HEALTH_ROUTE, (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok', aiAvailable: true }) })
  );
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

test.describe('large valid answers', () => {
  test('5KB answer + 3 actions + 4 sources + emoji/unicode/markdown-like text stays usable', async ({ page }) => {
    const big = `${'CodeForge is a free-first engineering platform. '.repeat(90)}\n\nFeatures:\n- **bold-like** and _italic-like_ markers stay plain text\n- \`code-like\` spans stay plain text\n\nEmoji 🚀 and Japanese GEMSって何？ and Arabic مرحبا render as text.`;
    await stubHealth(page);
    await page.route(CHAT_ROUTE, (route: Route) =>
      route.fulfill({
        status: 200, contentType: 'application/x-ndjson', body: ndjson({
          content: big,
          actions: [
            { type: 'OPEN_APP', label: 'View CodeForge', href: '/projects/codeforge' },
            { type: 'OPEN_FORGED', label: 'Visit Forged', href: '/forged' },
            { type: 'SHOW_APPS', label: 'View All Projects', href: '/projects' }
          ],
          mode: 'local', done: true, routeMode: 'deterministic',
          sourceLinks: [
            { label: 'CodeForge', kind: 'project', route: '/projects/codeforge' },
            { label: 'Forged', kind: 'page', route: '/forged' },
            { label: 'Projects', kind: 'page', route: '/projects' },
            { label: 'Support', kind: 'page', route: '/support' }
          ]
        })
      })
    );
    for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 700 }]) {
      await page.setViewportSize(viewport);
      await openWidget(page);
      await sendAndSettle(page, 'Tell me everything about CodeForge.');
      const last = page.locator('.kayla-msg--kayla').last();
      await expect(last).toContainText('🚀');
      // Markdown-like markers are plain text: no strong/em/code elements created.
      expect(await last.locator('strong, em, code').count()).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      const panelOverflow = await page.evaluate(() => {
        const panel = document.getElementById('kayla-panel')!;
        return panel.scrollWidth - panel.clientWidth;
      });
      expect(panelOverflow).toBeLessThanOrEqual(1);
      expect(await last.locator('.kayla-action-btn').count()).toBe(3);
      await page.keyboard.press('Escape');
    }
  });
});

test.describe('hostile text is inert', () => {
  test.beforeEach(async ({ page }) => {
    await stubHealth(page);
    await page.addInitScript(() => {
      (window as unknown as { __alerts: unknown[] }).__alerts = [];
      window.alert = (message?: unknown) => { (window as unknown as { __alerts: unknown[] }).__alerts.push(message); };
    });
  });

  const alerts = (page: Page) => page.evaluate(() => (window as unknown as { __alerts: unknown[] }).__alerts.length);

  test('hostile answer body never executes', async ({ page }) => {
    const hostile = `<script>alert(1)</script><img src=x onerror=alert(2)><a href="javascript:alert(3)">click</a><svg onload=alert(4)>`;
    await page.route(CHAT_ROUTE, (route: Route) =>
      route.fulfill({
        status: 200, contentType: 'application/x-ndjson', body: ndjson({
          content: `Grounded prefix. ${hostile} Grounded suffix.`,
          mode: 'local', done: true, routeMode: 'deterministic', sourceLinks: []
        })
      })
    );
    await openWidget(page);
    await sendAndSettle(page, 'Tell me about CodeForge.');
    await expect(page.locator('.kayla-msg--kayla').last()).toContainText('<script>');
    expect(await alerts(page)).toBe(0);
    expect(await page.locator('.kayla-msg--kayla').last().locator('script, img, svg').count()).toBe(0);
  });

  test('hostile action hrefs render no buttons; hostile sources render no links', async ({ page }) => {
    await page.route(CHAT_ROUTE, (route: Route) =>
      route.fulfill({
        status: 200, contentType: 'application/x-ndjson', body: ndjson({
          content: 'Grounded answer.',
          actions: [
            { type: 'OPEN_PAGE', label: 'evil js', href: 'javascript:alert(1)' },
            { type: 'OPEN_PAGE', label: 'evil data', href: 'data:text/html,<h1>x</h1>' },
            { type: 'OPEN_PAGE', label: 'evil vb', href: 'vbscript:msgbox(1)' }
          ],
          mode: 'local', done: true, routeMode: 'deterministic',
          sourceLinks: [
            { label: 'evil route', kind: 'page', route: 'javascript:alert(1)' },
            { label: 'evil url', kind: 'page', url: 'data:text/html,<h1>x</h1>' }
          ]
        })
      })
    );
    await openWidget(page);
    await sendAndSettle(page, 'Show me things.');
    expect(await page.locator('.kayla-msg--kayla').last().locator('.kayla-action-btn').count()).toBe(0);
    expect(await page.locator('.kayla-msg--kayla').last().locator('a[href^="javascript:"], a[href^="data:"]').count()).toBe(0);
    expect(await alerts(page)).toBe(0);
  });

  test('hostile user input is inert and encoded forms stay literal', async ({ page }) => {
    await page.route(CHAT_ROUTE, (route: Route) =>
      route.fulfill({
        status: 200, contentType: 'application/x-ndjson', body: ndjson({
          content: 'Safe grounded answer.', mode: 'local', done: true, routeMode: 'deterministic', sourceLinks: []
        })
      })
    );
    await openWidget(page);
    for (const hostile of [
      '<img src=x onerror=alert(1)>',
      '&#60;script&#62;alert(1)&#60;/script&#62;',
      '%3Cscript%3Ealert(1)%3C/script%3E',
      '<svg onload=alert(1)>'
    ]) {
      await sendAndSettle(page, hostile);
    }
    expect(await alerts(page)).toBe(0);
    const transcript = await page.locator('#kayla-conversation').textContent();
    expect(transcript).toContain('<img src=x onerror=alert(1)>');
  });
});
