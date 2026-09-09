import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { products, featuredProducts } from '../src/data/products';

const homepage = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
const forgedPage = readFileSync(new URL('../src/pages/forged.astro', import.meta.url), 'utf8');
const productCard = readFileSync(new URL('../src/components/ProductCard.astro', import.meta.url), 'utf8');

describe('FDS Software Distribution Architecture', () => {
  it('ensures homepage is not a raw download directory and links to /forged', () => {
    // Old raw available list should not be present
    expect(homepage).not.toContain('class="available"');
    expect(homepage).not.toContain('class="available__list"');
    expect(homepage).not.toContain("import { products } from '../data/products'");

    // New distribution portal section should guide users to /forged
    expect(homepage).toContain('class="distribution-portal"');
    expect(homepage).toContain('href="/forged"');
    expect(homepage).toContain('Public Releases // Distribution');
    expect(homepage).toContain('Open Forged Releases');
  });

  it('validates truthful allowlisted products metadata', () => {
    expect(products.length).toBe(2);

    const codeforge = products.find((p) => p.slug === 'codeforge');
    expect(codeforge).toBeDefined();
    expect(codeforge?.version).toBe('v0.2.0');
    expect(codeforge?.status).toBe('released');
    expect(codeforge?.pricingModel).toBe('free');
    expect(codeforge?.downloadUrl).toBe('https://github.com/Forger-Digital-Solutions/CodeForge/releases/latest');
    expect(codeforge?.upgradeUrl).toBe('/codeforge/upgrade');

    const forgerems = products.find((p) => p.slug === 'forgerems');
    expect(forgerems).toBeDefined();
    expect(forgerems?.version).toBe('v1.2.3-preview.1');
    expect(forgerems?.status).toBe('public-beta');
    expect(forgerems?.downloadUrl).toBe('https://github.com/Forger-Digital-Solutions/ForgerEMS/releases');
  });

  it('forged shelf displays verified distribution badges and layout', () => {
    expect(forgedPage).toContain('class="distribution-badges"');
    expect(forgedPage).toContain('Verified Public Builds');
    expect(forgedPage).toContain('Free-First Architecture');
    expect(forgedPage).toContain('Standalone Windows Binaries');
    expect(forgedPage).toContain('<ProductCard');
  });

  it('separates download action from commercial upgrade action in ProductCard', () => {
    expect(productCard).toContain('product.downloadUrl');
    expect(productCard).toContain('Download {product.name}');
    expect(productCard).toContain('product.upgradeUrl');
    expect(productCard).toContain('Upgrade & Licensing');
  });
});
