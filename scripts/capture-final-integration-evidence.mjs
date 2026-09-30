import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const arg = (name, fallback) => {
  const value = process.argv.find((entry) => entry.startsWith(`--${name}=`));
  return value ? value.slice(name.length + 3) : fallback;
};

const base = arg('url', 'http://127.0.0.1:4337').replace(/\/$/, '');
const output = resolve(arg('out', 'shots/final-integration-2026-09-30'));
mkdirSync(output, { recursive: true });

async function pageAt(browser, width, height, options = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    reducedMotion: options.reducedMotion ? 'reduce' : 'no-preference',
    isMobile: width <= 390,
    hasTouch: width <= 390,
  });
  const page = await context.newPage();
  await page.goto(`${base}/`, { waitUntil: 'networkidle', timeout: 60_000 });
  return { context, page };
}

async function captureElement(page, selector, name) {
  const target = page.locator(selector).first();
  await target.waitFor({ state: 'visible', timeout: 15_000 });
  await target.evaluate((element) => element.scrollIntoView({ behavior: 'instant', block: 'center' }));
  await target.screenshot({ path: resolve(output, name), animations: 'disabled' });
  console.log(name);
}

async function openKayla(page) {
  await page.locator('#kayla-launcher').click();
  await page.locator('.kayla-panel--open').waitFor({ state: 'visible', timeout: 10_000 });
}

async function waitForSettledKayla(page) {
  await page.locator('.kayla-msg--streaming').waitFor({ state: 'hidden', timeout: 45_000 });
  await page.locator('.kayla-status-text').waitFor({ state: 'visible' });
}

const browser = await chromium.launch({ headless: true });
try {
  // Clean atom at every requested homepage width.
  for (const [width, height] of [[1920, 1080], [1440, 900], [1280, 800], [768, 1024], [390, 844]]) {
    const { context, page } = await pageAt(browser, width, height);
    await captureElement(page, '.fds-ecosystem', `homepage-default-${width}.png`);
    await context.close();
  }

  // Selection evidence is captured by keyboard focus, the same path used in
  // the a11y suite. It reveals precisely one true product trajectory.
  for (const [node, name] of [['codeforge', 'homepage-codeforge-selected.png'], ['farmstand-finder', 'homepage-farmstand-selected.png']]) {
    const { context, page } = await pageAt(browser, 1440, 900);
    await page.locator(`.planet-link[data-node-id="${node}"]`).focus();
    await captureElement(page, '.fds-ecosystem', name);
    await context.close();
  }

  {
    const { context, page } = await pageAt(browser, 1440, 900, { reducedMotion: true });
    await captureElement(page, '.fds-ecosystem', 'homepage-reduced-motion-1440.png');
    await context.close();
  }

  // GEMS at its desktop, tablet, and mobile compositions, then one focus
  // capture per lineage so every physical conduit can be inspected.
  for (const [width, height] of [[1440, 900], [768, 1024], [390, 844]]) {
    const { context, page } = await pageAt(browser, width, height);
    await captureElement(page, '.gems-system', `gems-default-${width}.png`);
    await context.close();
  }
  for (const gem of ['topaz', 'sapphire', 'peridot', 'garnet']) {
    const { context, page } = await pageAt(browser, 1440, 900);
    await page.locator(`.gems-node[data-gem="${gem}"]`).focus();
    await captureElement(page, '.gems-system', `gems-${gem}-active.png`);
    await context.close();
  }
  {
    const { context, page } = await pageAt(browser, 1440, 900, { reducedMotion: true });
    await captureElement(page, '.gems-system', 'gems-reduced-motion-1440.png');
    await context.close();
  }

  // These are intentionally real Worker/browser requests, not mocked route
  // fulfillments. The first screenshot proves visible streaming; the second
  // proves the terminal Ready state after a real coding answer.
  {
    const { context, page } = await pageAt(browser, 1440, 900);
    await openKayla(page);
    await captureElement(page, '#kayla-panel', 'kayla-ready.png');
    await page.locator('#kayla-input').fill('Explain recursion in simple terms.');
    await page.locator('#kayla-send').click();
    await page.locator('.kayla-msg--streaming').waitFor({ state: 'visible', timeout: 15_000 });
    await captureElement(page, '#kayla-panel', 'kayla-real-general-streaming.png');
    await waitForSettledKayla(page);
    await captureElement(page, '#kayla-panel', 'kayla-real-general-ready.png');
    await context.close();
  }
  {
    const { context, page } = await pageAt(browser, 1440, 900);
    await openKayla(page);
    await page.locator('#kayla-input').fill('Write a JavaScript debounce function.');
    await page.locator('#kayla-send').click();
    await waitForSettledKayla(page);
    await captureElement(page, '#kayla-panel', 'kayla-real-code-ready.png');
    await context.close();
  }
  {
    const { context, page } = await pageAt(browser, 390, 844);
    await openKayla(page);
    await captureElement(page, '#kayla-panel', 'kayla-mobile-390-ready.png');
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(`Final integration evidence written to ${output}`);
