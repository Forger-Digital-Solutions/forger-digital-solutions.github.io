/*
 * FDS Ecosystem local visual captures (before/after + reduced-motion + responsive + core close-up).
 * Usage: node scripts/capture-eco-local.cjs [--url=http://127.0.0.1:4321] [--tag=after]
 */
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const args = process.argv.slice(2);
const getArg = (n, d) => { const m = args.find((a) => a.startsWith(`--${n}=`)); return m ? m.split('=').slice(1).join('=') : d; };
const BASE = getArg('url', 'http://127.0.0.1:4321').replace(/\/$/, '');
const TAG = getArg('tag', 'after');
const DIR = 'shots';
fs.mkdirSync(DIR, { recursive: true });

async function gotoEco(page) {
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
  try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch (_) {}
  await page.evaluate(() => { const el = document.querySelector('.fds-ecosystem'); if (el) el.scrollIntoView({ block: 'center' }); });
  await page.waitForTimeout(1800);
}

(async () => {
  console.log(`Ecosystem captures @ ${BASE} tag=${TAG}`);
  const browser = await chromium.launch({ headless: false, args: ['--window-size=1456,980'] });

  // Desktop animated: initial / +15 / +30
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await gotoEco(page);
  await page.screenshot({ path: `${DIR}/eco-${TAG}-initial.png` });
  console.log('  ', `eco-${TAG}-initial.png`);
  await page.waitForTimeout(15000);
  await page.screenshot({ path: `${DIR}/eco-${TAG}-plus15.png` });
  console.log('  ', `eco-${TAG}-plus15.png`);
  await page.waitForTimeout(15000);
  await page.screenshot({ path: `${DIR}/eco-${TAG}-plus30.png` });
  console.log('  ', `eco-${TAG}-plus30.png`);

  // Core close-up
  const box = await page.evaluate(() => {
    const r = document.querySelector('.fds-ecosystem__scene').getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  });
  await page.screenshot({ path: `${DIR}/eco-${TAG}-core-closeup.png`, clip: { x: box.cx - 130, y: box.cy - 130, width: 260, height: 260 } });
  console.log('  ', `eco-${TAG}-core-closeup.png`);
  await ctx.close();

  // Reduced motion
  const rm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const rmp = await rm.newPage();
  await gotoEco(rmp);
  await rmp.screenshot({ path: `${DIR}/eco-${TAG}-reduced.png` });
  console.log('  ', `eco-${TAG}-reduced.png`);
  await rm.close();

  // Tablet + mobile
  for (const [w, h, name] of [[768, 1024, 'tablet'], [390, 844, 'mobile']]) {
    const c = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
    const p = await c.newPage();
    await gotoEco(p);
    await p.screenshot({ path: `${DIR}/eco-${TAG}-${name}.png` });
    console.log('  ', `eco-${TAG}-${name}.png`);
    await c.close();
  }

  await browser.close();
  console.log('done');
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
