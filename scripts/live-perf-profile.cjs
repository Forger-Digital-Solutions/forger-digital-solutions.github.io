/*
 * FDS Live-Production Performance Profiler
 *
 * Reproduces the emergency forensic methodology (docs/audit/fds-emergency-performance-audit-2026-09-17.md)
 * against the LIVE production URL instead of a local dist server:
 *   1. CDP Performance.getMetrics over a settle+idle window  -> TaskDuration / ScriptDuration /
 *      LayoutDuration / RecalcStyleDuration deltas and main-thread busy %.
 *   2. PerformanceObserver('longtask')                        -> long-task count / total / max.
 *   3. document.getAnimations()                               -> running vs paused animation counts.
 *   4. Runtime.getHeapUsage + performance.memory              -> JS heap.
 *   5. Chromium trace (same categories as r42h harness) parsed by raw event NAME
 *      -> RasterTask / Paint / UpdateLayoutTree / Layerize / Commit / UpdateLayer / ImageDecodeTask
 *         totals + call counts, and main-thread RunTask long tasks.
 *
 * Usage:
 *   node scripts/live-perf-profile.cjs [--url=https://forgerdigitalsolutions.com]
 *        [--scenario=all|top|ecosystem|bottom|codeforge|gems|technology|about]
 *        [--idle=5000] [--trace=4000] [--settle=1800] [--iterations=2] [--headless]
 *        [--out=docs/audit/live-production/perf-summary.json]
 */
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(2);
const getArg = (n, d) => {
  const m = args.find((a) => a.startsWith(`--${n}=`));
  return m ? m.split('=').slice(1).join('=') : d;
};

const BASE = getArg('url', 'https://forgerdigitalsolutions.com').replace(/\/$/, '');
const SCENARIO = getArg('scenario', 'all');
const IDLE_MS = parseInt(getArg('idle', '5000'), 10);
const TRACE_MS = parseInt(getArg('trace', '4000'), 10);
const SETTLE_MS = parseInt(getArg('settle', '1800'), 10);
const ITERATIONS = parseInt(getArg('iterations', '2'), 10);
const FORCE_HEADLESS = args.includes('--headless');
const OUT = getArg('out', 'docs/audit/live-production/perf-summary.json');

const TRACE_CATEGORIES = [
  'devtools.timeline',
  'v8.execute',
  'disabled-by-default-devtools.timeline',
  'blink.user_timing',
];

// Event names we aggregate from the raw trace (matches the emergency audit table columns).
const TRACE_EVENTS = [
  'RasterTask',
  'Paint',
  'PrePaint',
  'UpdateLayoutTree',
  'RecalculateStyles',
  'Layout',
  'Layerize',
  'Commit',
  'UpdateLayer',
  'ImageDecodeTask',
  'GPUTask',
  'CompositeLayers',
  'FireAnimationFrame',
  'FunctionCall',
  'DrawFrame',
];

const SCENARIOS = {
  top: { route: '/', scroll: null, label: 'Homepage: Hero / Top' },
  ecosystem: { route: '/', scroll: '.fds-ecosystem', label: 'Homepage: Ecosystem Section' },
  bottom: { route: '/', scroll: 'footer', label: 'Homepage: Bottom / Footer' },
  codeforge: { route: '/projects/codeforge', scroll: null, label: 'CodeForge (/projects/codeforge)' },
  gems: { route: '/projects/gems-training-grounds', scroll: null, label: 'GEMS Training Grounds' },
  technology: { route: '/technology', scroll: null, label: 'Technology (/technology)' },
  about: { route: '/about', scroll: null, label: 'About (/about)' },
};

const INIT_SCRIPT = `
  window.__lt = [];
  try {
    const po = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__lt.push(e.duration);
    });
    po.observe({ entryTypes: ['longtask'] });
  } catch (_) {}
`;

function median(nums) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function snapMetrics(list) {
  return Object.fromEntries(list.map((m) => [m.name, m.value]));
}

async function collectTrace(cdp, waitMs) {
  const events = [];
  const onData = (p) => events.push(...p.value);
  cdp.on('Tracing.dataCollected', onData);
  const done = new Promise((res) => cdp.once('Tracing.tracingComplete', () => res()));
  await cdp.send('Tracing.start', { traceConfig: { includedCategories: TRACE_CATEGORIES } });
  await new Promise((r) => setTimeout(r, waitMs));
  await cdp.send('Tracing.end');
  await done;
  cdp.off('Tracing.dataCollected', onData);
  return events;
}

function parseTraceByName(events) {
  // Identify the renderer main thread.
  let mainTid = null;
  for (const e of events) {
    if (e.name === 'thread_name' && e.args && e.args.name === 'CrRendererMain') {
      mainTid = e.tid;
      break;
    }
  }
  const byName = {};
  for (const n of TRACE_EVENTS) byName[n] = { count: 0, ms: 0 };
  let mainRunTaskMs = 0;
  let mainRunTaskCount = 0;
  const mainLongTasks = [];

  for (const e of events) {
    const dur = e.dur || 0;
    if (byName[e.name] !== undefined && e.ph === 'X') {
      byName[e.name].count += 1;
      byName[e.name].ms += dur / 1000;
    }
    if (e.name === 'RunTask' && mainTid !== null && e.tid === mainTid && e.ph === 'X') {
      mainRunTaskMs += dur / 1000;
      mainRunTaskCount += 1;
      if (dur >= 50000) mainLongTasks.push(dur / 1000);
    }
  }
  for (const n of Object.keys(byName)) byName[n].ms = +byName[n].ms.toFixed(2);
  mainLongTasks.sort((a, b) => a - b);
  return {
    byName,
    mainRunTaskMs: +mainRunTaskMs.toFixed(2),
    mainRunTaskCount,
    traceLongTaskCount: mainLongTasks.length,
    traceLongTaskMaxMs: mainLongTasks.length ? +mainLongTasks[mainLongTasks.length - 1].toFixed(2) : 0,
    traceLongTaskTotalMs: +mainLongTasks.reduce((a, b) => a + b, 0).toFixed(2),
    totalEvents: events.length,
    mainTidFound: mainTid !== null,
  };
}

async function runScenario(browser, key) {
  const sc = SCENARIOS[key];
  const url = BASE + sc.route;
  const iterations = [];
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  for (let it = 0; it < ITERATIONS; it++) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(INIT_SCRIPT);

    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => pageErrors.push(String(e && e.message ? e.message : e)));
    page.on('requestfailed', (r) => failedRequests.push(`${r.method()} ${r.url()} :: ${r.failure() && r.failure().errorText}`));

    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Performance.enable');

    const t0 = Date.now();
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    try { await page.waitForLoadState('networkidle', { timeout: 15000 }); } catch (_) {}
    const loadMs = Date.now() - t0;

    if (sc.scroll) {
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
        else window.scrollTo(0, document.body.scrollHeight);
      }, sc.scroll);
    }
    await page.waitForTimeout(SETTLE_MS);

    // ---- Idle metric window ----
    await page.evaluate(() => { window.__lt = []; });
    const before = snapMetrics((await cdp.send('Performance.getMetrics')).metrics);
    const animsBefore = await page.evaluate(() => {
      const a = document.getAnimations ? document.getAnimations() : [];
      return {
        total: a.length,
        running: a.filter((x) => x.playState === 'running').length,
        paused: a.filter((x) => x.playState === 'paused').length,
      };
    });
    await page.waitForTimeout(IDLE_MS);
    const after = snapMetrics((await cdp.send('Performance.getMetrics')).metrics);
    const idle = {};
    for (const k of Object.keys(before)) idle[k] = +(after[k] - before[k]).toFixed(4);

    const longTasks = await page.evaluate(() => window.__lt || []);
    let heap = { usedSize: 0, totalSize: 0 };
    try { heap = await cdp.send('Runtime.getHeapUsage'); } catch (_) {}
    const perfMemory = await page.evaluate(() => {
      const m = performance.memory;
      return m ? { usedJSHeapSize: m.usedJSHeapSize, totalJSHeapSize: m.totalJSHeapSize } : null;
    });
    const animsAfter = await page.evaluate(() => {
      const a = document.getAnimations ? document.getAnimations() : [];
      return {
        total: a.length,
        running: a.filter((x) => x.playState === 'running').length,
        paused: a.filter((x) => x.playState === 'paused').length,
      };
    });

    // ---- Trace window ----
    const rawEvents = await collectTrace(cdp, TRACE_MS);
    const trace = parseTraceByName(rawEvents);

    const idleSec = IDLE_MS / 1000;
    iterations.push({
      iteration: it,
      loadMs,
      busy: {
        TaskDuration_s: idle.TaskDuration,
        ScriptDuration_s: idle.ScriptDuration,
        LayoutDuration_s: idle.LayoutDuration,
        RecalcStyleDuration_s: idle.RecalcStyleDuration,
        mainThreadBusyPct: +(((idle.TaskDuration || 0) / idleSec) * 100).toFixed(2),
        layoutCount: idle.LayoutCount,
        recalcStyleCount: idle.RecalcStyleCount,
      },
      longTasks: {
        count: longTasks.length,
        totalMs: +longTasks.reduce((a, b) => a + b, 0).toFixed(2),
        maxMs: longTasks.length ? +Math.max(...longTasks).toFixed(2) : 0,
      },
      animations: { before: animsBefore, after: animsAfter },
      heap: {
        cdpUsedSize: heap.usedSize,
        cdpTotalSize: heap.totalSize,
        usedJSHeapSize: perfMemory ? perfMemory.usedJSHeapSize : null,
      },
      trace,
    });

    await cdp.detach().catch(() => {});
    await ctx.close();
  }

  // Aggregate medians across iterations for headline numbers.
  const med = (fn) => +median(iterations.map(fn)).toFixed(2);
  const summary = {
    scenario: key,
    label: sc.label,
    url,
    iterations: iterations.length,
    median: {
      TaskDuration_s: med((r) => r.busy.TaskDuration_s || 0),
      ScriptDuration_s: med((r) => r.busy.ScriptDuration_s || 0),
      LayoutDuration_s: med((r) => r.busy.LayoutDuration_s || 0),
      RecalcStyleDuration_s: med((r) => r.busy.RecalcStyleDuration_s || 0),
      mainThreadBusyPct: med((r) => r.busy.mainThreadBusyPct),
      runningAnims: med((r) => r.animations.after.running),
      totalAnims: med((r) => r.animations.after.total),
      longTaskCount: med((r) => r.longTasks.count),
      longTaskTotalMs: med((r) => r.longTasks.totalMs),
      heapUsedMB: med((r) => (r.heap.usedJSHeapSize || r.heap.cdpUsedSize || 0) / (1024 * 1024)),
      RasterTask_ms: med((r) => r.trace.byName.RasterTask.ms),
      RasterTask_calls: med((r) => r.trace.byName.RasterTask.count),
      Paint_ms: med((r) => r.trace.byName.Paint.ms),
      Paint_calls: med((r) => r.trace.byName.Paint.count),
      UpdateLayoutTree_ms: med((r) => r.trace.byName.UpdateLayoutTree.ms),
      Layerize_ms: med((r) => r.trace.byName.Layerize.ms),
      Commit_ms: med((r) => r.trace.byName.Commit.ms),
      UpdateLayer_calls: med((r) => r.trace.byName.UpdateLayer.count),
      ImageDecodeTask_calls: med((r) => r.trace.byName.ImageDecodeTask.count),
      mainRunTask_ms: med((r) => r.trace.mainRunTaskMs),
      traceLongTaskCount: med((r) => r.trace.traceLongTaskCount),
      traceLongTaskMaxMs: med((r) => r.trace.traceLongTaskMaxMs),
    },
    health: {
      consoleErrors: [...new Set(consoleErrors)].slice(0, 20),
      pageErrors: [...new Set(pageErrors)].slice(0, 20),
      failedRequests: [...new Set(failedRequests)].slice(0, 20),
    },
    raw: iterations,
  };
  return summary;
}

(async () => {
  const keys = SCENARIO === 'all' ? Object.keys(SCENARIOS) : [SCENARIO];
  console.log('========================================================');
  console.log('FDS LIVE-PRODUCTION PERFORMANCE PROFILER');
  console.log('========================================================');
  console.log(`Base URL:   ${BASE}`);
  console.log(`Scenarios:  ${keys.join(', ')}`);
  console.log(`Idle:       ${IDLE_MS}ms   Trace: ${TRACE_MS}ms   Settle: ${SETTLE_MS}ms   Iterations: ${ITERATIONS}`);
  console.log('========================================================\n');

  let browser;
  let mode = 'headed';
  try {
    browser = await chromium.launch({ headless: false, args: ['--window-size=1456,980'] });
  } catch (e) {
    console.log('Headed launch failed, falling back to headless:', e.message);
    mode = 'headless';
    browser = await chromium.launch({ headless: true });
  }
  if (FORCE_HEADLESS) { /* no-op; kept for parity */ }
  console.log(`Chromium launched in ${mode} mode. Version: ${browser.version()}\n`);

  const results = { meta: { base: BASE, mode, idleMs: IDLE_MS, traceMs: TRACE_MS, settleMs: SETTLE_MS, iterations: ITERATIONS, startedAt: new Date().toISOString(), ua: null }, scenarios: {} };
  try {
    const probeCtx = await browser.newContext();
    const probePage = await probeCtx.newPage();
    results.meta.ua = await probePage.evaluate(() => navigator.userAgent);
    await probeCtx.close();
    console.log('UA:', results.meta.ua, '\n');

    for (const k of keys) {
      process.stdout.write(`> Profiling ${k} (${SCENARIOS[k].label}) ... `);
      const t = Date.now();
      const r = await runScenario(browser, k);
      results.scenarios[k] = r;
      const m = r.median;
      console.log(`done in ${((Date.now() - t) / 1000).toFixed(1)}s`);
      console.log(`    TaskDuration ${m.TaskDuration_s}s  busy ${m.mainThreadBusyPct}%  RasterTask ${m.RasterTask_ms}ms/${m.RasterTask_calls}  Paint ${m.Paint_ms}ms/${m.Paint_calls}  UpdateLayer ${m.UpdateLayer_calls}  ImageDecode ${m.ImageDecodeTask_calls}  runAnims ${m.runningAnims}/${m.totalAnims}  longTasks(idle) ${m.longTaskCount}  heap ${m.heapUsedMB}MB`);
      const h = r.health;
      if (h.pageErrors.length || h.consoleErrors.length || h.failedRequests.length) {
        console.log(`    HEALTH: pageErrors=${h.pageErrors.length} consoleErrors=${h.consoleErrors.length} failedReqs=${h.failedRequests.length}`);
      }
    }
  } finally {
    await browser.close();
  }

  results.meta.finishedAt = new Date().toISOString();
  const outPath = path.resolve(OUT);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nWrote summary JSON -> ${outPath}`);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
