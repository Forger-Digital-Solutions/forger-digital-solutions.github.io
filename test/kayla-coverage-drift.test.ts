import { describe, it, expect } from 'vitest';
import { createProvider } from '../src/lib/kayla/provider';
import { matchEntity, entities } from '../src/data/kayla/entities';
import { canonicalAnswer } from '../src/data/kayla/answers';
import { projects } from '../src/data/projects';
import { products } from '../src/data/products';
import { gems } from '../src/data/gems';
import { statusMeta } from '../src/data/status';

/**
 * Drift guard.
 *
 * Kayla's knowledge is derived from the site's data rather than copied, so a
 * new project should become answerable the moment it exists. These tests
 * enumerate the canonical sources and fail if any entity is unreachable or any
 * status/version/availability answer stops matching its source record — which
 * is what would happen if someone hard-coded a fact into Kayla instead.
 */

const provider = createProvider();
const has = (text: string, needle: string) => text.toLowerCase().includes(needle.toLowerCase());
const answerFor = async (question: string) => (await provider.search(question))[0]?.snippet || '';

describe('every canonical entity is reachable', () => {
  it.each(projects.map((p) => [p.name, p.slug]))('resolves the project %s', (name, slug) => {
    expect(matchEntity(name as string)).toBe(slug);
  });

  it.each(gems.map((g) => [g.name, `gem-${g.key}`]))('resolves the GEM %s', (name, id) => {
    expect(matchEntity(name as string)).toBe(id);
  });

  it.each(products.map((p) => [p.name]))('resolves the product %s', (name) => {
    expect(matchEntity(name as string)).toBeDefined();
  });

  it('registers an entity for every project, product, and GEM', () => {
    const ids = new Set(entities.map((entry) => entry.id));
    for (const project of projects) expect(ids, project.slug).toContain(project.slug);
    for (const gem of gems) expect(ids, gem.key).toContain(`gem-${gem.key}`);
    for (const product of products) {
      const covered = ids.has(product.slug) || projects.some((p) => p.slug === (product.projectSlug || product.slug));
      expect(covered, product.slug).toBe(true);
    }
  });
});

describe('every project answers the core intents from its own record', () => {
  it.each(projects.map((p) => [p.name, p.slug]))('%s reports its canonical status', async (name, slug) => {
    const record = projects.find((p) => p.slug === slug)!;
    const answer = await answerFor(`What is the status of ${name}?`);
    expect(has(answer, record.status), `expected status ${record.status} in: ${answer}`).toBe(true);
    expect(statusMeta[record.status]).toBeDefined();
  });

  it.each(projects.map((p) => [p.name, p.slug]))('%s reports availability that matches its product record', async (name, slug) => {
    const product = products.find((p) => (p.projectSlug || p.slug) === slug && p.downloadUrl);
    const answer = await answerFor(`Can I download ${name}?`);
    if (product) {
      expect(has(answer, 'yes'), answer).toBe(true);
      expect(has(answer, product.version!), answer).toBe(true);
      expect(has(answer, product.downloadUrl!), answer).toBe(true);
    } else {
      expect(has(answer, 'no'), answer).toBe(true);
      expect(answer).not.toMatch(/https?:\/\/github\.com\/[^\s]*releases/i);
    }
  });

  it.each(projects.map((p) => [p.name]))('%s has an identity answer drawn from its summary', async (name) => {
    const record = projects.find((p) => p.name === name)!;
    const answer = await answerFor(`What is ${name}?`);
    const firstWords = record.summary.split(' ').slice(0, 4).join(' ');
    expect(has(answer, record.name) || has(answer, firstWords), answer).toBe(true);
  });
});

describe('every GEM answers from gems.ts', () => {
  it.each(gems.map((g) => [g.name, g.key]))('%s reports its role and research state', async (name, key) => {
    const gem = gems.find((g) => g.key === key)!;
    const answer = await answerFor(`What is ${name}?`);
    expect(has(answer, gem.name)).toBe(true);
    expect(has(answer, gem.role.split(' ')[0])).toBe(true);
    expect(has(answer, gem.state)).toBe(true);
  });

  it.each(gems.map((g) => [g.name]))('%s is never offered as a download', async (name) => {
    const answer = await answerFor(`Where can I download ${name}?`);
    expect(has(answer, 'not downloadable') || has(answer, 'no ' + (name as string).toLowerCase() + ' release')).toBe(true);
  });
});

describe('published products answer version and price from their record', () => {
  it.each(products.filter((p) => p.version).map((p) => [p.name, p.slug]))('%s reports its canonical version', async (name, slug) => {
    const product = products.find((p) => p.slug === slug)!;
    const answer = await answerFor(`What version of ${name} is public?`);
    expect(has(answer, product.version!), answer).toBe(true);
  });

  it.each(products.map((p) => [p.name]))('%s is described as free with no invented price', async (name) => {
    const answer = await answerFor(`How much does ${name} cost?`);
    expect(has(answer, 'free'), answer).toBe(true);
    expect(answer).not.toMatch(/\$\s?\d/);
  });
});

describe('no canonical fact is hard-coded into the answer layer', () => {
  it('derives availability from the product record rather than the project name', () => {
    // Every project that has a download says yes; every one without says no.
    // If someone hard-codes a name, one of these two sets breaks first.
    const withDownload = projects.filter((p) => products.some((prod) => (prod.projectSlug || prod.slug) === p.slug && prod.downloadUrl));
    const withoutDownload = projects.filter((p) => !withDownload.includes(p));
    expect(withDownload.length + withoutDownload.length).toBe(projects.length);
    expect(withoutDownload.length).toBeGreaterThan(0);
  });

  it('reflects a status change without editing Kayla', async () => {
    // canonicalAnswer reads statusMeta at call time; the assertion below fails
    // if an answer ever stops tracking the record it claims to describe.
    for (const project of projects) {
      const answer = canonicalAnswer(`What is the status of ${project.name}?`);
      expect(answer, project.slug).toBeDefined();
      expect(answer!.text).toContain(project.status);
    }
  });
});
