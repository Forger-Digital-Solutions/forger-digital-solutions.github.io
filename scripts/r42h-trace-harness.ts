/**
 * FDS Website R4.2H Headed Runtime Performance Tracing Harness
 *
 * Runs genuine headed Chromium (headless: false) across scenarios H1–H7.
 * Supports:
 *   --mode=trace-only     Clean run with zero custom script instrumentation (Chrome CDP tracing only)
 *   --mode=instrumented   RunWith benchmark probes (RAF / FT / LT) to detect harness distortion
 *
 * Usage:
 *   npx tsx scripts/r42h-trace-harness.ts --label=r41 --dir=../fds-r41-baseline/dist --port=4324 --mode=trace-only --iterations=3
 *   npx tsx scripts/r42h-trace-harness.ts --label=r42 --dir=./dist --port=4324 --mode=trace-only --iterations=3
 */

import { chromium, type Browser, type CDPSession, type Page } from '@playwright/test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// ── CLI Arguments ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name: string, fallback: string): string {
  const match = args.find(a => a.startsWith(`--${name}=`));
  return match ? match.split('=')[1] : fallback;
}

const LABEL = getArg('label', 'r42'); // 'r41' or 'r42'
const TARGET_DIR = path.resolve(getArg('dir', './dist'));
const PORT = parseInt(getArg('port', '4324'), 10);
const BASE = `http://127.0.0.1:${PORT}`;
const MODE = getArg('mode', 'trace-only'); // 'trace-only' | 'instrumented'
const ITERATIONS = parseInt(getArg('iterations', '3'), 10);
const SCENARIO_FILTER = getArg('scenario', 'all'); // 'all' | 'H1' | 'H2' etc.

const AUDIT_DIR = path.join(process.cwd(), 'docs', 'audit', 'r42h');
const TRACE_DIR = path.join(AUDIT_DIR, 'traces');
const OUT_FILE = path.join(AUDIT_DIR, `r42h-${LABEL}-${MODE}.json`);

fs.mkdirSync(TRACE_DIR, { recursive: true });

console.log(`\n========================================================`);
console.log(`FDS WEBSITE R4.2H HEADED PERFORMANCE HARNESS`);
console.log(`========================================================`);
console.log(`Label:       ${LABEL}`);
console.log(`Target Dir:  ${TARGET_DIR}`);
console.log(`Port:        ${PORT}`);
console.log(`Mode:        ${MODE}`);
console.log(`Iterations:  ${ITERATIONS}`);
console.log(`Scenario:    ${SCENARIO_FILTER}`);
console.log(`Output:      ${OUT_FILE}`);
console.log(`========================================================\n`);

// ── In-Process HTTP Server ───────────────────────────────────────────────────
function startStaticServer(distDir: string, port: number): Promise<http.Server> {
  const mimeTypes: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.zip': 'application/zip',
  };

  const server = http.createServer((req, res) => {
    try {
      const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
      let reqPath = decodeURIComponent(url.pathname);
      let filePath = path.join(distDir, reqPath);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
      if (!fs.existsSync(filePath)) {
        filePath = path.join(distDir, '404.html');
      }

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, {
          'Content-Type': mimeTypes[ext] || 'application/octet-stream',
          'Cache-Control': 'no-cache',
        });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    } catch (e: any) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Internal Error: ${e.message}`);
    }
  });

  return new Promise((resolve, reject) => {
    server.listen(port, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

// ── CDP Trace Event Types & Parser ───────────────────────────────────────────
interface TraceEvent {
  cat: string;
  name: string;
  ph: string;
  ts: number;
  dur?: number;
  pid: number;
  tid: number;
  args?: any;
}

export interface ParsedTraceMetrics {
  totalTaskMs: number;
  scriptMs: number;
  styleMs: number;
  layoutMs: number;
  paintMs: number;
  compositeMs: number;
  unattributedTaskMs: number;
  longTaskCount: number;
  maxLongTaskMs: number;
  longTasksP95Ms: number;
  frameCount: number;
  frameIntervalMeanMs: number;
  frameIntervalP95Ms: number;
  droppedFramesGt33: number;
  droppedFramesGt50: number;
}

function parseTraceEvents(events: TraceEvent[]): ParsedTraceMetrics {
  // Find renderer main thread
  let mainTid: number | null = null;
  for (const e of events) {
    if (e.name === 'thread_name' && e.args?.name === 'CrRendererMain') {
      mainTid = e.tid;
      break;
    }
  }

  const mainEvents = mainTid !== null ? events.filter(e => e.tid === mainTid) : events;

  let totalTaskUs = 0;
  let scriptUs = 0;
  let styleUs = 0;
  let layoutUs = 0;
  let paintUs = 0;
  let compositeUs = 0;
  const longTasksUs: number[] = [];

  // Frame timing intervals from BeginFrame / DrawFrame / FireAnimationFrame
  const frameTimestampsUs: number[] = [];

  for (const e of mainEvents) {
    const dur = e.dur || 0;
    if (e.name === 'RunTask' && dur > 0) {
      totalTaskUs += dur;
      if (dur >= 50000) {
        longTasksUs.push(dur);
      }
    } else if (e.name === 'FunctionCall' || e.name === 'EvaluateScript' || e.name === 'v8.execute' || e.name === 'FireAnimationFrame') {
      scriptUs += dur;
    } else if (e.name === 'UpdateLayoutTree' || e.name === 'RecalculateStyles') {
      styleUs += dur;
    } else if (e.name === 'Layout') {
      layoutUs += dur;
    } else if (e.name === 'Paint' || e.name === 'PrePaint') {
      paintUs += dur;
    } else if (e.name === 'Commit' || e.name === 'CompositeLayers') {
      compositeUs += dur;
    }

    if (e.name === 'FireAnimationFrame' || e.name === 'DrawFrame' || e.name === 'BeginFrame') {
      frameTimestampsUs.push(e.ts);
    }
  }

  // Calculate frame intervals
  const intervalsMs: number[] = [];
  frameTimestampsUs.sort((a, b) => a - b);
  for (let i = 1; i < frameTimestampsUs.length; i++) {
    const diffMs = (frameTimestampsUs[i] - frameTimestampsUs[i - 1]) / 1000;
    if (diffMs > 0 && diffMs < 1000) { // filter outliers
      intervalsMs.push(diffMs);
    }
  }

  let meanFrameMs = 0;
  let p95FrameMs = 0;
  let droppedGt33 = 0;
  let droppedGt50 = 0;

  if (intervalsMs.length > 0) {
    const sorted = [...intervalsMs].sort((a, b) => a - b);
    meanFrameMs = sorted.reduce((sum, v) => sum + v, 0) / sorted.length;
    p95FrameMs = sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1];
    droppedGt33 = sorted.filter(v => v > 33.3).length;
    droppedGt50 = sorted.filter(v => v > 50.0).length;
  }

  const accountedUs = scriptUs + styleUs + layoutUs + paintUs + compositeUs;
  const unattributedUs = Math.max(0, totalTaskUs - accountedUs);

  longTasksUs.sort((a, b) => a - b);
  const p95LongTaskMs = longTasksUs.length > 0
    ? (longTasksUs[Math.floor(longTasksUs.length * 0.95)] / 1000)
    : 0;

  return {
    totalTaskMs: +(totalTaskUs / 1000).toFixed(2),
    scriptMs: +(scriptUs / 1000).toFixed(2),
    styleMs: +(styleUs / 1000).toFixed(2),
    layoutMs: +(layoutUs / 1000).toFixed(2),
    paintMs: +(paintUs / 1000).toFixed(2),
    compositeMs: +(compositeUs / 1000).toFixed(2),
    unattributedTaskMs: +(unattributedUs / 1000).toFixed(2),
    longTaskCount: longTasksUs.length,
    maxLongTaskMs: longTasksUs.length > 0 ? +(longTasksUs[longTasksUs.length - 1] / 1000).toFixed(2) : 0,
    longTasksP95Ms: +p95LongTaskMs.toFixed(2),
    frameCount: frameTimestampsUs.length,
    frameIntervalMeanMs: +meanFrameMs.toFixed(2),
    frameIntervalP95Ms: +p95FrameMs.toFixed(2),
    droppedFramesGt33: droppedGt33,
    droppedFramesGt50: droppedGt50,
  };
}

// ── Tracing Session Helper ───────────────────────────────────────────────────
async function runWithTracing(
  cdp: CDPSession,
  action: () => Promise<void>,
  traceName: string
): Promise<{ metrics: ParsedTraceMetrics; traceFile: string; sha256: string }> {
  const traceEvents: TraceEvent[] = [];
  const onData = (params: any) => traceEvents.push(...params.value);
  cdp.on('Tracing.dataCollected', onData);
  const tracingComplete = new Promise<void>(resolve => cdp.once('Tracing.tracingComplete', () => resolve()));

  let cdpMetrics: Record<string, number> | undefined = undefined;

  await cdp.send('Tracing.start', {
    traceConfig: {
      includedCategories: [
        'devtools.timeline',
        'v8.execute',
        'disabled-by-default-devtools.timeline',
        'blink.user_timing'
      ]
    }
  });

  if (MODE === 'instrumented') {
    cdpMetrics = await cdpDelta(cdp, action);
  } else {
    await action();
  }

  await cdp.send('Tracing.end');
  await tracingComplete;
  cdp.off('Tracing.dataCollected', onData);

  const parsed = parseTraceEvents(traceEvents);

  // Write compact parsed summary and trace metadata
  const traceFileName = `${traceName}.json`;
  const fullPath = path.join(TRACE_DIR, traceFileName);
  const traceData = JSON.stringify(traceEvents);
  const hash = crypto.createHash('sha256').update(traceData).digest('hex');

  // Only store raw trace locally in trace dir (not checked into git)
  fs.writeFileSync(fullPath, traceData);

  return {
    metrics: parsed,
    cdpMetrics,
    traceFile: traceFileName,
    sha256: hash,
  };
}

// ── Statistics Helper ────────────────────────────────────────────────────────
function computeMedian<T extends Record<string, number>>(records: T[]): T {
  if (records.length === 0) return {} as T;
  const keys = Object.keys(records[0]) as (keyof T)[];
  const result: any = {};
  for (const k of keys) {
    const vals = records.map(r => r[k] as number).sort((a, b) => a - b);
    const mid = Math.floor(vals.length / 2);
    result[k] = vals.length % 2 !== 0 ? vals[mid] : +((vals[mid - 1] + vals[mid]) / 2).toFixed(2);
  }
  return result as T;
}

// ── Probes for Mode 2 (Instrumented Mode to detect harness distortion) ─────────
const RAF_SCRIPT = `
  window.__name = window.__name || function(fn) { return fn; };
  window.__rc = 0;
  const _origRAF = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = function(cb) {
    window.__rc++;
    return _origRAF(cb);
  };
`;

const LT_SCRIPT = `
  window.__lt = [];
  try {
    const o = new PerformanceObserver(list => {
      list.getEntries().forEach(e => window.__lt.push({ d: +e.duration.toFixed(2), st: +e.startTime.toFixed(2) }));
    });
    o.observe({ type: 'longtask', buffered: true });
  } catch(e) {}
`;

const FT_SCRIPT = `
  window.__fi = [];
  window.__fc = 0;
  let _lastFrameTs = null;
  function _frameTrack(ts) {
    if (_lastFrameTs !== null) {
      window.__fi.push(ts - _lastFrameTs);
    }
    _lastFrameTs = ts;
    if (++window.__fc < 240) {
      requestAnimationFrame(_frameTrack);
    }
  }
  requestAnimationFrame(_frameTrack);
`;

async function cdpDelta(cdp: CDPSession, action: () => Promise<void>): Promise<Record<string, number>> {
  await cdp.send('Performance.enable');
  const snap = (metrics: Array<{ name: string; value: number }>) =>
    Object.fromEntries(metrics.map(m => [m.name, m.value]));
  const before = snap((await cdp.send('Performance.getMetrics')).metrics);
  await action();
  const after = snap((await cdp.send('Performance.getMetrics')).metrics);
  const delta: Record<string, number> = {};
  for (const k of Object.keys(before)) {
    delta[k] = +(after[k] - before[k]).toFixed(4);
  }
  return delta;
}

// ── Warm-up Helper ───────────────────────────────────────────────────────────
async function warmUpPage(page: Page) {
  if (MODE === 'instrumented') {
    await page.addInitScript(RAF_SCRIPT);
    await page.addInitScript(LT_SCRIPT);
  }
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts?.ready || Promise.resolve());
  await page.waitForTimeout(600); // allow initial animations and timers to stabilize
  if (MODE === 'instrumented') {
    await page.evaluate(`window.__rc = 0; window.__lt = [];`);
    await page.evaluate(FT_SCRIPT);
  }
}

// ── Main Headed Orchestrator ─────────────────────────────────────────────────
async function runHeadedHarness() {
  if (!fs.existsSync(TARGET_DIR)) {
    throw new Error(`Target directory does not exist: ${TARGET_DIR}`);
  }

  console.log(`Starting in-process static server on port ${PORT}...`);
  const server = await startStaticServer(TARGET_DIR, PORT);
  console.log(`Server ready at ${BASE}\n`);

  console.log('Launching genuine HEADED Chromium (headless: false)...');
  const browser: Browser = await chromium.launch({
    headless: false,
    args: [
      '--window-size=1456,980', // ensures viewport of at least 1440x900 inside window chrome
    ]
  });

  const sessionResults: Record<string, any> = {};

  try {
    // ── Environment Probe ──────────────────────────────────────────────────────
    const envContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const envPage = await envContext.newPage();
    await envPage.goto(BASE, { waitUntil: 'networkidle' });
    const envDetails = await envPage.evaluate(() => ({
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight,
      },
      window: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        outerWidth: window.outerWidth,
        outerHeight: window.outerHeight,
        devicePixelRatio: window.devicePixelRatio,
      },
      navigator: {
        hardwareConcurrency: navigator.hardwareConcurrency,
        userAgent: navigator.userAgent,
      }
    }));
    await envContext.close();

    sessionResults._environment = {
      label: LABEL,
      mode: MODE,
      browserVersion: browser.version(),
      ...envDetails,
    };
    console.log('Environment confirmed:', JSON.stringify(sessionResults._environment, null, 2));

    // ══════════════════════════════════════════════════════════════════════════
    // H1: Homepage Idle (1440px desktop, 10 seconds, settled, no pointer)
    // ══════════════════════════════════════════════════════════════════════════
    if (SCENARIO_FILTER === 'all' || SCENARIO_FILTER === 'H1') {
      console.log(`\n[H1] Running Homepage Idle (10s, ${ITERATIONS} iterations)...`);
      const h1Runs: ParsedTraceMetrics[] = [];
      const h1Meta: any[] = [];

      for (let i = 0; i < ITERATIONS; i++) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);

        // Warm up
        await warmUpPage(page);

        // Execute trace
        const { metrics, cdpMetrics, traceFile, sha256 } = await runWithTracing(
          cdp,
          async () => {
            await page.waitForTimeout(10000);
          },
          `trace-h1-${LABEL}-${MODE}-run${i + 1}`
        );

        h1Runs.push(metrics);
        h1Meta.push({ run: i + 1, traceFile, sha256, cdpMetrics });
        console.log(`  H1 Run ${i + 1}: TotalTask=${metrics.totalTaskMs}ms, Style=${metrics.styleMs}ms, Layout=${metrics.layoutMs}ms, Paint=${metrics.paintMs}ms, LongTasks=${metrics.longTaskCount}`);

        await context.close();
      }

      sessionResults.H1_desktop_idle = {
        scenario: 'H1: Homepage Idle (1440px, 10s)',
        runs: h1Runs,
        meta: h1Meta,
        median: computeMedian(h1Runs),
      };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // H2: Ecosystem Fully Visible (1440px desktop, 10 seconds, primary gate)
    // ══════════════════════════════════════════════════════════════════════════
    if (SCENARIO_FILTER === 'all' || SCENARIO_FILTER === 'H2') {
      console.log(`\n[H2] Running Ecosystem Fully Visible (10s, ${ITERATIONS} iterations)...`);
      const h2Runs: ParsedTraceMetrics[] = [];
      const h2Meta: any[] = [];
      let h2Observations: any = null;

      for (let i = 0; i < ITERATIONS; i++) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);

        // Warm up and scroll ecosystem to center
        await warmUpPage(page);
        await page.evaluate(() => {
          const eco = document.querySelector('.fds-ecosystem');
          if (eco) eco.scrollIntoView({ behavior: 'instant', block: 'center' });
        });
        await page.waitForTimeout(600); // let observer fire and settle

        // Check geometry and states before trace
        const preCheck = await page.evaluate(() => {
          const el = document.querySelector('.fds-ecosystem');
          const rect = el?.getBoundingClientRect();
          const planets = Array.from(document.querySelectorAll('.planet-motion'))
            .map(p => p.getAnimations().map(a => a.playState));
          const rings = Array.from(document.querySelectorAll('.core__ring'))
            .map(r => r.getAnimations().map(a => a.playState));
          const pulses = Array.from(document.querySelectorAll('.orbit-pulse'))
            .map(p => p.getAnimations().map(a => a.playState));
          return {
            rect: rect ? { top: rect.top, bottom: rect.bottom, height: rect.height } : null,
            ecoPaused: el?.hasAttribute('data-eco-paused') ?? null,
            planetsRunning: planets.every(states => states.every(s => s === 'running')),
            ringsRunning: rings.every(states => states.every(s => s === 'running')),
            pulsesRunning: pulses.every(states => states.every(s => s === 'running')),
          };
        });

        // Execute trace
        const { metrics, cdpMetrics, traceFile, sha256 } = await runWithTracing(
          cdp,
          async () => {
            await page.waitForTimeout(10000);
          },
          `trace-h2-${LABEL}-${MODE}-run${i + 1}`
        );

        h2Runs.push(metrics);
        h2Meta.push({ run: i + 1, traceFile, sha256, preCheck, cdpMetrics });
        console.log(`  H2 Run ${i + 1}: TotalTask=${metrics.totalTaskMs}ms, Style=${metrics.styleMs}ms, Layout=${metrics.layoutMs}ms, Paint=${metrics.paintMs}ms, LongTasks=${metrics.longTaskCount}`);

        h2Observations = preCheck;
        await context.close();
      }

      sessionResults.H2_ecosystem_visible = {
        scenario: 'H2: Ecosystem Fully Visible (1440px, 10s, center viewport)',
        runs: h2Runs,
        meta: h2Meta,
        observations: h2Observations,
        median: computeMedian(h2Runs),
      };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // H3: Ecosystem Visible + Natural Pointer Movement
    // ══════════════════════════════════════════════════════════════════════════
    if (SCENARIO_FILTER === 'all' || SCENARIO_FILTER === 'H3') {
      console.log(`\n[H3] Running Ecosystem Visible + Natural Pointer Interaction...`);
      const h3Runs: ParsedTraceMetrics[] = [];
      const h3InteractionStats: any[] = [];

      for (let i = 0; i < Math.min(ITERATIONS, 3); i++) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);

        await warmUpPage(page);
        await page.evaluate(() => {
          const eco = document.querySelector('.fds-ecosystem');
          if (eco) eco.scrollIntoView({ behavior: 'instant', block: 'center' });
        });
        await page.waitForTimeout(500);

        // Instrument pointer events & CSS variable update counting
        await page.evaluate(() => {
          (window as any).__h3_pm = 0;
          (window as any).__h3_csv = 0;
          const _orig = CSSStyleDeclaration.prototype.setProperty;
          CSSStyleDeclaration.prototype.setProperty = function(p, v, pr) {
            if (p === '--pointer-x' || p === '--pointer-y') (window as any).__h3_csv++;
            return _orig.call(this, p, v, pr);
          };
          document.addEventListener('pointermove', () => { (window as any).__h3_pm++; }, { passive: true, capture: true });
        });

        // Repeatable natural path: background -> core -> planet A -> label -> planet B -> background
        const waypoints = [
          { x: 300, y: 250 },
          { x: 720, y: 450 }, // central core
          { x: 550, y: 380 }, // planet 1
          { x: 560, y: 400 }, // label 1
          { x: 880, y: 520 }, // planet 2
          { x: 900, y: 540 }, // label 2
          { x: 1200, y: 300 }, // blank background
        ];

        const { metrics, cdpMetrics, traceFile, sha256 } = await runWithTracing(
          cdp,
          async () => {
            for (const wp of waypoints) {
              await page.mouse.move(wp.x, wp.y, { steps: 10 });
              await page.waitForTimeout(100);
            }
          },
          `trace-h3-${LABEL}-${MODE}-run${i + 1}`
        );

        const pointerData = await page.evaluate(() => ({
          pm: (window as any).__h3_pm,
          csv: (window as any).__h3_csv,
        }));

        h3Runs.push(metrics);
        h3InteractionStats.push({ ...pointerData, traceFile, sha256, cdpMetrics });
        console.log(`  H3 Run ${i + 1}: TotalTask=${metrics.totalTaskMs}ms, Style=${metrics.styleMs}ms, PointerEvents=${pointerData.pm}, CSSWrites=${pointerData.csv}`);

        await context.close();
      }

      sessionResults.H3_pointer_interaction = {
        scenario: 'H3: Ecosystem Visible + Natural Pointer Movement',
        runs: h3Runs,
        interactionStats: h3InteractionStats,
        median: computeMedian(h3Runs),
      };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // H4: Continuous Scroll Through Ecosystem
    // ══════════════════════════════════════════════════════════════════════════
    if (SCENARIO_FILTER === 'all' || SCENARIO_FILTER === 'H4') {
      console.log(`\n[H4] Running Continuous Scroll Through Ecosystem...`);
      const h4Runs: ParsedTraceMetrics[] = [];
      const h4ScrollStats: any[] = [];

      for (let i = 0; i < Math.min(ITERATIONS, 3); i++) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);

        await warmUpPage(page);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(400);

        // Smooth continuous scroll from top (0) through ecosystem to bottom
        const { metrics, cdpMetrics, traceFile, sha256 } = await runWithTracing(
          cdp,
          async () => {
            const steps = 30;
            const targetY = 2200;
            for (let s = 1; s <= steps; s++) {
              const y = (targetY / steps) * s;
              await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
              await page.waitForTimeout(50);
            }
          },
          `trace-h4-${LABEL}-${MODE}-run${i + 1}`
        );

        h4Runs.push(metrics);
        h4ScrollStats.push({ traceFile, sha256, cdpMetrics });
        console.log(`  H4 Run ${i + 1}: TotalTask=${metrics.totalTaskMs}ms, Style=${metrics.styleMs}ms, Paint=${metrics.paintMs}ms, LongTasks=${metrics.longTaskCount}`);

        await context.close();
      }

      sessionResults.H4_scroll_ecosystem = {
        scenario: 'H4: Continuous Scroll Through Ecosystem (30 steps over 1.5s)',
        runs: h4Runs,
        meta: h4ScrollStats,
        median: computeMedian(h4Runs),
      };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // H5: Hover Individual Planets
    // ══════════════════════════════════════════════════════════════════════════
    if (SCENARIO_FILTER === 'all' || SCENARIO_FILTER === 'H5') {
      console.log(`\n[H5] Running Planet Hover Interactions...`);
      const h5Runs: ParsedTraceMetrics[] = [];
      const h5Meta: any[] = [];

      for (let i = 0; i < Math.min(ITERATIONS, 3); i++) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);

        await warmUpPage(page);
        await page.evaluate(() => {
          const eco = document.querySelector('.fds-ecosystem');
          if (eco) eco.scrollIntoView({ behavior: 'instant', block: 'center' });
        });
        await page.waitForTimeout(500);

        const { metrics, cdpMetrics, traceFile, sha256 } = await runWithTracing(
          cdp,
          async () => {
            // Hover over 4 planet links sequentially
            const planets = page.locator('.planet-link');
            const count = await planets.count();
            for (let p = 0; p < Math.min(count, 4); p++) {
              await planets.nth(p).hover({ force: true });
              await page.waitForTimeout(300);
            }
          },
          `trace-h5-${LABEL}-${MODE}-run${i + 1}`
        );

        h5Runs.push(metrics);
        h5Meta.push({ traceFile, sha256, cdpMetrics });
        console.log(`  H5 Run ${i + 1}: TotalTask=${metrics.totalTaskMs}ms, Style=${metrics.styleMs}ms, Paint=${metrics.paintMs}ms`);
        await context.close();
      }

      sessionResults.H5_planet_hover = {
        scenario: 'H5: Hover 4 Planets Sequentially',
        runs: h5Runs,
        meta: h5Meta,
        median: computeMedian(h5Runs),
      };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // H6: Viewport Resize while Ecosystem Visible
    // ══════════════════════════════════════════════════════════════════════════
    if (SCENARIO_FILTER === 'all' || SCENARIO_FILTER === 'H6') {
      console.log(`\n[H6] Running Viewport Resize (1440 -> 1024 -> 768 -> 1440)...`);
      const h6Runs: ParsedTraceMetrics[] = [];
      const h6Meta: any[] = [];

      for (let i = 0; i < Math.min(ITERATIONS, 3); i++) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);

        await warmUpPage(page);
        await page.evaluate(() => {
          const eco = document.querySelector('.fds-ecosystem');
          if (eco) eco.scrollIntoView({ behavior: 'instant', block: 'center' });
        });
        await page.waitForTimeout(500);

        const { metrics, cdpMetrics, traceFile, sha256 } = await runWithTracing(
          cdp,
          async () => {
            await page.setViewportSize({ width: 1024, height: 800 });
            await page.waitForTimeout(400);
            await page.setViewportSize({ width: 768, height: 800 });
            await page.waitForTimeout(400);
            await page.setViewportSize({ width: 1440, height: 900 });
            await page.waitForTimeout(400);
          },
          `trace-h6-${LABEL}-${MODE}-run${i + 1}`
        );

        h6Runs.push(metrics);
        h6Meta.push({ traceFile, sha256, cdpMetrics });
        console.log(`  H6 Run ${i + 1}: TotalTask=${metrics.totalTaskMs}ms, Layout=${metrics.layoutMs}ms, Style=${metrics.styleMs}ms`);
        await context.close();
      }

      sessionResults.H6_resize = {
        scenario: 'H6: Viewport Resize 1440 -> 1024 -> 768 -> 1440',
        runs: h6Runs,
        meta: h6Meta,
        median: computeMedian(h6Runs),
      };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // H7: Real Browser Tab Switch (No backgrounding flags)
    // ══════════════════════════════════════════════════════════════════════════
    if (SCENARIO_FILTER === 'all' || SCENARIO_FILTER === 'H7') {
      console.log(`\n[H7] Running Real Browser Tab Switch...`);
      // Normal browser without disabling renderer backgrounding
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page1 = await context.newPage();

      await page1.goto(BASE, { waitUntil: 'networkidle' });
      await page1.waitForTimeout(500);

      // Check initial state
      const initialVis = await page1.evaluate(() => document.visibilityState);
      const initialBgPaused = await page1.evaluate(() => document.documentElement.hasAttribute('data-bg-paused'));

      // Open a second tab to cause focus switch
      const page2 = await context.newPage();
      await page2.goto(`${BASE}/about/`, { waitUntil: 'networkidle' });
      await page2.bringToFront();
      await page2.waitForTimeout(3000); // 3s on second tab

      // Check page1 state while backgrounded
      const backgroundVis = await page1.evaluate(() => document.visibilityState);
      const backgroundPaused = await page1.evaluate(() => document.documentElement.hasAttribute('data-bg-paused'));
      const backgroundPlanetStates = await page1.evaluate(() =>
        Array.from(document.querySelectorAll('.planet-motion')).slice(0, 3)
          .map(el => el.getAnimations().map(a => a.playState))
      );

      // Bring page1 back to front
      await page1.bringToFront();
      await page1.waitForTimeout(500);

      const returnedVis = await page1.evaluate(() => document.visibilityState);
      const returnedPaused = await page1.evaluate(() => document.documentElement.hasAttribute('data-bg-paused'));
      const returnedPlanetStates = await page1.evaluate(() =>
        Array.from(document.querySelectorAll('.planet-motion')).slice(0, 3)
          .map(el => el.getAnimations().map(a => a.playState))
      );

      sessionResults.H7_real_tab_switch = {
        scenario: 'H7: Real Browser Tab Switch',
        initial: { visibilityState: initialVis, dataBgPaused: initialBgPaused },
        backgrounded: {
          visibilityState: backgroundVis,
          dataBgPaused: backgroundPaused,
          planetStates: backgroundPlanetStates,
        },
        returned: {
          visibilityState: returnedVis,
          dataBgPaused: returnedPaused,
          planetStates: returnedPlanetStates,
        },
      };

      console.log('  H7 Results:', JSON.stringify(sessionResults.H7_real_tab_switch, null, 2));
      await context.close();
    }

    // Write final summary artifact
    fs.writeFileSync(OUT_FILE, JSON.stringify(sessionResults, null, 2));
    console.log(`\n✅ Headed trace summary written to: ${OUT_FILE}`);
  } finally {
    await browser.close();
    server.close();
    console.log('Server and browser closed cleanly.\n');
  }
}

runHeadedHarness().catch(err => {
  console.error('Headed harness execution failed:', err);
  process.exit(1);
});
