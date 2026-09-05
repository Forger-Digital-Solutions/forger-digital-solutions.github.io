import { describe, it, expect } from 'vitest';
import {
  validateSafeAction,
  sanitizeActions,
  ALLOWED_ACTION_TYPES,
  FORBIDDEN_ACTION_TYPES
} from '../src/lib/kayla/action-validator';
import { handleKaylaChat } from '../src/lib/kayla/handler';

describe('Kayla Action Safety Contract & Mutation Testing (Phase 11)', () => {
  it('rejects every forbidden action type from FORBIDDEN_ACTION_TYPES', () => {
    for (const forbiddenType of FORBIDDEN_ACTION_TYPES) {
      const action = {
        type: forbiddenType,
        label: `Malicious action ${forbiddenType}`,
        href: '/forged'
      };
      const result = validateSafeAction(action, { strictCanonical: true });
      expect(result.valid, `Expected ${forbiddenType} to be rejected`).toBe(false);
      expect(result.violations.some(v => v.includes('explicitly forbidden') || v.includes('not in the allowed read-only whitelist'))).toBe(true);
    }
  });

  it('rejects dangerous protocols in action hrefs', () => {
    const dangerousHrefs = [
      'javascript:alert(document.cookie)',
      'javascript://%0Aalert(1)',
      'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
      'vbscript:msgbox("hello")',
      'file:///C:/Windows/System32/calc.exe',
      'file:///etc/shadow'
    ];

    for (const href of dangerousHrefs) {
      const action = {
        type: 'OPEN_PAGE',
        label: 'Injected Action',
        href
      };
      const result = validateSafeAction(action, { strictCanonical: true });
      expect(result.valid, `Expected ${href} to be rejected`).toBe(false);
      expect(result.violations.some(v => v.includes('forbidden protocol'))).toBe(true);
    }
  });

  it('rejects unlisted internal routes when strictCanonical is enforced', () => {
    const fakeRoutes = [
      '/checkout',
      '/buy-now',
      '/subscribe',
      '/billing',
      '/admin',
      '/api/v1/delete',
      '/projects/non-existent-app'
    ];

    for (const route of fakeRoutes) {
      const action = {
        type: 'OPEN_PAGE',
        label: 'Bogus Route',
        href: route
      };
      const result = validateSafeAction(action, { strictCanonical: true });
      expect(result.valid, `Expected route ${route} to be rejected`).toBe(false);
      expect(result.violations.some(v => v.includes('is not a canonical internal route'))).toBe(true);
    }
  });

  it('rejects unapproved external domains', () => {
    const maliciousUrls = [
      'https://phishing-site.example.com/login',
      'https://fake-fds-store.com/checkout',
      'https://malware-download.net/codeforge.exe'
    ];

    for (const url of maliciousUrls) {
      const action = {
        type: 'OPEN_PAGE',
        label: 'Malicious External Link',
        href: url
      };
      const result = validateSafeAction(action, { strictCanonical: true });
      expect(result.valid, `Expected external URL ${url} to be rejected`).toBe(false);
      expect(result.violations.some(v => v.includes('not in canonical allowed domains'))).toBe(true);
    }
  });

  it('accepts canonical routes and approved external domains', () => {
    const validActions = [
      { type: 'OPEN_PAGE', label: 'Projects', href: '/projects' },
      { type: 'OPEN_FORGED', label: 'Forged', href: '/forged' },
      { type: 'OPEN_PAGE', label: 'Hardware Policy', href: '/support/hardware' },
      { type: 'OPEN_GITHUB', label: 'FDS GitHub', href: 'https://github.com/Forger-Digital-Solutions' },
      { type: 'OPEN_DONATE', label: 'Ko-fi', href: 'https://ko-fi.com/forgerdigitalsolutions' },
      { type: 'OPEN_CONTACT', label: 'Contact', href: 'mailto:support@forgerdigitalsolutions.com' },
      { type: 'SHOW_APPS', label: 'Show Apps' }
    ];

    for (const action of validActions) {
      const result = validateSafeAction(action, { strictCanonical: true });
      expect(result.valid, `Expected valid action ${action.label} to pass`).toBe(true);
    }
  });

  it('sanitizeActions filters out invalid or mutated actions from an action list', () => {
    const mixedActions = [
      { type: 'OPEN_PAGE', label: 'Valid Page', href: '/projects' },
      { type: 'SEND_PAYMENT', label: 'Pay $50', href: '/checkout' },
      { type: 'SUBMIT_FORM', label: 'Submit Email', href: '/subscribe' },
      { type: 'OPEN_FORGED', label: 'Valid Forged', href: '/forged' },
      { type: 'DOWNLOAD_AND_RUN', label: 'Run Binary', href: 'javascript:alert(1)' }
    ];

    const sanitized = sanitizeActions(mixedActions, { strictCanonical: true });
    expect(sanitized).toHaveLength(2);
    expect(sanitized[0].type).toBe('OPEN_PAGE');
    expect(sanitized[1].type).toBe('OPEN_FORGED');
  });

  it('handler rejects provider-injected forbidden actions through verification firewall', async () => {
    // Mock provider returning a forbidden SEND_PAYMENT action
    const mockHostileProvider = {
      id: 'mock',
      name: 'Mock Hostile Provider',
      isAvailable: async () => true,
      chat: async () => ({
        content: 'You can subscribe to CodeForge for $10/month.',
        actions: [
          { type: 'SEND_PAYMENT' as any, label: 'Pay Now', href: 'https://evil.example/pay' }
        ]
      })
    };

    const result = await handleKaylaChat(
      { message: 'How do I pay for CodeForge?' },
      {
        providerConfig: { provider: 'mock' },
        kaylaConfig: { aiEnabled: true }
      }
    );

    // Hostile action MUST be rejected by action firewall
    if (result.response && 'actions' in result.response && result.response.actions) {
      for (const a of result.response.actions) {
        expect(FORBIDDEN_ACTION_TYPES.has(a.type)).toBe(false);
        expect(ALLOWED_ACTION_TYPES.has(a.type)).toBe(true);
      }
    }
  });
});
