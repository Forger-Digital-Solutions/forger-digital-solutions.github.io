/**
 * R4.2 Performance Baseline — Playwright test spec
 * Run: npx playwright test test/e2e/r42-perf-measure.spec.ts --project=chromium
 *
 * Writes raw metrics to docs/audit/r42-perf-raw-before.json (or --label=after)
 * Uses CDP Performance.getMetrics as proxy for rendering cost.
 */
import { test, expect, chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const BASE = 'http://localhost:4323';
const LABEL = process.env.PERF_LABEL ?? 'before';
const OUT_DIR = join(process.cwd(), 'docs', 'audit');
const OUT_FILE = join(OUT_DIR, `r42-perf-raw-${LABEL}.json`);

const RAF_SCRIPT = `
  window.__rc = 0;
  const _o = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = function(cb) { window.__rc++; return _o(cb); };
`;
const PTR_SCRIPT = `
  window.__pm = 0; window.__csv = 0;
  const _s = CSSStyleDeclaration.prototype.setProperty;
  CSSStyleDeclaration.prototype.setProperty = function(p, v, pr) {
    if (p === '--pointer-x' || p === '--pointer-y') window.__csv++;
    return _s.call(this, p, v, pr);
  };
  document.addEventListener('pointermove', () => window.__pm++, { passive: true, capture: true });
`;
const LT_SCRIPT = `
  window.__lt = [];
  try {
    const o = new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push({ d: e.duration })));
    o.observe({ type: 'longtask', buffered: true });
  } catch(e) {}
`;
const FT_SCRIPT = `
  window.__fi = []; window.__fc = 0; let _l = null;
  function _f(ts) {
    if (_l !== null) window.__fi.push(ts - _l);
    _l = ts;
    if (++window.__fc < 120) requestAnimationFrame(_f);
  }
  requestAnimationFrame(_f);
`;

function fstats(a: number[]) {
  if (!a || a.length < 5) return { note: 'insufficient', n: a?.length ?? 0 };
  const s = [...a].sort((x, y) => x - y);
  const m = a.reduce((x, y) => x + y, 0) / a.length;
  return {
    mean_ms: +m.toFixed(2),
    p95_ms: +s[Math.floor(s.length * 0.95)].toFixed(2),
    dropped_gt33ms: a.filter(i => i > 33.3).length,
    fps_proxy: +(1000 / m).toFixed(1),
    n: a.length,
  };
}

async function cdpDelta(cdp: any, fn: () => Promise<void>) {
  await cdp.send('Performance.enable');
  const snap = (arr: any[]) => Object.fromEntries(arr.map((m: any) => [m.name, m.value]));
  const b = snap((await cdp.send('Performance.getMetrics')).metrics);
  await fn();
  const a = snap((await cdp.send('Performance.getMetrics')).metrics);
  return Object.fromEntries(Object.keys(b).map(k => [k, +(a[k] - b[k]).toFixed(4)]));
}

const results: Record<string, any> = {};

// ── S1: Homepage idle ──────────────────────────────────────────────────────────
test('S1 homepage idle 1440px', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.addInitScript(RAF_SCRIPT);
  await page.addInitScript(LT_SCRIPT);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.evaluate(() => { (window as any).__rc = 0; (window as any).__lt = []; });
  await page.evaluate(FT_SCRIPT);
  const d = await cdpDelta(cdp, () => page.waitForTimeout(3000));
  const r = await page.evaluate(() => ({
    rc: (window as any).__rc,
    lt: (window as any).__lt,
    fi: (window as any).__fi,
    an: document.getAnimations().length,
    dn: document.querySelectorAll('*').length,
  }));
  results.s1_idle = {
    scenario: 'Homepage idle 1440px/3s',
    script_s: d.ScriptDuration, layout_s: d.LayoutDuration,
    recalc_s: d.RecalcStyleDuration, task_s: d.TaskDuration,
    raf_3s: r.rc, lt: r.lt.length,
    lt_max_ms: r.lt.length ? +Math.max(...r.lt.map((t: any) => t.d)).toFixed(1) : 0,
    frame: fstats(r.fi), animations: r.an, dom_nodes: r.dn,
  };
  await ctx.close();
});

// ── S2: Pointermove ────────────────────────────────────────────────────────────
test('S2 pointermove 1440px', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.addInitScript(RAF_SCRIPT);
  await page.addInitScript(PTR_SCRIPT);
  await page.addInitScript(LT_SCRIPT);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.evaluate(() => { (window as any).__rc = 0; (window as any).__csv = 0; (window as any).__pm = 0; (window as any).__lt = []; });
  const d = await cdpDelta(cdp, async () => {
    for (let i = 0; i < 60; i++) {
      await page.mouse.move(200 + (i * 17) % 900, 100 + (i * 13) % 600, { steps: 1 });
      await page.waitForTimeout(33);
    }
  });
  const r = await page.evaluate(() => ({
    rc: (window as any).__rc,
    pm: (window as any).__pm,
    csv: (window as any).__csv,
    lt: (window as any).__lt,
  }));
  results.s2_pointer = {
    scenario: 'Pointermove 1440px/60 events/~2s',
    script_s: d.ScriptDuration, recalc_s: d.RecalcStyleDuration, task_s: d.TaskDuration,
    raf: r.rc, pointer_events: r.pm, css_var_updates: r.csv,
    css_var_per_event: r.pm > 0 ? +(r.csv / r.pm).toFixed(2) : 'N/A',
    lt: r.lt.length,
    lt_max_ms: r.lt.length ? +Math.max(...r.lt.map((t: any) => t.d)).toFixed(1) : 0,
  };
  await ctx.close();
});

// ── S3: Ecosystem visible ──────────────────────────────────────────────────────
test('S3 ecosystem visible 1440px', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.addInitScript(RAF_SCRIPT);
  await page.addInitScript(LT_SCRIPT);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    const e = document.querySelector('.fds-ecosystem');
    if (e) e.scrollIntoView({ behavior: 'instant' } as ScrollIntoViewOptions);
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => { (window as any).__rc = 0; (window as any).__lt = []; });
  await page.evaluate(FT_SCRIPT);
  const d = await cdpDelta(cdp, () => page.waitForTimeout(3000));
  const r = await page.evaluate(() => ({
    rc: (window as any).__rc,
    lt: (window as any).__lt,
    fi: (window as any).__fi,
    an: document.getAnimations().length,
    ep: document.querySelector('.fds-ecosystem')?.hasAttribute('data-eco-paused') ?? false,
    pm: Array.from(document.querySelectorAll('.planet-motion')).slice(0, 3)
      .map(el => el.getAnimations().map(a => a.playState)),
    op: Array.from(document.querySelectorAll('.orbit-pulse'))
      .map(el => el.getAnimations().map(a => a.playState)),
    cr: Array.from(document.querySelectorAll('.core__ring'))
      .map(el => el.getAnimations().map(a => a.playState)),
    hh: Array.from(document.querySelectorAll('.core__heart-halo'))
      .map(el => el.getAnimations().map(a => a.playState)),
  }));
  results.s3_eco_visible = {
    scenario: 'Ecosystem visible 1440px/3s',
    script_s: d.ScriptDuration, layout_s: d.LayoutDuration,
    recalc_s: d.RecalcStyleDuration, task_s: d.TaskDuration,
    raf_3s: r.rc, lt: r.lt.length,
    lt_max_ms: r.lt.length ? +Math.max(...r.lt.map((t: any) => t.d)).toFixed(1) : 0,
    frame: fstats(r.fi), total_animations: r.an, eco_paused_attr: r.ep,
    planet_states: r.pm, orbit_pulse_states: r.op, core_ring_states: r.cr, halo_states: r.hh,
  };
  await ctx.close();
});

// ── S4: Ecosystem offscreen ────────────────────────────────────────────────────
test('S4 ecosystem offscreen 1440px', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.addInitScript(RAF_SCRIPT);
  await page.addInitScript(LT_SCRIPT);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
  await page.waitForTimeout(400);
  await page.evaluate(() => { (window as any).__rc = 0; (window as any).__lt = []; });
  await page.evaluate(FT_SCRIPT);
  const d = await cdpDelta(cdp, () => page.waitForTimeout(3000));
  const r = await page.evaluate(() => ({
    rc: (window as any).__rc,
    lt: (window as any).__lt,
    fi: (window as any).__fi,
    ep: document.querySelector('.fds-ecosystem')?.hasAttribute('data-eco-paused') ?? false,
    pm: Array.from(document.querySelectorAll('.planet-motion')).slice(0, 3)
      .map(el => el.getAnimations().map(a => a.playState)),
    cr: Array.from(document.querySelectorAll('.core__ring')).slice(0, 2)
      .map(el => el.getAnimations().map(a => a.playState)),
  }));
  results.s4_eco_offscreen = {
    scenario: 'Ecosystem offscreen (bottom of page) 1440px/3s',
    script_s: d.ScriptDuration, recalc_s: d.RecalcStyleDuration, task_s: d.TaskDuration,
    raf_3s: r.rc, lt: r.lt.length,
    lt_max_ms: r.lt.length ? +Math.max(...r.lt.map((t: any) => t.d)).toFixed(1) : 0,
    frame: fstats(r.fi), eco_paused_attr: r.ep, planet_states: r.pm, ring_states: r.cr,
  };
  await ctx.close();
});

// ── S5: Hidden tab ─────────────────────────────────────────────────────────────
test('S5 hidden tab', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.addInitScript(RAF_SCRIPT);
  await page.addInitScript(LT_SCRIPT);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    (window as any).__rc = 0; (window as any).__lt = [];
    try {
      Object.defineProperty(document, 'hidden', { get: () => true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    } catch (e) {}
  });
  await cdp.send('Emulation.setVisibilityOverride', { hidden: true }).catch(() => {});
  await page.waitForTimeout(3000);
  const r = await page.evaluate(() => ({
    rc: (window as any).__rc,
    lt: (window as any).__lt,
    bp: document.documentElement.hasAttribute('data-bg-paused'),
    pm: Array.from(document.querySelectorAll('.planet-motion')).slice(0, 2)
      .map(el => el.getAnimations().map(a => a.playState)),
  }));
  await cdp.send('Emulation.setVisibilityOverride', { hidden: false }).catch(() => {});
  results.s5_hidden = {
    scenario: 'Hidden/background tab 3s',
    raf_while_hidden: r.rc, lt: r.lt.length, bg_paused_attr: r.bp,
    planet_states_hidden: r.pm, note: 'R4.1 baseline: no visibilitychange handler expected',
  };
  await ctx.close();
});

// ── S6: Reduced motion ─────────────────────────────────────────────────────────
test('S6 reduced motion', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.addInitScript(RAF_SCRIPT);
  await page.addInitScript(LT_SCRIPT);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.evaluate(() => { (window as any).__rc = 0; (window as any).__lt = []; });
  const d = await cdpDelta(cdp, () => page.waitForTimeout(3000));
  const r = await page.evaluate(() => ({
    rc: (window as any).__rc,
    lt: (window as any).__lt,
    an: document.getAnimations().length,
    pm: Array.from(document.querySelectorAll('.planet-motion')).slice(0, 2)
      .map(el => el.getAnimations().map(a => ({ state: a.playState, dur: (a.effect as any)?.getTiming()?.duration }))),
    op: Array.from(document.querySelectorAll('.orbit-pulse'))
      .map(el => el.getAnimations().map(a => a.playState)),
    cr: Array.from(document.querySelectorAll('.core__ring'))
      .map(el => el.getAnimations().map(a => a.playState)),
  }));
  results.s6_reduced = {
    scenario: 'Reduced motion 1440px/3s',
    script_s: d.ScriptDuration, recalc_s: d.RecalcStyleDuration, task_s: d.TaskDuration,
    raf_3s: r.rc, lt: r.lt.length, total_animations: r.an,
    planet_states: r.pm, orbit_pulse_states: r.op, core_ring_states: r.cr,
  };
  await ctx.close();
});

// ── S7: Mobile 390px ───────────────────────────────────────────────────────────
test('S7 mobile 390px', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.addInitScript(RAF_SCRIPT);
  await page.addInitScript(LT_SCRIPT);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.evaluate(() => { (window as any).__rc = 0; (window as any).__lt = []; });
  await page.evaluate(FT_SCRIPT);
  const d = await cdpDelta(cdp, () => page.waitForTimeout(3000));
  const r = await page.evaluate(() => ({
    rc: (window as any).__rc,
    lt: (window as any).__lt,
    fi: (window as any).__fi,
    an: document.getAnimations().length,
    sd: getComputedStyle(document.querySelector('.fds-ecosystem__scene-wrap') ?? document.body).display,
    pm: Array.from(document.querySelectorAll('.planet-motion')).slice(0, 2)
      .map(el => el.getAnimations().map(a => a.playState)),
  }));
  results.s7_mobile = {
    scenario: 'Mobile 390px/3s',
    script_s: d.ScriptDuration, recalc_s: d.RecalcStyleDuration, task_s: d.TaskDuration,
    raf_3s: r.rc, lt: r.lt.length,
    lt_max_ms: r.lt.length ? +Math.max(...r.lt.map((t: any) => t.d)).toFixed(1) : 0,
    frame: fstats(r.fi), total_animations: r.an, eco_scene_display: r.sd,
    planet_states_mobile: r.pm,
  };
  await ctx.close();
});

// ── S8: Kayla open/close ───────────────────────────────────────────────────────
test('S8 kayla open close', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(LT_SCRIPT);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const t0 = Date.now();
  await page.click('#kayla-launcher');
  await page.waitForSelector('.kayla-panel--open', { timeout: 3000 }).catch(() => {});
  const openMs = Date.now() - t0;
  await page.waitForTimeout(300);
  const t1 = Date.now();
  await page.click('.kayla-close');
  await page.waitForTimeout(300);
  const closeMs = Date.now() - t1;
  const r = await page.evaluate(() => ({ lt: (window as any).__lt }));
  results.s8_kayla = {
    scenario: 'Kayla open/close 1440px',
    open_ms: openMs, close_ms: closeMs, lt: r.lt.length,
    note: 'open_ms includes 250ms CSS transition; net interaction latency is open_ms - 250',
  };
  await ctx.close();
});

// ── Write results after all tests ──────────────────────────────────────────────
test.afterAll(async () => {
  results._meta = {
    label: LABEL,
    timestamp: new Date().toISOString(),
    base_url: BASE,
    env: 'Playwright headless Chromium (CDP)',
    limitations: [
      'CDP Performance.getMetrics are cumulative process-level proxies — deltas approximate rendering cost',
      'FPS values are frame-interval proxies from RAF timestamps, not direct vsync',
      'Headless Chromium may throttle some CSS animations differently than headed',
      'CDP Emulation.setVisibilityOverride availability varies — fallback fires event manually',
      'Long task detection requires PerformanceObserver support (available in Chromium)',
    ],
  };
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(results, null, 2));
  console.log('\n✅ R4.2 perf profile written to:', OUT_FILE);
  for (const [k, v] of Object.entries(results)) {
    if (k === '_meta') continue;
    console.log(`[${k}] ${v.scenario} | raf=${v.raf_3s ?? v.raf ?? v.raf_while_hidden ?? '-'} lt=${v.lt ?? '-'} sc=${v.script_s ?? '-'}s`);
  }
});
