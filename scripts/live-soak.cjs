/*
 * FDS Live-Production Soak + Memory-Stability Test (Phase 10)
 *
 * Drives a realistic interaction sequence on LIVE production, then idles, sampling:
 *   - JS heap (Performance.getMetrics JSHeapUsedSize + Runtime.getHeapUsage)
 *   - DOM Nodes / Documents / Frames (leak indicators)
 *   - cumulative main-thread TaskDuration (=> busy % over each interval)
 *   - long tasks (PerformanceObserver, cumulative)
 *   - document.getAnimations() total + running (duplicate-loop detector)
 *   - rAF frame-interval mean/p95 (jank / responsiveness)
 *
 * Verdict logic: heap should stabilize (not climb monotonically), animation total should not
 * grow, long-task rate should stay ~0, and idle busy% should return toward baseline.
 *
 * Usage: node scripts/live-soak.cjs [--url=...] [--idleSec=210] [--intervalSec=15]
 *        [--out=docs/audit/live-production/soak.json]
 */
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const getArg = (n, d) => { const m = args.find((a) => a.startsWith(`--${n}=`)); return m ? m.split('=').slice(1).join('=') : d; };
const BASE = getArg('url', 'https://forgerdigitalsolutions.com').replace(/\/$/, '');
const IDLE_SEC = parseInt(getArg('idleSec', '210'), 10);
const INTERVAL_SEC = parseInt(getArg('intervalSec', '15'), 10);
const OUT = getArg('out', 'docs/audit/live-production/soak.json');

const INIT = `
  window.__lt = []; window.__frames = [];
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push(e.duration); }).observe({ entryTypes: ['longtask'] }); } catch (_) {}
  (function frameTrack(){ let last = null; const tick = (ts) => { if (last !== null && window.__frames.length < 20000) window.__frames.push(ts - last); last = ts; requestAnimationFrame(tick); }; requestAnimationFrame(tick); })();
`;

const SNAP = `(() => {
  const a = document.getAnimations ? document.getAnimations() : [];
  const f = window.__frames || [];
  const sorted = [...f].sort((x, y) => x - y);
  const p95 = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : 0;
  const mean = sorted.length ? sorted.reduce((s, v) => s + v, 0) / sorted.length : 0;
  return {
    animTotal: a.length,
    animRunning: a.filter(x => x.playState === 'running').length,
    longTaskCount: (window.__lt || []).length,
    longTaskTotalMs: +((window.__lt || []).reduce((s, v) => s + v, 0)).toFixed(1),
    frameMeanMs: +mean.toFixed(2),
    frameP95Ms: +p95.toFixed(2),
    frameSamples: sorted.length,
  };
})()`;

function snapMetrics(list) { return Object.fromEntries(list.map((m) => [m.name, m.value])); }
function pctl(arr, p) { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; }

(async () => {
  console.log('========================================================');
  console.log('FDS LIVE-PRODUCTION SOAK TEST');
  console.log(`Base: ${BASE}   idle: ${IDLE_SEC}s   sample every ${INTERVAL_SEC}s`);
  console.log('========================================================\n');
  const browser = await chromium.launch({ headless: false, args: ['--window-size=1456,980'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(INIT);
  const errors = { console: [], page: [], requests: [] };
  page.on('console', (m) => { if (m.type() === 'error') errors.console.push(m.text()); });
  page.on('pageerror', (e) => errors.page.push(String(e && e.message ? e.message : e)));
  page.on('requestfailed', (r) => errors.requests.push(`${r.url()} :: ${r.failure() && r.failure().errorText}`));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');

  const startedAt = Date.now();
  const samples = [];
  let lastM = null, lastT = Date.now();

  async function sample(label) {
    const m = snapMetrics((await cdp.send('Performance.getMetrics')).metrics);
    let heap = {}; try { heap = await cdp.send('Runtime.getHeapUsage'); } catch (_) {}
    const s = await page.evaluate(SNAP);
    const now = Date.now();
    const dt = (now - lastT) / 1000;
    const dTask = lastM ? +(m.TaskDuration - lastM.TaskDuration).toFixed(4) : null;
    const rec = {
      label, tSec: +((now - startedAt) / 1000).toFixed(1),
      TaskDuration_s: +m.TaskDuration.toFixed(3),
      intervalBusyPct: dTask !== null ? +((dTask / dt) * 100).toFixed(2) : null,
      intervalTaskDelta_s: dTask, intervalSec: +dt.toFixed(1),
      JSHeapUsedMB: +(m.JSHeapUsedSize / 1048576).toFixed(2),
      cdpHeapUsedMB: +((heap.usedSize || 0) / 1048576).toFixed(2),
      Nodes: m.Nodes, Documents: m.Documents, Frames: m.Frames,
      LayoutCount: m.LayoutCount, RecalcStyleCount: m.RecalcStyleCount,
      ...s,
    };
    samples.push(rec);
    lastM = m; lastT = now;
    console.log(`  [${String(rec.tSec).padStart(6)}s] ${label.padEnd(22)} busy=${rec.intervalBusyPct === null ? '  -  ' : (rec.intervalBusyPct + '%').padStart(6)} heap=${String(rec.JSHeapUsedMB).padStart(6)}MB nodes=${String(rec.Nodes).padStart(5)} anim=${rec.animRunning}/${rec.animTotal} longTasks=${rec.longTaskCount} frameP95=${rec.frameP95Ms}ms`);
    return rec;
  }

  try {
    await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
    try { await page.waitForLoadState('networkidle', { timeout: 12000 }); } catch (_) {}
    await page.waitForTimeout(3000);
    await sample('home-top-initial');

    // ---- Interaction sequence (Phase 10 steps 2-11) ----
    const step = async (name, fn) => { try { await fn(); } catch (e) { errors.page.push(`soak step ${name}: ${e.message}`); } await page.waitForTimeout(1200); await sample(name); };

    await step('scroll-ecosystem', async () => { await page.evaluate(() => { const el = document.querySelector('.fds-ecosystem'); if (el) el.scrollIntoView({ block: 'center' }); }); });
    await step('hover-planets', async () => {
      const planets = await page.$$('.fds-ecosystem .planet, .planet');
      for (let i = 0; i < Math.min(planets.length, 6); i++) { try { await planets[i].hover({ timeout: 2000 }); await page.waitForTimeout(400); } catch (_) {} }
    });
    await step('scroll-gems', async () => { await page.evaluate(() => { const el = document.querySelector('.gems-system, [class*="gems"]'); if (el) el.scrollIntoView({ block: 'center' }); }); });
    await step('scroll-onefds', async () => { await page.evaluate(() => { const el = document.querySelector('.one-eco, [class*="one-eco"]'); if (el) el.scrollIntoView({ block: 'center' }); }); });
    await step('scroll-footer', async () => { await page.evaluate(() => { const el = document.querySelector('footer'); if (el) el.scrollIntoView({ block: 'center' }); else window.scrollTo(0, document.body.scrollHeight); }); });
    await step('back-to-top', async () => { await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' })); });
    await step('nav-codeforge', async () => { await page.goto(BASE + '/projects/codeforge', { waitUntil: 'load', timeout: 60000 }); });
    await step('nav-gems', async () => { await page.goto(BASE + '/projects/gems-training-grounds', { waitUntil: 'load', timeout: 60000 }); });
    await step('nav-home', async () => { await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 }); await page.waitForTimeout(1500); });
    await step('kayla-open', async () => {
      const trig = await page.$('[id*="kayla" i] button, [class*="kayla" i] button, [aria-label*="Kayla" i], [data-kayla-trigger]');
      if (trig) { await trig.click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(1500); }
    });

    // ---- Idle soak with periodic sampling ----
    console.log(`\n  -- idling ${IDLE_SEC}s, sampling every ${INTERVAL_SEC}s --`);
    const idleStart = Date.now();
    let n = 0;
    while ((Date.now() - idleStart) / 1000 < IDLE_SEC) {
      await page.waitForTimeout(INTERVAL_SEC * 1000);
      await sample(`idle-${++n}`);
    }

    // ---- Analysis ----
    const idleSamples = samples.filter((s) => s.label.startsWith('idle-'));
    const heaps = idleSamples.map((s) => s.JSHeapUsedMB);
    const nodes = idleSamples.map((s) => s.Nodes);
    const animTotals = samples.map((s) => s.animTotal);
    const busy = idleSamples.map((s) => s.intervalBusyPct).filter((v) => v !== null);
    const ltStart = idleSamples.length ? idleSamples[0].longTaskCount : 0;
    const ltEnd = idleSamples.length ? idleSamples[idleSamples.length - 1].longTaskCount : 0;
    const analysis = {
      idleSampleCount: idleSamples.length,
      heapFirstMB: heaps[0] ?? null, heapLastMB: heaps[heaps.length - 1] ?? null,
      heapMinMB: heaps.length ? Math.min(...heaps) : null, heapMaxMB: heaps.length ? Math.max(...heaps) : null,
      heapNetGrowthMB: heaps.length ? +(heaps[heaps.length - 1] - heaps[0]).toFixed(2) : null,
      nodesFirst: nodes[0] ?? null, nodesLast: nodes[nodes.length - 1] ?? null,
      nodesNetGrowth: nodes.length ? nodes[nodes.length - 1] - nodes[0] : null,
      animTotalFirst: animTotals[0], animTotalLast: animTotals[animTotals.length - 1],
      animTotalMax: Math.max(...animTotals),
      idleBusyMeanPct: busy.length ? +(busy.reduce((a, b) => a + b, 0) / busy.length).toFixed(2) : null,
      idleBusyMaxPct: busy.length ? Math.max(...busy) : null,
      longTasksDuringIdle: ltEnd - ltStart,
      finalFrameP95Ms: samples[samples.length - 1].frameP95Ms,
      verdict: {
        heapStable: heaps.length ? (Math.max(...heaps) - Math.min(...heaps)) < 8 : true, // < 8MB swing
        noAnimDuplication: Math.max(...animTotals) <= animTotals[0] + 2,
        noNodeLeak: nodes.length ? (nodes[nodes.length - 1] - nodes[0]) < 200 : true,
        noLongTasks: (ltEnd - ltStart) === 0,
      },
    };

    const result = { base: BASE, startedAt: new Date(startedAt).toISOString(), durationSec: +((Date.now() - startedAt) / 1000).toFixed(1), idleSec: IDLE_SEC, samples, analysis, errors: { console: [...new Set(errors.console)].slice(0, 15), page: [...new Set(errors.page)].slice(0, 15), requests: [...new Set(errors.requests)].slice(0, 15) } };
    const outPath = path.resolve(OUT);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
    console.log('\n==== SOAK ANALYSIS ====');
    console.log(JSON.stringify(analysis, null, 2));
    console.log('errors:', JSON.stringify(result.errors));
    console.log(`\nWrote soak -> ${outPath}`);
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
