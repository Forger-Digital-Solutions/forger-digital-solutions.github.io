import { describe, it, expect } from 'vitest';
import { createProvider } from '../src/lib/kayla/provider';

describe('Kayla Search', () => {
  const provider = createProvider();

  it('app lookup returns GEMS for "gems"', async () => {
    const results = await provider.search('gems');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toContain('GEMS');
  });

  it('ForgerEMS lookup returns ForgerEMS info', async () => {
    const results = await provider.search('forgerems');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].snippet.toLowerCase()).toContain('forgerems');
  });

  it('download lookup returns ForgerEMS download info', async () => {
    const results = await provider.search('download forgerems');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].snippet.toLowerCase()).toContain('forgerems');
  });

  it('FDS lookup returns company info', async () => {
    const results = await provider.search('what is forger digital solutions');
    expect(results.length).toBeGreaterThan(0);
    expect(['general', 'faq', 'company', 'app']).toContain(results[0].type);
    const snippet = results[0].snippet.toLowerCase();
    expect(snippet.includes('independent') || snippet.includes('forger')).toBe(true);
  });

  it('roadmap lookup returns roadmap info', async () => {
    const results = await provider.search('what is on the roadmap');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].snippet).toContain('GEMS');
  });

  it('unknown query returns no results message', async () => {
    const results = await provider.search('xyznonexistent');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toBe('No results');
  });
});
