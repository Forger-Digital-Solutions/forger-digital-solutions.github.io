/*
 * FDS Ecosystem Geometry Check
 * Measures rendered planet centers (viewBox units) to quantify orbit crowding.
 *  --mode=static : reduced-motion (static = configured start phases)
 *  --mode=timed  : animated, sampled at ~0/10/20/30/60s to detect convergence
 * Reports per-planet angle (deg, 0=east, +clockwise) + radius from core,
 * pairwise min center distance, and min distance-to-core.
 *
 * Usage: node scripts/eco-geometry-check.cjs [--url=http://127.0.0.1:4321] [--mode=static|timed]
 */
const { chromium } = require('@playwright/test');
const args = process.argv.slice(2);
const getArg = (n, d) => { const m = args.find((a) => a.startsWith(`--${n}=`)); return m ? m.split('=').slice(1).join('=') : d; };
const BASE = getArg('url', 'http://127.0.0.1:4321').replace(/\/$/, '');
const MODE = getArg('mode', 'static');

const MEASURE = `(() => {
  const svg = document.querySelector('.fds-ecosystem__scene');
  if (!svg) return null;
  const sr = svg.getBoundingClientRect();
  const scale = sr.width / 680;
  const cx = sr.left + sr.width / 2, cy = sr.top + sr.height / 2;
  const toVB = (px, py) => [340 + (px - cx) / scale, 340 + (py - cy) / scale];
  const planets = [...document.querySelectorAll('.planet-motion')].map((g) => {
    const shell = g.querySelector('.planet__shell');
    const r = shell.getBoundingClientRect();
    const [x, y] = toVB(r.left + r.width / 2, r.top + r.height / 2);
    const size = parseFloat(getComputedStyle(g.querySelector('.planet')).getPropertyValue('--planet-size')) || 40;
    return { id: g.getAttribute('data-planet'), x: +x.toFixed(1), y: +y.toFixed(1), size };
  });
  const heart = document.querySelector('.core__heart');
  const hr = heart ? heart.getBoundingClientRect() : null;
  const core = hr ? toVB(hr.left + hr.width / 2, hr.top + hr.height / 2) : [340, 340];
  return { planets, core: core.map((v) => +v.toFixed(1)), scale: +scale.toFixed(3) };
})()`;

function analyze(m) {
  const P = m.planets;
  const rows = P.map((p) => {
    const dx = p.x - m.core[0], dy = p.y - m.core[1];
    const rad = Math.hypot(dx, dy);
    let ang = Math.atan2(dy, dx) * 180 / Math.PI; // y down: + = clockwise (toward bottom)
    if (ang < 0) ang += 360;
    return { id: p.id, x: p.x, y: p.y, angle: +ang.toFixed(0), radius: +rad.toFixed(0), size: p.size };
  });
  let minPair = { dist: Infinity, a: null, b: null };
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
    const d = Math.hypot(P[i].x - P[j].x, P[i].y - P[j].y);
    if (d < minPair.dist) minPair = { dist: +d.toFixed(0), a: P[i].id, b: P[j].id };
  }
  const minCore = Math.min(...rows.map((r) => r.radius));
  const nearCore = rows.filter((r) => r.radius < 140).map((r) => r.id);
  return { rows, minPair, minCoreRadius: +minCore.toFixed(0), planetsTooCloseToCore: nearCore };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...(MODE === 'static' ? { reducedMotion: 'reduce' } : {}) });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
  try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch (_) {}
  await page.evaluate(() => { const el = document.querySelector('.fds-ecosystem'); if (el) el.scrollIntoView({ block: 'center' }); });
  await page.waitForTimeout(1500);

  const print = (label, m) => {
    const a = analyze(m);
    console.log(`\n--- ${label} ---`);
    for (const r of a.rows.sort((x, y) => x.angle - y.angle)) {
      console.log(`  ${r.id.padEnd(18)} angle=${String(r.angle).padStart(3)}°  radius=${String(r.radius).padStart(3)}  (${r.x},${r.y})`);
    }
    console.log(`  minPairDist=${a.minPair.dist} (${a.minPair.a}~${a.minPair.b})  minCoreRadius=${a.minCoreRadius}  tooCloseToCore=[${a.planetsTooCloseToCore.join(',')}]`);
    return a;
  };

  if (MODE === 'static') {
    print('STATIC (reduced-motion)', await page.evaluate(MEASURE));
  } else {
    const samples = [0, 10, 20, 30, 60];
    let t0 = Date.now();
    for (const t of samples) {
      const wait = t * 1000 - (Date.now() - t0);
      if (wait > 0) await page.waitForTimeout(wait);
      const a = print(`t=+${t}s`, await page.evaluate(MEASURE));
      if (t === 0) global.first = a;
    }
  }
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
