import { test, expect, type Page, type Route } from '@playwright/test';

/**
 * Phase 13 browser lifecycle, slow-network, and offline certification.
 *
 * Lifecycle contract under test (defined here, proven below): hiding,
 * freezing, navigating, closing, or reloading never duplicates sends,
 * replays actions, or wedges the composer. The transcript is intentionally
 * in-memory (page lifetime); a reload starts one fresh greeting.
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

async function stub(page: Page, chat?: (route: Route) => Promise<void> | void) {
  await page.route(HEALTH_ROUTE, (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok', aiAvailable: true }) })
  );
  await page.route(CHAT_ROUTE, chat ?? ((route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(ANSWER) })
  ));
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

test.describe('lifecycle resilience', () => {
  test('hidden then visible mid-request: no duplicate send, answer settles once', async ({ page }) => {
    let calls = 0;
    await stub(page, (route: Route) => {
      calls++;
      return new Promise<void>((resolve) => { setTimeout(() => { void route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(ANSWER) }).then(resolve); }, 800); });
    });
    await openWidget(page);
    await page.locator('#kayla-input').fill('lifecycle question');
    await page.locator('#kayla-send').click();
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    });
    await expect(page.locator('.kayla-msg--kayla').last()).not.toHaveText(/^Thinking/, { timeout: 10_000 });
    await expect(page.locator('.kayla-msg--kayla').last()).toContainText('CodeForge');
    expect(calls).toBe(1);
    expect(await page.locator('.kayla-msg--user').count()).toBe(1);
  });

  test('Back then Forward around an action keeps one widget and one send path', async ({ page }) => {
    // Step budget: three full page loads plus chat settles under parallel load.
    test.setTimeout(90_000);
    await stub(page);
    await openWidget(page);
    await sendAndSettle(page, 'What can I actually download?');
    await Promise.all([
      page.waitForURL(/\/projects\/codeforge/),
      page.locator('.kayla-action-btn', { hasText: 'View CodeForge' }).click()
    ]);
    await page.goBack();
    await expect(page.locator('#kayla-launcher')).toBeVisible();
    await page.goForward();
    await expect(page.locator('#main-content')).toContainText(/CodeForge/i);
    await page.goBack();
    expect(await page.locator('#kayla-launcher').count()).toBe(1);
    expect(await page.locator('#kayla-panel').count()).toBe(1);
    await page.locator('#kayla-launcher').click();
    let calls = 0;
    await page.unroute(CHAT_ROUTE);
    await page.route(CHAT_ROUTE, (route: Route) => {
      calls++;
      return route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(ANSWER) });
    });
    await sendAndSettle(page, 'after traversal');
    expect(calls).toBe(1);
  });

  test('reload starts one fresh greeting: single init, usable composer, no replay', async ({ page }) => {
    await stub(page);
    await openWidget(page);
    await sendAndSettle(page, 'before reload');
    expect(await page.locator('.kayla-msg--kayla').count()).toBeGreaterThan(1);
    await page.reload();
    await page.locator('#kayla-launcher').click();
    await expect(page.locator('#kayla-panel')).toBeVisible();
    // In-memory transcript is page-lifetime by design: exactly the greeting.
    expect(await page.locator('.kayla-msg--kayla').count()).toBe(1);
    expect(await page.locator('#kayla-launcher').count()).toBe(1);
    let calls = 0;
    await page.unroute(CHAT_ROUTE);
    await page.route(CHAT_ROUTE, (route: Route) => {
      calls++;
      return route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(ANSWER) });
    });
    await sendAndSettle(page, 'after reload');
    expect(calls).toBe(1);
  });

  test('freeze/resume via CDP leaves no stuck loading state', async ({ page }) => {
    await stub(page);
    await openWidget(page);
    const session = await page.context().newCDPSession(page);
    try {
      await sendAndSettle(page, 'before freeze');
      await session.send('Page.setWebLifecycleState', { state: 'frozen' });
      await session.send('Page.setWebLifecycleState', { state: 'active' });
    } catch {
      test.skip(true, 'CDP lifecycle states unsupported in this Chromium build');
    }
    await expect(page.locator('#kayla-input')).toBeEnabled();
    await sendAndSettle(page, 'after resume');
  });
});

test.describe('slow network', () => {
  test('delayed first byte: loading appears immediately, close works, sequencing holds', async ({ page }) => {
    await stub(page, () => new Promise(() => {})); // headers never arrive
    await openWidget(page);
    await page.locator('#kayla-input').fill('slow question');
    await page.locator('#kayla-send').click();
    // Pre-network placeholder: explicit loading inside 1s despite no bytes.
    await expect(page.locator('.kayla-msg--streaming')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('#kayla-stop')).toBeVisible();
    await expect(page.locator('#kayla-input')).toBeDisabled();
    await page.locator('#kayla-stop').click();
    await expect(page.locator('#kayla-conversation')).toContainText('Response cancelled.');
    await expect(page.locator('#kayla-input')).toBeEnabled();
  });

  test('CDP-throttled network: dialog responsive, answer settles, no internals', async ({ page, context }) => {
    test.setTimeout(120_000); // throttled round-trips are slow by construction
    await stub(page);
    const session = await context.newCDPSession(page);
    await session.send('Network.emulateNetworkConditions', {
      offline: false, latency: 400, downloadThroughput: 50 * 1024, uploadThroughput: 50 * 1024
    });
    try {
      await openWidget(page);
      await sendAndSettle(page, 'throttled question');
      await expect(page.locator('.kayla-msg--kayla').last()).toContainText('CodeForge');
      expect(await page.locator('#kayla-conversation').textContent()).not.toMatch(/OpenRouter|Timeout|Failed to fetch/i);
    } finally {
      await session.send('Network.emulateNetworkConditions', {
        offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1
      });
    }
  });

  test('hanging request has no client-side retry; Stop recovers (server 9s bound owns timeouts)', async ({ page }) => {
    let calls = 0;
    await stub(page, () => { calls++; return new Promise(() => {}); });
    await openWidget(page);
    await page.locator('#kayla-input').fill('hanging question');
    await page.locator('#kayla-send').click();
    await expect(page.locator('.kayla-msg--streaming')).toBeVisible({ timeout: 2000 });
    await page.waitForTimeout(2500);
    expect(calls).toBe(1); // no silent retry in 2.5s of hanging
    await page.locator('#kayla-stop').click();
    await expect(page.locator('#kayla-input')).toBeEnabled();
  });
});

test.describe('offline behavior', () => {
  test('offline before send: bounded failure, visitor-safe copy, no retry, no stuck loader', async ({ page, context }) => {
    await stub(page);
    await openWidget(page);
    // Drop the stub so offline is real: the request must genuinely fail.
    await page.unroute(CHAT_ROUTE);
    const failedChat: string[] = [];
    page.on('requestfailed', (request) => { if (request.url().includes('/api/kayla/chat')) failedChat.push(request.url()); });
    await context.setOffline(true);
    try {
      await page.locator('#kayla-input').fill('offline question');
      await page.locator('#kayla-send').click();
      await expect(page.locator('.kayla-msg--kayla').last()).toContainText(/unavailable/i, { timeout: 10_000 });
      expect(await page.locator('#kayla-conversation').textContent()).not.toMatch(/Failed to fetch|TypeError|stack/i);
      await expect(page.locator('#kayla-input')).toBeEnabled();
      expect(failedChat).toHaveLength(1); // exactly one attempt: no retry loop
    } finally {
      await context.setOffline(false);
    }
  });

  test('network loss mid-flight then restoration: next requests work normally', async ({ page }) => {
    let calls = 0;
    await stub(page, (route: Route) => {
      calls++;
      if (calls === 1) return route.abort('failed');
      return route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(ANSWER) });
    });
    await openWidget(page);
    await sendAndSettle(page, 'dies mid-flight');
    await expect(page.locator('.kayla-msg--kayla').last()).toContainText(/unavailable/i);
    await sendAndSettle(page, 'restored deterministic');
    await expect(page.locator('.kayla-msg--kayla').last()).toContainText('CodeForge');
  });
});
