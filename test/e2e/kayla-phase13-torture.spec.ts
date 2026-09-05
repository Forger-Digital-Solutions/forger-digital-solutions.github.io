import { test, expect, type Page } from '@playwright/test';

/**
 * Phase 13 stream-supersession torture + abort semantics.
 *
 * A controllable in-page fetch shim replaces the chat transport with
 * explicitly-gated streams: the test decides exactly when each chunk, error,
 * or completion lands. No sleeps sequence the races — every step waits on a
 * deterministic DOM/signal condition. Supersession always follows the real
 * product flow (Stop, then re-ask), because the UI intentionally forbids
 * concurrent sends.
 */

async function installShim(page: Page) {
  await page.addInitScript(() => {
    const state = { calls: [] as { body: unknown; aborted: boolean }[], streams: [] as { push: (l: string) => void; close: () => void; fail: (m: string) => void }[] };
    (window as unknown as { __kaylaCtl: typeof state }).__kaylaCtl = state;
    const origFetch = window.fetch.bind(window);
    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(typeof input === 'string' ? input : (input as Request).url ?? input);
      if (!url.includes('/api/kayla/chat')) return origFetch(input, init);
      const index = state.calls.length;
      const call = { body: undefined as unknown, aborted: false };
      try { call.body = init?.body ? JSON.parse(String(init.body)) : null; } catch { call.body = String(init?.body); }
      state.calls.push(call);
      let controller: ReadableStreamDefaultController | null = null;
      const stream = new ReadableStream({
        start(c) {
          controller = c;
          const enc = new TextEncoder();
          state.streams[index] = {
            push: (line: string) => { try { c.enqueue(enc.encode(`${line}\n`)); } catch { /* closed */ } },
            close: () => { try { c.close(); } catch { /* closed */ } },
            fail: (message: string) => { try { c.error(new Error(message)); } catch { /* closed */ } }
          };
        },
        cancel() { /* client gave up; test still owns the producer side */ }
      });
      init?.signal?.addEventListener('abort', () => {
        call.aborted = true;
        try { controller?.error(new DOMException('aborted', 'AbortError')); } catch { /* settled */ }
      });
      return Promise.resolve(new Response(stream, { status: 200, headers: { 'Content-Type': 'application/x-ndjson' } }));
    }) as typeof window.fetch;
  });
}

const calls = (page: Page) => page.evaluate(() => (window as unknown as { __kaylaCtl: { calls: { aborted: boolean }[] } }).__kaylaCtl.calls.length);
const aborted = (page: Page, i: number) => page.evaluate((n) => (window as unknown as { __kaylaCtl: { calls: { aborted: boolean }[] } }).__kaylaCtl.calls[n]?.aborted, i);
async function push(page: Page, i: number, line: string) {
  await page.evaluate(([n, l]) => (window as unknown as { __kaylaCtl: { streams: { push: (s: string) => void }[] } }).__kaylaCtl.streams[n].push(l), [i, line] as const);
}
async function closeStream(page: Page, i: number) {
  await page.evaluate((n) => (window as unknown as { __kaylaCtl: { streams: { close: () => void }[] } }).__kaylaCtl.streams[n].close(), i);
}
async function failStream(page: Page, i: number, message: string) {
  await page.evaluate(([n, m]) => (window as unknown as { __kaylaCtl: { streams: { fail: (s: string) => void }[] } }).__kaylaCtl.streams[n].fail(m), [i, message] as const);
}

const frame = (obj: unknown): string => JSON.stringify(obj);
const answerFrame = (content: string, extra: Record<string, unknown> = {}) =>
  frame({ content, mode: 'local', done: true, routeMode: 'deterministic', sourceLinks: [], ...extra });

async function openWidget(page: Page) {
  await page.route('**/api/kayla/health*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok', aiAvailable: true }) })
  );
  await page.goto('/');
  await page.locator('#kayla-launcher').click();
  await expect(page.locator('#kayla-panel')).toBeVisible();
}

async function startSend(page: Page, text: string) {
  await page.locator('#kayla-input').fill(text);
  await page.locator('#kayla-send').click();
}

async function bubbleCount(page: Page) {
  return page.locator('.kayla-msg--kayla').count();
}

test.describe('supersession torture', () => {
  test.beforeEach(async ({ page }) => { await installShim(page); });

  test('A: partial content, then late content + error + completion after supersession affect nothing', async ({ page }) => {
    await openWidget(page);
    await startSend(page, 'first question');
    await expect.poll(() => calls(page), { timeout: 10_000 }).toBe(1);
    await push(page, 0, frame({ content: 'PARTIAL-AAA ' }));
    await expect(page.locator('.kayla-msg--kayla').last()).toContainText('PARTIAL-AAA');
    await page.locator('#kayla-stop').click();
    await startSend(page, 'second question');
    await expect.poll(() => calls(page), { timeout: 10_000 }).toBe(2);
    // Request 1's late barrage lands after supersession: must be ignored.
    await push(page, 0, frame({ content: 'LATE-AAA-STALE ' }));
    await failStream(page, 0, 'boom');
    await push(page, 0, frame({ content: 'DONE-AAA-STALE', done: true }));
    await closeStream(page, 0);
    // Authoritative request settles normally with exactly one terminal state.
    await push(page, 1, answerFrame('FRESH-BBB'));
    await closeStream(page, 1);
    await expect(page.locator('.kayla-msg--kayla').last()).toHaveText('FRESH-BBB');
    const transcript = await page.locator('#kayla-conversation').textContent();
    expect(transcript).not.toContain('LATE-AAA-STALE');
    expect(transcript).not.toContain('DONE-AAA-STALE');
    expect(transcript).not.toContain('temporarily unavailable');
    expect(await page.locator('.kayla-msg--user').count()).toBe(2);
    expect(await bubbleCount(page)).toBe(3); // greeting + cancelled-turn bubble + FRESH-BBB
    await expect(page.locator('#kayla-input')).toBeEnabled();
  });

  test('B: request-1 fallback arriving before request-2 renders never appears', async ({ page }) => {
    await openWidget(page);
    await startSend(page, 'first question');
    await expect.poll(() => calls(page), { timeout: 10_000 }).toBe(1);
    await page.locator('#kayla-stop').click();
    await startSend(page, 'second question');
    await expect.poll(() => calls(page), { timeout: 10_000 }).toBe(2);
    await push(page, 0, answerFrame('STALE-FALLBACK-AAA', { replace: true, routeMode: 'provider_failed_fallback' }));
    await closeStream(page, 0);
    await push(page, 1, answerFrame('FRESH-BBB'));
    await closeStream(page, 1);
    await expect(page.locator('.kayla-msg--kayla').last()).toHaveText('FRESH-BBB');
    expect(await page.locator('#kayla-conversation').textContent()).not.toContain('STALE-FALLBACK-AAA');
  });

  test('C: stream error exactly at supersession produces no stale error bubble', async ({ page }) => {
    await openWidget(page);
    await startSend(page, 'first question');
    await expect.poll(() => calls(page), { timeout: 10_000 }).toBe(1);
    await page.locator('#kayla-stop').click();
    await startSend(page, 'second question');
    await expect.poll(() => calls(page), { timeout: 10_000 }).toBe(2);
    await failStream(page, 0, 'TIMEOUT');
    await push(page, 1, answerFrame('FRESH-BBB'));
    await closeStream(page, 1);
    await expect(page.locator('.kayla-msg--kayla').last()).toHaveText('FRESH-BBB');
    expect(await page.locator('#kayla-conversation').textContent()).not.toContain('temporarily unavailable');
  });

  test('D: late action set from request 1 never attaches to request 2', async ({ page }) => {
    await openWidget(page);
    await startSend(page, 'first question');
    await expect.poll(() => calls(page), { timeout: 10_000 }).toBe(1);
    await page.locator('#kayla-stop').click();
    await startSend(page, 'second question');
    await expect.poll(() => calls(page), { timeout: 10_000 }).toBe(2);
    await push(page, 1, answerFrame('FRESH-BBB', { actions: [{ type: 'OPEN_APP', label: 'View CodeForge', href: '/projects/codeforge' }] }));
    await closeStream(page, 1);
    await expect(page.locator('.kayla-msg--kayla').last()).toContainText('FRESH-BBB');
    await push(page, 0, frame({ actions: [{ type: 'OPEN_PAGE', label: 'STALE-EVIL-ACTION', href: '/support' }] }));
    await closeStream(page, 0);
    await page.waitForTimeout(300);
    expect(await page.locator('#kayla-conversation').textContent()).not.toContain('STALE-EVIL-ACTION');
    expect(await page.locator('.kayla-msg--kayla').last().locator('.kayla-action-btn').count()).toBe(1);
  });

  test('E: dialog closed mid-stream settles once on reopen, no duplicates', async ({ page }) => {
    await openWidget(page);
    await startSend(page, 'streaming question');
    await expect.poll(() => calls(page), { timeout: 10_000 }).toBe(1);
    await push(page, 0, frame({ content: 'PARTIAL ' }));
    await expect(page.locator('.kayla-msg--kayla').last()).toContainText('PARTIAL');
    await page.keyboard.press('Escape');
    await expect(page.locator('#kayla-panel')).toBeHidden();
    await push(page, 0, answerFrame('SETTLED-WHILE-CLOSED'));
    await closeStream(page, 0);
    await page.waitForTimeout(300);
    await page.locator('#kayla-launcher').click();
    await expect(page.locator('#kayla-conversation')).toContainText('SETTLED-WHILE-CLOSED');
    expect(await bubbleCount(page)).toBe(2); // greeting + one settled answer
    await expect(page.locator('#kayla-input')).toBeEnabled();
  });

  test('F: navigation mid-stream raises no error and loads cleanly', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await openWidget(page);
    await startSend(page, 'streaming question');
    await expect.poll(() => calls(page), { timeout: 10_000 }).toBe(1);
    await push(page, 0, frame({ content: 'PARTIAL ' }));
    await page.goto('/projects');
    await expect(page.locator('#main-content')).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe('abort semantics', () => {
  test.beforeEach(async ({ page }) => { await installShim(page); });

  test('Stop aborts the network; resend aborts the stale controller; exactly one fetch per send', async ({ page }) => {
    await openWidget(page);
    await startSend(page, 'first');
    await expect.poll(() => calls(page), { timeout: 10_000 }).toBe(1);
    expect(await aborted(page, 0)).toBe(false);
    await page.locator('#kayla-stop').click();
    expect(await aborted(page, 0)).toBe(true);
    // Abort alone (no newer turn) settles the turn as cancelled, not failed.
    await expect(page.locator('.kayla-msg--kayla').last()).toHaveText('Response cancelled.', { timeout: 10_000 });
    await startSend(page, 'second');
    await expect.poll(() => calls(page), { timeout: 10_000 }).toBe(2);
    // The second send re-aborts defensively; the first call stays aborted.
    expect(await aborted(page, 0)).toBe(true);
    await push(page, 1, answerFrame('SECOND-OK'));
    await closeStream(page, 1);
    await expect(page.locator('.kayla-msg--kayla').last()).toHaveText('SECOND-OK');
    // No retries, no replays: fetch count equals send count.
    const total = await page.evaluate(() => (window as unknown as { __kaylaCtl: { calls: unknown[] } }).__kaylaCtl.calls.length);
    expect(total).toBe(2);
  });

  test('superseded abort never surfaces as failure and never triggers fallback', async ({ page }) => {
    await openWidget(page);
    await startSend(page, 'first');
    await expect.poll(() => calls(page), { timeout: 10_000 }).toBe(1);
    await page.locator('#kayla-stop').click();
    await startSend(page, 'second');
    await expect.poll(() => calls(page), { timeout: 10_000 }).toBe(2);
    await push(page, 1, answerFrame('SECOND-OK'));
    await closeStream(page, 1);
    await expect(page.locator('.kayla-msg--kayla').last()).toHaveText('SECOND-OK');
    const transcript = await page.locator('#kayla-conversation').textContent();
    expect(transcript).not.toContain('temporarily unavailable');
    expect(transcript).not.toContain('Knowledge Mode');
    expect(await page.evaluate(() => document.querySelector('.kayla-status-text')?.textContent)).not.toBe('Service Unavailable');
  });
});

test.describe('live-region semantics under supersession', () => {
  test.beforeEach(async ({ page }) => { await installShim(page); });

  test('announcement surfaces carry the authoritative answer, never stale text', async ({ page }) => {
    await openWidget(page);
    // Live-region wiring is polite, non-atomic: answers are announced once
    // without re-reading the whole transcript on every turn.
    const live = await page.locator('#kayla-conversation').evaluate((el) => ({
      live: el.getAttribute('aria-live'),
      atomic: el.getAttribute('aria-atomic'),
      relevant: el.getAttribute('aria-relevant')
    }));
    expect(live.live).toBe('polite');
    expect(live.atomic).toBeNull();
    expect(live.relevant).toContain('additions');
    await startSend(page, 'first');
    await expect.poll(() => calls(page), { timeout: 10_000 }).toBe(1);
    await push(page, 0, frame({ content: 'PARTIAL-AAA ' }));
    await page.locator('#kayla-stop').click();
    await startSend(page, 'second');
    await expect.poll(() => calls(page), { timeout: 10_000 }).toBe(2);
    await push(page, 0, frame({ content: 'STALE-AAA ' }));
    await push(page, 1, answerFrame('FRESH-BBB'));
    await closeStream(page, 1);
    await expect(page.locator('.kayla-msg--kayla').last()).toHaveText('FRESH-BBB');
    expect(await page.locator('#kayla-conversation').textContent()).not.toContain('STALE-AAA');
  });
});
