import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildKaylaApiEndpoints } from '../src/components/KaylaCopilot';

const component = readFileSync(new URL('../src/components/KaylaCopilot.astro', import.meta.url), 'utf8');
const controller = readFileSync(new URL('../src/components/KaylaCopilot.ts', import.meta.url), 'utf8');

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

  it('preserves starters and mobile/reduced-motion behavior', () => {
    expect(component.match(/class="kayla-starter"/g)?.length).toBeGreaterThanOrEqual(6);
    expect(component).toContain('@media (max-width: 480px)');
    expect(component).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
