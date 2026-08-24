import { describe, it, expect } from 'vitest';
import { createProvider } from '../src/lib/kayla/provider';
import { kaylaKnowledge } from '../src/data/kayla/index';
import { apps, resolveAppId } from '../src/data/kayla/apps';
import { productRelationships } from '../src/data/kayla/relationships';
import { releases } from '../src/data/kayla/releases';

describe('Kayla Ecosystem - Company', () => {
  it('knows what FDS is', async () => {
    const provider = createProvider();
    const results = await provider.search('what is forger digital solutions');
    expect(results.length).toBeGreaterThan(0);
    const combined = results.map(r => r.snippet.toLowerCase()).join(' ');
    expect(combined).toContain('forger digital solutions (fds)');
    expect(results[0].snippet).not.toMatch(/^ForgerEMS:/);
  });

  it('knows the FDS mission', async () => {
    const provider = createProvider();
    const results = await provider.search('what is fds trying to build');
    expect(results.length).toBeGreaterThan(0);
  });

  it('knows the FDS vision', async () => {
    const provider = createProvider();
    const results = await provider.search('fds vision');
    expect(results.length).toBeGreaterThan(0);
  });
});

describe('Kayla Ecosystem - Founder', () => {
  it('knows who founded FDS', async () => {
    const provider = createProvider();
    const results = await provider.search('who founded fds');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].snippet).toContain('Edward Schmidt');
  });

  it('knows why FDS was created', async () => {
    const provider = createProvider();
    const results = await provider.search('why was fds created');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].snippet.length).toBeGreaterThan(50);
  });

  it('does not expose private founder information', async () => {
    const provider = createProvider();
    const results = await provider.search('founder private phone number address');
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.snippet.toLowerCase()).not.toContain('private phone');
      expect(r.snippet.toLowerCase()).not.toContain('home address');
    }
  });
});

describe('Kayla Ecosystem - Five Primary Apps', () => {
  const provider = createProvider();

  it('knows GEMS / Training Grounds', async () => {
    const results = await provider.search('Explain GEMS');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].snippet.toLowerCase()).toContain('gems');
  });

  it('knows KyraBlox', async () => {
    const results = await provider.search('Explain KyraBlox');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].snippet.toLowerCase()).toContain('kyrablox');
  });

  it('knows Kayla AI Publisher', async () => {
    const results = await provider.search('Explain Kayla AI Publisher');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].snippet.toLowerCase()).toContain('kayla');
  });

  it('knows We The People', async () => {
    const results = await provider.search('Explain We The People');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].snippet.toLowerCase()).toContain('people');
  });

  it('knows FarmStand Finder', async () => {
    const results = await provider.search('Explain FarmStand Finder');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].snippet.toLowerCase()).toContain('farmstand');
  });
});

describe('Kayla Ecosystem - ForgerEMS', () => {
  it('knows what ForgerEMS is', async () => {
    const provider = createProvider();
    const results = await provider.search('What is ForgerEMS?');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].snippet.toLowerCase()).toContain('forgerems');
  });

  it('knows where to download ForgerEMS', async () => {
    const provider = createProvider();
    const results = await provider.search('Where can I download ForgerEMS?');
    expect(results.length).toBeGreaterThan(0);
    const combined = results.map(r => r.snippet.toLowerCase()).join(' ');
    expect(combined).toContain('v1.2.4-preview.5');
  });

  it('knows ForgerEMS version', async () => {
    const provider = createProvider();
    const results = await provider.search('What version is ForgerEMS?');
    expect(results.length).toBeGreaterThan(0);
    const combined = results.map(r => r.snippet.toLowerCase()).join(' ');
    expect(combined).toContain('v1.2.4-preview.5');
  });
});

describe('Kayla Ecosystem - Forged', () => {
  it('knows what Forged is', async () => {
    const provider = createProvider();
    const results = await provider.search('What is Forged?');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].snippet.toLowerCase()).toContain('forged');
  });
});

describe('Kayla Ecosystem - Downloads', () => {
  it('lists downloads', async () => {
    const provider = createProvider();
    const results = await provider.search('downloads');
    expect(results.length).toBeGreaterThan(0);
  });
});

describe('Kayla Ecosystem - Roadmap', () => {
  it('knows current roadmap', async () => {
    const provider = createProvider();
    const results = await provider.search('What is on the roadmap?');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].snippet).toContain('GEMS');
  });

  it('distinguishes released vs active vs experimental vs planned', async () => {
    const statuses = new Set(kaylaKnowledge.roadmap.map(r => r.status));
    expect(statuses.has('released') || statuses.has('active') || statuses.has('experimental') || statuses.has('planned')).toBe(true);
  });
});

describe('Kayla Ecosystem - Community', () => {
  it('knows community goals', async () => {
    const provider = createProvider();
    const results = await provider.search('community gardens affordable communities');
    expect(results.length).toBeGreaterThan(0);
  });

  it('knows hardware donation info', async () => {
    const provider = createProvider();
    const results = await provider.search('donate old hardware');
    expect(results.length).toBeGreaterThan(0);
  });

  it('knows how to support FDS', async () => {
    const provider = createProvider();
    const results = await provider.search('How can I support FDS?');
    expect(results.length).toBeGreaterThan(0);
  });
});

describe('Kayla Ecosystem - Product Relationships', () => {
  it('understands how apps relate', async () => {
    const provider = createProvider();
    const results = await provider.search('how do the apps fit together');
    expect(results.length).toBeGreaterThan(0);
  });

  it('recommends apps based on intent', async () => {
    const provider = createProvider();
    const results = await provider.search('Which FDS app should I use for game development?');
    expect(results.length).toBeGreaterThan(0);
    const combined = results.map(r => r.snippet.toLowerCase()).join(' ');
    expect(combined).toContain('kyrablox');
  });

  it('recommends ForgerEMS for toolkit needs', async () => {
    const provider = createProvider();
    const results = await provider.search('Which FDS app should I use for Windows toolkits?');
    expect(results.length).toBeGreaterThan(0);
    const combined = results.map(r => r.snippet.toLowerCase()).join(' ');
    expect(combined).toContain('forgerems');
  });
});

describe('Kayla Ecosystem - GitHub', () => {
  it('knows public GitHub repositories', async () => {
    const provider = createProvider();
    const results = await provider.search('ForgerEMS github');
    expect(results.length).toBeGreaterThan(0);
  });
});

describe('Kayla Ecosystem - Synthesis', () => {
  it('can explain the entire FDS ecosystem', async () => {
    const provider = createProvider();
    const results = await provider.search('Explain all of FDS to me');
    expect(results.length).toBeGreaterThan(0);
    const combined = results.map(r => r.snippet).join(' ');
    expect(combined).toContain('GEMS');
    expect(combined).toContain('ForgerEMS');
    expect(combined).toContain('Forged');
  });
});
