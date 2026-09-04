#!/usr/bin/env node
/**
 * Retrieval evaluation corpus (Phase 9, expanded from 10 → 25 cases).
 *
 * Each case names the FDS entities a good answer must be grounded in — not
 * the exact wording of an answer. This is deliberate: retrieval quality is
 * "did we find the right evidence", which is a different question from
 * golden-queries.json's "did the final prose say the right thing". A case
 * passes when at least one expected entity appears among the top-K results
 * the full local pipeline (canonical → known-answer → entity → retrieval)
 * would actually ground an answer or a provider call with.
 *
 * Per the retrieval trust rule (Phase 8, Part 6): a passing case here proves
 * the *evidence* was found, never that a specific relationship or claim
 * about it is true. Semantic verification (verify.ts / verify-relations.ts)
 * is what is answerable for truth; this script is not a substitute for it.
 *
 * Phase 9 additions: 15 new cases covering cross-project, intent-based,
 * ambiguous-language, comparison, and expanded availability categories.
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
 *
 * `diagnostics`: optional metadata for understanding WHY a result won/lost:
 *   - category: the retrieval behavior this case exercises
 *   - expectSnippetContains: text that must appear in the top result's snippet
 */
const CASES = [
  // ─── Single-entity ──────────────────────────────────────────────────────────
  {
    question: 'What does Training Grounds do?',
    anyOf: ['gems-training-grounds'],
    category: 'single-entity'
  },
  {
    question: 'What is ForgerEMS?',
    anyOf: ['forgerems'],
    category: 'single-entity'
  },
  {
    question: 'Tell me about CodeForge.',
    anyOf: ['codeforge'],
    category: 'single-entity'
  },
  {
    question: "What's the KyraBlox project?",
    anyOf: ['kyrablox'],
    category: 'single-entity'
  },
  {
    question: 'What is FarmStand Finder?',
    anyOf: ['farmstand-finder'],
    category: 'single-entity'
  },

  // ─── Category / list ────────────────────────────────────────────────────────
  {
    question: 'What AI projects does FDS have?',
    anyOf: ['gems-training-grounds', 'kayla-ai-publisher', 'codeforge'],
    names: ['GEMS', 'Training Grounds', 'Kayla AI Publisher'],
    category: 'category'
  },
  {
    question: "What's aimed at developers?",
    anyOf: ['codeforge'],
    category: 'category'
  },
  {
    question: "What's related to publishing?",
    anyOf: ['kayla-ai-publisher'],
    category: 'category'
  },
  {
    question: 'Which projects are community focused?',
    anyOf: ['farmstand-finder', 'we-the-people'],
    names: ['FarmStand Finder', 'We The People'],
    category: 'category'
  },

  // ─── Availability ───────────────────────────────────────────────────────────
  {
    question: 'What can I actually download?',
    anyOf: ['codeforge', 'forgerems'],
    names: ['CodeForge', 'ForgerEMS'],
    category: 'availability'
  },
  {
    question: "What's still research?",
    anyOf: ['gems-training-grounds', 'gem-topaz', 'gem-sapphire', 'gem-peridot', 'gem-garnet'],
    category: 'availability'
  },
  {
    question: 'Which projects are visible publicly but not released?',
    anyOf: ['kyrablox', 'we-the-people', 'farmstand-finder', 'kayla-ai-publisher'],
    names: ['KyraBlox', 'We The People', 'FarmStand Finder', 'Kayla AI Publisher'],
    category: 'availability'
  },
  {
    question: 'What can I use right now?',
    anyOf: ['codeforge', 'forgerems'],
    names: ['CodeForge', 'ForgerEMS'],
    category: 'availability'
  },

  // ─── Cross-project / relationship ──────────────────────────────────────────
  {
    question: 'How do GEMS and CodeForge connect?',
    anyOf: ['gems-training-grounds', 'codeforge'],
    category: 'cross-project'
  },
  {
    question: 'How is Kayla AI Publisher different from CodeForge?',
    anyOf: ['kayla-ai-publisher', 'codeforge'],
    category: 'cross-project'
  },
  {
    question: 'How does Training Grounds relate to the GEMS family?',
    anyOf: ['gems-training-grounds', 'gem-topaz', 'gem-sapphire', 'gem-peridot', 'gem-garnet'],
    category: 'cross-project'
  },

  // ─── Intent-based / recommendation ─────────────────────────────────────────
  {
    question: 'Where does CodeForge fit into FDS?',
    anyOf: ['codeforge'],
    category: 'intent-based'
  },
  {
    question: 'Where should a developer start?',
    anyOf: ['codeforge'],
    category: 'intent-based'
  },
  {
    // "AI" interest is broad — GEMS, Kayla AI Publisher, CodeForge, and also
    // We The People (civic AI) can legitimately appear. The test verifies that
    // at least one AI-relevant project is grounded, not that a specific one wins.
    question: 'What should someone interested in AI look at?',
    anyOf: ['gems-training-grounds', 'kayla-ai-publisher', 'codeforge', 'we-the-people'],
    names: ['GEMS', 'Training Grounds', 'Kayla AI Publisher', 'CodeForge'],
    category: 'intent-based'
  },

  // ─── Ambiguous language ─────────────────────────────────────────────────────
  {
    // "coding project" — CodeForge is the canonical answer; the snippet text
    // should contain "CodeForge" even if the top result id differs.
    question: "What's the coding project?",
    anyOf: ['codeforge'],
    names: ['CodeForge'],
    category: 'ambiguous'
  },
  {
    question: "What's the model training project?",
    anyOf: ['gems-training-grounds'],
    category: 'ambiguous'
  },
  {
    question: "What's the publishing thing?",
    anyOf: ['kayla-ai-publisher'],
    category: 'ambiguous'
  },
  {
    question: 'How are the GEMS different?',
    anyOf: ['gems-training-grounds', 'gem-topaz', 'gem-sapphire', 'gem-peridot', 'gem-garnet'],
    category: 'ambiguous'
  },

  // ─── Status grouping ───────────────────────────────────────────────────────
  {
    // The canonical answer for "public page but no download" is the
    // availability-matrix, whose snippet lists the project names.
    question: 'Which projects have a public page but no public download?',
    anyOf: ['kyrablox', 'we-the-people', 'farmstand-finder', 'kayla-ai-publisher'],
    names: ['KyraBlox', 'We The People', 'FarmStand Finder', 'Kayla AI Publisher'],
    category: 'status-grouping'
  },
  {
    question: 'Which FDS projects are in private development?',
    anyOf: ['kyrablox', 'we-the-people', 'farmstand-finder', 'kayla-ai-publisher'],
    names: ['KyraBlox', 'We The People', 'FarmStand Finder', 'Kayla AI Publisher'],
    category: 'status-grouping'
  }
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
  const byCategory = {};

  for (const testCase of CASES) {
    const hits = await provider.search(testCase.question, { route: '/', pageType: 'home' }, []);
    const top = hits.slice(0, TOP_K);
    const foundIds = top.flatMap(resultIds);
    const snippetText = top.map((r) => r.snippet || '').join(' ').toLowerCase();
    const expected = testCase.anyOf.map((v) => v.toLowerCase());
    const expectedNames = (testCase.names || []).map((v) => v.toLowerCase());
    const pass = expected.some((id) => foundIds.includes(id)) || expectedNames.some((name) => snippetText.includes(name));

    const result = {
      question: testCase.question,
      expected: testCase.anyOf,
      category: testCase.category || 'general',
      pass,
      top: top.map((r) => ({ id: r.id, route: r.route, sourceType: r.sourceType, score: r.score }))
    };
    results.push(result);

    // Accumulate per-category stats
    const bucket = (byCategory[result.category] ||= { pass: 0, fail: 0, total: 0 });
    bucket.total += 1;
    if (pass) bucket.pass += 1;
    else bucket.fail += 1;
  }

  const passed = results.filter((r) => r.pass).length;
  const summary = {
    label: 'RETRIEVAL EVALUATION CORPUS — grounding-only, not an answer-wording check',
    total: results.length,
    passed,
    byCategory
  };

  if (asJson) {
    console.log(JSON.stringify({ summary, results }, null, 2));
  } else {
    console.log('\nKAYLA RETRIEVAL EVALUATION CORPUS (grounding only, not answer wording)');
    console.log('='.repeat(76));
    for (const result of results) {
      console.log(`${result.pass ? 'PASS' : 'FAIL'}  [${result.category}] ${result.question}`);
      if (verbose || !result.pass) {
        console.log(`   expected any of: ${result.expected.join(', ')}`);
        console.log(`   top-${TOP_K}: ${result.top.map((t) => `${t.id || t.route} (${t.sourceType}, score=${t.score})`).join(' | ')}`);
      }
    }
    console.log('-'.repeat(76));
    if (verbose) {
      console.log('By category:');
      for (const [cat, stats] of Object.entries(byCategory).sort()) {
        console.log(`  ${cat.padEnd(20)} ${stats.pass}/${stats.total} PASS`);
      }
      console.log('-'.repeat(76));
    }
    console.log(`${passed} / ${results.length} cases grounded on an expected entity`);
    console.log('='.repeat(76));
  }
  process.exitCode = passed === results.length ? 0 : 1;
} finally {
  await vite.close();
}
