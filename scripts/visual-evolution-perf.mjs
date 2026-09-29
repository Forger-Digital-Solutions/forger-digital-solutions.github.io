import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const arg = (name, fallback) => {
  const entry = process.argv.find((value) => value.startsWith(`--${name}=`));
  return entry ? entry.slice(name.length + 3) : fallback;
};
const base = arg('url', 'http://127.0.0.1:4321').replace(/\/$/, '');
const out = resolve(arg('out', '.visual-audit/performance.json'));
const idleMs = Number(arg('idle', '2500'));
const traceMs = Number(arg('trace', '2000'));
const settleMs = Number(arg('settle', '1000'));
const iterations = Number(arg('iterations', '1'));
const scenarios = [
  { name: 'homepage-hero', path: '/', selector: '.hero' },
  { name: 'homepage-ecosystem', path: '/', selector: '.fds-ecosystem' },
  { name: 'gems', path: '/', selector: '.gems-system' },
  { name: 'kayla-closed', path: '/', selector: '.hero' },
  { name: 'kayla-open', path: '/', selector: '.hero', openKayla: true },
  { name: 'kayla-streaming', path: '/', selector: '.hero', openKayla: true, streaming: true },
];
const traceCategories = ['devtools.timeline', 'v8.execute', 'disabled-by-default-devtools.timeline', 'blink.user_timing'];
const tracked = ['RasterTask', 'Paint', 'ImageDecodeTask', 'UpdateLayoutTree', 'Layerize', 'Commit', 'UpdateLayer'];
const initScript = `window.__visualLongTasks=[];try{new PerformanceObserver(list=>{for(const entry of list.getEntries())window.__visualLongTasks.push(entry.duration)}).observe({entryTypes:['longtask']})}catch(_){}`;
const round = (value) => Number((value || 0).toFixed(2));
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return round(sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2);
};

async function getTrace(cdp, during) {
  const events = [];
  const onData = (packet) => events.push(...packet.value);
  cdp.on('Tracing.dataCollected', onData);
  const done = new Promise((resolveDone) => cdp.once('Tracing.tracingComplete', resolveDone));
  await cdp.send('Tracing.start', { traceConfig: { includedCategories: traceCategories } });
  if (during) await during();
  await new Promise((resolveWait) => setTimeout(resolveWait, traceMs));
  await cdp.send('Tracing.end');
  await done;
  cdp.off('Tracing.dataCollected', onData);
  const byName = Object.fromEntries(tracked.map((name) => [name, { count: 0, ms: 0 }]));
  for (const event of events) {
    if (byName[event.name] && event.ph === 'X') {
      byName[event.name].count += 1;
      byName[event.name].ms += (event.dur || 0) / 1000;
    }
  }
  for (const name of tracked) byName[name].ms = round(byName[name].ms);
  return byName;
}

const browser = await chromium.launch({ headless: true });
const results = { meta: { url: base, chromium: browser.version(), viewport: '1440x900', idleMs, traceMs, settleMs, iterations, capturedAt: new Date().toISOString() }, scenarios: {} };
try {
  for (const scenario of scenarios) {
    const runs = [];
    for (let iteration = 0; iteration < iterations; iteration += 1) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await page.addInitScript(initScript);
      await cdp.send('Performance.enable');
      if (scenario.streaming) {
        await page.route('**/api/kayla/health*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) }));
        await page.addInitScript(() => {
          const nativeFetch = window.fetch.bind(window);
          window.fetch = (input, init) => {
            if (!String(input).includes('/api/kayla/chat')) return nativeFetch(input, init);
            const encoder = new TextEncoder();
            const chunks = [
              'A local browser profile ', 'is measuring incremental ', 'NDJSON transcript updates ',
              'during a mock stream, ', 'without contacting a live model.'
            ].map((content) => JSON.stringify({ content, mode: 'ai', routeMode: 'general' }) + '\n');
            chunks.push(JSON.stringify({ done: true, mode: 'ai', routeMode: 'general' }) + '\n');
            let index = 0;
            const body = new ReadableStream({
              async pull(controller) {
                if (index >= chunks.length) { controller.close(); return; }
                controller.enqueue(encoder.encode(chunks[index++]));
                await new Promise((resolveWait) => setTimeout(resolveWait, 500));
              }
            });
            return Promise.resolve(new Response(body, { status: 200, headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' } }));
          };
        });
      }
      await page.goto(`${base}${scenario.path}`, { waitUntil: 'load', timeout: 60000 });
      try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch {}
      const target = page.locator(scenario.selector).first();
      await target.waitFor({ state: 'visible', timeout: 10000 });
      await target.evaluate((el) => el.scrollIntoView({ behavior: 'instant', block: 'center' }));
      if (scenario.openKayla) {
        await page.locator('#kayla-launcher').click();
        await page.locator('.kayla-panel--open').waitFor({ state: 'visible', timeout: 5000 });
      }
      if (scenario.streaming) await page.locator('#kayla-input').fill('Give me a short streaming performance sample.');
      await page.waitForTimeout(settleMs);
      await page.evaluate(() => { window.__visualLongTasks = []; });
      const before = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((metric) => [metric.name, metric.value]));
      const animationsBefore = await page.evaluate(() => {
        const entries = document.getAnimations?.() || [];
        return { total: entries.length, running: entries.filter((animation) => animation.playState === 'running').length, paused: entries.filter((animation) => animation.playState === 'paused').length };
      });
      let trace;
      if (scenario.streaming) {
        trace = await getTrace(cdp, async () => {
          await page.locator('#kayla-send').click();
          await page.locator('.kayla-msg--streaming').waitFor({ state: 'visible', timeout: 5000 });
        });
        await page.locator('.kayla-msg--streaming').waitFor({ state: 'detached', timeout: 10000 });
        await page.waitForTimeout(settleMs);
      } else {
        await page.waitForTimeout(idleMs);
        trace = await getTrace(cdp);
      }
      const after = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((metric) => [metric.name, metric.value]));
      const longTasks = await page.evaluate(() => window.__visualLongTasks);
      const heap = await cdp.send('Runtime.getHeapUsage').catch(() => ({ usedSize: 0, totalSize: 0 }));
      const animationsAfter = await page.evaluate(() => {
        const entries = document.getAnimations?.() || [];
        return { total: entries.length, running: entries.filter((animation) => animation.playState === 'running').length, paused: entries.filter((animation) => animation.playState === 'paused').length };
      });
      runs.push({
        loadMs: 0,
        metrics: Object.fromEntries(['TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration'].map((key) => [key, round(after[key] - before[key])])),
        longTasks: { count: longTasks.length, totalMs: round(longTasks.reduce((sum, duration) => sum + duration, 0)), maxMs: round(Math.max(0, ...longTasks)) },
        animationsBefore, animationsAfter,
        heapBytes: heap.usedSize,
        trace,
      });
      await cdp.detach().catch(() => {});
      await context.close();
    }
    const medianOf = (read) => median(runs.map(read));
    results.scenarios[scenario.name] = {
      iterations: runs.length,
      median: {
        TaskDuration_s: medianOf((run) => run.metrics.TaskDuration),
        ScriptDuration_s: medianOf((run) => run.metrics.ScriptDuration),
        LayoutDuration_s: medianOf((run) => run.metrics.LayoutDuration),
        RecalcStyleDuration_s: medianOf((run) => run.metrics.RecalcStyleDuration),
        RasterTask_ms: medianOf((run) => run.trace.RasterTask.ms),
        RasterTask_calls: medianOf((run) => run.trace.RasterTask.count),
        Paint_ms: medianOf((run) => run.trace.Paint.ms),
        Paint_calls: medianOf((run) => run.trace.Paint.count),
        ImageDecodeTask_calls: medianOf((run) => run.trace.ImageDecodeTask.count),
        longTaskCount: medianOf((run) => run.longTasks.count),
        longTaskTotalMs: medianOf((run) => run.longTasks.totalMs),
        longTaskMaxMs: medianOf((run) => run.longTasks.maxMs),
        runningAnimations: medianOf((run) => run.animationsAfter.running),
        totalAnimations: medianOf((run) => run.animationsAfter.total),
        heapMB: medianOf((run) => run.heapBytes / (1024 * 1024)),
      },
      raw: runs,
    };
    const m = results.scenarios[scenario.name].median;
    console.log(`${scenario.name}: TaskDuration=${m.TaskDuration_s}s RasterTask=${m.RasterTask_ms}ms/${m.RasterTask_calls} Paint=${m.Paint_ms}ms/${m.Paint_calls} ImageDecode=${m.ImageDecodeTask_calls} longTasks=${m.longTaskCount} animations=${m.runningAnimations}/${m.totalAnimations} heap=${m.heapMB}MB`);
  }
} finally {
  await browser.close();
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(results, null, 2));
console.log(`Wrote ${out}`);
