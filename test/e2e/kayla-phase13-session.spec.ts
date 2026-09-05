import { test, expect, type Page, type Route } from '@playwright/test';

/**
 * Phase 13 sustained-session, memory, multi-tab, storage, and navigation
 * certification.
 *
 * Bounds under test: browser transcript ≤ MAX_VISIBLE_MESSAGES (50) bubbles,
 * server history window = 10 turns per request (independent bound, enforced
 * server-side). Neither may grow with session length.
 */

const CHAT_ROUTE = '**/api/kayla/chat*';
const HEALTH_ROUTE = '**/api/kayla/health*';

function ndjson(...objects: unknown[]): string {
  return objects.map((value) => JSON.stringify(value)).join('\n') + '\n';
}

const ANSWER = (i: number) => ({
  content: `Grounded answer number ${i} about CodeForge.`,
  actions: [{ type: 'OPEN_APP', label: 'View CodeForge', href: '/projects/codeforge' }],
  mode: 'local',
  done: true,
  routeMode: 'deterministic',
  sourceLinks: [{ label: 'CodeForge', kind: 'project', route: '/projects/codeforge' }]
});

async function stubHealth(page: Page) {
  await page.route(HEALTH_ROUTE, (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok', aiAvailable: true }) })
  );
}

test.describe('long session: 100 mixed turns', () => {
  test.setTimeout(180_000);

  test('transcript stays bounded, history payload stays capped, no latency drift', async ({ page }) => {
    let calls = 0;
    const bodies: { history: unknown[] }[] = [];
    const durations: number[] = [];
    await stubHealth(page);
    await page.route(CHAT_ROUTE, (route: Route) => {
      calls++;
      try { bodies.push({ history: (JSON.parse(route.request().postData() || '{}') as { history?: unknown[] }).history ?? [] }); } catch { bodies.push({ history: [] }); }
      const n = calls;
      if (n % 10 === 0) return route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: 'slow', errorType: 'RATE_LIMITED' }) });
      if (n % 15 === 0) return route.abort('failed');
      return route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(ANSWER(n)) });
    });
    await page.goto('/');
    await page.locator('#kayla-launcher').click();
    await expect(page.locator('#kayla-panel')).toBeVisible();

    for (let turn = 1; turn <= 100; turn++) {
      const start = Date.now();
      await page.locator('#kayla-input').fill(`turn ${turn} question about CodeForge`);
      await page.locator('#kayla-send').click();
      // Settle proof without DOM counting (the 50-message cap prunes old
      // bubbles) and without racing the transient disabled state: the route
      // counter proves the turn started (setProcessing ran synchronously
      // before fetch), and a re-enabled composer proves it settled.
      await expect.poll(async () => {
        if (calls < turn) return false;
        return page.locator('#kayla-send').isEnabled();
      }, { timeout: 10_000 }).toBe(true);
      durations.push(Date.now() - start);
    }

    expect(calls).toBe(100);
    // Browser transcript bound: ≤ 50 retained messages (+1 streaming slack).
    expect(await page.locator('#kayla-conversation > *').count()).toBeLessThanOrEqual(52);
    // Server history window bound: every request carried ≤ 10 turns.
    for (const [i, body] of bodies.entries()) {
      expect(body.history.length, `request ${i}`).toBeLessThanOrEqual(10);
    }
    // No latency drift: late median within 5x of early median (generous).
    const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
    expect(median(durations.slice(-20))).toBeLessThan(median(durations.slice(0, 20)) * 5 + 500);
    // One send still equals one request after 100 turns (no listener growth).
    await page.locator('#kayla-input').fill('turn 101');
    await page.locator('#kayla-send').click();
    await expect.poll(async () => calls, { timeout: 10_000 }).toBe(101);
    expect(calls).toBe(101);
  });
});

test.describe('memory boundedness', () => {
  test('20 open/close + request cycles: stable DOM, single send path, heap reported', async ({ page }) => {
    // Step budget: 40 sequential open/close transitions plus a chat settle.
    test.setTimeout(90_000);
    let calls = 0;
    await stubHealth(page);
    await page.route(CHAT_ROUTE, (route: Route) => {
      calls++;
      return route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(ANSWER(calls)) });
    });
    await page.goto('/');
    const heapBefore = await page.evaluate(() => (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? null);
    const domBefore = await page.evaluate(() => document.getElementsByTagName('*').length);
    for (let i = 0; i < 20; i++) {
      await page.locator('#kayla-launcher').click();
      await expect(page.locator('#kayla-panel')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('#kayla-panel')).toBeHidden();
    }
    await page.locator('#kayla-launcher').click();
    const usersBefore = await page.locator('.kayla-msg--user').count();
    await page.locator('#kayla-input').fill('after cycles');
    await page.locator('#kayla-send').click();
    await expect.poll(async () => page.locator('.kayla-msg--user').count(), { timeout: 10_000 }).toBe(usersBefore + 1);
    expect(calls).toBe(1);
    const domAfter = await page.evaluate(() => document.getElementsByTagName('*').length);
    // One transcript turn added only: DOM growth is exactly the new bubbles.
    expect(domAfter - domBefore).toBeLessThan(30);
    const heapAfter = await page.evaluate(() => (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? null);
    console.log(`INFO heap before=${heapBefore} after=${heapAfter} (GC-variant, informational only)`);
  });
});

test.describe('multi-tab isolation', () => {
  test('two tabs keep separate transcripts, actions, and loading states', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const tabA = await context.newPage();
      const tabB = await context.newPage();
      for (const tab of [tabA, tabB]) {
        await stubHealth(tab);
        await tab.route(CHAT_ROUTE, (route: Route) =>
          route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(ANSWER(1)) })
        );
      }
      await tabA.goto('/');
      await tabB.goto('/');
      await tabA.locator('#kayla-launcher').click();
      await tabB.locator('#kayla-launcher').click();
      await tabA.locator('#kayla-input').fill('Tell me about CodeForge');
      await tabB.locator('#kayla-input').fill('Tell me about GEMS');
      await tabA.locator('#kayla-send').click();
      await tabB.locator('#kayla-send').click();
      await expect(tabA.locator('.kayla-msg--user').last()).toContainText('CodeForge', { timeout: 10_000 });
      await expect(tabB.locator('.kayla-msg--user').last()).toContainText('GEMS', { timeout: 10_000 });
      // No transcript bleed in either direction.
      expect(await tabA.locator('#kayla-conversation').textContent()).not.toContain('Tell me about GEMS');
      expect(await tabB.locator('#kayla-conversation').textContent()).not.toContain('Tell me about CodeForge');
    } finally {
      await context.close();
    }
  });
});

test.describe('storage audit', () => {
  test('a full Kayla session adds zero storage keys and persists no chat content', async ({ page }) => {
    await stubHealth(page);
    await page.route(CHAT_ROUTE, (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(ANSWER(1)) })
    );
    // Freeze the site's anonymous visitor counter (third-party hit + its
    // dedup timestamp) so the diff below measures Kayla only. The counter's
    // own keys are audited statically in §21; they carry no chat content.
    await page.route('**/countapi**', (route: Route) => route.abort('blockedbyclient'));
    await page.goto('/');
    // Baseline BEFORE Kayla is touched: the site chrome owns anonymous
    // counter/dedup keys (fds_visitor_*, support dialog state) that predate
    // Kayla and contain no chat content. Kayla itself must add nothing.
    const before = await page.evaluate(() => ({
      local: Object.keys({ ...localStorage }).sort().join('\n'),
      session: Object.keys({ ...sessionStorage }).sort().join('\n')
    }));
    await page.locator('#kayla-launcher').click();
    await page.locator('#kayla-input').fill('What can I actually download?');
    await page.locator('#kayla-send').click();
    await expect(page.locator('.kayla-msg--kayla').last()).not.toHaveText(/^Thinking/, { timeout: 10_000 });
    const after = await page.evaluate(async () => ({
      local: Object.keys({ ...localStorage }),
      session: Object.keys({ ...sessionStorage }),
      localDump: JSON.stringify({ ...localStorage }),
      sessionDump: JSON.stringify({ ...sessionStorage }),
      cookies: document.cookie,
      indexedDB: typeof indexedDB !== 'undefined' && indexedDB.databases ? await indexedDB.databases() : []
    }));
    // Kayla added no keys at all.
    expect(after.local.sort().join('\n')).toBe(before.local);
    expect(after.session.sort().join('\n')).toBe(before.session);
    // And nowhere in storage sits prompt/answer text.
    expect(`${after.localDump} ${after.sessionDump} ${after.cookies}`.toLowerCase()).not.toMatch(/download|codeforge|kayla/);
    expect(after.indexedDB).toEqual([]);
  });
});

test.describe('navigation regression', () => {
  test('repeated navigation never duplicates init or sends', async ({ page }) => {
    // Step budget: four navigation legs plus five Back/Forward cycles.
    test.setTimeout(120_000);
    await stubHealth(page);
    let calls = 0;
    await page.route(CHAT_ROUTE, (route: Route) => {
      calls++;
      return route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(ANSWER(calls)) });
    });
    const legs: [string, string][] = [
      ['/', '/projects/codeforge'],
      ['/', '/support'],
      ['/this-route-does-not-exist-xyz', '/'],
      ['/projects/gems-training-grounds', '/']
    ];
    for (const [from, to] of legs) {
      await page.goto(from);
      await page.locator('#kayla-launcher').click();
      await expect(page.locator('#kayla-panel')).toBeVisible();
      await page.goto(to);
    }
    await page.goto('/');
    expect(await page.locator('#kayla-launcher').count()).toBe(1);
    expect(await page.locator('#kayla-panel').count()).toBe(1);
    await page.locator('#kayla-launcher').click();
    for (let i = 0; i < 5; i++) {
      await page.goBack().catch(() => {});
      await page.goForward().catch(() => {});
    }
    await page.goto('/');
    await page.locator('#kayla-launcher').click();
    const usersBefore = await page.locator('.kayla-msg--user').count();
    const callsBefore = calls;
    await page.locator('#kayla-input').fill('after navigation storm');
    await page.locator('#kayla-send').click();
    await expect.poll(async () => page.locator('.kayla-msg--user').count(), { timeout: 10_000 }).toBe(usersBefore + 1);
    expect(calls - callsBefore).toBe(1);
    expect(await page.locator('#kayla-conversation').textContent()).not.toContain('after navigation stormafter navigation storm');
  });
});
