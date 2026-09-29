/*
 * FDS Ecosystem orbital cycle captures — one page, many timeline positions.
 *
 * CSS animations cannot be seeked by screenshot timing alone (render lag drifts),
 * so each frame is set by shifting Web Animations API delays by a fixed offset,
 * which lands every plane at exactly the requested point in its own period.
 *
 * Usage: node scripts/capture-eco-cycle.cjs [--url=http://127.0.0.1:4321] [--tag=orbit] [--times=0,10,20,30,45,60]
 */
const { chromium } = require('@playwright/test');
const fs = require('node:fs');

const args = process.argv.slice(2);
const getArg = (n, d) => { const m = args.find((a) => a.startsWith(`--${n}=`)); return m ? m.split('=').slice(1).join('=') : d; };
const BASE = getArg('url', 'http://127.0.0.1:4321').replace(/\/$/, '');
const TAG = getArg('tag', 'orbit');
const TIMES = getArg('times', '0,10,20,30,45,60').split(',').map(Number);
const DIR = 'shots';
fs.mkdirSync(DIR, { recursive: true });

async function openScene(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 60000 });
  try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch {}
  await page.evaluate(() => document.querySelector('.fds-ecosystem')?.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(1200);
}

/**
 * Land the whole scene at exactly t seconds of orbital time. Every plane carries a
 * negative animation delay of -period*start/100, so a plane sitting at
 * currentTime = t is at start/100 + t/period — the same clock the offline collision
 * model runs on. Seeking absolutely rather than relatively means the t=0 frame IS the
 * first paint a reduced-motion visitor sees, and a frame taken at the instant the
 * model says two worlds come closest is that instant rather than a guess at it.
 */
async function seek(page, seconds) {
  await page.evaluate((offset) => {
    for (const anim of document.getAnimations()) {
      if (!anim.effect) continue;
      anim.currentTime = offset * 1000;
    }
  }, seconds);
  await page.waitForTimeout(120);
}

(async () => {
  console.log(`Ecosystem cycle captures @ ${BASE} tag=${TAG}`);
  const browser = await chromium.launch({ headless: false, args: ['--window-size=1456,980'] });

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await openScene(page);
  const scene = await page.evaluate(() => {
    const r = document.querySelector('.fds-ecosystem__scene').getBoundingClientRect();
    return { x: r.left, y: r.top, width: r.width, height: r.height };
  });
  for (const t of TIMES) {
    await seek(page, t);
    const file = `${DIR}/eco-${TAG}-t${String(t).padStart(2, '0')}s.png`;
    await page.screenshot({ path: file, clip: scene });
    console.log(`   ${file}`);
  }
  await ctx.close();

  const reduced = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', deviceScaleFactor: 2 });
  const rp = await reduced.newPage();
  await openScene(rp);
  const rbox = await rp.evaluate(() => {
    const r = document.querySelector('.fds-ecosystem__scene').getBoundingClientRect();
    return { x: r.left, y: r.top, width: r.width, height: r.height };
  });
  await rp.screenshot({ path: `${DIR}/eco-${TAG}-reduced.png`, clip: rbox });
  console.log(`   eco-${TAG}-reduced.png`);
  await reduced.close();

  for (const [w, h, name] of [[1920, 1080, '1920'], [1599, 900, '1599'], [1280, 800, '1280'], [768, 1024, 'tablet'], [390, 844, 'mobile']]) {
    const c = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
    const p = await c.newPage();
    await openScene(p);
    await p.screenshot({ path: `${DIR}/eco-${TAG}-${name}.png` });
    console.log(`   eco-${TAG}-${name}.png`);
    await c.close();
  }

  await browser.close();
  console.log('done');
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
