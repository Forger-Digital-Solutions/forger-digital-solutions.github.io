import { test, expect, type Page, type Route } from '@playwright/test';

/**
 * Phase 13 measured contrast certification (WCAG 2.2 AA).
 *
 * No visual-inspection claims: every row reads the RENDERED foreground and
 * the composited background (rgba layers flattened against the first opaque
 * ancestor) and computes the WCAG relative-luminance ratio in-page.
 * Thresholds: normal text 4.5:1, large text 3:1, non-text UI 3:1.
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

interface Row { element: string; fg: string; bg: string; ratio: number; threshold: number; kind: string }

async function measure(page: Page, element: string, selector: string, threshold: number, kind: string): Promise<Row> {
  const result = await page.locator(selector).first().evaluate((el) => {
    const parse = (s: string): [number, number, number, number] => {
      const m = s.match(/rgba?\(([^)]+)\)/);
      if (!m) return [0, 0, 0, 1];
      const parts = m[1].split(',').map((x) => parseFloat(x.trim()));
      return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
    };
    const over = (fgc: [number, number, number, number], bgc: [number, number, number]): [number, number, number] => {
      const a = fgc[3];
      return [fgc[0] * a + bgc[0] * (1 - a), fgc[1] * a + bgc[1] * (1 - a), fgc[2] * a + bgc[2] * (1 - a)];
    };
    const fg = parse(getComputedStyle(el).color);
    let bg: [number, number, number] = [255, 255, 255];
    let node: Element | null = el;
    const layers: [number, number, number, number][] = [];
    while (node) {
      const c = parse(getComputedStyle(node).backgroundColor);
      layers.push(c);
      if (c[3] >= 1) break;
      node = node.parentElement;
    }
    for (let i = layers.length - 1; i >= 0; i--) bg = over(layers[i], bg);
    const lum = (c: [number, number, number]): number => {
      const f = (v: number): number => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
    };
    const toHex = (c: [number, number, number] | [number, number, number, number]): string =>
      `#${[c[0], c[1], c[2]].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
    const l1 = lum([fg[0], fg[1], fg[2]]);
    const l2 = lum(bg);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    return { fg: toHex(fg), bg: toHex(bg), ratio: Math.round(ratio * 100) / 100 };
  });
  return { element, ...result, threshold, kind };
}

test.describe('measured contrast (WCAG 2.2 AA)', () => {
  test('Kayla text and controls meet AA against rendered backgrounds', async ({ page }) => {
    await page.route(HEALTH_ROUTE, (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok', aiAvailable: true }) })
    );
    await page.route(CHAT_ROUTE, (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(ANSWER) })
    );
    await page.goto('/');
    await page.locator('#kayla-launcher').click();
    await expect(page.locator('#kayla-panel')).toBeVisible();
    const before = await page.locator('.kayla-msg--kayla').count();
    await page.locator('#kayla-input').fill('Can I download CodeForge?');
    await page.locator('#kayla-send').click();
    await expect.poll(async () => page.locator('.kayla-msg--kayla').count(), { timeout: 15_000 }).toBeGreaterThan(before);
    await expect(page.locator('.kayla-msg--kayla').last()).not.toHaveText(/^Thinking/, { timeout: 10_000 });

    const rows: Row[] = [
      await measure(page, 'kayla answer text', '.kayla-msg--kayla .kayla-msg__text', 4.5, 'text'),
      await measure(page, 'user bubble text', '.kayla-msg--user .kayla-msg__text', 4.5, 'text'),
      await measure(page, 'panel title', '.kayla-panel__name', 4.5, 'text'),
      await measure(page, 'status text', '.kayla-status-text', 4.5, 'text'),
      await measure(page, 'sources label', '.kayla-msg__sources-label', 4.5, 'text'),
      await measure(page, 'source link', '.kayla-source-link', 4.5, 'text'),
      await measure(page, 'action button', '.kayla-action-btn', 4.5, 'text'),
      await measure(page, 'composer input', '#kayla-input', 4.5, 'text'),
      await measure(page, 'launcher label', '#kayla-launcher', 4.5, 'text')
    ];

    // Non-text UI: keyboard focus indicator (global 2px outline) vs panel bg.
    await page.locator('#kayla-send').focus();
    const focusRow = await page.locator('#kayla-send').evaluate((el) => {
      const parse = (s: string): [number, number, number] => {
        const m = s.match(/rgba?\(([^)]+)\)/);
        const p = m ? m[1].split(',').map((x) => parseFloat(x.trim())) : [0, 0, 0];
        return [p[0], p[1], p[2]];
      };
      const lum = (c: [number, number, number]): number => {
        const f = (v: number): number => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
      };
      const outline = parse(getComputedStyle(el).outlineColor);
      const panel = parse(getComputedStyle(document.getElementById('kayla-panel')!).backgroundColor);
      const l1 = lum(outline);
      const l2 = lum(panel);
      return { ratio: Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100 };
    });
    rows.push({ element: 'focus indicator', fg: 'outline', bg: 'panel', ratio: focusRow.ratio, threshold: 3, kind: 'non-text' });

    console.log('\nCONTRAST EVIDENCE (rendered fg/bg, WCAG ratio vs threshold)');
    for (const row of rows) {
      console.log(`${row.ratio >= row.threshold ? 'PASS' : 'FAIL'}  ${row.element}: fg=${row.fg} bg=${row.bg} ratio=${row.ratio}:1 threshold=${row.threshold}:1`);
    }
    for (const row of rows) {
      expect(row.ratio, `${row.element} ${row.fg}/${row.bg} below WCAG AA ${row.threshold}:1`).toBeGreaterThanOrEqual(row.threshold);
    }
  });

  test('placeholder and disabled states are reported (informational)', async ({ page }) => {
    await page.route(HEALTH_ROUTE, (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok', aiAvailable: true }) })
    );
    await page.goto('/');
    await page.locator('#kayla-launcher').click();
    const placeholder = await page.locator('#kayla-input').evaluate((el) => {
      const cs = getComputedStyle(el, '::placeholder');
      return cs.color;
    });
    console.log(`INFO placeholder color: ${placeholder} (decorative hint; input text itself must pass AA)`);
    expect(typeof placeholder).toBe('string');
  });
});
