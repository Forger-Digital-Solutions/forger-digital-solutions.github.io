/*
 * FDS Live-Production Visual Integrity Captures (Phase 2)
 * Saves targeted screenshots of LIVE production into shots/ (gitignored evidence).
 * Usage: node scripts/capture-live-visual.cjs [--url=https://forgerdigitalsolutions.com]
 */
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const args = process.argv.slice(2);
const getArg = (n, d) => { const m = args.find((a) => a.startsWith(`--${n}=`)); return m ? m.split('=').slice(1).join('=') : d; };
const BASE = getArg('url', 'https://forgerdigitalsolutions.com').replace(/\/$/, '');
const DIR = 'shots';
fs.mkdirSync(DIR, { recursive: true });

async function shot(page, name, opts = {}) {
  const p = `${DIR}/live-${name}.png`;
  await page.screenshot({ path: p, ...opts });
  console.log('  captured', p);
}

(async () => {
  console.log(`FDS LIVE visual captures @ ${BASE}\n`);
  const browser = await chromium.launch({ headless: false, args: ['--window-size=1456,980'] });

  // Desktop normal-motion sections
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
  try { await page.waitForLoadState('networkidle', { timeout: 12000 }); } catch (_) {}
  await page.waitForTimeout(2500);
  await shot(page, 'home-hero-1440');

  // Ecosystem (8 planets + core)
  await page.evaluate(() => { const el = document.querySelector('.fds-ecosystem'); if (el) el.scrollIntoView({ block: 'center' }); });
  await page.waitForTimeout(2000);
  await shot(page, 'home-ecosystem-1440');

  // Planet hover glow (interactive drop-shadow preserved)
  const planet = await page.$('.fds-ecosystem .planet, .planet');
  if (planet) { try { await planet.hover({ timeout: 3000 }); await page.waitForTimeout(900); await shot(page, 'home-planet-hover-1440'); } catch (_) {} }

  // GEMS
  await page.evaluate(() => { const el = document.querySelector('.gems-system, [class*="gems"]'); if (el) el.scrollIntoView({ block: 'center' }); });
  await page.waitForTimeout(1800);
  await shot(page, 'home-gems-1440');

  // OneFDS
  await page.evaluate(() => { const el = document.querySelector('.one-eco, [class*="one-eco"]'); if (el) el.scrollIntoView({ block: 'center' }); });
  await page.waitForTimeout(1800);
  await shot(page, 'home-onefds-1440');

  // Footer
  await page.evaluate(() => { const el = document.querySelector('footer'); if (el) el.scrollIntoView({ block: 'center' }); else window.scrollTo(0, document.body.scrollHeight); });
  await page.waitForTimeout(1500);
  await shot(page, 'home-footer-1440');
  await ctx.close();

  // Routes
  for (const [route, name] of [['/projects/codeforge', 'codeforge-1440'], ['/projects/gems-training-grounds', 'gems-page-1440'], ['/technology', 'technology-1440'], ['/about', 'about-1440']]) {
    const c = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await c.newPage();
    await p.goto(BASE + route, { waitUntil: 'load', timeout: 60000 });
    try { await p.waitForLoadState('networkidle', { timeout: 10000 }); } catch (_) {}
    await p.waitForTimeout(2000);
    await shot(p, name);
    await c.close();
  }

  // Mobile + tablet home
  for (const [w, h, name] of [[390, 844, 'home-mobile-390'], [768, 1024, 'home-tablet-768']]) {
    const c = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
    const p = await c.newPage();
    await p.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
    try { await p.waitForLoadState('networkidle', { timeout: 10000 }); } catch (_) {}
    await p.waitForTimeout(2200);
    await shot(p, name);
    await c.close();
  }

  // Reduced motion home
  const rmc = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const rmp = await rmc.newPage();
  await rmp.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
  try { await rmp.waitForLoadState('networkidle', { timeout: 10000 }); } catch (_) {}
  await rmp.waitForTimeout(2000);
  await shot(rmp, 'home-reduced-motion-1440');
  await rmc.close();

  await browser.close();
  console.log('\nDone. Captures in shots/');
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
