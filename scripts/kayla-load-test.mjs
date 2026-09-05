#!/usr/bin/env node
/**
 * Phase 12 local load harness — concurrency correctness WITHOUT touching
 * production.
 *
 *   npm run kayla:load-test                        # local mocked scenarios
 *   node scripts/kayla-load-test.mjs --json        # machine-readable result
 *
 * Safety: this harness only ever drives the in-process handler (mock provider
 * where a model lane is needed). There is no --target flag and no production
 * mode: hammering the public Worker or site is explicitly out of scope for
 * Phase 12 (production sees only a small paced canary, run separately).
 *
 * Scenarios:
 *   1. 50 deterministic requests (sequential baseline)
 *   2. 50 task requests (sequential baseline)
 *   3. mixed concurrent workload (concurrency 10, mixed classes incl. mock provider)
 *   4. provider-mocked workload (concurrency 10, provider-lane only)
 *
 * Each scenario reports success/error counts, status distribution, and timing.
 * Cross-session isolation is proven in vitest (distinct histories in flight
 * concurrently); here every request carries an independent session id and any
 * unexpected status or thrown error fails the run.
 */
import path from 'node:path';
import process from 'node:process';
import { createServer } from 'vite';

const root = path.resolve(import.meta.dirname, '..');
const asJson = process.argv.includes('--json');

const DETERMINISTIC_QUESTIONS = [
  'Who founded FDS?',
  'Can I download KyraBlox?',
  'What does CodeForge cost?',
  'Where should I start?',
  'How can I support FDS?'
];
const TASK_QUESTIONS = [
  "I'm a developer. Where should I start?",
  'What can I actually download?',
  'I want to learn about AI research.',
  'How can I support FDS with hardware?'
];
const PROVIDER_QUESTIONS = [
  'Give me a short overview of how the FDS ecosystem fits together.',
  'Compare CodeForge and GEMS Training Grounds for me.'
];

function makeEndpoints(kaylaConfig, allowAI) {
  return {
    providerConfig: { provider: 'mock' },
    kaylaConfig,
    consumeRequestAllowance: async () => true,
    consumeAIAllowance: async () => allowAI
  };
}

async function runPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;
  const latencies = [];
  async function lane() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      const start = performance.now();
      try {
        const outcome = await worker(items[i], i);
        latencies.push(performance.now() - start);
        results[i] = { ok: true, ...outcome };
      } catch (error) {
        latencies.push(performance.now() - start);
        results[i] = { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, lane));
  latencies.sort((a, b) => a - b);
  return { results, latencies };
}

function summarize(name, requests, concurrency, results, latencies) {
  const ok = results.filter((r) => r.ok).length;
  const errors = results.length - ok;
  const statuses = {};
  for (const r of results) {
    const key = r.ok ? `status:${r.status}` : `threw:${r.error}`;
    statuses[key] = (statuses[key] || 0) + 1;
  }
  const pct = (q) => latencies.length ? Math.round(latencies[Math.min(latencies.length - 1, Math.floor(q * latencies.length))] * 100) / 100 : 0;
  return { scenario: name, requests, concurrency, success: ok, errors, statuses, minMs: pct(0), medianMs: pct(0.5), maxMs: pct(1), result: errors === 0 ? 'PASS' : 'FAIL' };
}

const vite = await createServer({ root, appType: 'custom', server: { middlewareMode: true }, logLevel: 'silent' });
let exitCode = 0;
try {
  const [{ handleKaylaChat }, { createKaylaConfig }] = await Promise.all([
    vite.ssrLoadModule('/src/lib/kayla/handler.ts'),
    vite.ssrLoadModule('/src/lib/kayla/config.ts')
  ]);
  const base = { ...createKaylaConfig({}), enabled: true, provider: 'mock', model: 'mock', apiKey: 'test', rateLimitPerMinute: 10_000 };
  const endpoints = makeEndpoints(base, true);

  const chat = async (message, session) => {
    const { status, response } = await handleKaylaChat(
      { message, history: [], context: { route: '/', pageType: 'home' } },
      { ...endpoints, onDiagnostics: undefined }
    );
    if (status !== 200 || !('answer' in response) || !response.answer) {
      throw new Error(`session ${session}: unexpected response status=${status} ${response.error || ''}`);
    }
    return { status, route: response.routeMode };
  };

  const summaries = [];

  // 1. 50 deterministic requests, sequential.
  {
    const items = Array.from({ length: 50 }, (_, i) => DETERMINISTIC_QUESTIONS[i % DETERMINISTIC_QUESTIONS.length]);
    const { results, latencies } = await runPool(items, 1, (m, i) => chat(m, `det-${i}`));
    summaries.push(summarize('deterministic x50', 50, 1, results, latencies));
  }
  // 2. 50 task requests, sequential.
  {
    const items = Array.from({ length: 50 }, (_, i) => TASK_QUESTIONS[i % TASK_QUESTIONS.length]);
    const { results, latencies } = await runPool(items, 1, (m, i) => chat(m, `task-${i}`));
    summaries.push(summarize('task x50', 50, 1, results, latencies));
  }
  // 3. Mixed concurrent workload: 60 requests across all classes at concurrency 10.
  {
    const pool = [...DETERMINISTIC_QUESTIONS, ...TASK_QUESTIONS, ...PROVIDER_QUESTIONS, 'What AI work is FDS doing?'];
    const items = Array.from({ length: 60 }, (_, i) => pool[i % pool.length]);
    const { results, latencies } = await runPool(items, 10, (m, i) => chat(m, `mix-${i}`));
    summaries.push(summarize('mixed concurrent x60', 60, 10, results, latencies));
  }
  // 4. Provider-mocked workload: 30 provider-lane requests at concurrency 10.
  {
    const items = Array.from({ length: 30 }, (_, i) => PROVIDER_QUESTIONS[i % PROVIDER_QUESTIONS.length]);
    const { results, latencies } = await runPool(items, 10, (m, i) => chat(m, `prov-${i}`));
    summaries.push(summarize('provider-mocked x30', 30, 10, results, latencies));
  }

  const failed = summaries.filter((s) => s.result !== 'PASS').length;
  if (asJson) {
    console.log(JSON.stringify({ target: 'local-in-process (mock provider, no production traffic)', summaries }, null, 2));
  } else {
    console.log('\nKAYLA LOCAL LOAD TEST (in-process, mock provider — no production traffic)');
    console.log('='.repeat(92));
    console.log('| Scenario              | Requests | Concurrency | Success | Errors | Median | Max    | Result |');
    console.log('|-----------------------|---------:|------------:|--------:|-------:|-------:|-------:|-------:|');
    for (const s of summaries) {
      console.log(`| ${s.scenario.padEnd(21)} | ${String(s.requests).padStart(8)} | ${String(s.concurrency).padStart(11)} | ${String(s.success).padStart(7)} | ${String(s.errors).padStart(6)} | ${`${s.medianMs}ms`.padStart(6)} | ${`${s.maxMs}ms`.padStart(6)} | ${s.result.padEnd(6)} |`);
    }
    console.log('='.repeat(92));
    for (const s of summaries) console.log(`- ${s.scenario}: ${JSON.stringify(s.statuses)}`);
    console.log(failed ? `LOAD TEST: FAIL (${failed} scenario(s))` : 'LOAD TEST: PASS');
  }
  if (failed) exitCode = 1;
} finally {
  await vite.close();
}
process.exit(exitCode);
