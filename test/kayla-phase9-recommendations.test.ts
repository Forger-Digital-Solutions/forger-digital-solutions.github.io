import { describe, it, expect } from 'vitest';
import { canonicalAnswer } from '../src/data/kayla/answers';

/**
 * Phase 9 — Grounded recommendation scoring and availability awareness.
 *
 * Verifies that recommendation queries:
 * 1. Score against canonical project data (categories, problem, differentiation, tags)
 * 2. Return accurate project mappings without hardcoding
 * 3. Include honest status and availability descriptions so unreleased projects
 *    are not recommended as downloadable software
 */

const ctx = { route: '/', pageType: 'home' } as const;

describe('Phase 9 Grounded Recommendations', () => {
  it('recommends KyraBlox for game development and disclaims public release', () => {
    const answer = canonicalAnswer('Which app should I use for game development?', ctx, []);
    expect(answer).toBeDefined();
    expect(answer!.text).toContain('KyraBlox');
    expect(answer!.text).toMatch(/ACTIVE DEVELOPMENT|active development/i);
    expect(answer!.actions?.[0]?.href).toBe('/projects/kyrablox');
  });

  it('recommends ForgerEMS for technician and drive maintenance', () => {
    const answer = canonicalAnswer('Which tool is for computer repair and technician diagnostics?', ctx, []);
    expect(answer).toBeDefined();
    expect(answer!.text).toContain('ForgerEMS');
    expect(answer!.text).toMatch(/available now|download/i);
  });

  it('recommends Kayla AI Publisher for manuscripts and creative writing', () => {
    const answer = canonicalAnswer('Which project handles writing books and manuscripts?', ctx, []);
    expect(answer).toBeDefined();
    expect(answer!.text).toContain('Kayla AI Publisher');
    expect(answer!.text).toMatch(/ACTIVE DEVELOPMENT|active development/i);
    expect(answer!.actions?.[0]?.href).toBe('/projects/kayla-ai-publisher');
  });

  it('recommends FarmStand Finder for local food discovery', () => {
    const answer = canonicalAnswer('What should I use to find nearby farm stands?', ctx, []);
    expect(answer).toBeDefined();
    expect(answer!.text).toContain('FarmStand Finder');
    expect(answer!.text).toMatch(/ACTIVE DEVELOPMENT|active development/i);
  });

  it('recommends CodeForge for software engineering and repository work', () => {
    const answer = canonicalAnswer('Which tool helps with autonomous software engineering repositories?', ctx, []);
    expect(answer).toBeDefined();
    expect(answer!.text).toContain('CodeForge');
    expect(answer!.text).toMatch(/available now|released/i);
  });

  it('recommends GEMS / Training Grounds for AI model training and evaluation', () => {
    const answer = canonicalAnswer('What FDS project is focused on model research and training?', ctx, []);
    expect(answer).toBeDefined();
    expect(answer!.text).toMatch(/GEMS|Training Grounds/i);
    expect(answer!.text).toMatch(/RESEARCH|research/i);
  });

  it('gracefully handles ambiguous recommendation queries by listing all areas', () => {
    const answer = canonicalAnswer('Which one is best for my needs?', ctx, []);
    expect(answer).toBeDefined();
    expect(answer!.text).toMatch(/depends on the job/i);
  });
});
