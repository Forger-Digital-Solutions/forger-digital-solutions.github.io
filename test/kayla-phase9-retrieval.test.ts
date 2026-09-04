import { describe, it, expect } from 'vitest';
import { canonicalAnswer } from '../src/data/kayla/answers';
import { createProvider } from '../src/lib/kayla/provider';
import { CONTEXT_BUDGET, measureContextChars } from '../src/lib/kayla/systemPrompt';
import type { KaylaConversationMessage } from '../src/data/kayla/types';

/**
 * Phase 9 — retrieval fix, context budgeting, and availability-grouping tests.
 *
 * Key invariants:
 * 1. "Publicly visible but not released" queries now return all non-released
 *    projects, not just the most recently matched canonical entity.
 * 2. Context budget constants are stable, bounded values.
 * 3. measureContextChars() returns a number bounded by budget.
 */

const ctx = { route: '/', pageType: 'home' } as const;

describe('availability-grouping canonical answers', () => {
  it('answers "visible publicly but not released" with multiple projects', () => {
    const answer = canonicalAnswer('Which projects are visible publicly but not released?', ctx, []);
    expect(answer).toBeDefined();
    expect(answer!.text).toMatch(/publicly listed/i);
    // Must name multiple non-released projects
    const text = answer!.text;
    const mentionsAny = ['KyraBlox', 'FarmStand Finder', 'Kayla AI Publisher', 'We The People']
      .filter(name => text.includes(name));
    expect(mentionsAny.length).toBeGreaterThanOrEqual(2);
  });

  it('does NOT return CodeForge as primary grounding for "publicly visible but not released"', () => {
    const answer = canonicalAnswer('Which projects are visible publicly but not released?', ctx, []);
    // CodeForge IS released — it must not be presented as "not released"
    expect(answer!.text).not.toMatch(/CodeForge.*not.*released/i);
    // The sources must not include app-codeforge as sole source
    expect(answer!.sources).not.toEqual(['app-codeforge']);
  });

  it('answers "public page but no public download" correctly', () => {
    const answer = canonicalAnswer('Which projects have a public page but no public download?', ctx, []);
    expect(answer).toBeDefined();
    // Must list non-released projects
    expect(answer!.text).toMatch(/publicly listed|no download/i);
    expect(answer!.intent).toBe('availability');
    expect(answer!.settled).toBe(true);
  });

  it('answers "projects listed but not available" correctly', () => {
    const answer = canonicalAnswer('Which projects are listed but not available for download?', ctx, []);
    // Either availability-grouping branch or standard availability list is acceptable
    // The key requirement: must NOT return a single entity canonical match
    if (answer) {
      expect(answer.sources).not.toEqual(['app-codeforge']);
      expect(answer.text).not.toMatch(/^Yes\. CodeForge/);
    }
  });

  it('still correctly routes "what can I download" to the positive availability answer', () => {
    const answer = canonicalAnswer('What can I download?', ctx, []);
    expect(answer).toBeDefined();
    expect(answer!.intent).toBe('availability');
    // Should include something downloadable, not the not-released list
    expect(answer!.text).toMatch(/CodeForge|ForgerEMS/i);
  });

  it('still correctly routes "which projects are in private development"', () => {
    const answer = canonicalAnswer('Which FDS projects are in private development?', ctx, []);
    expect(answer).toBeDefined();
    expect(answer!.intent).toBe('availability');
    expect(answer!.text).toMatch(/PRIVATE DEVELOPMENT/);
  });
});

describe('Phase 9 context budget constants', () => {
  it('CONTEXT_BUDGET.maxSupportingSources is a positive integer ≤ 6', () => {
    expect(CONTEXT_BUDGET.maxSupportingSources).toBeGreaterThan(0);
    expect(CONTEXT_BUDGET.maxSupportingSources).toBeLessThanOrEqual(6);
  });

  it('CONTEXT_BUDGET.maxHistoryTurns is a positive integer ≤ 10', () => {
    expect(CONTEXT_BUDGET.maxHistoryTurns).toBeGreaterThan(0);
    expect(CONTEXT_BUDGET.maxHistoryTurns).toBeLessThanOrEqual(10);
  });

  it('CONTEXT_BUDGET.maxHistoryTurnChars is a positive integer ≤ 4000', () => {
    expect(CONTEXT_BUDGET.maxHistoryTurnChars).toBeGreaterThan(0);
    expect(CONTEXT_BUDGET.maxHistoryTurnChars).toBeLessThanOrEqual(4000);
  });
});

describe('Phase 9 measureContextChars', () => {
  const mockSources = [
    { type: 'general' as const, title: 'CodeForge', snippet: 'CodeForge is a released platform.', score: 100, sourceType: 'canonical' as const },
    { type: 'general' as const, title: 'ForgerEMS', snippet: 'ForgerEMS is a Windows technician workbench.', score: 90, sourceType: 'canonical' as const }
  ];

  it('returns a positive number for a simple request', () => {
    const chars = measureContextChars({ message: 'What is CodeForge?', history: [], sources: mockSources });
    expect(chars).toBeGreaterThan(0);
  });

  it('is larger with history than without', () => {
    const history: KaylaConversationMessage[] = [
      { role: 'user', content: 'What is FDS?' },
      { role: 'assistant', content: 'FDS is an independent software studio.' }
    ];
    const withHistory = measureContextChars({ message: 'And CodeForge?', history, sources: mockSources });
    const withoutHistory = measureContextChars({ message: 'And CodeForge?', history: [], sources: mockSources });
    expect(withHistory).toBeGreaterThan(withoutHistory);
  });

  it('does not grow unboundedly with very long history', () => {
    // History with more than maxHistoryTurns entries should be capped
    const longHistory: KaylaConversationMessage[] = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
      content: 'a'.repeat(3000) // Each turn 3000 chars — exceeds maxHistoryTurnChars
    }));
    const chars = measureContextChars({ message: 'What is CodeForge?', history: longHistory, sources: mockSources });
    // With 20 turns, cap to maxHistoryTurns (6), each capped at maxHistoryTurnChars (2000)
    // Max history contribution: 6 × 2000 = 12000 chars
    // Verify it's not unbounded (20 × 3000 = 60000 would be unbounded)
    expect(chars).toBeLessThan(20 * 3000);
  });
});

describe('Phase 9 retrieval: provider grounding includes expected entities', () => {
  it('grounds "visible publicly but not released" on non-released projects', async () => {
    const provider = createProvider();
    const results = await provider.search(
      'Which projects are visible publicly but not released?',
      { route: '/', pageType: 'home' },
      []
    );
    expect(results.length).toBeGreaterThan(0);
    const top = results[0];
    // The answer must not ground on CodeForge (the released project)
    expect(top.id).not.toBe('app-codeforge');
    // It must be a settled canonical answer about non-released projects
    expect(top.settled).toBe(true);
    // The snippet must name multiple non-released projects
    const names = ['KyraBlox', 'FarmStand Finder', 'Kayla AI Publisher', 'We The People'];
    const mentioned = names.filter(n => top.snippet.includes(n));
    expect(mentioned.length).toBeGreaterThanOrEqual(2);
  });
});
