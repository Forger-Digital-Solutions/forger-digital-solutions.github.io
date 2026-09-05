/**
 * Accessibility validation for the four signature project pages:
 * axe scans (desktop + mobile), forced-colors emulation, and 200% mobile zoom.
 * Usage: node scripts/signature-a11y-check.mjs
 */
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const base = 'http://localhost:4321';
const ROUTES = [
  ['kyrablox', '/projects/kyrablox/'],
  ['kayla', '/projects/kayla-ai-publisher/'],
  ['wtp', '/projects/we-the-people/'],
  ['farmstand', '/projects/farmstand-finder/'],
];

const browser = await chromium.launch();
let violationsTotal = 0;

for (const [name, path] of ROUTES) {
  // Desktop + mobile axe scan
  for (const [label, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.goto(base + path, { waitUntil: 'networkidle' });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const violations = results.violations.filter((v) => !['incomplete'].includes(v.id) || true);
    const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical' || v.impact === 'moderate');
    console.log(`axe ${name} ${label}: ${violations.length} violation(s)`);
    for (const v of violations) {
      console.log(`  - [${v.impact}] ${v.id}: ${v.nodes.length} node(s) — ${v.help}`);
    }
    violationsTotal += violations.length;
    await context.close();
  }

  // Forced colors
  const fcContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, forcedColors: 'active' });
  const fcPage = await fcContext.newPage();
  await fcPage.goto(base + path, { waitUntil: 'networkidle' });
  const fcOverflow = await fcPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(`forced-colors ${name}: overflowDelta=${fcOverflow}`);
  await fcPage.screenshot({ path: `.visual-audit/after/forced-colors--${name}.png`, fullPage: false });
  await fcContext.close();

  // 200% zoom on mobile viewport
  const zoomContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const zoomPage = await zoomContext.newPage();
  await zoomPage.goto(base + path, { waitUntil: 'networkidle' });
  await zoomPage.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await zoomPage.waitForTimeout(200);
  const zoomOverflow = await zoomPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(`zoom-200 ${name}: overflowDelta=${zoomOverflow}`);
  await zoomContext.close();
}

await browser.close();
console.log(violationsTotal === 0 ? 'AXE CLEAN' : `AXE VIOLATIONS: ${violationsTotal}`);
