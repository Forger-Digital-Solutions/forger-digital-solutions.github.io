#!/usr/bin/env node
/**
 * Retrieval evaluation corpus (Phase 8, Part 5).
 *
 * Each case names the FDS entities a good answer must be grounded in — not
 * the exact wording of an answer. This is deliberate: retrieval quality is
 * "did we find the right evidence", which is a different question from
 * golden-queries.json's "did the final prose say the right thing". A case
 * passes when at least one expected entity appears among the top-K results
 * the full local pipeline (canonical -> known-answer -> entity -> retrieval)
 * would actually ground an answer or a provider call with.
 *
 * Per the retrieval trust rule (Phase 8, Part 6): a passing case here proves
 * the *evidence* was found, never that a specific relationship or claim
 * about it is true. Semantic verification (verify.ts / verify-relations.ts)
 * is what is answerable for truth; this script is not a substitute for it.
 *
 *   node scripts/kayla-retrieval-eval.mjs            # summary
 *   node scripts/kayla-retrieval-eval.mjs --verbose  # every case's top hits
 *   node scripts/kayla-retrieval-eval.mjs --json     # machine-readable result
 */
import path from 'node:path';
import process from 'node:process';
import { createServer } from 'vite';

const root = path.resolve(import.meta.dirname, '..');
const verbose = process.argv.includes('--verbose');
const asJson = process.argv.includes('--json');
const TOP_K = 3;

/**
 * `anyOf`: the case passes if any one of these entities is actually grounding
 * the top-K results — either structurally (a result's `id`/`route` names it)
 * or textually (a settled canonical answer reads it back by name, e.g. a
 * filtered availability listing that names "CodeForge" in its snippet rather
 * than carrying a per-entity id). Kept deliberately permissive — several
 * entities can legitimately ground the same question — per-entity precision
 * is not what this evaluates.
 */
const CASES = [
  { question: 'What AI projects does FDS have?', anyOf: ['gems-training-grounds', 'kayla-ai-publisher', 'codeforge'], names: ['GEMS', 'Training Grounds', 'Kayla AI Publisher'] },
  { question: "What's aimed at developers?", anyOf: ['codeforge'] },
  { question: "What's related to publishing?", anyOf: ['kayla-ai-publisher'] },
  { question: 'What can I actually download?', anyOf: ['codeforge', 'forgerems'], names: ['CodeForge', 'ForgerEMS'] },
  { question: "What's still research?", anyOf: ['gems-training-grounds', 'gem-topaz', 'gem-sapphire', 'gem-peridot', 'gem-garnet'] },
  { question: 'Where does CodeForge fit into FDS?', anyOf: ['codeforge'] },
  { question: 'What does Training Grounds do?', anyOf: ['gems-training-grounds'] },
  { question: 'How are the GEMS different?', anyOf: ['gems-training-grounds', 'gem-topaz', 'gem-sapphire', 'gem-peridot', 'gem-garnet'] },
  { question: 'Which projects are visible publicly but not released?', anyOf: ['kyrablox', 'we-the-people', 'farmstand-finder', 'kayla-ai-publisher'], names: ['KyraBlox', 'We The People', 'FarmStand Finder', 'Kayla AI Publisher'] },
  { question: 'Where should a developer start?', anyOf: ['codeforge'] }
];

function resultIds(result) {
  const ids = [];
  if (result.id) ids.push(result.id.replace(/^(app-|gem-|product-|dl-|download-|release-|github-|roadmap-|docs-)/, ''), result.id);
  if (result.route) ids.push(result.route.replace(/^\/projects\//, '').replace(/^\//, ''));
  return ids.map((v) => v.toLowerCase());
}

const vite = await createServer({ root, appType: 'custom', server: { middlewareMode: true }, logLevel: 'silent' });
try {
  const { createProvider } = await vite.ssrLoadModule('/src/lib/kayla/provider.ts');
  const provider = createProvider();

  const results = [];
  for (const testCase of CASES) {
    const hits = await provider.search(testCase.question, { route: '/', pageType: 'home' }, []);
    const top = hits.slice(0, TOP_K);
    const foundIds = top.flatMap(resultIds);
    const snippetText = top.map((r) => r.snippet || '').join(' ').toLowerCase();
    const expected = testCase.anyOf.map((v) => v.toLowerCase());
    const expectedNames = (testCase.names || []).map((v) => v.toLowerCase());
    const pass = expected.some((id) => foundIds.includes(id)) || expectedNames.some((name) => snippetText.includes(name));
    results.push({
      question: testCase.question,
      expected: testCase.anyOf,
      pass,
      top: top.map((r) => ({ id: r.id, route: r.route, sourceType: r.sourceType, score: r.score }))
    });
  }

  const passed = results.filter((r) => r.pass).length;
  const summary = { label: 'RETRIEVAL EVALUATION CORPUS — grounding-only, not an answer-wording check', total: results.length, passed };

  if (asJson) {
    console.log(JSON.stringify({ summary, results }, null, 2));
  } else {
    console.log('\nKAYLA RETRIEVAL EVALUATION CORPUS (grounding only, not answer wording)');
    console.log('='.repeat(76));
    for (const result of results) {
      console.log(`${result.pass ? 'PASS' : 'FAIL'}  ${result.question}`);
      if (verbose || !result.pass) {
        console.log(`   expected any of: ${result.expected.join(', ')}`);
        console.log(`   top-${TOP_K}: ${result.top.map((t) => `${t.id || t.route} (${t.sourceType}, score=${t.score})`).join(' | ')}`);
      }
    }
    console.log('-'.repeat(76));
    console.log(`${passed} / ${results.length} cases grounded on an expected entity`);
    console.log('='.repeat(76));
  }
  process.exitCode = passed === results.length ? 0 : 1;
} finally {
  await vite.close();
}
