import { describe, expect, it } from 'vitest';
import { emailConfig, getActiveEmail } from '../src/config/email';
import { siteConfig } from '../src/config/site';

describe('FDS Centralized Email Configuration & Security', () => {
  it('confirms the active fallback email is the proven working mailbox', () => {
    expect(emailConfig.activeFallbackEmail).toBe('forgerdigisolsupport@gmail.com');
    expect(siteConfig.supportEmail).toBe('forgerdigisolsupport@gmail.com');
  });

  it('ensures all unverified roles safely fall back to activeFallbackEmail', () => {
    const roles = ['support', 'billing', 'security', 'contact'] as const;

    for (const role of roles) {
      const entry = emailConfig.routes[role];
      expect(entry).toBeDefined();
      expect(entry.role).toBe(role);
      expect(entry.activeAddress).toBe('forgerdigisolsupport@gmail.com');
      expect(entry.status).toBe('pending_domain_verification');
      expect(entry.targetAddress).toBe(`${role}@forgerdigitalsolutions.com`);
      // Active email resolution must always return the active fallback email while pending
      expect(getActiveEmail(role)).toBe('forgerdigisolsupport@gmail.com');
    }
  });

  it('contains no fabricated SPF, DKIM, or DMARC strings in code exports', () => {
    const serialized = JSON.stringify(emailConfig);
    expect(serialized).not.toContain('v=spf1');
    expect(serialized).not.toContain('v=DKIM1');
    expect(serialized).not.toContain('v=DMARC1');
  });
});
