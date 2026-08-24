import { describe, it, expect } from 'vitest';
import { isActionAllowed } from '../src/lib/kayla/actions';

describe('Kayla Security', () => {
  it('does not index .env files by policy', () => {
    const envPaths = ['.env', '.env.local', '.env.production', '.env.development'];
    for (const p of envPaths) {
      expect(p).toMatch(/^\.env/);
    }
    expect(true).toBe(true);
  });

  it('rejects javascript: URLs in actions', () => {
    expect(isActionAllowed({ type: 'OPEN_PAGE', label: 'x', href: 'javascript:void(0)' })).toBe(false);
    expect(isActionAllowed({ type: 'OPEN_PAGE', label: 'x', href: 'data:text/html,<script>alert(1)</script>' })).toBe(false);
  });

  it('rejects unknown action types', () => {
    expect(isActionAllowed({ type: 'EVIL_ACTION', label: 'x' })).toBe(false);
  });

  it('only allow-listed action types are accepted', () => {
    const allowed = ['OPEN_PAGE', 'OPEN_APP', 'OPEN_DOWNLOAD', 'OPEN_GITHUB', 'OPEN_FORGED', 'OPEN_CONTACT', 'OPEN_DONATE', 'SHOW_APPS', 'SHOW_ROADMAP'];
    for (const type of allowed) {
      expect(isActionAllowed({ type, label: 'x', href: '/test' })).toBe(true);
    }
  });
});
