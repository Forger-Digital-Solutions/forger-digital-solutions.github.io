import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

function walkHtml(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walkHtml(full, acc);
    else if (name.endsWith('.html')) acc.push(full);
  }
  return acc;
}

describe('Live QA Pass Regression Suite', () => {
  it('ships optimized header/footer brand logos (< 15 KB) and keeps the 702 KB original out of Header and Footer', () => {
    const webpPath = join(repoRoot, 'public/images/brand/fds-logo-sm.webp');
    const pngPath = join(repoRoot, 'public/images/brand/fds-logo-sm.png');
    const origPath = join(repoRoot, 'public/images/brand/fds-logo.png');

    expect(existsSync(webpPath)).toBe(true);
    expect(existsSync(pngPath)).toBe(true);
    expect(existsSync(origPath)).toBe(true);
    expect(statSync(webpPath).size).toBeLessThan(15 * 1024);
    expect(statSync(pngPath).size).toBeLessThan(15 * 1024);

    const header = readFileSync(join(repoRoot, 'src/components/Header.astro'), 'utf8');
    const footer = readFileSync(join(repoRoot, 'src/components/Footer.astro'), 'utf8');
    expect(header).toContain('/images/brand/fds-logo-sm.webp');
    expect(header).toContain('/images/brand/fds-logo-sm.png');
    expect(header).not.toContain('/images/brand/fds-logo.png');
    expect(footer).toContain('/images/brand/fds-logo-sm.webp');
    expect(footer).toContain('/images/brand/fds-logo-sm.png');
    expect(footer).not.toContain('/images/brand/fds-logo.png');
  });

  it('ships a 1200x630 JPG social image alongside WebP in BaseLayout, homepage, and Hub page', () => {
    const jpgPath = join(repoRoot, 'public/images/og/studio-intelligence-hub.jpg');
    expect(existsSync(jpgPath)).toBe(true);
    expect(statSync(jpgPath).size).toBeGreaterThan(10 * 1024);

    const baseLayout = readFileSync(join(repoRoot, 'src/layouts/BaseLayout.astro'), 'utf8');
    const homepage = readFileSync(join(repoRoot, 'src/pages/index.astro'), 'utf8');
    const hubPage = readFileSync(join(repoRoot, 'src/pages/solutions/studio-intelligence-hub/index.astro'), 'utf8');

    expect(baseLayout).toContain('ogImageWebp?: string');
    expect(baseLayout).toContain('property="og:image:type"');
    expect(baseLayout).toContain('property="og:image:width" content="1200"');
    expect(baseLayout).toContain('property="og:image:height" content="630"');
    expect(homepage).toContain('ogImage="/images/og/studio-intelligence-hub.jpg"');
    expect(homepage).toContain('ogImageWebp={hub.hero.image}');
    expect(hubPage).toContain('ogImage="/images/og/studio-intelligence-hub.jpg"');
    expect(hubPage).toContain('ogImageWebp={hub.hero.image}');
  });

  it('includes a Studio Intelligence Hub link on the 404 page', () => {
    const page404 = readFileSync(join(repoRoot, 'src/pages/404.astro'), 'utf8');
    expect(page404).toContain('href="/solutions/studio-intelligence-hub/"');
    expect(page404).toContain('Studio Intelligence Hub');
  });

  it('keeps the floating Ask Kayla button compact at narrow widths with footer clearance', () => {
    const kayla = readFileSync(join(repoRoot, 'src/components/KaylaCopilot.astro'), 'utf8');
    const footer = readFileSync(join(repoRoot, 'src/components/Footer.astro'), 'utf8');
    expect(kayla).toContain('@media (max-width: 768px)');
    expect(kayla).toContain('width: 2.75rem');
    expect(kayla).toContain('height: 2.75rem');
    expect(footer).toContain('env(safe-area-inset-bottom, 0px)');
  });

  it('keeps all built HTML page meta descriptions at or under 160 characters when dist/ is present', () => {
    const distDir = join(repoRoot, 'dist');
    const htmlFiles = walkHtml(distDir);
    if (htmlFiles.length === 0) return;

    const violations: string[] = [];
    for (const file of htmlFiles) {
      const html = readFileSync(file, 'utf8');
      const match = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
      if (!match) {
        violations.push(`${file}: missing meta description`);
        continue;
      }
      const desc = match[1]
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&mdash;/g, '—')
        .replace(/&ndash;/g, '–');
      if (desc.length > 160) {
        violations.push(`${file.replace(`${distDir}/`, '')} (${desc.length} chars): ${desc}`);
      }
    }
    expect(violations).toEqual([]);
  });
});
