import { describe, it, expect } from 'vitest';
import { isActionAllowed } from '../src/lib/kayla/actions';
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
