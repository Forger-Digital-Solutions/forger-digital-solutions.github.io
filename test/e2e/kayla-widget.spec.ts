import { test, expect, type Page, type Route } from '@playwright/test';

/**
 * Kayla widget browser regression suite.
 *
 * Every case here exists because the property it checks cannot be proven
 * without a real layout engine. In particular, two Phase 6 defects are pinned:
 * focus escaping the open dialog on Tab, and runtime-created elements getting
 * none of the widget's CSS because Astro scopes styles to server-rendered
 * markup. Both looked fine to code review and to "does the element exist"
 * assertions — so these assert computed style and real focus movement instead.
 */

const CHAT_ROUTE = '**/api/kayla/chat*';
const HEALTH_ROUTE = '**/api/kayla/health*';

/** One NDJSON line, the shape the Worker's streaming path emits. */
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

async function stubHealth(page: Page, aiAvailable = true) {
  await page.route(HEALTH_ROUTE, (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok', aiAvailable }) })
  );
}

async function stubChat(page: Page, body: string, status = 200) {
  await page.route(CHAT_ROUTE, (route: Route) =>
    route.fulfill({ status, contentType: 'application/x-ndjson; charset=utf-8', body })
  );
}

async function openWidget(page: Page) {
  await page.goto('/');
  await page.locator('#kayla-launcher').click();
  await expect(page.locator('#kayla-panel')).toBeVisible();
}

async function sendMessage(page: Page, text: string) {
  await page.locator('#kayla-input').fill(text);
  await page.locator('#kayla-send').click();
  await expect(page.locator('.kayla-msg--kayla').last()).not.toHaveText(/^Thinking/, { timeout: 10_000 });
}

test.describe('Widget open/close and keyboard behaviour', () => {
  test.beforeEach(async ({ page }) => { await stubHealth(page); });

  test('launcher opens the panel', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#kayla-panel')).toBeHidden();
    await page.locator('#kayla-launcher').click();
    await expect(page.locator('#kayla-panel')).toBeVisible();
  });

  test('Escape closes the panel and returns focus to the launcher', async ({ page }) => {
    await openWidget(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('#kayla-panel')).toBeHidden();
    const focusedId = await page.evaluate(() => document.activeElement?.id);
    expect(focusedId).toBe('kayla-launcher');
  });

  test('Tab from the last control stays inside the open dialog', async ({ page }) => {
    await stubChat(page, ndjson(CANONICAL_ANSWER));
    await openWidget(page);
    // Sending a message is what created the hidden stop button that broke the
    // Phase 6 trap, so the regression only reproduces after a real turn.
    await sendMessage(page, 'Can I download CodeForge?');
    await page.locator('#kayla-input').focus();
    for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
    const inside = await page.evaluate(() =>
      Boolean(document.getElementById('kayla-panel')?.contains(document.activeElement))
    );
    expect(inside, 'focus escaped the open dialog on Tab').toBe(true);
  });

  test('Shift+Tab from the first control stays inside the open dialog', async ({ page }) => {
    await stubChat(page, ndjson(CANONICAL_ANSWER));
    await openWidget(page);
    await sendMessage(page, 'Can I download CodeForge?');
    await page.locator('.kayla-close').focus();
    for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+Tab');
    const inside = await page.evaluate(() =>
      Boolean(document.getElementById('kayla-panel')?.contains(document.activeElement))
    );
    expect(inside, 'focus escaped the open dialog on Shift+Tab').toBe(true);
  });
});

test.describe('Runtime-created elements actually receive the widget CSS', () => {
  test.beforeEach(async ({ page }) => {
    await stubHealth(page);
    await stubChat(page, ndjson(CANONICAL_ANSWER));
  });

  test('the visitor bubble is styled, not a bare block of text', async ({ page }) => {
    await openWidget(page);
    await sendMessage(page, 'Can I download CodeForge?');
    const styles = await page.locator('.kayla-msg--user').first().evaluate((element) => {
      const computed = getComputedStyle(element);
      return { background: computed.backgroundColor, padding: computed.paddingTop, radius: computed.borderTopLeftRadius };
    });
    // Phase 6 shipped with rgba(0,0,0,0) / 0px / 0px here: the class was
    // present and the element existed, but no rule ever matched it.
    expect(styles.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(parseFloat(styles.padding)).toBeGreaterThan(0);
    expect(parseFloat(styles.radius)).toBeGreaterThan(0);
  });

  test('the Kayla bubble is styled', async ({ page }) => {
    await openWidget(page);
    await sendMessage(page, 'Can I download CodeForge?');
    const styles = await page.locator('.kayla-msg--kayla').last().evaluate((element) => {
      const computed = getComputedStyle(element);
      return { padding: computed.paddingTop, radius: computed.borderTopLeftRadius };
    });
    expect(parseFloat(styles.padding)).toBeGreaterThan(0);
    expect(parseFloat(styles.radius)).toBeGreaterThan(0);
  });

  test('action buttons are styled, not default browser buttons', async ({ page }) => {
    await openWidget(page);
    await sendMessage(page, 'Can I download CodeForge?');
    const styles = await page.locator('.kayla-action-btn').first().evaluate((element) => {
      const computed = getComputedStyle(element);
      return { border: computed.borderTopStyle, background: computed.backgroundColor, radius: computed.borderTopLeftRadius };
    });
    // The default UA button is `2px outset` — that exact value is what Phase 6
    // observed in production.
    expect(styles.border).not.toBe('outset');
    expect(parseFloat(styles.radius)).toBeGreaterThan(0);
  });

  test('the sources row lays out as a spaced flex row', async ({ page }) => {
    await openWidget(page);
    await sendMessage(page, 'Can I download CodeForge?');
    const styles = await page.locator('.kayla-msg__sources').first().evaluate((element) => {
      const computed = getComputedStyle(element);
      return { display: computed.display, gap: computed.columnGap };
    });
    // Phase 6 observed display:block with gap:normal, which ran the label and
    // the source together as "SourcesCodeForge".
    expect(styles.display).toBe('flex');
    expect(parseFloat(styles.gap)).toBeGreaterThan(0);
  });

  test('a source link points at a canonical internal route', async ({ page }) => {
    await openWidget(page);
    await sendMessage(page, 'Can I download CodeForge?');
    const href = await page.locator('.kayla-source-link').first().getAttribute('href');
    expect(href).toBe('/projects/codeforge');
  });
});

test.describe('Long answers stay usable', () => {
  test('a long answer scrolls without breaking layout or the composer', async ({ page }) => {
    await stubHealth(page);
    const longText = Array.from({ length: 40 }, (_, i) =>
      `Paragraph ${i + 1}: CodeForge inspects repositories, plans changes, runs verification, and reports what changed under developer control.`
    ).join('\n\n');
    await stubChat(page, ndjson({ ...CANONICAL_ANSWER, content: longText }));
    await openWidget(page);
    await sendMessage(page, 'Tell me everything about CodeForge.');

    const conversation = page.locator('#kayla-conversation');
    const metrics = await conversation.evaluate((element) => ({
      scrollable: element.scrollHeight > element.clientHeight,
      horizontalOverflow: element.scrollWidth > element.clientWidth + 1
    }));
    expect(metrics.scrollable).toBe(true);
    expect(metrics.horizontalOverflow).toBe(false);

    await expect(page.locator('#kayla-input')).toBeVisible();
    await expect(page.locator('#kayla-send')).toBeVisible();

    // Text must stay inside its bubble rather than spilling across the panel.
    const contained = await page.locator('.kayla-msg--kayla').last().evaluate((element) => {
      const panel = document.getElementById('kayla-panel')!;
      return element.getBoundingClientRect().right <= panel.getBoundingClientRect().right + 1;
    });
    expect(contained).toBe(true);
  });
});

test.describe('Narrow mobile', () => {
  test.use({ viewport: { width: 320, height: 690 } });

  test('no horizontal overflow at 320px with a message on screen', async ({ page }) => {
    await stubHealth(page);
    await stubChat(page, ndjson(CANONICAL_ANSWER));
    await openWidget(page);
    await sendMessage(page, 'Can I download CodeForge?');
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(overflow, 'page scrolls horizontally at 320px').toBe(false);
    await expect(page.locator('#kayla-input')).toBeVisible();
  });
});

test.describe('Mobile at 390px', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('launcher, composer, send, sources, and actions stay usable with no horizontal overflow', async ({ page }) => {
    await stubHealth(page);
    await stubChat(page, ndjson(CANONICAL_ANSWER));
    await openWidget(page);
    await expect(page.locator('#kayla-input')).toBeVisible();
    await expect(page.locator('#kayla-send')).toBeVisible();
    await sendMessage(page, 'Can I download CodeForge?');

    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(overflow, 'page scrolls horizontally at 390px').toBe(false);

    const lastMessage = page.locator('.kayla-msg--kayla').last();
    await expect(lastMessage.locator('.kayla-msg__actions')).toBeVisible();
    // The transcript itself may scroll vertically; the document must not.
    await expect(page.locator('#kayla-conversation')).toBeVisible();
  });
});

test.describe('Reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('opens, closes, and answers with controls and loading state still usable', async ({ page }) => {
    await stubHealth(page);
    await stubChat(page, ndjson(CANONICAL_ANSWER));
    await openWidget(page);

    // Loading state must communicate progress without relying on an animation
    // a reduced-motion visitor may not perceive.
    await page.locator('#kayla-input').fill('Can I download CodeForge?');
    await page.locator('#kayla-send').click();
    await expect(page.locator('.kayla-msg--kayla').last()).toBeVisible();
    await expect(page.locator('.kayla-msg--kayla').last()).not.toHaveText(/^Thinking/, { timeout: 10_000 });

    await expect(page.locator('#kayla-input')).toBeVisible();
    await expect(page.locator('#kayla-send')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('#kayla-panel')).toBeHidden();
  });
});

test.describe('Failure UX', () => {
  test('a rate limit shows visitor-friendly wording, not protocol internals', async ({ page }) => {
    await stubHealth(page);
    await page.route(CHAT_ROUTE, (route: Route) =>
      route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: 'Too many requests', errorType: 'RATE_LIMITED' }) })
    );
    await openWidget(page);
    await page.locator('#kayla-input').fill('Can I download CodeForge?');
    await page.locator('#kayla-send').click();

    const transcript = page.locator('#kayla-conversation');
    await expect(transcript).toContainText(/requests/i, { timeout: 10_000 });
    const text = (await transcript.innerText()).toLowerCase();
    expect(text).not.toContain('429');
    expect(text).not.toContain('durable object');
    expect(text).not.toContain('cloudflare');
    expect(text).not.toContain('rate_limited');
  });

  test('a provider fallback shows the grounded answer with no alarming banner', async ({ page }) => {
    await stubHealth(page);
    await stubChat(page, ndjson({
      content: "Kayla's conversational AI is temporarily unavailable, but I can still answer from the FDS knowledge base.\n\nCodeForge is publicly available and free.",
      actions: CANONICAL_ANSWER.actions,
      mode: 'local',
      done: true,
      replace: true,
      routeMode: 'provider_failed_fallback',
      sourceLinks: CANONICAL_ANSWER.sourceLinks
    }));
    await openWidget(page);
    await sendMessage(page, 'Compare CodeForge and Kayla AI Publisher.');

    const text = await page.locator('#kayla-conversation').innerText();
    expect(text).toContain('CodeForge is publicly available and free.');
    expect(text.toLowerCase()).not.toContain('provider_failed_fallback');
    expect(text.toLowerCase()).not.toContain('openrouter');
    // The status badge must not flip to an outage state for an answered question.
    await expect(page.locator('.kayla-status-text')).not.toHaveText(/service unavailable/i);
  });
});

test.describe('Rejected model output never enters the transcript', () => {
  test('a replaced answer is what gets stored and resent as history', async ({ page }) => {
    await stubHealth(page);
    // The server streams the unsafe text first, then replaces it — exactly what
    // the buffer-then-validate path does when verification rejects a generation.
    await page.route(CHAT_ROUTE, async (route: Route) => {
      const request = route.request();
      const payload = JSON.parse(request.postData() || '{}') as { history?: { content: string }[] };
      // Second turn: assert the forged/rejected text is absent from history.
      if ((payload.history?.length ?? 0) > 0) {
        const serialized = JSON.stringify(payload.history);
        await route.fulfill({
          status: 200,
          contentType: 'application/x-ndjson; charset=utf-8',
          body: ndjson({ content: `HISTORY_SEEN:${serialized.includes('Sapphire powers CodeForge') ? 'LEAKED' : 'CLEAN'}`, mode: 'local', done: true, routeMode: 'deterministic' })
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/x-ndjson; charset=utf-8',
        body: ndjson(
          { mode: 'ai' },
          { type: 'content', content: 'Sapphire powers CodeForge.' },
          { replace: true, content: 'GEMS is research; CodeForge is a released product. They are separate.', mode: 'local', done: true, routeMode: 'provider_replaced' }
        )
      });
    });

    await openWidget(page);
    await sendMessage(page, 'How do GEMS and CodeForge relate?');
    await expect(page.locator('#kayla-conversation')).not.toContainText('Sapphire powers CodeForge');

    await sendMessage(page, 'What is CodeForge then?');
    await expect(page.locator('#kayla-conversation')).toContainText('HISTORY_SEEN:CLEAN');
  });
});
