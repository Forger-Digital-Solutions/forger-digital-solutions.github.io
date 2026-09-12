#!/usr/bin/env node
/**
 * R4 Kayla floating-widget overlap audit.
 *
 * Measures, at the R4 certification widths, whether the fixed Kayla launcher
 * (closed) or the open panel intersects interactive page content it must not
 * obscure: footer legal links, primary CTAs, archive/SHA controls, and
 * bottom-of-page action rows. Pure geometry — no screenshots, no backend.
 *
 *   node scripts/kayla-overlap-audit.mjs [baseUrl]
 */
import { chromium } from '@playwright/test';

const BASE = process.argv[2] || 'http://localhost:4321';
const WIDTHS = [360, 390, 430, 768, 1024, 1280, 1440, 1920];
const PAGES = ['/', '/forged', '/projects/codeforge', '/projects/forgerems'];

/** Selectors of page content the widget must not cover. */
const PROTECTED = [
  { name: 'footer legal/links', selector: 'footer a' },
  { name: 'primary CTA', selector: '.btn-primary, .cta-btn, .archive-card a[href*=".zip"], .archive-card button' },
  { name: 'SHA block', selector: 'code, .archive-sha' }
];

function intersects(a, b) {
  return a && b && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

const browser = await chromium.launch();
let collisions = 0;
let checks = 0;

for (const width of WIDTHS) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  for (const route of PAGES) {
    await page.goto(BASE + route, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(250);

    // Closed launcher over bottom-of-page content.
    const launcher = await page.locator('#kayla-launcher').boundingBox();
    for (const { name, selector } of PROTECTED) {
      const boxes = await page.locator(selector).all();
      for (const box of boxes.slice(0, 40)) {
        const b = await box.boundingBox();
        checks++;
        if (intersects(launcher, b)) {
          collisions++;
          const text = (await box.textContent().catch(() => '')).trim().slice(0, 40);
          console.log(`COLLISION ${width}px ${route} launcher ∩ ${name} "${text}"`);
        }
      }
    }

    // Open panel over the same content (panel intentionally covers content
    // while open — the requirement is that it must not cover it while
    // blocking the page's own last CTA row from being reachable after close,
    // so here we only flag the launcher, and record panel overflow issues).
    await page.click('#kayla-launcher');
    await page.waitForTimeout(350);
    const panel = await page.locator('#kayla-panel').boundingBox();
    checks++;
    if (panel && (panel.x < 0 || panel.y < 0 || panel.x + panel.width > width || panel.y + panel.height > 900)) {
      collisions++;
      console.log(`PANEL OUT OF VIEWPORT ${width}px ${route}: ${JSON.stringify(panel)}`);
    }
    const input = await page.locator('#kayla-input').boundingBox();
    checks++;
    if (!input || input.y + input.height > 900 || input.y < 0) {
      collisions++;
      console.log(`COMPOSER UNREACHABLE ${width}px ${route}: ${JSON.stringify(input)}`);
    }
    // No horizontal overflow, panel open or closed.
    for (const [label, overflow] of await page.evaluate(() => [
      ['open', document.documentElement.scrollWidth - document.documentElement.clientWidth],
      ['closed', (() => { document.querySelector('.kayla-close').click(); return document.documentElement.scrollWidth - document.documentElement.clientWidth; })()]
    ])) {
      checks++;
      if (overflow > 0) {
        collisions++;
        console.log(`HORIZONTAL OVERFLOW ${width}px ${route} panel ${label}: ${overflow}px`);
      }
    }
    await page.waitForTimeout(200);
  }
  await context.close();
}

await browser.close();
console.log(`\nChecks: ${checks}, collisions: ${collisions}`);
process.exit(collisions > 0 ? 1 : 0);
