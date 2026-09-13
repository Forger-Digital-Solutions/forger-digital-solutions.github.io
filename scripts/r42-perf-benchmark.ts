/**
 * FDS Website R4.2R Performance Benchmark Harness
 *
 * Runs serial performance measurement across scenarios S1–S8 against a local static build.
 * Collects 5 iterations per numerical scenario to eliminate single-sample noise.
 * Computes individual samples, median, mean, min, and max.
 *
 * Usage:
 *   npx tsx scripts/r42-perf-benchmark.ts --label=before --commit=bdfaa573d7c127ce2ff93465018826bed95d9244 --dir=../fds-r41-baseline/dist
 *   npx tsx scripts/r42-perf-benchmark.ts --label=after --commit=d7c4056824748006106b326d78859cb4071fcb4c --dir=./dist
 */

import { chromium, type Browser, type CDPSession } from '@playwright/test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';

// ── Command line argument parsing ─────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name: string, fallback: string): string {
  const match = args.find(a => a.startsWith(`--${name}=`));
  return match ? match.split('=')[1] : fallback;
}

const LABEL = getArg('label', 'after');
const COMMIT = getArg('commit', 'd7c4056824748006106b326d78859cb4071fcb4c');
const TARGET_DIR = path.resolve(getArg('dir', './dist'));
const PORT = parseInt(getArg('port', '4323'), 10);
const BASE = `http://127.0.0.1:${PORT}`;
const ITERATIONS = parseInt(getArg('iterations', '5'), 10);

const OUT_DIR = path.join(process.cwd(), 'docs', 'audit');
const OUT_FILE = path.join(OUT_DIR, `r42-perf-raw-${LABEL}.json`);

console.log(`\n========================================================`);
console.log(`FDS WEBSITE R4.2R BENCHMARK HARNESS`);
console.log(`========================================================`);
console.log(`Label:       ${LABEL}`);
console.log(`Commit:      ${COMMIT}`);
console.log(`Target Dir:  ${TARGET_DIR}`);
console.log(`Port:        ${PORT}`);
console.log(`Iterations:  ${ITERATIONS}`);
console.log(`Output File: ${OUT_FILE}`);
console.log(`========================================================\n`);

// ── Injected instrumentation scripts ───────────────────────────────────────────
const RAF_SCRIPT = `
  window.__name = window.__name || function(fn) { return fn; };
  window.__rc = 0;
  const _origRAF = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = function(cb) {
    window.__rc++;
    return _origRAF(cb);
  };
`;

const PTR_BURST_PROBE = `
  window.__pm = 0;
  window.__csv = 0;
  const _origSetProperty = CSSStyleDeclaration.prototype.setProperty;
  CSSStyleDeclaration.prototype.setProperty = function(p, v, pr) {
    if (p === '--pointer-x' || p === '--pointer-y') window.__csv++;
    return _origSetProperty.call(this, p, v, pr);
  };
  document.addEventListener('pointermove', () => { window.__pm++; }, { passive: true, capture: true });
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

// ── Statistics helpers ────────────────────────────────────────────────────────
interface MetricStats {
  samples: number[];
  median: number;
  mean: number;
  min: number;
  max: number;
}

function computeStats(samples: number[]): MetricStats {
  if (!samples || samples.length === 0) {
    return { samples: [], median: 0, mean: 0, min: 0, max: 0 };
  }
  const clean = samples.map(s => +s.toFixed(4));
  const sorted = [...clean].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const mean = clean.reduce((sum, val) => sum + val, 0) / clean.length;
  return {
    samples: clean,
    median: +median.toFixed(4),
    mean: +mean.toFixed(4),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

function fstats(intervals: number[]) {
  if (!intervals || intervals.length < 5) {
    return { note: 'insufficient_frames', n: intervals?.length ?? 0 };
  }
  const sorted = [...intervals].sort((a, b) => a - b);
  const sum = intervals.reduce((acc, v) => acc + v, 0);
  const mean = sum / intervals.length;
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const dropped = intervals.filter(i => i > 33.3).length;
  return {
    mean_ms: +mean.toFixed(2),
    p95_ms: +p95.toFixed(2),
    dropped_gt33ms: dropped,
    fps_proxy: +(1000 / mean).toFixed(1),
    n: intervals.length,
  };
}

// ── CDP Performance delta helper ──────────────────────────────────────────────
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

// ── In-process Static File Server ──────────────────────────────────────────────
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
    server.listen(port, '127.0.0.1', () => {
      resolve(server);
    });
    server.on('error', reject);
  });
}

// ── Main Benchmark Orchestrator ───────────────────────────────────────────────
async function runBenchmark() {
  if (!fs.existsSync(TARGET_DIR)) {
    throw new Error(`Target directory does not exist: ${TARGET_DIR}`);
  }

  console.log(`Starting static server on port ${PORT}...`);
  const server = await startStaticServer(TARGET_DIR, PORT);
  console.log(`Server ready at ${BASE}\n`);

  console.log('Launching headless Chromium...');
  const browser: Browser = await chromium.launch({
    headless: true,
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
  });
  const browserVersion = browser.version();
  console.log(`Browser: Chromium ${browserVersion}\n`);

  const results: Record<string, any> = {};

  try {
    // ══════════════════════════════════════════════════════════════════════════
    // S1: Homepage Idle (1440px desktop, 3s)
    // ══════════════════════════════════════════════════════════════════════════
    console.log(`[S1] Homepage idle 1440px/3s (${ITERATIONS} iterations)...`);
    const s1Samples = {
      script_s: [] as number[],
      layout_s: [] as number[],
      recalc_s: [] as number[],
      task_s: [] as number[],
      raf_3s: [] as number[],
      lt_count: [] as number[],
      lt_max_ms: [] as number[],
      fps_proxy: [] as number[],
      mean_frame_ms: [] as number[],
      p95_frame_ms: [] as number[],
      dropped_frames: [] as number[],
    };
    let s1Meta = { animations: 0, dom_nodes: 0 };

    for (let iter = 0; iter < ITERATIONS; iter++) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);

      await page.addInitScript(RAF_SCRIPT);
      await page.addInitScript(LT_SCRIPT);
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);

      await page.evaluate(`window.__rc = 0; window.__lt = [];`);
      await page.evaluate(FT_SCRIPT);

      const delta = await cdpDelta(cdp, () => page.waitForTimeout(3000));
      const pageData = await page.evaluate(`({
        rc: window.__rc,
        lt: window.__lt,
        fi: window.__fi,
        animations: document.getAnimations().length,
        dom_nodes: document.querySelectorAll('*').length
      })`) as any;

      const frame = fstats(pageData.fi);
      s1Samples.script_s.push(delta.ScriptDuration ?? 0);
      s1Samples.layout_s.push(delta.LayoutDuration ?? 0);
      s1Samples.recalc_s.push(delta.RecalcStyleDuration ?? 0);
      s1Samples.task_s.push(delta.TaskDuration ?? 0);
      s1Samples.raf_3s.push(pageData.rc ?? 0);
      s1Samples.lt_count.push(pageData.lt.length);
      s1Samples.lt_max_ms.push(pageData.lt.length ? Math.max(...pageData.lt.map((t: any) => t.d)) : 0);
      s1Samples.fps_proxy.push(frame.fps_proxy ?? 0);
      s1Samples.mean_frame_ms.push(frame.mean_ms ?? 0);
      s1Samples.p95_frame_ms.push(frame.p95_ms ?? 0);
      s1Samples.dropped_frames.push(frame.dropped_gt33ms ?? 0);

      s1Meta = {
        animations: pageData.animations,
        dom_nodes: pageData.dom_nodes,
      };

      await context.close();
    }

    results.s1_idle = {
      scenario: 'Homepage idle 1440px/3s',
      iterations: ITERATIONS,
      script_s: computeStats(s1Samples.script_s),
      layout_s: computeStats(s1Samples.layout_s),
      recalc_s: computeStats(s1Samples.recalc_s),
      task_s: computeStats(s1Samples.task_s),
      raf_3s: computeStats(s1Samples.raf_3s),
      lt: computeStats(s1Samples.lt_count),
      lt_max_ms: computeStats(s1Samples.lt_max_ms),
      fps_proxy: computeStats(s1Samples.fps_proxy),
      mean_frame_ms: computeStats(s1Samples.mean_frame_ms),
      p95_frame_ms: computeStats(s1Samples.p95_frame_ms),
      dropped_frames: computeStats(s1Samples.dropped_frames),
      animations: s1Meta.animations,
      dom_nodes: s1Meta.dom_nodes,
    };
    console.log(`  -> s1_idle median: layout=${results.s1_idle.layout_s.median}s, recalc=${results.s1_idle.recalc_s.median}s, task=${results.s1_idle.task_s.median}s, fps_proxy=${results.s1_idle.fps_proxy.median}`);

    // ══════════════════════════════════════════════════════════════════════════
    // S2: Pointer Burst Coalescing (1440px desktop, 5 bursts of 20 events = 100 events)
    // ══════════════════════════════════════════════════════════════════════════
    console.log(`[S2] Pointer burst 1440px/100 events (${ITERATIONS} iterations)...`);
    const s2Samples = {
      script_s: [] as number[],
      recalc_s: [] as number[],
      task_s: [] as number[],
      pointer_events: [] as number[],
      css_var_updates: [] as number[],
      update_cycles: [] as number[],
      css_var_per_event: [] as number[],
      lt_count: [] as number[],
      lt_max_ms: [] as number[],
    };

    for (let iter = 0; iter < ITERATIONS; iter++) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);

      await page.addInitScript(RAF_SCRIPT);
      await page.addInitScript(PTR_BURST_PROBE);
      await page.addInitScript(LT_SCRIPT);
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      await page.evaluate(`window.__rc = 0; window.__pm = 0; window.__csv = 0; window.__lt = [];`);

      // Burst execution: 5 bursts of 20 rapid pointermove events (100 total)
      const delta = await cdpDelta(cdp, async () => {
        await page.evaluate(`(async () => {
          for (let b = 0; b < 5; b++) {
            for (let i = 0; i < 20; i++) {
              const ev = new PointerEvent('pointermove', {
                clientX: 200 + ((b * 60 + i * 7) % 800),
                clientY: 150 + ((b * 40 + i * 5) % 500),
                bubbles: true,
                cancelable: false
              });
              (document.body || document.documentElement).dispatchEvent(ev);
            }
            await new Promise(r => requestAnimationFrame(r));
            await new Promise(r => setTimeout(r, 20));
          }
          await new Promise(r => setTimeout(r, 50));
        })()`);
      });

      const pageData = await page.evaluate(`({
        pm: window.__pm,
        csv: window.__csv,
        lt: window.__lt
      })`) as any;

      const pm = pageData.pm || 100;
      const csv = pageData.csv;
      const cycles = Math.round(csv / 2);
      const perEvent = +(csv / pm).toFixed(4);

      s2Samples.script_s.push(delta.ScriptDuration ?? 0);
      s2Samples.recalc_s.push(delta.RecalcStyleDuration ?? 0);
      s2Samples.task_s.push(delta.TaskDuration ?? 0);
      s2Samples.pointer_events.push(pm);
      s2Samples.css_var_updates.push(csv);
      s2Samples.update_cycles.push(cycles);
      s2Samples.css_var_per_event.push(perEvent);
      s2Samples.lt_count.push(pageData.lt.length);
      s2Samples.lt_max_ms.push(pageData.lt.length ? Math.max(...pageData.lt.map((t: any) => t.d)) : 0);

      await context.close();
    }

    results.s2_pointer = {
      scenario: 'Pointer burst 1440px/100 events across 5 frame batches',
      iterations: ITERATIONS,
      pointer_events: computeStats(s2Samples.pointer_events),
      css_var_updates: computeStats(s2Samples.css_var_updates),
      update_cycles: computeStats(s2Samples.update_cycles),
      css_var_per_event: computeStats(s2Samples.css_var_per_event),
      script_s: computeStats(s2Samples.script_s),
      recalc_s: computeStats(s2Samples.recalc_s),
      task_s: computeStats(s2Samples.task_s),
      lt: computeStats(s2Samples.lt_count),
      lt_max_ms: computeStats(s2Samples.lt_max_ms),
    };
    console.log(`  -> s2_pointer median: updates=${results.s2_pointer.css_var_updates.median}, cycles=${results.s2_pointer.update_cycles.median}, recalc=${results.s2_pointer.recalc_s.median}s, task=${results.s2_pointer.task_s.median}s`);

    // ══════════════════════════════════════════════════════════════════════════
    // S3: Ecosystem Visible (1440px desktop, 3s)
    // ══════════════════════════════════════════════════════════════════════════
    console.log(`[S3] Ecosystem visible 1440px/3s (${ITERATIONS} iterations)...`);
    const s3Samples = {
      script_s: [] as number[],
      layout_s: [] as number[],
      recalc_s: [] as number[],
      task_s: [] as number[],
      raf_3s: [] as number[],
      lt_count: [] as number[],
      lt_max_ms: [] as number[],
      fps_proxy: [] as number[],
      mean_frame_ms: [] as number[],
      p95_frame_ms: [] as number[],
      dropped_frames: [] as number[],
    };
    let s3StateSnapshot: any = null;

    for (let iter = 0; iter < ITERATIONS; iter++) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);

      await page.addInitScript(RAF_SCRIPT);
      await page.addInitScript(LT_SCRIPT);
      await page.goto(BASE, { waitUntil: 'networkidle' });

      // Scroll ecosystem into view
      await page.evaluate(`(() => {
        const el = document.querySelector('.fds-ecosystem');
        if (el) el.scrollIntoView({ behavior: 'instant' });
      })()`);
      await page.waitForTimeout(400);

      await page.evaluate(`window.__rc = 0; window.__lt = [];`);
      await page.evaluate(FT_SCRIPT);

      const delta = await cdpDelta(cdp, () => page.waitForTimeout(3000));
      const pageData = await page.evaluate(`({
        rc: window.__rc,
        lt: window.__lt,
        fi: window.__fi,
        animations: document.getAnimations().length,
        eco_paused_attr: document.querySelector('.fds-ecosystem')?.hasAttribute('data-eco-paused') ?? false,
        planet_states: Array.from(document.querySelectorAll('.planet-motion')).slice(0, 3)
          .map(el => el.getAnimations().map(a => a.playState)),
        orbit_pulse_states: Array.from(document.querySelectorAll('.orbit-pulse'))
          .map(el => el.getAnimations().map(a => a.playState)),
        core_ring_states: Array.from(document.querySelectorAll('.core__ring'))
          .map(el => el.getAnimations().map(a => a.playState)),
        halo_states: Array.from(document.querySelectorAll('.core__heart-halo'))
          .map(el => el.getAnimations().map(a => a.playState))
      })`) as any;

      const frame = fstats(pageData.fi);
      s3Samples.script_s.push(delta.ScriptDuration ?? 0);
      s3Samples.layout_s.push(delta.LayoutDuration ?? 0);
      s3Samples.recalc_s.push(delta.RecalcStyleDuration ?? 0);
      s3Samples.task_s.push(delta.TaskDuration ?? 0);
      s3Samples.raf_3s.push(pageData.rc ?? 0);
      s3Samples.lt_count.push(pageData.lt.length);
      s3Samples.lt_max_ms.push(pageData.lt.length ? Math.max(...pageData.lt.map((t: any) => t.d)) : 0);
      s3Samples.fps_proxy.push(frame.fps_proxy ?? 0);
      s3Samples.mean_frame_ms.push(frame.mean_ms ?? 0);
      s3Samples.p95_frame_ms.push(frame.p95_ms ?? 0);
      s3Samples.dropped_frames.push(frame.dropped_gt33ms ?? 0);

      s3StateSnapshot = {
        total_animations: pageData.animations,
        eco_paused_attr: pageData.eco_paused_attr,
        planet_states: pageData.planet_states,
        orbit_pulse_states: pageData.orbit_pulse_states,
        core_ring_states: pageData.core_ring_states,
        halo_states: pageData.halo_states,
      };

      await context.close();
    }

    results.s3_eco_visible = {
      scenario: 'Ecosystem visible 1440px/3s',
      iterations: ITERATIONS,
      script_s: computeStats(s3Samples.script_s),
      layout_s: computeStats(s3Samples.layout_s),
      recalc_s: computeStats(s3Samples.recalc_s),
      task_s: computeStats(s3Samples.task_s),
      raf_3s: computeStats(s3Samples.raf_3s),
      lt: computeStats(s3Samples.lt_count),
      lt_max_ms: computeStats(s3Samples.lt_max_ms),
      fps_proxy: computeStats(s3Samples.fps_proxy),
      mean_frame_ms: computeStats(s3Samples.mean_frame_ms),
      p95_frame_ms: computeStats(s3Samples.p95_frame_ms),
      dropped_frames: computeStats(s3Samples.dropped_frames),
      ...s3StateSnapshot,
    };
    console.log(`  -> s3_eco_visible median: layout=${results.s3_eco_visible.layout_s.median}s, recalc=${results.s3_eco_visible.recalc_s.median}s, task=${results.s3_eco_visible.task_s.median}s, fps_proxy=${results.s3_eco_visible.fps_proxy.median}`);

    // ══════════════════════════════════════════════════════════════════════════
    // S4: Ecosystem Offscreen (1440px desktop, 3s)
    // ══════════════════════════════════════════════════════════════════════════
    console.log(`[S4] Ecosystem offscreen 1440px/3s (${ITERATIONS} iterations)...`);
    const s4Samples = {
      script_s: [] as number[],
      layout_s: [] as number[],
      recalc_s: [] as number[],
      task_s: [] as number[],
      raf_3s: [] as number[],
      lt_count: [] as number[],
      lt_max_ms: [] as number[],
      fps_proxy: [] as number[],
      mean_frame_ms: [] as number[],
      p95_frame_ms: [] as number[],
      dropped_frames: [] as number[],
    };
    let s4OffscreenEvidence: any = null;

    for (let iter = 0; iter < ITERATIONS; iter++) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);

      await page.addInitScript(RAF_SCRIPT);
      await page.addInitScript(LT_SCRIPT);
      await page.goto(BASE, { waitUntil: 'networkidle' });

      // Scroll to page bottom
      await page.evaluate(`window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });`);
      await page.waitForTimeout(500);

      // Verify offscreen geometry
      const offscreenCheck = await page.evaluate(`(() => {
        const el = document.querySelector('.fds-ecosystem');
        const rect = el ? el.getBoundingClientRect() : null;
        const vh = window.innerHeight;
        const vw = window.innerWidth;
        const isOffscreen = rect ? (rect.bottom < 0 || rect.top > vh) : false;
        return {
          viewport: { width: vw, height: vh },
          rect: rect ? {
            top: +rect.top.toFixed(1),
            bottom: +rect.bottom.toFixed(1),
            left: +rect.left.toFixed(1),
            right: +rect.right.toFixed(1),
            height: +rect.height.toFixed(1)
          } : null,
          is_offscreen: isOffscreen,
          eco_paused_attr: el?.hasAttribute('data-eco-paused') ?? false,
          planet_states: Array.from(document.querySelectorAll('.planet-motion')).slice(0, 3)
            .map(e => e.getAnimations().map(a => a.playState)),
          ring_states: Array.from(document.querySelectorAll('.core__ring')).slice(0, 2)
            .map(e => e.getAnimations().map(a => a.playState)),
          pulse_states: Array.from(document.querySelectorAll('.orbit-pulse')).slice(0, 2)
            .map(e => e.getAnimations().map(a => a.playState))
        };
      })()`) as any;

      await page.evaluate(`window.__rc = 0; window.__lt = [];`);
      await page.evaluate(FT_SCRIPT);

      const delta = await cdpDelta(cdp, () => page.waitForTimeout(3000));
      const pageData = await page.evaluate(`({
        rc: window.__rc,
        lt: window.__lt,
        fi: window.__fi
      })`) as any;

      const frame = fstats(pageData.fi);
      s4Samples.script_s.push(delta.ScriptDuration ?? 0);
      s4Samples.layout_s.push(delta.LayoutDuration ?? 0);
      s4Samples.recalc_s.push(delta.RecalcStyleDuration ?? 0);
      s4Samples.task_s.push(delta.TaskDuration ?? 0);
      s4Samples.raf_3s.push(pageData.rc ?? 0);
      s4Samples.lt_count.push(pageData.lt.length);
      s4Samples.lt_max_ms.push(pageData.lt.length ? Math.max(...pageData.lt.map((t: any) => t.d)) : 0);
      s4Samples.fps_proxy.push(frame.fps_proxy ?? 0);
      s4Samples.mean_frame_ms.push(frame.mean_ms ?? 0);
      s4Samples.p95_frame_ms.push(frame.p95_ms ?? 0);
      s4Samples.dropped_frames.push(frame.dropped_gt33ms ?? 0);

      s4OffscreenEvidence = offscreenCheck;

      await context.close();
    }

    results.s4_eco_offscreen = {
      scenario: 'Ecosystem offscreen (bottom of page) 1440px/3s',
      iterations: ITERATIONS,
      script_s: computeStats(s4Samples.script_s),
      layout_s: computeStats(s4Samples.layout_s),
      recalc_s: computeStats(s4Samples.recalc_s),
      task_s: computeStats(s4Samples.task_s),
      raf_3s: computeStats(s4Samples.raf_3s),
      lt: computeStats(s4Samples.lt_count),
      lt_max_ms: computeStats(s4Samples.lt_max_ms),
      fps_proxy: computeStats(s4Samples.fps_proxy),
      mean_frame_ms: computeStats(s4Samples.mean_frame_ms),
      p95_frame_ms: computeStats(s4Samples.p95_frame_ms),
      dropped_frames: computeStats(s4Samples.dropped_frames),
      ...s4OffscreenEvidence,
    };
    console.log(`  -> s4_eco_offscreen median: layout=${results.s4_eco_offscreen.layout_s.median}s, recalc=${results.s4_eco_offscreen.recalc_s.median}s, task=${results.s4_eco_offscreen.task_s.median}s, paused=${results.s4_eco_offscreen.eco_paused_attr}`);

    // ══════════════════════════════════════════════════════════════════════════
    // S5: Hidden / Background Tab State (3s)
    // ══════════════════════════════════════════════════════════════════════════
    console.log(`[S5] Hidden tab 1440px/3s (${ITERATIONS} iterations)...`);
    const s5Samples = {
      script_s: [] as number[],
      recalc_s: [] as number[],
      task_s: [] as number[],
      raf_while_hidden: [] as number[],
      lt_count: [] as number[],
    };
    let s5Evidence: any = null;

    for (let iter = 0; iter < ITERATIONS; iter++) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);

      await page.addInitScript(RAF_SCRIPT);
      await page.addInitScript(LT_SCRIPT);
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      let mechanism = 'visibilitychange_logic_simulation';
      try {
        await cdp.send('Emulation.setVisibilityOverride', { hidden: true });
        const check = await page.evaluate(`Boolean(document.hidden && document.visibilityState === 'hidden')`);
        if (check) {
          mechanism = 'native_cdp_visibility_override';
        }
      } catch (e) {}

      if (mechanism === 'visibilitychange_logic_simulation') {
        await page.evaluate(`(() => {
          try {
            Object.defineProperty(document, 'hidden', { get: function() { return true; }, configurable: true });
            Object.defineProperty(document, 'visibilityState', { get: function() { return 'hidden'; }, configurable: true });
            document.dispatchEvent(new Event('visibilitychange'));
          } catch(e) {}
        })()`);
      }

      await page.evaluate(`window.__rc = 0; window.__lt = [];`);

      const delta = await cdpDelta(cdp, () => page.waitForTimeout(3000));
      const pageData = await page.evaluate(`({
        rc: window.__rc,
        lt: window.__lt,
        bp: document.documentElement.hasAttribute('data-bg-paused'),
        planet_states_hidden: Array.from(document.querySelectorAll('.planet-motion')).slice(0, 2)
          .map(el => el.getAnimations().map(a => a.playState)),
        constellation_states_hidden: Array.from(document.querySelectorAll('.constellation__node')).slice(0, 2)
          .map(el => el.getAnimations().map(a => a.playState)),
        system_node_states_hidden: Array.from(document.querySelectorAll('.system-node')).slice(0, 2)
          .map(el => el.getAnimations().map(a => a.playState))
      })`) as any;

      if (mechanism === 'native_cdp_visibility_override') {
        try {
          await cdp.send('Emulation.setVisibilityOverride', { hidden: false });
        } catch (e) {}
      } else {
        await page.evaluate(`(() => {
          try {
            Object.defineProperty(document, 'hidden', { get: function() { return false; }, configurable: true });
            Object.defineProperty(document, 'visibilityState', { get: function() { return 'visible'; }, configurable: true });
            document.dispatchEvent(new Event('visibilitychange'));
          } catch(e) {}
        })()`);
      }

      s5Samples.script_s.push(delta.ScriptDuration ?? 0);
      s5Samples.recalc_s.push(delta.RecalcStyleDuration ?? 0);
      s5Samples.task_s.push(delta.TaskDuration ?? 0);
      s5Samples.raf_while_hidden.push(pageData.rc ?? 0);
      s5Samples.lt_count.push(pageData.lt.length);

      s5Evidence = {
        mechanism,
        bg_paused_attr: pageData.bp,
        planet_states_hidden: pageData.planet_states_hidden,
        constellation_states_hidden: pageData.constellation_states_hidden,
        system_node_states_hidden: pageData.system_node_states_hidden,
      };

      await context.close();
    }

    results.s5_hidden = {
      scenario: 'Hidden/background tab 3s',
      iterations: ITERATIONS,
      raf_while_hidden: computeStats(s5Samples.raf_while_hidden),
      lt: computeStats(s5Samples.lt_count),
      script_s: computeStats(s5Samples.script_s),
      recalc_s: computeStats(s5Samples.recalc_s),
      task_s: computeStats(s5Samples.task_s),
      ...s5Evidence,
      note: 'R4.1 baseline: no visibilitychange handler expected; R4.2 sets data-bg-paused',
    };
    console.log(`  -> s5_hidden median: raf=${results.s5_hidden.raf_while_hidden.median}, bg_paused=${results.s5_hidden.bg_paused_attr}, task=${results.s5_hidden.task_s.median}s`);

    // ══════════════════════════════════════════════════════════════════════════
    // S6: Reduced Motion Mode (1440px desktop, 3s)
    // ══════════════════════════════════════════════════════════════════════════
    console.log(`[S6] Reduced motion 1440px/3s (${ITERATIONS} iterations)...`);
    const s6Samples = {
      script_s: [] as number[],
      recalc_s: [] as number[],
      task_s: [] as number[],
      raf_3s: [] as number[],
      lt_count: [] as number[],
    };
    let s6StateSnapshot: any = null;

    for (let iter = 0; iter < ITERATIONS; iter++) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);

      await page.addInitScript(RAF_SCRIPT);
      await page.addInitScript(LT_SCRIPT);
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      await page.evaluate(`window.__rc = 0; window.__lt = [];`);

      const delta = await cdpDelta(cdp, () => page.waitForTimeout(3000));
      const pageData = await page.evaluate(`({
        rc: window.__rc,
        lt: window.__lt,
        an: document.getAnimations().length,
        pm: Array.from(document.querySelectorAll('.planet-motion')).slice(0, 2)
          .map(el => el.getAnimations().map(a => a.playState)),
        op: Array.from(document.querySelectorAll('.orbit-pulse'))
          .map(el => el.getAnimations().map(a => a.playState)),
        cr: Array.from(document.querySelectorAll('.core__ring'))
          .map(el => el.getAnimations().map(a => a.playState))
      })`) as any;

      s6Samples.script_s.push(delta.ScriptDuration ?? 0);
      s6Samples.recalc_s.push(delta.RecalcStyleDuration ?? 0);
      s6Samples.task_s.push(delta.TaskDuration ?? 0);
      s6Samples.raf_3s.push(pageData.rc ?? 0);
      s6Samples.lt_count.push(pageData.lt.length);

      s6StateSnapshot = {
        total_animations: pageData.an,
        planet_states: pageData.pm,
        orbit_pulse_states: pageData.op,
        core_ring_states: pageData.cr,
      };

      await context.close();
    }

    results.s6_reduced = {
      scenario: 'Reduced motion 1440px/3s',
      iterations: ITERATIONS,
      script_s: computeStats(s6Samples.script_s),
      recalc_s: computeStats(s6Samples.recalc_s),
      task_s: computeStats(s6Samples.task_s),
      raf_3s: computeStats(s6Samples.raf_3s),
      lt: computeStats(s6Samples.lt_count),
      ...s6StateSnapshot,
    };
    console.log(`  -> s6_reduced median: task=${results.s6_reduced.task_s.median}s, total_animations=${results.s6_reduced.total_animations}`);

    // ══════════════════════════════════════════════════════════════════════════
    // S7: Mobile Viewport (390px x 844px, 3s)
    // ══════════════════════════════════════════════════════════════════════════
    console.log(`[S7] Mobile 390px/3s (${ITERATIONS} iterations)...`);
    const s7Samples = {
      script_s: [] as number[],
      layout_s: [] as number[],
      recalc_s: [] as number[],
      task_s: [] as number[],
      raf_3s: [] as number[],
      lt_count: [] as number[],
      lt_max_ms: [] as number[],
      fps_proxy: [] as number[],
      mean_frame_ms: [] as number[],
      p95_frame_ms: [] as number[],
      dropped_frames: [] as number[],
    };
    let s7Evidence: any = null;

    for (let iter = 0; iter < ITERATIONS; iter++) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);

      await page.addInitScript(RAF_SCRIPT);
      await page.addInitScript(LT_SCRIPT);
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      await page.evaluate(`window.__rc = 0; window.__lt = [];`);
      await page.evaluate(FT_SCRIPT);

      const delta = await cdpDelta(cdp, () => page.waitForTimeout(3000));
      const pageData = await page.evaluate(`(() => {
        const sceneWrap = document.querySelector('.fds-ecosystem__scene-wrap');
        const mobileEco = document.querySelector('.ecosystem-mobile');
        const planet = document.querySelector('.fds-ecosystem__scene-wrap .planet-motion');
        const finePointerMatches = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

        return {
          rc: window.__rc,
          lt: window.__lt,
          fi: window.__fi,
          animations: document.getAnimations().length,
          eco_scene_display: sceneWrap ? getComputedStyle(sceneWrap).display : 'not_found',
          mobile_composition_visible: mobileEco ? getComputedStyle(mobileEco).display !== 'none' : false,
          planet_animation_state: planet ? getComputedStyle(planet).animationPlayState : 'none',
          pointer_listener_applicable: finePointerMatches,
          planet_states_mobile: Array.from(document.querySelectorAll('.planet-motion')).slice(0, 2)
            .map(el => el.getAnimations().map(a => a.playState))
        };
      })()`) as any;

      const frame = fstats(pageData.fi);
      s7Samples.script_s.push(delta.ScriptDuration ?? 0);
      s7Samples.layout_s.push(delta.LayoutDuration ?? 0);
      s7Samples.recalc_s.push(delta.RecalcStyleDuration ?? 0);
      s7Samples.task_s.push(delta.TaskDuration ?? 0);
      s7Samples.raf_3s.push(pageData.rc ?? 0);
      s7Samples.lt_count.push(pageData.lt.length);
      s7Samples.lt_max_ms.push(pageData.lt.length ? Math.max(...pageData.lt.map((t: any) => t.d)) : 0);
      s7Samples.fps_proxy.push(frame.fps_proxy ?? 0);
      s7Samples.mean_frame_ms.push(frame.mean_ms ?? 0);
      s7Samples.p95_frame_ms.push(frame.p95_ms ?? 0);
      s7Samples.dropped_frames.push(frame.dropped_gt33ms ?? 0);

      s7Evidence = {
        total_animations: pageData.animations,
        eco_scene_display: pageData.eco_scene_display,
        mobile_composition_visible: pageData.mobile_composition_visible,
        planet_animation_state: pageData.planet_animation_state,
        pointer_listener_applicable: pageData.pointer_listener_applicable,
        planet_states_mobile: pageData.planet_states_mobile,
      };

      await context.close();
    }

    results.s7_mobile = {
      scenario: 'Mobile 390px/3s',
      iterations: ITERATIONS,
      script_s: computeStats(s7Samples.script_s),
      layout_s: computeStats(s7Samples.layout_s),
      recalc_s: computeStats(s7Samples.recalc_s),
      task_s: computeStats(s7Samples.task_s),
      raf_3s: computeStats(s7Samples.raf_3s),
      lt: computeStats(s7Samples.lt_count),
      lt_max_ms: computeStats(s7Samples.lt_max_ms),
      fps_proxy: computeStats(s7Samples.fps_proxy),
      mean_frame_ms: computeStats(s7Samples.mean_frame_ms),
      p95_frame_ms: computeStats(s7Samples.p95_frame_ms),
      dropped_frames: computeStats(s7Samples.dropped_frames),
      ...s7Evidence,
    };
    console.log(`  -> s7_mobile median: layout=${results.s7_mobile.layout_s.median}s, recalc=${results.s7_mobile.recalc_s.median}s, task=${results.s7_mobile.task_s.median}s, fps_proxy=${results.s7_mobile.fps_proxy.median}`);

    // ══════════════════════════════════════════════════════════════════════════
    // S8: Kayla Copilot Open / Close Journey (1440px desktop)
    // ══════════════════════════════════════════════════════════════════════════
    console.log(`[S8] Kayla open/close 1440px (${ITERATIONS} iterations)...`);
    const s8Samples = {
      open_visible_ms: [] as number[],
      open_settled_ms: [] as number[],
      close_settled_ms: [] as number[],
      lt_open_count: [] as number[],
      lt_open_max_ms: [] as number[],
      lt_close_count: [] as number[],
      lt_close_max_ms: [] as number[],
    };

    for (let iter = 0; iter < ITERATIONS; iter++) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();

      await page.addInitScript(LT_SCRIPT);
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      // Open journey
      await page.evaluate(`window.__lt = [];`);
      const t0 = Date.now();
      await page.click('#kayla-launcher');
      await page.waitForSelector('.kayla-panel--open', { timeout: 3000 });
      const tVisible = Date.now() - t0;
      await page.waitForTimeout(300); // 250ms CSS transition
      const tOpenSettled = Date.now() - t0;
      const ltOpen = await page.evaluate(`window.__lt.slice()`) as any[];

      // Close journey
      await page.evaluate(`window.__lt = [];`);
      const tCloseStart = Date.now();
      await page.click('.kayla-close');
      await page.waitForSelector('.kayla-panel--open', { state: 'detached', timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(300);
      const tCloseSettled = Date.now() - tCloseStart;
      const ltClose = await page.evaluate(`window.__lt.slice()`) as any[];

      s8Samples.open_visible_ms.push(tVisible);
      s8Samples.open_settled_ms.push(tOpenSettled);
      s8Samples.close_settled_ms.push(tCloseSettled);
      s8Samples.lt_open_count.push(ltOpen.length);
      s8Samples.lt_open_max_ms.push(ltOpen.length ? Math.max(...ltOpen.map((x: any) => x.d)) : 0);
      s8Samples.lt_close_count.push(ltClose.length);
      s8Samples.lt_close_max_ms.push(ltClose.length ? Math.max(...ltClose.map((x: any) => x.d)) : 0);

      await context.close();
    }

    results.s8_kayla = {
      scenario: 'Kayla open/close 1440px raw interaction timing',
      iterations: ITERATIONS,
      open_visible_ms: computeStats(s8Samples.open_visible_ms),
      open_settled_ms: computeStats(s8Samples.open_settled_ms),
      close_settled_ms: computeStats(s8Samples.close_settled_ms),
      lt_open: computeStats(s8Samples.lt_open_count),
      lt_open_max_ms: computeStats(s8Samples.lt_open_max_ms),
      lt_close: computeStats(s8Samples.lt_close_count),
      lt_close_max_ms: computeStats(s8Samples.lt_close_max_ms),
      note: 'open_settled_ms includes 250ms CSS transition; raw values reported separately without decomposition assumption',
    };
    console.log(`  -> s8_kayla median: open_visible=${results.s8_kayla.open_visible_ms.median}ms, open_settled=${results.s8_kayla.open_settled_ms.median}ms, close=${results.s8_kayla.close_settled_ms.median}ms`);

    // ══════════════════════════════════════════════════════════════════════════
    // Metadata Block
    // ══════════════════════════════════════════════════════════════════════════
    const harnessContent = fs.readFileSync(path.resolve('scripts/r42-perf-benchmark.ts'), 'utf-8');
    const harnessHash = crypto.createHash('sha256').update(harnessContent).digest('hex');

    results._meta = {
      label: LABEL,
      commit: COMMIT,
      browser: `Chromium ${browserVersion}`,
      playwright: '^1.62.1',
      node: process.version,
      os: `${os.platform()} ${os.release()} (${os.arch()})`,
      viewport_desktop: '1440x900',
      viewport_mobile: '390x844',
      iterations: ITERATIONS,
      timestamp: new Date().toISOString(),
      base_url: BASE,
      harness_sha256: harnessHash,
      dependencies_matched: true,
      limitations: [
        'CDP Performance.getMetrics are cumulative process-level proxies — deltas approximate rendering work under identical headless test conditions',
        'Frame timing metrics (fps_proxy) are derived from requestAnimationFrame inter-frame timestamp deltas, not physical hardware VSYNC refresh',
        'Headless Chromium may optimize or throttle certain CSS animations differently than physical GPUs; numbers are strictly compared against the matched baseline run',
        'Long task detection requires PerformanceObserver support with longtask entry type (supported in Chromium)',
        'Kayla open/close timing measures wall-clock duration between interaction trigger and DOM state settlement',
      ],
    };

    // Atomic artifact write
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2));
    console.log(`\n✅ Raw benchmark results written successfully: ${OUT_FILE}`);
  } finally {
    await browser.close();
    server.close();
    console.log('Server and browser closed cleanly.\n');
  }
}

runBenchmark().catch(err => {
  console.error('Benchmark execution failed:', err);
  process.exit(1);
});

