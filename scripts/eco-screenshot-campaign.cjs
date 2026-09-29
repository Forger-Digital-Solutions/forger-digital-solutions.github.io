/*
 * FDS ecosystem screenshot campaign — authoring/test tooling, does not ship.
 *
 * Every "T+Xs" frame is produced by driving the CSS animation clock directly
 * (Animation.currentTime) instead of waiting wall-clock seconds, so the captured
 * frame is exactly the model time the offline certificate talks about. That is what
 * makes a screenshot of "the closest approach at t=916.872s" a piece of evidence
 * rather than a lucky capture.
 *
 * Usage: node scripts/eco-screenshot-campaign.cjs [--url=http://127.0.0.1:4321] [--out=shots]
 */
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(2);
const getArg = (n, d) => {
  const m = args.find((a) => a.startsWith(`--${n}=`));
  return m ? m.split('=').slice(1).join('=') : d;
};
const BASE = getArg('url', 'http://127.0.0.1:4321').replace(/\/$/, '');
const OUT = path.resolve(getArg('out', 'shots/eco'));
fs.mkdirSync(OUT, { recursive: true });

/** Freeze every ecosystem animation at model time t (seconds). Passed to
 *  page.evaluate as a real function — a function-looking string is not invoked. */
const SET_CLOCK = (t) => {
  const anims = [];
  document.querySelectorAll('.planet-motion, .orbit-pulse, .orbit-segment').forEach((el) => {
    for (const a of el.getAnimations()) anims.push(a);
  });
  for (const a of document.getAnimations()) anims.push(a);
  for (const a of new Set(anims)) { a.pause(); a.currentTime = t * 1000; }
  return anims.length;
};

const VIEWPORTS = [
  ['1920', 1920, 1080],
  ['1599', 1599, 900],
  ['1440', 1440, 900],
  ['1280', 1280, 800],
  ['tablet-768', 768, 1024],
  ['mobile-390', 390, 844],
];

async function main() {
  const times = (process.env.FRAMES || '0,10,30,60,540,1080').split(',').map(Number);
  const closest = (process.env.CLOSEST || '').split(',').filter(Boolean).map(Number);
  const browser = await chromium.launch({ headless: true });

  // Time frames at desktop width.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
  try { await page.waitForLoadState('networkidle', { timeout: 15000 }); } catch { /* fonts etc. */ }
  const eco = page.locator('.fds-ecosystem');
  await eco.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);

  const shot = async (name, opts = {}) => {
    const file = path.join(OUT, `${name}.png`);
    await (opts.clip ? page.screenshot({ path: file, clip: opts.clip }) : page.screenshot({ path: file, fullPage: !!opts.full }));
    console.log(`  ${name}.png`);
  };

  for (const t of [...times, ...closest]) {
    await page.evaluate(SET_CLOCK, t);
    await page.waitForTimeout(120);
    const label = closest.includes(t) ? `closest-${t}` : `t-${String(t).padStart(4, '0')}`;
    await shot(label);
    const box = await eco.boundingBox();
    if (box) await shot(`${label}-scene`, { clip: box });
  }

  // Core close-up.
  await page.evaluate(SET_CLOCK, 0);
  const core = await page.locator('.core').boundingBox();
  if (core) {
    await shot('core-closeup', {
      clip: { x: core.x - 60, y: core.y - 60, width: core.width + 120, height: core.height + 120 },
    });
  }
  await ctx.close();

  // Reduced motion: the frozen T=0 frame.
  const rctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', deviceScaleFactor: 1.5 });
  const rpage = await rctx.newPage();
  await rpage.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
  const reco = rpage.locator('.fds-ecosystem');
  await reco.scrollIntoViewIfNeeded();
  await rpage.waitForTimeout(800);
  await rpage.screenshot({ path: path.join(OUT, 'reduced-motion.png') });
  const rbox = await reco.boundingBox();
  if (rbox) await rpage.screenshot({ path: path.join(OUT, 'reduced-motion-scene.png'), clip: rbox });
  console.log('  reduced-motion.png');
  await rctx.close();

  // Responsive sweep.
  for (const [name, width, height] of VIEWPORTS) {
    const c = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const p = await c.newPage();
    await p.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
    const e = p.locator('.fds-ecosystem');
    await e.scrollIntoViewIfNeeded();
    await p.waitForTimeout(700);
    await p.screenshot({ path: path.join(OUT, `responsive-${name}.png`) });
    const b = await e.boundingBox();
    if (b) await p.screenshot({ path: path.join(OUT, `responsive-${name}-scene.png`), clip: b });
    console.log(`  responsive-${name}.png`);
    await c.close();
  }

  await browser.close();
  console.log(`\ncampaign written to ${OUT}`);
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
