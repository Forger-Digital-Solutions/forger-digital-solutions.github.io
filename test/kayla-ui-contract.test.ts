import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildKaylaApiEndpoints, isSourceLinkSafe } from '../src/components/KaylaCopilot';

const component = readFileSync(new URL('../src/components/KaylaCopilot.astro', import.meta.url), 'utf8');
const controller = readFileSync(new URL('../src/components/KaylaCopilot.ts', import.meta.url), 'utf8');
const supportPage = readFileSync(new URL('../src/pages/support.astro', import.meta.url), 'utf8');

describe('Kayla browser UI contract', () => {
  it('normalizes an empty API setting to the local Astro endpoints', () => {
    expect(buildKaylaApiEndpoints(undefined)).toEqual({
      chat: '/api/kayla/chat',
      health: '/api/kayla/health'
    });
  });

  it('normalizes a workers.dev base URL without duplicating route segments', () => {
    expect(buildKaylaApiEndpoints('https://kayla-api.example.workers.dev/')).toEqual({
      chat: 'https://kayla-api.example.workers.dev/api/kayla/chat',
      health: 'https://kayla-api.example.workers.dev/api/kayla/health'
    });
  });

  it('accepts a complete chat URL and derives the health URL', () => {
    expect(buildKaylaApiEndpoints('https://kayla-api.example.workers.dev/api/kayla/chat')).toEqual({
      chat: 'https://kayla-api.example.workers.dev/api/kayla/chat',
      health: 'https://kayla-api.example.workers.dev/api/kayla/health'
    });
  });

  it('keeps the dialog, status, conversation, label, and input accessible', () => {
    expect(component).toContain('role="dialog"');
    expect(component).toContain('aria-modal="true"');
    expect(component).toContain('role="status"');
    expect(component).toContain('aria-live="polite"');
    expect(component).toContain('for="kayla-input"');
    expect(component).toContain('maxlength="2000"');
  });

  it('provides keyboard dismissal, focus containment, and bounded history', () => {
    expect(controller).toContain("e.key === 'Escape'");
    expect(controller).toContain("e.key === 'Tab'");
    expect(controller).toContain('l.focus()');
    expect(controller).toContain('const MAX_HISTORY = 10');
    expect(controller).toContain('.slice(-MAX_HISTORY)');
  });

  it('excludes style.display-hidden controls from the Tab focus trap', () => {
    // Regression: the starters row and the stop button are hidden with
    // style.display, not the hidden attribute. Filtering the trap's
    // focusable set on el.hidden alone let it compute "last" as an
    // invisible, unfocusable node (the stop button once a message had been
    // sent) — a real Tab press from the last visible control then matched
    // nothing, and focus escaped the open dialog into the rest of the page.
    // Verified live in a browser: after this fix, 6 Tab presses from the
    // composer correctly cycle within the panel; before it, focus landed on
    // the page's own skip-link while the dialog was still visibly open.
    expect(controller).toContain('el.offsetParent !== null');
  });

  it('preserves starters and mobile/reduced-motion behavior', () => {
    expect(component.match(/class="kayla-starter"/g)?.length).toBeGreaterThanOrEqual(6);
    expect(component).toContain('@media (max-width: 480px)');
    expect(component).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('uses the modern clipboard API without a deprecated execCommand fallback', () => {
    expect(supportPage).toContain('navigator.clipboard?.writeText');
    expect(supportPage).not.toContain('document.execCommand');
  });

  it('renders sources over the streaming path and the panel styles them', () => {
    expect(controller).toContain('chunk.sourceLinks');
    expect(controller).toContain('buildSourcesRow');
    expect(component).toContain('.kayla-msg__sources');
  });

  it('only ever links a source to an internal route or an https URL', () => {
    expect(isSourceLinkSafe({ label: 'CodeForge', kind: 'project', route: '/projects/codeforge' })).toBe(true);
    expect(isSourceLinkSafe({ label: 'GitHub', kind: 'github', url: 'https://github.com/Forger-Digital-Solutions/CodeForge' })).toBe(true);
    expect(isSourceLinkSafe({ label: 'Internal knowledge', kind: 'canonical' })).toBe(true);
    expect(isSourceLinkSafe({ label: 'Bad', kind: 'page', route: 'https://evil.example/phish' })).toBe(false);
    expect(isSourceLinkSafe({ label: 'Bad', kind: 'canonical', url: 'javascript:alert(1)' })).toBe(false);
    expect(isSourceLinkSafe({ label: 'Bad', kind: 'canonical', url: 'http://insecure.example' })).toBe(false);
  });
});
