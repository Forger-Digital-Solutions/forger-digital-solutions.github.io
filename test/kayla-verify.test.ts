import { describe, it, expect } from 'vitest';
import { verifyAgainstCanon, canonAllowList } from '../src/lib/kayla/verify';
import { createProvider } from '../src/lib/kayla/provider';
import { projects } from '../src/data/projects';
import { products } from '../src/data/products';
import { gems } from '../src/data/gems';
import goldenQueries from './kayla/golden-queries.json';

/**
 * The canonical verifier has to be right in both directions: it must catch a
 * model that contradicts the site, and it must never reject an answer the site
 * itself would give. A verifier that fires on good answers silently downgrades
 * every AI response to the local one.
 */

describe('verifier catches contradictions of canonical data', () => {
  const lies: [string, string][] = [
    ['version', 'CodeForge is currently version 9.0.'],
    ['version', 'The latest ForgerEMS is v2.0.0.'],
    ['price', 'CodeForge costs $49 per month.'],
    ['availability', 'KyraBlox is publicly available today.'],
    ['availability', 'You can download Topaz now.'],
    ['availability', 'Kayla AI Publisher has launched publicly.'],
    ['url', 'Get it at https://kyrablox-downloads.example.com/setup.exe'],
    ['benchmark', 'Sapphire beats GPT-5 on HumanEval with 92%.'],
    ['benchmark', 'Peridot scored 88% on MMLU.'],
    ['cancellation', 'Garnet was cancelled last year.'],
    ['cancellation', 'We The People is no longer being developed.'],
    ['founder', 'FDS was founded by Elon Musk.'],
    ['founder', 'Elon Musk founded Forger Digital Solutions in 2020.'],
    ['founder', 'The founder of FDS is Elon Musk.'],
    ['metric', 'CodeForge has 2,000,000 users.'],
    ['metric', 'FDS has 45 employees.'],
    ['metric', 'FDS raised $15 million in seed funding.'],
    ['price', 'CodeForge costs 49 dollars.'],
    ['price', 'The paid CodeForge plan is $9.99 and includes unlimited Claude.'],
    ['url', 'Get it at https://github.com/attacker/fake-repo/releases/download/v1.0/setup.exe'],
    ['url', 'Click here: javascript:alert(1) for the download.'],
    ['benchmark', 'Sapphire achieved frontier parity with GPT-5.'],
    ['version', 'CodeForge 9.0 launched this week.'],
    ['cancellation', 'We The People was shelved indefinitely.'],
    ['availability', 'You can install KyraBlox today.'],
    ['temporal_claim', 'Sapphire will ship in October.'],
    ['causal_claim', 'KyraBlox is private because of legal concerns.'],
    ['causal_claim', 'GEMS development failed due to lack of funding.'],
    ['roadmap_claim', 'CodeForge will replace the free model with Sapphire.'],
    ['roadmap_claim', 'Kayla will add a paid subscription tier next month.']
  ];

  for (const [kind, text] of lies) {
    it(`flags a ${kind} claim: "${text.slice(0, 48)}"`, () => {
      const verdict = verifyAgainstCanon(text);
      expect(verdict.ok).toBe(false);
      expect(verdict.violations.map((v) => v.kind)).toContain(kind);
    });
  }
});

describe('verifier accepts everything the site itself says', () => {
  it('accepts every canonical answer Kayla produces', async () => {
    const provider = createProvider();
    const failures: string[] = [];
    for (const query of goldenQueries.queries) {
      const top = (await provider.search(query.question))[0];
      if (!top?.snippet) continue;
      const verdict = verifyAgainstCanon(top.snippet);
      if (!verdict.ok) failures.push(`${query.id}: ${verdict.violations.map((v) => `${v.kind} (${v.detail})`).join('; ')}`);
    }
    expect(failures, `verifier rejected its own canonical answers:\n${failures.join('\n')}`).toEqual([]);
  });

  it('accepts canonical project, product, and GEM prose', () => {
    const prose = [
      ...projects.map((p) => `${p.name}: ${p.description}`),
      ...projects.flatMap((p) => p.highlights || []),
      ...projects.flatMap((p) => (p.sections || []).map((s) => `${s.title}: ${s.body || (s.items || []).join('. ')}`)),
      ...products.map((p) => `${p.name} ${p.version}: ${p.description} ${p.downloadUrl}`),
      ...gems.map((g) => `${g.name}: ${g.role}. ${g.direction} ${g.foundationStrategy} ${g.notClaimed}`)
    ];
    const failures = prose
      .map((text) => ({ text, verdict: verifyAgainstCanon(text) }))
      .filter((entry) => !entry.verdict.ok)
      .map((entry) => `${entry.verdict.violations.map((v) => v.kind).join(',')}: ${entry.text.slice(0, 90)}`);
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('accepts a correct premise correction that names the false version', () => {
    expect(verifyAgainstCanon('There is no CodeForge v9.0. The current public version is v0.2.0.').ok).toBe(true);
  });

  it('accepts real platform and model names that look like versions', () => {
    const text = 'CodeForge runs on Windows 10/11 x64. Generation 0 research references Qwen2.5-Coder, OLMo 2, Mathstral, and SmolVLM2 checkpoints.';
    expect(verifyAgainstCanon(text).ok).toBe(true);
  });

  it('accepts the aspiration wording without reading it as a parity claim', () => {
    const text = 'Affordable frontier-like usefulness is a target, not a claim of current parity with Claude Opus or GPT-class systems.';
    expect(verifyAgainstCanon(text).ok).toBe(true);
  });
});

describe('verifier allow-list is derived from site data', () => {
  it('lists exactly the versions products declare', () => {
    const declared = products.filter((p) => p.version).map((p) => p.version!.replace(/^v/i, '').toLowerCase()).sort();
    expect(canonAllowList().versions.sort()).toEqual(declared);
  });

  it('treats every project without a public build as not downloadable', () => {
    const expected = projects
      .filter((p) => !products.some((prod) => (prod.projectSlug || prod.slug) === p.slug && prod.downloadUrl))
      .map((p) => p.name.toLowerCase());
    for (const name of expected) {
      expect(canonAllowList().notDownloadable).toContain(name);
    }
    for (const gem of gems) {
      expect(canonAllowList().notDownloadable).toContain(gem.name.toLowerCase());
    }
  });
});
