import { test, expect, type Page, type Route } from '@playwright/test';

/**
 * Phase 12 browser reliability journeys (Chromium).
 *
 * Proves Kayla stays correct and usable when production gets messy: slow
 * streams, cancelled turns, double-sends, rate limits, outages, navigation,
 * viewports, and keyboards. The API is intercepted with handler-identical
 * NDJSON shapes (see the probe in the Phase 12 cert: action payloads below
 * are byte-for-byte what handleKaylaChat returns), so no test spends the
 * shared model allowance or touches production.
 */

const CHAT_ROUTE = '**/api/kayla/chat*';
const HEALTH_ROUTE = '**/api/kayla/health*';

function ndjson(...objects: unknown[]): string {
  return objects.map((value) => JSON.stringify(value)).join('\n') + '\n';
}

const DOWNLOAD_ANSWER = {
  content: 'Right now you can download CodeForge and ForgerEMS from the Forged page.',
  actions: [
    { type: 'OPEN_FORGED', label: 'Visit Forged', href: '/forged' },
    { type: 'OPEN_APP', label: 'View CodeForge', href: '/projects/codeforge' }
  ],
  mode: 'local',
  done: true,
  routeMode: 'deterministic',
  sourceLinks: [{ label: 'Forged', kind: 'page', route: '/forged' }]
};

const GEMS_ANSWER = {
  content: 'GEMS Training Grounds is the FDS AI research program.',
  actions: [{ type: 'OPEN_APP', label: 'View GEMS / Training Grounds', href: '/projects/gems-training-grounds' }],
  mode: 'local',
  done: true,
  routeMode: 'deterministic',
  sourceLinks: [{ label: 'GEMS', kind: 'project', route: '/projects/gems-training-grounds' }]
};

const SUPPORT_ANSWER = {
  content: 'You can support FDS with a donation or hardware.',
  actions: [{ type: 'OPEN_DONATE', label: 'Support FDS', href: '/support' }],
  mode: 'local',
  done: true,
  routeMode: 'deterministic',
  sourceLinks: [{ label: 'Support', kind: 'page', route: '/support' }]
};

const FALLBACK_ANSWER = {
  content: "Kayla's conversational AI is temporarily unavailable, but CodeForge is free and public.",
  actions: [{ type: 'OPEN_APP', label: 'View CodeForge', href: '/projects/codeforge' }],
  mode: 'local',
  done: true,
  replace: true,
  routeMode: 'provider_failed_fallback',
  sourceLinks: [{ label: 'CodeForge', kind: 'project', route: '/projects/codeforge' }]
};

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
  // Count first: the greeting bubble already matches "not Thinking", so only
  // a NEW kayla bubble proves this turn settled (matters on slow networks
  // where the streaming placeholder appears after the first poll).
  const before = await page.locator('.kayla-msg--kayla').count();
  await page.locator('#kayla-input').fill(text);
  await page.locator('#kayla-send').click();
  await expect.poll(async () => page.locator('.kayla-msg--kayla').count(), { timeout: 15_000 }).toBeGreaterThan(before);
  await expect(page.locator('.kayla-msg--kayla').last()).not.toHaveText(/^Thinking/, { timeout: 10_000 });
}

test.describe('Stale, duplicate, and cancelled requests', () => {
  test.beforeEach(async ({ page }) => { await stubHealth(page); });

  test('late answer A never overwrites newer answer B (Stop then re-ask)', async ({ page }) => {
    let calls = 0;
    await page.route(CHAT_ROUTE, (route: Route) => {
      calls++;
      if (calls === 1) {
        // Hang forever: no timing margin to race. Stop aborts this request;
        // the guarantee is that its asynchronous completion can never
        // overwrite the newer turn.
        return new Promise<void>(() => {});
      }
      return route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson({ content: 'FRESH-ANSWER-BBB', mode: 'local', done: true, routeMode: 'deterministic', sourceLinks: [] }) });
    });
    await openWidget(page);
    await page.locator('#kayla-input').fill('first slow question');
    await page.locator('#kayla-send').click();
    await expect(page.locator('#kayla-stop')).toBeVisible();
    await page.locator('#kayla-stop').click();
    await sendAndSettle(page, 'second question');
    await expect(page.locator('.kayla-msg--kayla').last()).toHaveText('FRESH-ANSWER-BBB');
    // Let any late settling from the aborted first request land. The newer
    // turn must own the transcript: both user turns intact, B's answer last,
    // composer re-enabled, no stuck loading state.
    await page.waitForTimeout(1000);
    expect(await page.locator('.kayla-msg--user').count()).toBe(2);
    await expect(page.locator('.kayla-msg--kayla').last()).toHaveText('FRESH-ANSWER-BBB');
    await expect(page.locator('#kayla-input')).toBeEnabled();
    await expect(page.locator('#kayla-stop')).toBeHidden();
  });

  test('rapid Enter+Enter sends exactly one request', async ({ page }) => {
    let calls = 0;
    await page.route(CHAT_ROUTE, (route: Route) => {
      calls++;
      return route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(DOWNLOAD_ANSWER) });
    });
    await openWidget(page);
    await page.locator('#kayla-input').fill('What can I actually download?');
    await page.locator('#kayla-input').press('Enter');
    await page.locator('#kayla-input').press('Enter');
    await expect(page.locator('.kayla-msg--kayla').last()).not.toHaveText(/^Thinking/, { timeout: 10_000 });
    expect(calls).toBe(1);
    expect(await page.locator('.kayla-msg--user').count()).toBe(1);
  });

  test('slow stream shows loading + Stop; Stop cancels cleanly and layout holds', async ({ page }) => {
    await page.route(CHAT_ROUTE, (route: Route) => new Promise<void>((resolve) => {
      setTimeout(() => { void route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(DOWNLOAD_ANSWER) }).then(resolve); }, 1200);
    }));
    await openWidget(page);
    await page.locator('#kayla-input').fill('What can I actually download?');
    await page.locator('#kayla-send').click();
    await expect(page.locator('.kayla-msg--streaming')).toBeVisible();
    await expect(page.locator('#kayla-stop')).toBeVisible();
    await page.locator('#kayla-stop').click();
    await expect(page.locator('#kayla-conversation')).toContainText('Response cancelled.');
    await expect(page.locator('#kayla-input')).toBeVisible();
    await expect(page.locator('#kayla-send')).toBeEnabled();
  });
});

test.describe('Rate limits, outages, and recovery', () => {
  test.beforeEach(async ({ page }) => { await stubHealth(page); });

  test('429 shows friendly copy, keeps focus, and the composer works afterwards', async ({ page }) => {
    let calls = 0;
    await page.route(CHAT_ROUTE, (route: Route) => {
      calls++;
      if (calls === 1) return route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: 'slow down', errorType: 'RATE_LIMITED' }) });
      return route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(DOWNLOAD_ANSWER) });
    });
    await openWidget(page);
    await sendAndSettle(page, 'first question');
    const msg = page.locator('.kayla-msg--kayla').last();
    await expect(msg).toContainText(/try again/i);
    await expect(msg).not.toContainText(/429|Durable|stack/i);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('kayla-input');
    await sendAndSettle(page, 'second question');
    await expect(page.locator('.kayla-msg--kayla').last()).toContainText('CodeForge');
  });

  test('unreachable Worker shows an unavailable state; the panel still closes', async ({ page }) => {
    await page.route(CHAT_ROUTE, (route: Route) => route.abort('failed'));
    await openWidget(page);
    await sendAndSettle(page, 'hello?');
    await expect(page.locator('.kayla-msg--kayla').last()).toContainText(/temporarily unavailable/i);
    await page.keyboard.press('Escape');
    await expect(page.locator('#kayla-panel')).toBeHidden();
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('kayla-launcher');
  });

  test('provider-fallback answers still carry working actions', async ({ page }) => {
    await page.route(CHAT_ROUTE, (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(FALLBACK_ANSWER) })
    );
    await openWidget(page);
    await sendAndSettle(page, 'overview of the ecosystem');
    await expect(page.locator('.kayla-msg--kayla').last()).toContainText(/temporarily unavailable/i);
    await Promise.all([
      page.waitForURL(/\/projects\/codeforge/),
      page.locator('.kayla-action-btn', { hasText: 'View CodeForge' }).click()
    ]);
  });
});

test.describe('Real navigation journeys', () => {
  test.beforeEach(async ({ page }) => { await stubHealth(page); });

  test('developer journey: ask, click View CodeForge, land on the project page', async ({ page }) => {
    await page.route(CHAT_ROUTE, (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(DOWNLOAD_ANSWER) })
    );
    await openWidget(page);
    await sendAndSettle(page, "I'm a developer. Where should I start?");
    await Promise.all([
      page.waitForURL(/\/projects\/codeforge/),
      page.locator('.kayla-action-btn', { hasText: 'View CodeForge' }).click()
    ]);
  });

  test('downloads journey: See available software navigates to /forged', async ({ page }) => {
    await page.route(CHAT_ROUTE, (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(DOWNLOAD_ANSWER) })
    );
    await openWidget(page);
    await sendAndSettle(page, 'What can I actually download?');
    await Promise.all([
      page.waitForURL(/\/forged/),
      page.locator('.kayla-action-btn', { hasText: 'Visit Forged' }).click()
    ]);
  });

  test('support journey: Support FDS navigates to /support without paying anything', async ({ page }) => {
    await page.route(CHAT_ROUTE, (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(SUPPORT_ANSWER) })
    );
    await openWidget(page);
    await sendAndSettle(page, 'How can I support FDS?');
    await Promise.all([
      page.waitForURL(/\/support/),
      page.locator('.kayla-action-btn', { hasText: 'Support FDS' }).click()
    ]);
  });

  test('GEMS journey: AI research action lands on the canonical GEMS page', async ({ page }) => {
    await page.route(CHAT_ROUTE, (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(GEMS_ANSWER) })
    );
    await openWidget(page);
    await sendAndSettle(page, 'I want to learn about AI research.');
    await Promise.all([
      page.waitForURL(/\/projects\/gems-training-grounds/),
      page.locator('.kayla-action-btn', { hasText: 'GEMS' }).click()
    ]);
  });

  test('external actions expose the canonical href with safe new-tab behavior (no payment executed)', async ({ page }) => {
    await page.route(CHAT_ROUTE, (route: Route) =>
      route.fulfill({
        status: 200, contentType: 'application/x-ndjson', body: ndjson({
          content: 'CodeForge releases live on GitHub.', actions: [{ type: 'OPEN_GITHUB', label: 'Open GitHub releases', href: 'https://github.com/Forger-Digital-Solutions/CodeForge/releases/latest' }],
          mode: 'local', done: true, routeMode: 'deterministic', sourceLinks: []
        })
      })
    );
    await openWidget(page);
    await page.goto('/');
    await page.locator('#kayla-launcher').click();
    await sendAndSettle(page, 'Where do I download CodeForge?');
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.locator('.kayla-action-btn', { hasText: 'Open GitHub releases' }).click()
    ]);
    expect(popup.url()).toContain('github.com/Forger-Digital-Solutions/CodeForge');
    await popup.close();
    expect(page.url()).toContain('localhost');
  });

  test('topic switch replaces stale actions (no CodeForge button after asking about GEMS)', async ({ page }) => {
    let calls = 0;
    await page.route(CHAT_ROUTE, (route: Route) => {
      calls++;
      const body = calls === 1 ? DOWNLOAD_ANSWER : GEMS_ANSWER;
      return route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(body) });
    });
    await openWidget(page);
    await sendAndSettle(page, 'I want CodeForge.');
    await expect(page.locator('.kayla-action-btn', { hasText: 'View CodeForge' }).first()).toBeVisible();
    await sendAndSettle(page, 'Actually I want GEMS.');
    await expect(page.locator('.kayla-action-btn', { hasText: 'View GEMS / Training Grounds' }).last()).toBeVisible();
    expect(await page.locator('.kayla-msg--kayla').last().locator('.kayla-action-btn', { hasText: 'View CodeForge' }).count()).toBe(0);
  });

  test('action -> project page -> Back keeps the widget functional', async ({ page }) => {
    await page.route(CHAT_ROUTE, (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(DOWNLOAD_ANSWER) })
    );
    await openWidget(page);
    await sendAndSettle(page, 'What can I actually download?');
    await Promise.all([
      page.waitForURL(/\/projects\/codeforge/),
      page.locator('.kayla-action-btn', { hasText: 'View CodeForge' }).click()
    ]);
    await page.goBack();
    await expect(page.locator('#kayla-launcher')).toBeVisible();
    await page.locator('#kayla-launcher').click();
    await expect(page.locator('#kayla-panel')).toBeVisible();
    await sendAndSettle(page, 'hello again');
  });

  test('deep link: page context resolves on /projects/codeforge without visiting home first', async ({ page }) => {
    let posted: Record<string, unknown> | null = null;
    await page.route(CHAT_ROUTE, (route: Route) => {
      posted = JSON.parse(route.request().postData() || '{}') as Record<string, unknown>;
      return route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(DOWNLOAD_ANSWER) });
    });
    await page.goto('/projects/codeforge');
    await page.locator('#kayla-launcher').click();
    await sendAndSettle(page, 'Where do I download this?');
    expect((posted?.context as Record<string, unknown>)?.entity).toBe('codeforge');
  });

  test('404 page: widget stays usable and claims no project context', async ({ page }) => {
    let posted: Record<string, unknown> | null = null;
    await page.route(CHAT_ROUTE, (route: Route) => {
      posted = JSON.parse(route.request().postData() || '{}') as Record<string, unknown>;
      return route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(DOWNLOAD_ANSWER) });
    });
    await page.goto('/this-route-does-not-exist-xyz');
    await page.locator('#kayla-launcher').click();
    await expect(page.locator('#kayla-panel')).toBeVisible();
    await sendAndSettle(page, 'Where should I start?');
    expect((posted?.context as Record<string, unknown>)?.entity).toBeUndefined();
  });

  test('navigating away mid-request raises no page errors and loads cleanly', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.route(CHAT_ROUTE, () => new Promise(() => {}));
    await openWidget(page);
    await page.locator('#kayla-input').fill('slow question');
    await page.locator('#kayla-send').click();
    await page.goto('/projects');
    await expect(page.locator('#main-content')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('closing mid-request then reopening shows the settled answer without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.route(CHAT_ROUTE, (route: Route) => new Promise<void>((resolve) => {
      setTimeout(() => { void route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(DOWNLOAD_ANSWER) }).then(resolve); }, 800);
    }));
    await openWidget(page);
    await page.locator('#kayla-input').fill('What can I actually download?');
    await page.locator('#kayla-send').click();
    await page.keyboard.press('Escape');
    await expect(page.locator('#kayla-panel')).toBeHidden();
    await page.waitForTimeout(1500);
    await page.locator('#kayla-launcher').click();
    await expect(page.locator('#kayla-conversation')).toContainText('CodeForge');
    expect(errors).toEqual([]);
  });
});

test.describe('Keyboard, viewports, layout, and console', () => {
  test.beforeEach(async ({ page }) => { await stubHealth(page); });

  test('keyboard-only journey: open, ask, and navigate without a mouse', async ({ page }) => {
    await page.route(CHAT_ROUTE, (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(DOWNLOAD_ANSWER) })
    );
    await page.goto('/');
    await page.locator('#kayla-launcher').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#kayla-panel')).toBeVisible();
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('kayla-input');
    await page.keyboard.type("I'm a developer.");
    await page.keyboard.press('Enter');
    await expect(page.locator('.kayla-msg--kayla').last()).not.toHaveText(/^Thinking/, { timeout: 10_000 });
    // Focus returns to the composer; Tab forward through the trap until the
    // View CodeForge action is reached (exact count varies with starters).
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('kayla-input');
    let reachedAction = false;
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      const label = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        return el?.classList?.contains('kayla-action-btn') ? (el.textContent || '') : '';
      });
      if (label.includes('View CodeForge')) { reachedAction = true; break; }
    }
    expect(reachedAction).toBe(true);
    await page.keyboard.press('Enter');
    await page.waitForURL(/\/projects\/codeforge/);
  });

  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 600 }, { width: 768, height: 800 }]) {
    test(`layout holds at ${viewport.width}x${viewport.height}: composer reachable, no sideways scroll`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.route(CHAT_ROUTE, (route: Route) =>
        route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(DOWNLOAD_ANSWER) })
      );
      await openWidget(page);
      await sendAndSettle(page, 'What can I actually download?');
      await expect(page.locator('#kayla-input')).toBeVisible();
      await expect(page.locator('#kayla-send')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test('long action and source labels do not break the panel', async ({ page }) => {
    const longLabel = `A very long but valid action label ${'that keeps going '.repeat(8)}`;
    const longSource = `A very long source label ${'with extra words '.repeat(8)}`;
    await page.route(CHAT_ROUTE, (route: Route) =>
      route.fulfill({
        status: 200, contentType: 'application/x-ndjson', body: ndjson({
          content: 'Here is a grounded answer.',
          actions: [{ type: 'OPEN_PAGE', label: longLabel, href: '/projects' }],
          mode: 'local', done: true, routeMode: 'deterministic',
          sourceLinks: [{ label: longSource, kind: 'page', route: '/projects' }]
        })
      })
    );
    await page.setViewportSize({ width: 320, height: 568 });
    await openWidget(page);
    await sendAndSettle(page, 'List everything.');
    const panelOverflow = await page.evaluate(() => {
      const panel = document.getElementById('kayla-panel')!;
      return panel.scrollWidth - panel.clientWidth;
    });
    expect(panelOverflow).toBeLessThanOrEqual(1);
  });

  test('touch targets: launcher and send meet a usable minimum size', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 700 });
    await page.goto('/');
    const launcher = await page.locator('#kayla-launcher').boundingBox();
    expect(launcher?.height).toBeGreaterThanOrEqual(32);
    expect(launcher?.width).toBeGreaterThanOrEqual(32);
    await page.locator('#kayla-launcher').click();
    const send = await page.locator('#kayla-send').boundingBox();
    expect(send?.height).toBeGreaterThanOrEqual(32);
    expect(send?.width).toBeGreaterThanOrEqual(32);
  });

  test('ten open/close cycles leave exactly one send handler (no listener leak)', async ({ page }) => {
    let calls = 0;
    await page.route(CHAT_ROUTE, (route: Route) => {
      calls++;
      return route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(DOWNLOAD_ANSWER) });
    });
    await page.goto('/');
    for (let i = 0; i < 10; i++) {
      await page.locator('#kayla-launcher').click();
      await expect(page.locator('#kayla-panel')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('#kayla-panel')).toBeHidden();
    }
    await page.locator('#kayla-launcher').click();
    await sendAndSettle(page, 'single send after reopen cycles');
    expect(calls).toBe(1);
  });

  test('full journey leaves zero console errors, page errors, or failed requests', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      // Dev-server-only noise: Vite's dep optimizer can answer 504 while
      // parallel workers cold-start it ("Outdated Optimize Dep"). Production
      // serves prebuilt static files, so this artifact cannot occur there.
      if (message.text().includes('Outdated Optimize Dep')) return;
      consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(String(error)));
    page.on('requestfailed', (request) => failedRequests.push(request.url()));
    await page.route(CHAT_ROUTE, (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(DOWNLOAD_ANSWER) })
    );
    await openWidget(page);
    await sendAndSettle(page, "I'm a developer. Where should I start?");
    await Promise.all([
      page.waitForURL(/\/projects\/codeforge/),
      page.locator('.kayla-action-btn', { hasText: 'View CodeForge' }).click()
    ]);
    await page.goBack();
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });
});
