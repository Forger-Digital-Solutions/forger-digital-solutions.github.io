import { test, expect, type Page, type Route } from '@playwright/test';

/**
 * Presentation-normalization regression corpus.
 *
 * Kayla's answers previously rendered as flat `textContent`, so a provider
 * slip into markdown, or a canonical bullet list, showed up as literal
 * "•"/"-"/"**"/"#" characters in a pre-wrap blob. render-answer.ts converts a
 * deliberately narrow set of shapes into real DOM (paragraphs, lists, inline
 * bold/code) while staying safe by construction — never parsing or assigning
 * HTML. This suite proves both halves: known-ugly shapes render intentionally,
 * and legitimate punctuation is never mangled to get there.
 */

const CHAT_ROUTE = '**/api/kayla/chat*';
const HEALTH_ROUTE = '**/api/kayla/health*';

function ndjson(...objects: unknown[]): string {
  return objects.map((value) => JSON.stringify(value)).join('\n') + '\n';
}

async function stubAnswer(page: Page, content: string) {
  await page.route(HEALTH_ROUTE, (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok', aiAvailable: true }) })
  );
  await page.route(CHAT_ROUTE, (route: Route) =>
    route.fulfill({
      status: 200, contentType: 'application/x-ndjson', body: ndjson({
        content, mode: 'local', done: true, routeMode: 'deterministic', sourceLinks: []
      })
    })
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
  return page.locator('.kayla-msg--kayla').last();
}

test.describe('structured rendering of known shapes', () => {
  test('a bullet block renders as a real <ul>, not literal "•" text', async ({ page }) => {
    await stubAnswer(page, 'Start with what you want to accomplish:\n\n• CodeForge — repository engineering\n• GEMS / Training Grounds — model research\n• KyraBlox — game projects');
    await openWidget(page);
    const last = await sendAndSettle(page, 'Where should I start?');
    const items = last.locator('.kayla-msg__list li');
    await expect(items).toHaveCount(3);
    await expect(items.first()).toHaveText('CodeForge — repository engineering');
    // The bullet marker is a list marker now, not a literal character in the text.
    await expect(last).not.toContainText('•');
  });

  test('a numbered block renders as a real <ol>', async ({ page }) => {
    await stubAnswer(page, '1. First, inspect the repository\n2. Then plan the change\n3. Finally verify the result');
    await openWidget(page);
    const last = await sendAndSettle(page, 'How does CodeForge work?');
    await expect(last.locator('ol.kayla-msg__list li')).toHaveCount(3);
  });

  test('a lead-in line immediately followed by bullets (no blank line) still splits into paragraph + list', async ({ page }) => {
    await stubAnswer(page, 'Features:\n• Plans repository work\n• Runs verification');
    await openWidget(page);
    const last = await sendAndSettle(page, 'What can CodeForge do?');
    await expect(last.locator('p.kayla-msg__p').first()).toHaveText('Features:');
    await expect(last.locator('.kayla-msg__list li')).toHaveCount(2);
  });

  test('**bold** renders as <strong> and `code` renders as <code>', async ({ page }) => {
    await stubAnswer(page, 'CodeForge is **available now** at `v0.2.0`.');
    await openWidget(page);
    const last = await sendAndSettle(page, 'Is CodeForge available?');
    await expect(last.locator('strong')).toHaveText('available now');
    await expect(last.locator('code')).toHaveText('v0.2.0');
  });

  test('a "### Heading" marker is stripped, not shown as literal hashes', async ({ page }) => {
    await stubAnswer(page, '### CodeForge\n\nCodeForge is a free-first autonomous engineering platform.');
    await openWidget(page);
    const last = await sendAndSettle(page, 'Tell me about CodeForge.');
    await expect(last).not.toContainText('#');
    await expect(last.locator('p.kayla-msg__p').first()).toHaveText('CodeForge');
  });

  test('a "> " blockquote marker is stripped, but the quoted text itself is untouched', async ({ page }) => {
    await stubAnswer(page, '> "CodeForge is currently available to the public."');
    await openWidget(page);
    const last = await sendAndSettle(page, 'Is CodeForge available?');
    await expect(last).not.toContainText('>');
    // The renderer never strips quotation marks — only the leading "> " marker.
    await expect(last.locator('p.kayla-msg__p').first()).toHaveText('"CodeForge is currently available to the public."');
  });
});

test.describe('legitimate content survives unchanged', () => {
  test('product names, contractions, versions, prices, and a real requested quote all render intact', async ({ page }) => {
    const text = "Kayla AI Publisher is one of FDS's projects, currently at v0.2.0. You asked for the exact wording: \"exact quote requested by user\". FDS also lists C++, Node.js, and README.md, and CodeForge costs $10 less than nothing — it's free. The GEMS lineages are Topaz, Sapphire, Peridot, and Garnet.";
    await stubAnswer(page, text);
    await openWidget(page);
    const last = await sendAndSettle(page, 'Tell me about the ecosystem.');
    const rendered = (await last.locator('.kayla-msg__text').innerText()).replace(/\s+/g, ' ').trim();
    for (const fragment of [
      'Kayla AI Publisher',
      "FDS's projects",
      'v0.2.0',
      '"exact quote requested by user"',
      'C++',
      'Node.js',
      'README.md',
      '$10',
      'Topaz, Sapphire, Peridot, and Garnet'
    ]) {
      expect(rendered).toContain(fragment);
    }
  });
});

test.describe('scaffolding-shaped text stays inert, never crashes the renderer', () => {
  test('a JSON-shaped answer renders as plain inert text', async ({ page }) => {
    await stubAnswer(page, '{"answer":"CodeForge is available now."}');
    await openWidget(page);
    const last = await sendAndSettle(page, 'Tell me about CodeForge.');
    await expect(last).toContainText('{"answer":"CodeForge is available now."}');
    expect(await last.locator('script').count()).toBe(0);
  });

  test('hostile markup inside an otherwise well-formed answer never executes', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __alerts: number }).__alerts = 0;
      window.alert = () => { (window as unknown as { __alerts: number }).__alerts++; };
    });
    await stubAnswer(page, 'CodeForge is free. **<script>alert(1)</script>** <img src=x onerror=alert(2)> `<svg onload=alert(3)>`');
    await openWidget(page);
    const last = await sendAndSettle(page, 'Tell me about CodeForge.');
    expect(await page.evaluate(() => (window as unknown as { __alerts: number }).__alerts)).toBe(0);
    expect(await last.locator('script').count()).toBe(0);
    expect(await last.locator('img').count()).toBe(0);
    expect(await last.locator('svg').count()).toBe(0);
    // The hostile string still appears as inert text — nothing was silently dropped.
    await expect(last).toContainText('alert(1)');
  });
});
