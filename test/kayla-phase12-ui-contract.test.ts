import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MAX_VISIBLE_MESSAGES } from '../src/components/KaylaCopilot';

const component = readFileSync(new URL('../src/components/KaylaCopilot.astro', import.meta.url), 'utf8');
const controller = readFileSync(new URL('../src/components/KaylaCopilot.ts', import.meta.url), 'utf8');

/**
 * Phase 12 browser-UI static contract.
 *
 * Runtime journeys (stale responses, double-sends, navigation, viewports) are
 * proven in Playwright; this file pins the code shapes those journeys depend
 * on, so a refactor cannot silently remove the guard the E2E relies upon.
 */
describe('Phase 12 UI reliability contract', () => {
  it('ignores late responses from superseded requests (stale-response guard)', () => {
    expect(controller).toContain('requestSeq');
    expect(controller).toContain('isCurrent');
    // A newer turn aborts the previous controller before claiming the sequence.
    expect(controller).toContain('abortController?.abort()');
    // Late completions stay silent instead of touching transcript/status/flag.
    expect(controller).toContain('if (!isCurrent()) return;');
    // The streaming loop stops consuming a superseded stream and frees it.
    expect(controller).toContain('await reader.cancel()');
  });

  it('bounds the visible transcript far above the server history window', () => {
    expect(MAX_VISIBLE_MESSAGES).toBeGreaterThanOrEqual(20);
    expect(controller).toContain('enforceTranscriptBounds');
    expect(controller).toContain('MAX_HISTORY = 10');
  });

  it('keeps double-send protection: sends are ignored while a request is in flight', () => {
    expect(controller).toContain('if (!query.trim() || isProcessing) return;');
    // Enter still sends; Shift+Enter still does not.
    expect(controller).toContain("e.key === 'Enter' && !e.shiftKey");
  });

  it('renders every message as text, never executable HTML', () => {
    expect(controller).toContain('textEl.textContent = msg.text');
    expect(controller).toContain('textEl.textContent = text');
    expect(controller).not.toMatch(/\.innerHTML\s*=\s*(msg\.text|text|streamingText)/);
  });

  it('keeps the stop control, focus recovery, and accessible state announcements', () => {
    expect(controller).toContain("aria-label', 'Stop response'");
    expect(controller).toContain('abortController.abort()');
    expect(controller).toContain('if (isOpen) input()?.focus()');
    expect(component).toContain('role="dialog"');
    expect(component).toContain('aria-live="polite"');
    expect(component).toContain('aria-label="Send message"');
    expect(component).toContain('aria-label="Close Kayla Copilot"');
    expect(component).toContain('for="kayla-input"');
  });

  it('performs no automatic retries (single user-initiated attempt per send)', () => {
    expect(controller).not.toMatch(/setTimeout\(\s*\(\)\s*=>\s*handleQuery/);
    expect(controller).not.toMatch(/for\s*\([^)]*retry/i);
  });

  it('external sources open in a new tab with noopener/noreferrer', () => {
    expect(controller).toContain("link.rel = 'noopener noreferrer'");
    expect(controller).toContain("link.target = '_blank'");
  });
});
