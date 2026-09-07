import { existsSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const root = new URL('../', import.meta.url);
const layout = readFileSync(new URL('src/layouts/BaseLayout.astro', root), 'utf8');
const favicon = readFileSync(new URL('public/favicon.svg', root), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('public/site.webmanifest', root), 'utf8')) as {
  icons: Array<{ src: string; sizes: string; type: string }>;
};

describe('FDS browser identity smoke contract', () => {
  it('declares one cache-busted FDS icon family without obsolete alternate metadata', () => {
    expect(layout).toContain('href="/favicon.svg?v=fds-r1"');
    expect(layout).toContain('href="/favicon.ico?v=fds-r1"');
    expect(layout).toContain('href="/favicon-48x48.png?v=fds-r1"');
    expect(layout).toContain('href="/apple-touch-icon.png?v=fds-r1"');
    expect(layout).toContain('href="/site.webmanifest?v=fds-r1"');
    expect(layout).not.toContain('rel="alternate icon"');
  });

  it('uses the established orbital FDS symbol rather than a text tile', () => {
    expect(favicon).toContain('Compact adaptation of the established FDS orbital monogram');
    expect(favicon).not.toContain('<text');
    expect(favicon).not.toContain('#1b53d6');
    expect(favicon).not.toContain('>FDS<');
  });

  it('keeps every browser and shortcut asset present and non-empty', () => {
    const expected = [
      ['favicon.svg', 100],
      ['favicon.ico', 500],
      ['favicon-16x16.png', 100],
      ['favicon-32x32.png', 100],
      ['favicon-48x48.png', 100],
      ['apple-touch-icon.png', 100],
      ['icon-192.png', 100],
      ['icon-512.png', 100]
    ] as const;

    for (const [name, minimumBytes] of expected) {
      const path = new URL(`public/${name}`, root);
      expect(existsSync(path), `Missing browser identity asset: ${name}`).toBe(true);
      expect(statSync(path).size, `Empty browser identity asset: ${name}`).toBeGreaterThan(minimumBytes);
    }
  });

  it('version-busts manifest icons and covers install-shortcut sizes', () => {
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: '/icon-192.png?v=fds-r1', sizes: '192x192', type: 'image/png' }),
      expect.objectContaining({ src: '/icon-512.png?v=fds-r1', sizes: '512x512', type: 'image/png' })
    ]));
  });
});
