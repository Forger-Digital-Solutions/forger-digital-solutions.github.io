import { describe, it, expect, beforeEach } from 'vitest';
import { retrieveKnowledge, resolveEntity, fuzzySimilarity } from '../src/data/kayla/retrieval';
import type { KaylaPageContext } from '../src/data/kayla/types';

describe('Kayla Phase 2 - Fuzzy Retrieval', () => {
  it('handles typos in ForgerEMS', () => {
    const results = retrieveKnowledge('FogerEMS');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].doc.text.toLowerCase()).toContain('forgerems');
  });

  it('handles "Forger EMS" with space', () => {
    const results = retrieveKnowledge('Forger EMS');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].doc.text.toLowerCase()).toContain('forgerems');
  });

  it('handles KyraBlox typo', () => {
    const results = retrieveKnowledge('Kyrablox');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].doc.text.toLowerCase()).toContain('kyrablox');
  });

  it('handles FarmStand Finder variations', () => {
    const results = retrieveKnowledge('Farmstand finder');
    expect(results.length).toBeGreaterThan(0);
    const combined = results.map(r => r.doc.text.toLowerCase()).join(' ');
    expect(combined).toContain('farmstand');
  });

  it('handles WeThePeople typo', () => {
    const results = retrieveKnowledge('WeThePeple');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].doc.text.toLowerCase()).toContain('people');
  });

  it('handles Kayla Publisher variations', () => {
    const results = retrieveKnowledge('Kayla Publisher');
    expect(results.length).toBeGreaterThan(0);
    const combined = results.map(r => r.doc.text.toLowerCase()).join(' ');
    expect(combined).toContain('kayla ai publisher');
  });

  it('resolves entity aliases', () => {
    expect(resolveEntity('gems')).toBe('gems-training-grounds');
    expect(resolveEntity('forger ems')).toBe('forgerems');
    expect(resolveEntity('ems')).toBe('forgerems');
    expect(resolveEntity('toolkit')).toBe('forgerems');
  });

  it('resolves fuzzy entity names', () => {
    expect(resolveEntity('FogerEMS')).toBe('forgerems');
  });

  it('boosts results based on page context', () => {
    const context: KaylaPageContext = {
      route: '/projects/gems-training-grounds',
      pageType: 'project',
      entity: 'gems-training-grounds'
    };
    const results = retrieveKnowledge('gems training', context);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].doc.entityId).toBe('gems-training-grounds');
  });
});

describe('Kayla Phase 2 - Fuzzy Similarity', () => {
  it('returns 1 for identical strings', () => {
    expect(fuzzySimilarity('forgerems', 'forgerems')).toBe(1);
  });

  it('returns high value for small typos', () => {
    const sim = fuzzySimilarity('forgerems', 'fogerems');
    expect(sim).toBeGreaterThan(0.8);
  });

  it('returns low value for unrelated strings', () => {
    const sim = fuzzySimilarity('xyzabc', 'forgerems');
    expect(sim).toBeLessThan(0.5);
  });
});

describe('Kayla Phase 2 - Retrieval Ranking', () => {
  it('ranks exact matches above partial matches', () => {
    const results = retrieveKnowledge('ForgerEMS');
    expect(results.length).toBeGreaterThan(0);
    const forgeremsResult = results.find(r => r.doc.entityId === 'forgerems');
    expect(forgeremsResult).toBeDefined();
    expect(forgeremsResult!.score).toBeGreaterThan(10);
  });

  it('returns multiple results for broad queries', () => {
    const results = retrieveKnowledge('projects apps');
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it('returns empty array for empty query', () => {
    const results = retrieveKnowledge('');
    expect(results.length).toBe(0);
  });

  it('handles nonsense queries gracefully', () => {
    const results = retrieveKnowledge('xyznonexistent123');
    expect(results.length).toBe(0);
  });
});
