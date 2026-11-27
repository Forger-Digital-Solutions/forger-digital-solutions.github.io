import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { publicRegistry, solutionsData, getRegistryEntry } from '../src/data/registry';
import { canonicalAnswer } from '../src/data/kayla/answers';
import { verifyAgainstCanon } from '../src/lib/kayla/verify';
import { validateSafeAction } from '../src/lib/kayla/action-validator';

const repoRoot = new URL('..', import.meta.url).pathname;

function walkFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walkFiles(full, acc);
    else if (/\.(astro|ts|js|mjs|json|css)$/i.test(name)) acc.push(full);
  }
  return acc;
}

describe('Operation Digital Forge II — Commercial & Kayla Verification Suite', () => {
  it('defines all six commercial audience solution pathways and five personalization layers', () => {
    const slugs = solutionsData.audienceSolutions.map((s) => s.slug);
    expect(slugs).toEqual([
      'game-developers',
      'gaming-studios',
      'anime-manga-creators',
      'animation-studios',
      'software-engineering',
      'enterprise-private-ai',
    ]);
    expect(solutionsData.personalizationLayers).toHaveLength(5);
    expect(solutionsData.hackmaniteCommercial.workforceRoles).toHaveLength(10);
    expect(solutionsData.hackmaniteCommercial.offerings).toHaveLength(5);
    expect(solutionsData.cinnabarCommercial.workforceRoles).toHaveLength(8);
    expect(solutionsData.cinnabarCommercial.domains).toHaveLength(17);
    expect(solutionsData.jaspiliteCommercial.providerMaturityLadder).toHaveLength(5);
    expect(solutionsData.alexandriteConvergence.stages).toHaveLength(7);
  });

  it('registers BattleVerse Arena and BattleVerse Creator Studio with Apache-2.0 Hackmanite base verification', () => {
    expect(publicRegistry.length).toBeGreaterThanOrEqual(14);
    expect(getRegistryEntry('battleverse-arena').route).toBe('/products/battleverse/arena/');
    expect(getRegistryEntry('battleverse-creator-studio').development_status).toBe('commercial-direction');
    expect(getRegistryEntry('hackmanite-prime').license_info).toMatch(/Apache-2\.0/i);
    expect(getRegistryEntry('hackmanite-reasoning').license_info).toMatch(/Apache-2\.0/i);
  });

  it('ships all newly commissioned dual-width WebP assets under public/images/forge/', () => {
    for (const base of [
      'solutions-studio-workforce',
      'jaspilite-orchestration',
      'battleverse-creator-studio',
      'project-forge-lab',
    ]) {
      expect(existsSync(join(repoRoot, `public/images/forge/${base}.webp`))).toBe(true);
      expect(existsSync(join(repoRoot, `public/images/forge/${base}-sm.webp`))).toBe(true);
    }
  });

  it('keeps internal unapproved pricing hypotheses and revenue scenarios out of public pages & content', () => {
    const files = [
      ...walkFiles(join(repoRoot, 'content')),
      ...walkFiles(join(repoRoot, 'src/pages')),
      ...walkFiles(join(repoRoot, 'src/components')),
    ];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      expect(text, `Unapproved revenue scenario leak in ${file}`).not.toMatch(/\$39,957\.50|\$479,490/);
      expect(text, `Unapproved public tier price leak in ${file}`).not.toMatch(/\$9\.99|\$19\.99|\$49\.99|\$299\+|\$1,999\+/);
    }
  });

  it('answers all 15 commercial & flagship Kayla queries truthfully with valid canonical actions', () => {
    const queries = [
      'What is Alexandrite?',
      'Is Hackmanite available?',
      'What is Cinnabar?',
      'Does Cinnabar generate anime?',
      'What is BattleVerse Arena?',
      'What is BattleVerse Creator Studio?',
      'Can FDS build a private AI for my gaming studio?',
      'What is the difference between Jaspilite and Hackmanite?',
      'Can I download Jaspilite?',
      'Can I connect my existing AI subscriptions?',
      'Is State Lines playable?',
      'Can my studio license FDS models?',
      'Does FDS offer an API?',
      'How can I become a preview tester?',
      'How can my company contact FDS?',
    ];

    for (const q of queries) {
      const ans = canonicalAnswer(q, { route: '/', pageType: 'home' }, []);
      expect(ans, `Missing canonical answer for "${q}"`).toBeDefined();
      expect(ans!.settled, `Expected settled answer for "${q}"`).toBe(true);
      const verdict = verifyAgainstCanon(ans!.text);
      expect(verdict.ok, `Canon verification failed for "${q}": ${JSON.stringify(verdict.violations)}`).toBe(true);
      for (const act of ans!.actions || []) {
        const res = validateSafeAction(act, { strictCanonical: true });
        expect(res.valid, `Invalid action on "${q}": ${JSON.stringify(res.violations)}`).toBe(true);
      }
    }
  });
});
