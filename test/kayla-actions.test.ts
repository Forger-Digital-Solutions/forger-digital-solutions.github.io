import { describe, it, expect } from 'vitest';
import { isActionAllowed, dedupeActions } from '../src/lib/kayla/actions';
import type { KaylaSafeAction } from '../src/data/kayla/types';

describe('Kayla Actions', () => {
  const allowedAction: KaylaSafeAction = {
    type: 'OPEN_PAGE',
    label: 'Test',
    href: '/test'
  };

  const dangerousAction = {
    type: 'OPEN_PAGE',
    label: 'Bad',
    href: 'javascript:alert(1)'
  } as unknown as KaylaSafeAction;

  const arbitraryAction = {
    type: 'ARBITRARY_JS',
    label: 'Bad'
  } as unknown as KaylaSafeAction;

  it('allows valid internal page action', () => {
    expect(isActionAllowed(allowedAction)).toBe(true);
  });

  it('rejects javascript: URLs', () => {
    expect(isActionAllowed(dangerousAction)).toBe(false);
  });

  it('rejects arbitrary action types', () => {
    expect(isActionAllowed(arbitraryAction)).toBe(false);
  });

  it('allows OPEN_DOWNLOAD with valid href', () => {
    expect(isActionAllowed({ type: 'OPEN_DOWNLOAD', label: 'Download', href: '/downloads/test.zip' })).toBe(true);
  });

  it('allows OPEN_GITHUB with valid href', () => {
    expect(isActionAllowed({ type: 'OPEN_GITHUB', label: 'GitHub', href: 'https://github.com/test' })).toBe(true);
  });
});

describe('Action deduplication', () => {
  it('keeps only the first action pointing at a given destination', () => {
    const actions: KaylaSafeAction[] = [
      { type: 'OPEN_APP', label: 'View CodeForge', href: '/projects/codeforge' },
      { type: 'OPEN_APP', label: 'View official release', href: '/projects/codeforge' },
      { type: 'OPEN_GITHUB', label: 'GitHub', href: 'https://github.com/Forger-Digital-Solutions/CodeForge' }
    ];
    expect(dedupeActions(actions)).toEqual([
      { type: 'OPEN_APP', label: 'View CodeForge', href: '/projects/codeforge' },
      { type: 'OPEN_GITHUB', label: 'GitHub', href: 'https://github.com/Forger-Digital-Solutions/CodeForge' }
    ]);
  });

  it('keeps distinct actions to the same type with different destinations', () => {
    const actions: KaylaSafeAction[] = [
      { type: 'OPEN_APP', label: 'View CodeForge', href: '/projects/codeforge' },
      { type: 'OPEN_APP', label: 'View GEMS', href: '/projects/gems-training-grounds' }
    ];
    expect(dedupeActions(actions)).toHaveLength(2);
  });

  it('treats href-less actions like SHOW_APPS as one destination each', () => {
    const actions: KaylaSafeAction[] = [
      { type: 'SHOW_APPS', label: 'View All Projects' },
      { type: 'SHOW_APPS', label: 'See Everything' }
    ];
    expect(dedupeActions(actions)).toHaveLength(1);
  });

  it('leaves undefined and empty input alone', () => {
    expect(dedupeActions(undefined)).toBeUndefined();
    expect(dedupeActions([])).toEqual([]);
  });
});
