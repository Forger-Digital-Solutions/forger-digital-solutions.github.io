#!/usr/bin/env node
/**
 * Adaptive-routing efficiency evaluation (Phase 8, Parts 3 & 30).
 *
 * Classifies every question in the golden-query evaluation corpus into the
 * lane it would actually take in production with the AI provider enabled:
 *
 *   deterministic       - a settled canonical fact; the provider is never
 *                         consulted (deterministicAnswer() short-circuits
 *                         before isProviderEligible runs at all).
 *   provider_eligible   - the routing gate would attempt the provider.
 *   local_only          - not settled, and the gate declines the provider
 *                         (e.g. a thin retrieval hit on a roadmap/capability
 *                         question).
 *
 * This never contacts OpenRouter and never runs against production traffic —
 * it is a static evaluation over test/kayla/golden-queries.json, labelled as
 * such throughout. It answers "how much of this evaluation corpus needs a
 * model at all", not "how many visitors trigger a model call".
 *
 *   node scripts/kayla-routing-eval.mjs            # summary
 *   node scripts/kayla-routing-eval.mjs --verbose  # per-category breakdown
 *   node scripts/kayla-routing-eval.mjs --json     # machine-readable result
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createServer } from 'vite';

const root = path.resolve(import.meta.dirname, '..');
const verbose = process.argv.includes('--verbose');
const asJson = process.argv.includes('--json');

const vite = await createServer({ root, appType: 'custom', server: { middlewareMode: true }, logLevel: 'silent' });
try {
  const [{ createProvider, isProviderEligible, deterministicAnswer }] = await Promise.all([
    vite.ssrLoadModule('/src/lib/kayla/handler.ts')
  ]);
  const { createProvider: makeLocalProvider } = await vite.ssrLoadModule('/src/lib/kayla/provider.ts');

  const dataset = JSON.parse(fs.readFileSync(path.join(root, 'test/kayla/golden-queries.json'), 'utf-8'));
  const localProvider = makeLocalProvider();
  // Shaped exactly like the production provider config, so the gate's
  // "provider === mock/test always eligible" carve-out never applies here.
  const providerConfig = { provider: 'openrouter', model: 'openrouter/free' };

  const results = [];
  for (const query of dataset.queries) {
    const context = query.context || { route: '/', pageType: 'home' };
    const history = query.history || [];
    const sources = await localProvider.search(query.question, context, history);
    const settled = deterministicAnswer(sources);
    const lane = settled
      ? 'deterministic'
      : isProviderEligible(query.question, sources, providerConfig)
        ? 'provider_eligible'
        : 'local_only';
    results.push({ id: query.id, category: query.category, tier: query.tier, question: query.question, lane });
  }

  const counts = { deterministic: 0, provider_eligible: 0, local_only: 0 };
  for (const result of results) counts[result.lane] += 1;
  const total = results.length;
  const avoided = counts.deterministic + counts.local_only;

  const byCategory = {};
  for (const result of results) {
    const bucket = (byCategory[result.category] ||= { deterministic: 0, provider_eligible: 0, local_only: 0, total: 0 });
    bucket[result.lane] += 1;
    bucket.total += 1;
  }

  const summary = {
    label: 'EVALUATION CORPUS (test/kayla/golden-queries.json) — not production traffic',
    total,
    counts,
    avoidedProviderCalls: avoided,
    avoidedProviderCallsPct: Number(((avoided / total) * 100).toFixed(1))
  };

  if (asJson) {
    console.log(JSON.stringify({ summary, byCategory, results }, null, 2));
  } else {
    console.log('\nKAYLA ADAPTIVE-ROUTING EFFICIENCY (evaluation corpus, no provider contacted)');
    console.log('='.repeat(76));
    console.log(`Total evaluation questions: ${total}`);
    console.log(`  deterministic (settled, no provider possible):  ${String(counts.deterministic).padStart(3)}`);
    console.log(`  local_only (not settled, gate declines):        ${String(counts.local_only).padStart(3)}`);
    console.log(`  provider_eligible (gate would attempt):         ${String(counts.provider_eligible).padStart(3)}`);
    console.log('-'.repeat(76));
    console.log(`Provider calls avoided on this corpus: ${avoided} / ${total} (${summary.avoidedProviderCallsPct}%)`);
    console.log('This is an evaluation-corpus measurement, not a production-traffic statistic.');
    if (verbose) {
      console.log('-'.repeat(76));
      for (const [category, bucket] of Object.entries(byCategory).sort()) {
        console.log(`  ${category.padEnd(24)} deterministic=${bucket.deterministic} local_only=${bucket.local_only} provider_eligible=${bucket.provider_eligible} (of ${bucket.total})`);
      }
    }
    console.log('='.repeat(76));
  }
} finally {
  await vite.close();
}
