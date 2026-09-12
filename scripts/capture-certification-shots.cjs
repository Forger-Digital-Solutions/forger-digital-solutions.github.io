// Captures certification screenshots of the built site at every required
// viewport width. Run after `npm run build` with `astro preview` on :4321.
const { chromium } = require('@playwright/test');
const { mkdirSync } = require('node:fs');

const WIDTHS = [360, 390, 430, 768, 1024, 1280, 1440, 1920];
const PAGES = [
  ['home', '/'],
  ['projects', '/projects'],
  ['forged', '/forged'],
  ['codeforge', '/projects/codeforge'],
  ['forgerems', '/projects/forgerems'],
  ['gems', '/projects/gems-training-grounds'],
  ['wtp', '/projects/we-the-people'],
  ['upgrade', '/codeforge/upgrade'],
  ['technology', '/technology'],
  ['lab', '/lab'],
  ['notes', '/notes'],
  ['about', '/about'],
  ['faq', '/faq'],
];
// Full width sweep for the pages whose layout work matters most; the rest at
// the three most sensitive widths.
const FULL_SWEEP = new Set(['home', 'forged', 'projects']);
const SUBSET = [390, 768, 1440];

(async () => {
  mkdirSync('shots', { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  // Reduced motion also disables the scroll-reveal animation, so full-page
  // captures show every section (and doubles as the reduced-motion layout check).
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [name, path] of PAGES) {
    const widths = FULL_SWEEP.has(name) ? WIDTHS : SUBSET;
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`http://localhost:4321${path}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(450);
      await page.screenshot({ path: `shots/${name}-${width}.png`, fullPage: true });
      console.log(`${name}-${width}.png`);
    }
  }
  await browser.close();
})();
