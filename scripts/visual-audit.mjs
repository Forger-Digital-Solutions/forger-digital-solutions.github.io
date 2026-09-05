/**
 * Visual audit capture for the four private-development project pages.
 * Usage: node scripts/visual-audit.mjs before|after
 * Writes full-page + section screenshots per viewport into .visual-audit/<label>/.
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const label = process.argv[2] ?? 'before';
const base = 'http://localhost:4321';
const outDir = resolve('.visual-audit', label);
mkdirSync(outDir, { recursive: true });

const ROUTES = [
  ['kyrablox', '/projects/kyrablox/'],
  ['kayla', '/projects/kayla-ai-publisher/'],
  ['wtp', '/projects/we-the-people/'],
  ['farmstand', '/projects/farmstand-finder/'],
];

const VIEWPORTS = [
  ['1440x900', 1440, 900],
  ['1280x800', 1280, 800],
  ['768x1024', 768, 1024],
  ['430x932', 430, 932],
  ['390x844', 390, 844],
  ['320x568', 320, 568],
];

const browser = await chromium.launch();
for (const [routeName, routePath] of ROUTES) {
  for (const [vpName, width, height] of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const errors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', (err) => errors.push(String(err)));
    await page.goto(base + routePath, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    // Overflow probe at this viewport
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return { scrollW: doc.scrollWidth, clientW: doc.clientWidth };
    });

    await page.screenshot({ path: resolve(outDir, `${routeName}--${vpName}--full.png`), fullPage: true });
    // Hero viewport shot
    await page.screenshot({ path: resolve(outDir, `${routeName}--${vpName}--hero.png`) });

    if (overflow.scrollW > overflow.clientW) {
      console.log(`OVERFLOW ${routeName} @ ${vpName}: scrollW=${overflow.scrollW} clientW=${overflow.clientW}`);
    }
    if (errors.length) {
      console.log(`CONSOLE ${routeName} @ ${vpName}: ${errors.slice(0, 3).join(' | ')}`);
    }
    await context.close();
  }
  console.log(`done ${routeName}`);
}
await browser.close();
console.log(`ALL DONE -> ${outDir}`);
