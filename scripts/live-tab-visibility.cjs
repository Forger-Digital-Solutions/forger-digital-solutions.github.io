/*
 * FDS Live tab-visibility suspension test — uses the SAME method as the validated
 * e2e spec (test/e2e/perf-animation-lifecycle.spec.ts): mock document.hidden + dispatch
 * visibilitychange, then assert data-bg-paused on <html> and animation-play-state: paused.
 * Also checks safe resume with no animation/loop duplication.
 *
 * Usage: node scripts/live-tab-visibility.cjs [--url=https://forgerdigitalsolutions.com]
 */
const { chromium } = require('@playwright/test');
const args = process.argv.slice(2);
const getArg = (n, d) => { const m = args.find((a) => a.startsWith(`--${n}=`)); return m ? m.split('=').slice(1).join('=') : d; };
const BASE = getArg('url', 'https://forgerdigitalsolutions.com').replace(/\/$/, '');

const STATE = `(() => {
  const q = (sel) => document.querySelector(sel);
  const ps = (sel) => { const el = q(sel); return el ? getComputedStyle(el).animationPlayState : 'missing'; };
  const anims = document.getAnimations ? document.getAnimations() : [];
  return {
    bgPaused: document.documentElement.hasAttribute('data-bg-paused'),
    total: anims.length,
    running: anims.filter(a => a.playState === 'running').length,
    paused: anims.filter(a => a.playState === 'paused').length,
    planet: ps('.fds-ecosystem .planet-motion'),
    constellation: ps('.constellation__node'),
    systemNode: ps('.system-node'),
  };
})()`;

(async () => {
  console.log(`FDS LIVE tab-visibility test @ ${BASE}\n`);
  const browser = await chromium.launch({ headless: false, args: ['--window-size=1456,980'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const out = {};
  try {
    await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
    try { await page.waitForLoadState('networkidle', { timeout: 12000 }); } catch (_) {}
    await page.waitForTimeout(2500);

    out.visibleBefore = await page.evaluate(STATE);
    console.log('visible (before):', JSON.stringify(out.visibleBefore));

    // Simulate hidden
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { get: () => true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(900);
    out.hidden = await page.evaluate(STATE);
    console.log('hidden          :', JSON.stringify(out.hidden));
    await page.waitForTimeout(2000);
    out.hiddenLater = await page.evaluate(STATE);
    console.log('hidden (+2s)    :', JSON.stringify(out.hiddenLater));

    // Simulate visible again
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { get: () => false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(1200);
    out.resumed = await page.evaluate(STATE);
    console.log('resumed         :', JSON.stringify(out.resumed));

    // Verdicts
    const checks = {
      bgPausedSetOnHidden: out.hidden.bgPaused === true,
      bgPausedClearedOnResume: out.resumed.bgPaused === false,
      planetPausedWhenHidden: out.hidden.planet === 'paused',
      constellationPausedWhenHidden: out.hidden.constellation === 'paused',
      systemNodePausedWhenHidden: out.hidden.systemNode === 'paused',
      runningDroppedWhenHidden: out.hidden.running < out.visibleBefore.running,
      noAnimationDuplication: out.resumed.total === out.visibleBefore.total,
      runningResumed: out.resumed.running === out.visibleBefore.running,
      stableWhileHidden: out.hiddenLater.running === out.hidden.running,
    };
    out.checks = checks;
    console.log('\nchecks:', JSON.stringify(checks, null, 2));
    const pass = Object.values(checks).every(Boolean);
    console.log(pass ? '\nTAB-VISIBILITY: ALL PASS' : '\nTAB-VISIBILITY: SOME CHECKS FAILED');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
