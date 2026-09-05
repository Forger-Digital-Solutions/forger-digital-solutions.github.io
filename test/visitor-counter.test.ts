import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const counter = readFileSync(new URL('../src/components/VisitorCounter.astro', import.meta.url), 'utf8');

describe('visitor counter semantics (one browser visit per 24h)', () => {
  it('gates increments with a 24-hour last-hit window', () => {
    expect(counter).toContain("LAST_HIT_KEY = 'fds_visitor_last_hit'");
    expect(counter).toContain('DEDUP_MS = 24 * 60 * 60 * 1000');
    expect(counter).toMatch(/Date\.now\(\) - lastHit >= DEDUP_MS/);
  });

  it('stores no persistent visitor identifier', () => {
    expect(counter).not.toContain('fds_visitor_id');
    expect(counter).not.toContain('fds_visitor_expiry');
    // The only random value is the ephemeral per-tab claim id.
    expect(counter).toContain('getRandomValues');
  });

  it('reads through the read-only endpoint inside the window', () => {
    expect(counter).toContain("replace('/hit/', '/get/')");
    expect(counter).toMatch(/if \(!eligible\) \{\s*void readCount\(\);/);
  });

  it('records the last-hit timestamp only after a successful hit', () => {
    const hitBody = counter.slice(counter.indexOf('const recordHit'), counter.indexOf('const tryClaim'));
    expect(hitBody).toMatch(/if \(!res\.ok\) throw/);
    expect(hitBody).toMatch(/store\.set\(LAST_HIT_KEY, String\(Date\.now\(\)\)\)/);
  });

  it('keeps multi-tab dedupe: one claim, followers only read', () => {
    expect(counter).toContain('BroadcastChannel');
    expect(counter).toContain('CLAIM_TTL_MS');
    expect(counter).toMatch(/if \(!tryClaim\(\)\)/);
    // A follower never records a hit of its own.
    const follower = counter.slice(counter.indexOf('if (!tryClaim())'), counter.indexOf('setTimeout(recordHit'));
    expect(follower).not.toContain('recordHit()');
    expect(follower).toContain('readCount()');
  });

  it('fails safe: counter stays hidden, no placeholder value, no fake zero', () => {
    expect(counter).toMatch(/data-state="pending"/);
    expect(counter).toMatch(/\[data-state='pending'\]\s*\{\s*visibility: hidden/);
    // setValue (the only path to data-state="ready") runs only after res.ok.
    const setValueBody = counter.slice(counter.indexOf('const setValue'), counter.indexOf('let bc'));
    expect(setValueBody).not.toMatch(/fetch/);
    expect(counter).not.toContain("textContent = '0'");
  });
});
