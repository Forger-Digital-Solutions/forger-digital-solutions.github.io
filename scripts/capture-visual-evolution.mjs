import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const arg = (name, fallback) => {
  const entry = process.argv.find((value) => value.startsWith(`--${name}=`));
  return entry ? entry.slice(name.length + 3) : fallback;
};
const base = arg('url', 'http://127.0.0.1:4321').replace(/\/$/, '');
const stage = arg('stage', 'before');
const outRoot = resolve(`docs/audit/visual-evolution-2026-09-29/${stage}`);
const viewports = [
  ['1920', 1920, 1080], ['1599', 1599, 900], ['1440', 1440, 900],
  ['1280', 1280, 800], ['1024', 1024, 768], ['768', 768, 1024], ['390', 390, 844],
];
const ensureDir = (path) => mkdirSync(path, { recursive: true });
ensureDir(resolve(outRoot, 'kayla'));
const saveElement = async (page, selector, path) => {
  const element = page.locator(selector).first();
  await element.waitFor({ state: 'visible', timeout: 10000 });
  await element.evaluate((el) => el.scrollIntoView({ behavior: 'instant', block: 'center' }));
  await page.waitForTimeout(250);
  await element.screenshot({ path, animations: 'disabled' });
};
const url = (params = {}) => {
  const parsed = new URL(base);
  for (const [key, value] of Object.entries(params)) if (value) parsed.searchParams.set(key, value);
  return parsed.toString();
};

const browser = await chromium.launch({ headless: true });
try {
  const logoContext = await browser.newContext({ viewport: { width: 500, height: 500 } });
  const logoPage = await logoContext.newPage();
  await logoPage.goto(`${base}/images/codeforge/codeforge-icon.svg`, { waitUntil: 'load' });
  ensureDir(resolve(outRoot, 'reference'));
  await logoPage.screenshot({ path: resolve(outRoot, 'reference/codeforge-icon.png') });
  await logoContext.close();

  const candidateDir = resolve(outRoot, 'candidates');
  for (const candidate of ['direct-expansion', 'codeforge-reactor', 'quiet-scaffold']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(url({ eco: candidate }), { waitUntil: 'networkidle' });
    ensureDir(resolve(candidateDir, 'homepage'));
    await saveElement(page, '.fds-ecosystem', resolve(candidateDir, `homepage/${candidate}.png`));
    await context.close();
  }
  for (const candidate of ['neural-lattice', 'reactor-pipeline']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(url({ gems: candidate }), { waitUntil: 'networkidle' });
    ensureDir(resolve(candidateDir, 'gems'));
    await saveElement(page, '.gems-system', resolve(candidateDir, `gems/${candidate}.png`));
    await context.close();
  }

  const interactionContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const interactionPage = await interactionContext.newPage();
  await interactionPage.goto(base, { waitUntil: 'networkidle' });
  const gemsDiagram = interactionPage.locator('.gems-system');
  await gemsDiagram.scrollIntoViewIfNeeded();
  ensureDir(resolve(outRoot, 'interactions'));
  await interactionPage.locator('.gems-node[data-gem="topaz"]').focus();
  await gemsDiagram.screenshot({ path: resolve(outRoot, 'interactions/gems-topaz-focus.png'), animations: 'disabled' });
  await interactionPage.locator('.gems-node[data-gem="peridot"]').hover();
  await gemsDiagram.screenshot({ path: resolve(outRoot, 'interactions/gems-peridot-hover.png'), animations: 'disabled' });
  await interactionContext.close();

  const reducedContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const reducedPage = await reducedContext.newPage();
  await reducedPage.goto(url(), { waitUntil: 'networkidle' });
  ensureDir(resolve(outRoot, 'reduced-motion'));
  await saveElement(reducedPage, '.fds-ecosystem', resolve(outRoot, 'reduced-motion/ecosystem.png'));
  await saveElement(reducedPage, '.gems-system', resolve(outRoot, 'reduced-motion/gems.png'));
  await reducedContext.close();

  for (const [name, width, height] of viewports) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    await page.goto(url(), { waitUntil: 'networkidle' });
    const dir = resolve(outRoot, 'responsive', name);
    ensureDir(dir);
    await page.locator('.hero').screenshot({ path: resolve(dir, 'homepage-hero.png'), animations: 'disabled' });
    await saveElement(page, '.fds-ecosystem', resolve(dir, 'homepage-ecosystem.png'));
    if (name === '1440' || name === '390') {
      await saveElement(page, '.one-eco', resolve(dir, 'connected-systems.png'));
      await saveElement(page, '.gems-system', resolve(dir, 'gems.png'));
    }
    if (name === '1440') {
      await page.locator('#kayla-launcher').click();
      await page.locator('#kayla-panel').waitFor({ state: 'visible' });
      await page.screenshot({ path: resolve(outRoot, 'kayla/panel-open.png') });
    }
    await context.close();
  }

  const kaylaContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const kaylaPage = await kaylaContext.newPage();
  await kaylaPage.route('**/api/kayla/health*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) }));
  await kaylaPage.route('**/api/kayla/chat*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/x-ndjson; charset=utf-8',
    body: `${JSON.stringify({ content: '```ts\nfunction reverse(text: string): string {\n  return [...text].reverse().join(\'\');\n}\n```', actions: [], sourceLinks: [], mode: 'ai', routeMode: 'general', done: true })}\n`,
  }));
  await kaylaPage.goto(url(), { waitUntil: 'networkidle' });
  ensureDir(resolve(outRoot, 'kayla'));
  await kaylaPage.screenshot({ path: resolve(outRoot, 'kayla/launcher.png') });
  await kaylaPage.locator('#kayla-launcher').click();
  await kaylaPage.locator('#kayla-panel').waitFor({ state: 'visible' });
  await kaylaPage.locator('#kayla-input').fill('How do I reverse a string in TypeScript?');
  await kaylaPage.locator('#kayla-send').click();
  await kaylaPage.locator('.kayla-code').waitFor({ state: 'visible', timeout: 10000 });
  await kaylaPage.locator('#kayla-panel').screenshot({ path: resolve(outRoot, 'kayla/code-response.png') });
  await kaylaContext.close();

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1 });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.route('**/api/kayla/health*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) }));
  await mobilePage.goto(url(), { waitUntil: 'networkidle' });
  await mobilePage.locator('#kayla-launcher').click();
  await mobilePage.locator('#kayla-panel').waitFor({ state: 'visible' });
  ensureDir(resolve(outRoot, 'kayla'));
  await mobilePage.screenshot({ path: resolve(outRoot, 'kayla/mobile.png') });
  await mobileContext.close();
  console.log(`Captured visual evidence to ${outRoot}`);
} finally {
  await browser.close();
}
