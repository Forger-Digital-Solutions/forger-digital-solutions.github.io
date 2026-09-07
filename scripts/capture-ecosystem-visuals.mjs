import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const stage = process.argv[2] || 'before';
const outDir = resolve(`.visual-audit/ecosystem-${stage}`);
mkdirSync(outDir, { recursive: true });

const VIEWPORTS = [
  ['1440x900', 1440, 900],
  ['1280x800', 1280, 800],
  ['768x1024', 768, 1024],
  ['430x932', 430, 932],
  ['390x844', 390, 844],
  ['320x568', 320, 568],
];

const browser = await chromium.launch();
for (const [vpName, width, height] of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const ecosystem = page.locator('.fds-ecosystem');
  await ecosystem.waitFor({ state: 'visible', timeout: 5000 });
  await ecosystem.screenshot({ path: resolve(outDir, `ecosystem--${vpName}.png`) });

  const hero = page.locator('.hero');
  await hero.screenshot({ path: resolve(outDir, `hero--${vpName}.png`) });

  console.log(`Captured ${vpName} for ${stage}`);
  await context.close();
}
await browser.close();
console.log(`All screenshots saved to ${outDir}`);
