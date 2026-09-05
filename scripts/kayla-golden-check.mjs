#!/usr/bin/env node
/**
 * Runs the golden query set against Kayla's local answer routing — the path
 * that survives a provider outage — and reports accuracy per tier.
 *
 *   node scripts/kayla-golden-check.mjs            # summary, non-zero on tier failure
 *   node scripts/kayla-golden-check.mjs --verbose  # every failing query
 *   node scripts/kayla-golden-check.mjs --json     # machine-readable result
 *
 * Assertions are invariants, not prose: each 'require' group needs one member
 * present, each 'forbid' string must be absent. Placeholders resolve from the
 * site's own data so the expectations cannot drift from canonical facts.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createServer } from 'vite';

const root = path.resolve(import.meta.dirname, '..');
const verbose = process.argv.includes('--verbose');
const asJson = process.argv.includes('--json');

const TIER_TARGETS = { 1: 1.0, 2: 0.95, 3: 0.9 };

const vite = await createServer({ root, appType: 'custom', server: { middlewareMode: true }, logLevel: 'silent' });
let exitCode = 0;
try {
  const [{ handleKaylaChat }, { createKaylaConfig }, { products }, { siteConfig }] = await Promise.all([
    vite.ssrLoadModule('/src/lib/kayla/handler.ts'),
    vite.ssrLoadModule('/src/lib/kayla/config.ts'),
    vite.ssrLoadModule('/src/data/products.ts'),
    vite.ssrLoadModule('/src/config/site.ts')
  ]);

  // Provider disabled: this is exactly what a visitor receives during an
  // OpenRouter outage, so the numbers below describe Kayla without any model.
  const offlineConfig = { ...createKaylaConfig({}), enabled: false, provider: '', rateLimitPerMinute: 10_000 };
  const endpointConfig = {
    providerConfig: { provider: '' },
    kaylaConfig: offlineConfig,
    consumeRequestAllowance: async () => true,
    consumeAIAllowance: async () => false
  };

  const dataset = JSON.parse(fs.readFileSync(path.join(root, 'test/kayla/golden-queries.json'), 'utf-8'));
  const product = (slug) => products.find((item) => item.slug === slug);
  const resolve = (value) => value
    .replaceAll('{{codeforge.version}}', product('codeforge')?.version ?? '')
    .replaceAll('{{forgerems.version}}', product('forgerems')?.version ?? '')
    .replaceAll('{{site.email}}', siteConfig.supportEmail)
    .replaceAll('{{site.cashapp}}', siteConfig.cashAppHandle);

  const results = [];

  for (const query of dataset.queries) {
    const context = query.context || { route: '/', pageType: 'home' };
    const history = query.history || [];
    const { response } = await handleKaylaChat({ message: query.question, history, context }, endpointConfig);
    const text = response.answer || response.error || '';
    const top = { snippet: text, sourceType: response.sources?.[0]?.id ? 'canonical' : (response.answer ? 'local' : 'error'), actions: response.actions };
    const answer = `${text} ${(top.actions || []).filter(Boolean).map((a) => `${a.label} ${a.href || ''}`).join(' ')}`;
    const haystack = answer.toLowerCase();

    const missing = (query.require || [])
      .map((group) => group.map(resolve))
      .filter((group) => !group.some((needle) => haystack.includes(needle.toLowerCase())));
    const present = (query.forbid || [])
      .map(resolve)
      .filter((needle) => haystack.includes(needle.toLowerCase()));

    const structuralFailures = [];
    if (query.expectActions && !(response.actions?.length > 0)) structuralFailures.push('expected at least one action, got none');
    if (query.expectSources && !(response.sourceLinks?.length > 0)) structuralFailures.push('expected at least one source, got none');
    if (query.expectRouteMode && response.routeMode !== query.expectRouteMode) structuralFailures.push(`expected routeMode "${query.expectRouteMode}", got "${response.routeMode}"`);

    results.push({
      id: query.id,
      tier: query.tier,
      category: query.category,
      question: query.question,
      canonicalRefs: query.canonicalRefs || [],
      layer: top.sourceType || 'none',
      intent: top.intent || null,
      routeMode: response.routeMode || null,
      pass: missing.length === 0 && present.length === 0 && structuralFailures.length === 0,
      missing: missing.map((group) => group.join(' | ')),
      forbidden: present,
      structuralFailures,
      answer: (top.snippet || '').replace(/\s+/g, ' ').slice(0, 300)
    });
  }

  const tiers = {};
  for (const result of results) {
    const bucket = (tiers[result.tier] ||= { total: 0, passed: 0, failures: [] });
    bucket.total += 1;
    if (result.pass) bucket.passed += 1;
    else bucket.failures.push(result);
  }

  const layers = {};
  for (const result of results) layers[result.layer] = (layers[result.layer] || 0) + 1;

  const summary = {
    total: results.length,
    passed: results.filter((r) => r.pass).length,
    tiers: Object.fromEntries(Object.entries(tiers).map(([tier, data]) => [tier, {
      total: data.total,
      passed: data.passed,
      accuracy: Number((data.passed / data.total).toFixed(4)),
      target: TIER_TARGETS[tier] ?? null,
      meetsTarget: data.passed / data.total >= (TIER_TARGETS[tier] ?? 0)
    }])),
    answeredByLayer: layers
  };

  for (const [tier, data] of Object.entries(summary.tiers)) if (!data.meetsTarget) exitCode = 1;

  if (asJson) {
    console.log(JSON.stringify({ summary, results }, null, 2));
  } else {
    console.log('\nKAYLA GOLDEN QUERY CHECK (local routing, no provider)');
    console.log('='.repeat(56));
    for (const [tier, data] of Object.entries(summary.tiers)) {
      const target = data.target === null ? 'n/a' : `${(data.target * 100).toFixed(0)}%`;
      console.log(`Tier ${tier}: ${String(data.passed).padStart(3)}/${String(data.total).padEnd(3)}  ${(data.accuracy * 100).toFixed(1).padStart(5)}%  target ${target}  ${data.meetsTarget ? 'MEETS' : 'BELOW'}`);
    }
    console.log('-'.repeat(56));
    console.log(`Overall: ${summary.passed}/${summary.total} (${((summary.passed / summary.total) * 100).toFixed(1)}%)`);
    console.log(`Answered by layer: ${Object.entries(layers).map(([k, v]) => `${k}=${v}`).join(', ')}`);
    const failures = results.filter((r) => !r.pass);
    if (failures.length) {
      console.log('-'.repeat(56));
      for (const failure of failures) {
        console.log(`FAIL [${failure.id}] ${failure.question}`);
        if (failure.canonicalRefs && failure.canonicalRefs.length) {
          console.log(`   Canonical Ref: ${failure.canonicalRefs.join(', ')} (verify if canonical source was intentionally changed)`);
        }
        if (failure.missing.length) console.log(`   missing: ${failure.missing.join('  //  ')}`);
        if (failure.forbidden.length) console.log(`   forbidden present: ${failure.forbidden.join(', ')}`);
        if (failure.structuralFailures.length) console.log(`   structural: ${failure.structuralFailures.join('  //  ')}`);
        if (verbose) console.log(`   answer: ${failure.answer}`);
      }
    }
    console.log('='.repeat(56));
    console.log(exitCode === 0 ? 'VERDICT: PASS' : 'VERDICT: BELOW TARGET');
  }
} finally {
  await vite.close();
}
process.exit(exitCode);
