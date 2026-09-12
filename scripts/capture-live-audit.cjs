// R3 live production visual audit captures (reduced-motion, full page) into shots/.
// Usage: node scripts/capture-live-audit.cjs [baseUrl]
const { chromium } = require('@playwright/test');
const { mkdirSync } = require('node:fs');

const BASE = process.argv[2] || 'https://forgerdigitalsolutions.com';
const WIDTHS = [360, 390, 430, 768, 1024, 1280, 1440, 1920];
const TARGETS = [
  { route: '/', widths: WIDTHS, tag: 'home' },
  { route: '/forged', widths: WIDTHS, tag: 'forged' },
  { route: '/projects/codeforge', widths: [390, 1440], tag: 'codeforge' },
  { route: '/projects/forgerems', widths: [390, 1440], tag: 'forgerems' },
  { route: '/projects/gems-training-grounds', widths: [390, 1440], tag: 'gems' },
  { route: '/about', widths: [390, 1440], tag: 'about' },
  { route: '/faq', widths: [390, 1440], tag: 'faq' },
  { route: '/notes', widths: [390, 1440], tag: 'notes' },
];

(async () => {
  mkdirSync('shots', { recursive: true });
  const browser = await chromium.launch();
  for (const t of TARGETS) {
    for (const width of t.widths) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      try {
        await page.goto(BASE + t.route, { waitUntil: 'load', timeout: 45_000 });
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `shots/live-${t.tag}-${width}.png`, fullPage: true });
        console.log('captured', `${t.tag}-${width}`);
      } catch (e) {
        console.log('FAILED', `${t.tag}-${width}`, e.message);
      }
      await page.close();
    }
  }
  await browser.close();
})();
