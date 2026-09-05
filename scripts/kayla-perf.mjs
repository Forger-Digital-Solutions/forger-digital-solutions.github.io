#!/usr/bin/env node
/**
 * Phase 12 local performance harness — repeatable, offline, zero provider quota.
 *
 *   npm run kayla:perf                  # summary table (15 samples per question)
 *   npm run kayla:perf -- --samples=5   # faster local run
 *   node scripts/kayla-perf.mjs --json  # machine-readable result for the receipt
 *
 * Measures handleKaylaChat end-to-end (validation + task plan + retrieval +
 * routing + verification) WITHOUT contacting any provider: deterministic,
 * retrieval, and task questions run with the provider disabled; provider-lane
 * questions run against the in-process mock provider so no shared daily
 * allowance is spent and no network timing pollutes the numbers.
 *
 * Request classes are reported separately (never averaged together): a fast
 * deterministic answer must not hide behind provider-lane latency statistics.
 * Percentiles are only meaningful with enough samples — p95 is reported when
 * a class has >= 20 samples, otherwise min/median/max only.
 */
import path from 'node:path';
import process from 'node:process';
import { createServer } from 'vite';

const root = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const asJson = args.includes('--json');
const samplesArg = args.find((a) => a.startsWith('--samples='));
const SAMPLES = Math.max(3, Math.min(50, parseInt(samplesArg?.split('=')[1] || '15', 10) || 15));

// Representative questions per Phase 12 Part 5. Expected classes are labels for
// the report — every sample is bucketed by its ACTUAL measured routeMode.
const CORPUS = [
  { label: 'deterministic', message: 'Who founded FDS?' },
  { label: 'deterministic', message: 'Can I download KyraBlox?' },
  { label: 'deterministic', message: 'What does CodeForge cost?' },
  { label: 'task', message: "I'm a developer. Where should I start?" },
  { label: 'task', message: 'What can I actually download?' },
  { label: 'task', message: 'How can I support FDS?' },
  { label: 'retrieval', message: 'What AI work is FDS doing?' },
  // Routes `retrieval` (entity-match over site content, no settled canonical
  // answer): keeps the RETRIEVAL class populated with a genuine sample.
  { label: 'retrieval', message: 'What community resources exist?' },
  { label: 'provider', message: 'Give me a short overview of how the FDS ecosystem fits together.' }
];

/**
 * Internal budgets (ms), set from measured local behavior with headroom — not
 * aspirational targets. Purpose is regression detection: if a future refactor
 * pushes deterministic answers toward seconds, this harness should notice.
 * Wall-clock on shared CI runners is noisy, so these are advisory here and
 * enforced only via --check-budgets on a controlled machine.
 */
const BUDGETS_MS = {
  DETERMINISTIC: 250,
  TASK_PLAN: 250,
  RETRIEVAL: 250,
  PROVIDER_ACCEPTED_MOCK: 500,
  PROVIDER_FALLBACK: 500,
  RATE_LIMITED: 100,
  INVALID_REQUEST: 100
};

function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const pick = (q) => sorted[Math.min(n - 1, Math.floor(q * n))];
  return {
    samples: n,
    min: Math.round(sorted[0] * 100) / 100,
    median: Math.round(pick(0.5) * 100) / 100,
    max: Math.round(sorted[n - 1] * 100) / 100,
    p95: n >= 20 ? Math.round(pick(0.95) * 100) / 100 : null
  };
}

const vite = await createServer({ root, appType: 'custom', server: { middlewareMode: true }, logLevel: 'silent' });
let exitCode = 0;
try {
  const [{ handleKaylaChat }, { createKaylaConfig }] = await Promise.all([
    vite.ssrLoadModule('/src/lib/kayla/handler.ts'),
    vite.ssrLoadModule('/src/lib/kayla/config.ts')
  ]);

  const offlineConfig = { ...createKaylaConfig({}), enabled: false, provider: '', rateLimitPerMinute: 10_000 };
  const offlineEndpoint = (diagnostics) => ({
    providerConfig: { provider: '' },
    kaylaConfig: offlineConfig,
    consumeRequestAllowance: async () => true,
    consumeAIAllowance: async () => false,
    onDiagnostics: (d) => diagnostics.push(d)
  });
  // Mock provider exercises the real provider lane (prompt build, call,
  // verification, action shaping) with zero network and zero budget spend.
  const mockConfig = { ...createKaylaConfig({}), enabled: true, provider: 'mock', model: 'mock', apiKey: 'test', rateLimitPerMinute: 10_000 };
  const mockEndpoint = (diagnostics) => ({
    providerConfig: { provider: 'mock' },
    kaylaConfig: mockConfig,
    consumeRequestAllowance: async () => true,
    consumeAIAllowance: async () => true,
    onDiagnostics: (d) => diagnostics.push(d)
  });

  const buckets = new Map(); // class -> { durations, questions, routes }
  const record = (cls, ms, question, route) => {
    if (!buckets.has(cls)) buckets.set(cls, { durations: [], questions: new Set(), routes: new Set() });
    const b = buckets.get(cls);
    b.durations.push(ms);
    b.questions.add(question);
    if (route) b.routes.add(route);
  };

  for (const item of CORPUS) {
    const useMock = item.label === 'provider';
    // Warmup: caches, lazy indexes, and JIT settle before timing starts.
    for (let i = 0; i < 2; i++) {
      const diagnostics = [];
      await handleKaylaChat({ message: item.message }, useMock ? mockEndpoint(diagnostics) : offlineEndpoint(diagnostics));
    }
    for (let i = 0; i < SAMPLES; i++) {
      const diagnostics = [];
      const start = performance.now();
      const { status, response } = await handleKaylaChat({ message: item.message }, useMock ? mockEndpoint(diagnostics) : offlineEndpoint(diagnostics));
      const ms = performance.now() - start;
      if (status !== 200) throw new Error(`perf harness got status ${status} for "${item.message}": ${response.error}`);
      const route = response.routeMode || 'unknown';
      const goal = diagnostics[0]?.goal;
      const goalGuided = Boolean(goal && goal !== 'unknown');
      // Primary bucket is the actual serving lane (never averaged together).
      // TASK_PLAN is reported as an additional subset row: goal-guided local
      // answers (deterministic or retrieval) that went through task planning.
      let cls;
      if (route === 'provider_accepted') cls = 'PROVIDER_ACCEPTED_MOCK';
      else if (route === 'provider_failed_fallback' || route === 'provider_replaced') cls = 'PROVIDER_FALLBACK';
      else if (route === 'deterministic') cls = 'DETERMINISTIC';
      else if (route === 'retrieval' || route === 'no_results') cls = 'RETRIEVAL';
      else cls = route.toUpperCase();
      record(cls, ms, item.message, route);
      if (goalGuided && (cls === 'DETERMINISTIC' || cls === 'RETRIEVAL')) {
        record('TASK_PLAN', ms, item.message, `${route}+goal:${goal}`);
      }
    }
  }

  // Control classes: rate-limited and invalid requests (cheap by construction).
  {
    const durations = [];
    for (let i = 0; i < SAMPLES; i++) {
      const start = performance.now();
      const { status } = await handleKaylaChat({ message: 'Who founded FDS?' }, {
        providerConfig: { provider: '' }, kaylaConfig: offlineConfig, consumeRequestAllowance: async () => false
      });
      durations.push(performance.now() - start);
      if (status !== 429) throw new Error(`expected 429, got ${status}`);
    }
    for (const d of durations) record('RATE_LIMITED', d, '(rate-limited control)', 'rate_limited');
  }
  {
    const durations = [];
    for (let i = 0; i < SAMPLES; i++) {
      const diagnostics = [];
      const start = performance.now();
      const { status } = await handleKaylaChat({ message: '' }, offlineEndpoint(diagnostics));
      durations.push(performance.now() - start);
      if (status !== 400) throw new Error(`expected 400, got ${status}`);
    }
    for (const d of durations) record('INVALID_REQUEST', d, '(invalid control)', 'validation_error');
  }

  const rows = [...buckets.entries()].map(([cls, b]) => ({ class: cls, ...stats(b.durations), questions: b.questions.size, budgetMs: BUDGETS_MS[cls] ?? null }));
  rows.sort((a, b) => a.class.localeCompare(b.class));

  const checkBudgets = args.includes('--check-budgets');
  let budgetFailures = 0;
  for (const row of rows) {
    row.budgetResult = row.budgetMs == null ? 'n/a' : (row.median <= row.budgetMs ? 'PASS' : 'FAIL');
    if (row.budgetResult === 'FAIL') budgetFailures++;
  }

  if (asJson) {
    console.log(JSON.stringify({ samples: SAMPLES, providerTimeoutCeilingMs: 9000, budgetsMs: BUDGETS_MS, rows }, null, 2));
  } else {
    console.log('\nKAYLA LOCAL PERFORMANCE BASELINE (offline, no provider quota)');
    console.log('='.repeat(78));
    console.log('| Request Class          | Samples |   Min | Median |   Max |   p95 | Budget |');
    console.log('|------------------------|--------:|------:|-------:|------:|------:|-------:|');
    for (const row of rows) {
      const p95 = row.p95 == null ? '   n/a' : row.p95.toFixed(2).padStart(6);
      console.log(`| ${row.class.padEnd(22)} | ${String(row.samples).padStart(7)} | ${row.min.toFixed(2).padStart(5)} | ${row.median.toFixed(2).padStart(6)} | ${row.max.toFixed(2).padStart(5)} | ${p95} | ${(row.budgetMs == null ? 'n/a' : `${row.budgetMs}ms ${row.budgetResult}`).padStart(6)} |`);
    }
    console.log('='.repeat(78));
    console.log('Times are handleKaylaChat end-to-end ms on this machine (validation + task');
    console.log('plan + retrieval + routing + verification). Provider lane uses the mock');
    console.log('provider; production ceiling for a real provider attempt is 9000ms.');
    if (checkBudgets && budgetFailures > 0) console.log(`BUDGET CHECK: FAIL (${budgetFailures} class(es) over budget)`);
    else if (checkBudgets) console.log('BUDGET CHECK: PASS');
  }
  if (checkBudgets && budgetFailures > 0) exitCode = 1;
} finally {
  await vite.close();
}
process.exit(exitCode);
