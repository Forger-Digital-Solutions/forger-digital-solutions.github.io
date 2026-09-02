import { describe, it, expect } from 'vitest';
import { apps, appAliases, resolveAppId } from '../src/data/kayla/apps';
import { forgerems } from '../src/data/kayla/apps/forgerems';
import { roadmap } from '../src/data/kayla/roadmap';
import { community } from '../src/data/kayla/community';
import { downloads } from '../src/data/kayla/downloads';
import { forged } from '../src/data/kayla/ecosystem/forged';
import { fds } from '../src/data/kayla/company/fds';
import { founder } from '../src/data/kayla/company/founder';
import { faqs } from '../src/data/kayla/support';
import { releases, getLatestRelease, getReleaseForApp } from '../src/data/kayla/releases';
import { githubRepos, getGithubRepo } from '../src/data/kayla/github';
import { officialSites, getOfficialSite, getEnabledOfficialSites } from '../src/data/kayla/sites';
import { productRelationships, getRelationshipsForApp } from '../src/data/kayla/relationships';
import { retrieveKnowledge, getRetrievalIndexSize, resolveEntity } from '../src/data/kayla/retrieval';
import { kaylaKnowledge } from '../src/data/kayla/index';
import { products } from '../src/data/products';

describe('Kayla Knowledge Pipeline - Apps', () => {
  it('has every current project plus the ForgerEMS product', () => {
    const requiredIds = ['gems-training-grounds', 'kyrablox', 'kayla-ai-publisher', 'we-the-people', 'farmstand-finder', 'forgerems'];
    for (const id of requiredIds) {
      const app = apps.find(a => a.id === id);
      expect(app).toBeDefined();
    }
  });

  it('normalized app model has required fields', () => {
    for (const app of apps) {
      expect(app.id).toBeTruthy();
      expect(app.name).toBeTruthy();
      expect(app.aliases.length).toBeGreaterThan(0);
      expect(app.tagline).toBeTruthy();
      expect(app.description).toBeTruthy();
      expect(app.status).toBeTruthy();
      expect(app.category).toBeTruthy();
      expect(app.summary).toBeTruthy();
      expect(app.purpose).toBeTruthy();
    }
  });

  it('app IDs are unique', () => {
    const ids = apps.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('app aliases map to valid app IDs', () => {
    const validIds = new Set(apps.map(a => a.id));
    for (const [alias, id] of Object.entries(appAliases)) {
      expect(validIds.has(id)).toBe(true);
    }
  });

  it('alias keys are unique', () => {
    const keys = Object.keys(appAliases);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('resolves aliases correctly', () => {
    expect(resolveAppId('gems')).toBe('gems-training-grounds');
    expect(resolveAppId('kyrablox')).toBe('kyrablox');
    expect(resolveAppId('kayla')).toBe('kayla-ai-publisher');
    expect(resolveAppId('we the people')).toBe('we-the-people');
    expect(resolveAppId('farmstand')).toBe('farmstand-finder');
    expect(resolveAppId('forgerems')).toBe('forgerems');
  });
});

describe('Kayla Knowledge Pipeline - ForgerEMS', () => {
  it('has required metadata', () => {
    expect(forgerems.id).toBe('forgerems');
    expect(forgerems.name).toBe('ForgerEMS');
    expect(forgerems.status).toBe('public-beta');
    expect(forgerems.category).toBe('Technician Workbench');
    expect(forgerems.platforms).toEqual(['Windows']);
    expect(forgerems.documentation).toBe('https://github.com/Forger-Digital-Solutions/ForgerEMS');
  });

  it('has download info', () => {
    expect(forgerems.download).toBe('https://github.com/Forger-Digital-Solutions/ForgerEMS/releases');
    expect(forgerems.downloads).toContain('https://github.com/Forger-Digital-Solutions/ForgerEMS/releases');
  });

  it('has changelog/FAQ data', () => {
    expect(forgerems.faq?.length).toBeGreaterThan(0);
    expect(forgerems.limitations?.length).toBeGreaterThan(0);
  });
});

describe('Kayla Knowledge Pipeline - Releases', () => {
  it('has at least one release', () => {
    expect(releases.length).toBeGreaterThan(0);
  });

  it('release statuses are valid', () => {
    const validStatuses = new Set(['stable', 'preview', 'beta', 'experimental']);
    for (const release of releases) {
      expect(validStatuses.has(release.status)).toBe(true);
    }
  });

  it('getLatestRelease returns correct release', () => {
    const latest = getLatestRelease('forgerems');
    expect(latest).toBeDefined();
    expect(latest?.version).toBe('v1.2.3-preview.1');
  });

  it('getReleaseForApp returns correct release', () => {
    const release = getReleaseForApp('forgerems');
    expect(release).toBeDefined();
    expect(release?.version).toBe('v1.2.3-preview.1');
  });
});

describe('Kayla Knowledge Pipeline - GitHub Registry', () => {
  it('has at least one repository', () => {
    expect(githubRepos.length).toBeGreaterThan(0);
  });

  it('repository URLs are valid GitHub URLs', () => {
    for (const repo of githubRepos) {
      expect(repo.url).toMatch(/^https:\/\/github\.com\//);
    }
  });

  it('getGithubRepo resolves correctly', () => {
    const repo = getGithubRepo('ForgerEMS');
    expect(repo).toBeDefined();
    expect(repo?.url).toBe('https://github.com/forger-digital-solutions/ForgerEMS');
  });
});

describe('Kayla Knowledge Pipeline - Official Sites', () => {
  it('has at least one official site', () => {
    expect(officialSites.length).toBeGreaterThan(0);
  });

  it('site origins are valid URLs', () => {
    for (const site of officialSites) {
      expect(site.origin).toMatch(/^https?:\/\//);
    }
  });

  it('getOfficialSite resolves correctly', () => {
    const site = getOfficialSite('fds-website');
    expect(site).toBeDefined();
    expect(site?.name).toBe('Forger Digital Solutions Official Website');
  });

  it('getEnabledOfficialSites returns only enabled sites', () => {
    const enabled = getEnabledOfficialSites();
    for (const site of enabled) {
      expect(site.enabled).toBe(true);
    }
  });
});

describe('Kayla Knowledge Pipeline - Product Relationships', () => {
  const validTargets = new Set([...apps.map(a => a.id), 'forged']);

  it('has relationships defined', () => {
    expect(productRelationships.length).toBeGreaterThan(0);
  });

  it('relationship targets reference valid apps or entities', () => {
    for (const rel of productRelationships) {
      expect(validTargets.has(rel.from) || rel.from === 'kayla-ai-publisher').toBe(true);
      expect(validTargets.has(rel.to)).toBe(true);
    }
  });

  it('relationship types are valid', () => {
    const validTypes = new Set(['relatedTo', 'companionTo', 'publishedThrough', 'partOf', 'supports']);
    for (const rel of productRelationships) {
      expect(validTypes.has(rel.relation)).toBe(true);
    }
  });

  it('getRelationshipsForApp returns correct relationships', () => {
    const rels = getRelationshipsForApp('gems-training-grounds');
    expect(rels.length).toBeGreaterThan(0);
  });
});

describe('Kayla Knowledge Pipeline - Retrieval Index', () => {
  it('index has documents', () => {
    const size = getRetrievalIndexSize();
    expect(size).toBeGreaterThan(10);
  });

  it('resolves entities for all apps', () => {
    const appIds = apps.map(a => a.id);
    for (const id of appIds) {
      const resolved = resolveEntity(id);
      expect(resolved).toBe(id);
    }
  });

  it('retrieves FDS company info', () => {
    const results = retrieveKnowledge('what is forger digital solutions');
    expect(results.length).toBeGreaterThan(0);
  });

  it('retrieves ForgerEMS info', () => {
    const results = retrieveKnowledge('forgerems');
    expect(results.length).toBeGreaterThan(0);
    const combined = results.map(r => r.doc.text.toLowerCase()).join(' ');
    expect(combined).toContain('forgerems');
  });

  it('retrieves roadmap info', () => {
    const results = retrieveKnowledge('roadmap');
    expect(results.length).toBeGreaterThan(0);
  });

  it('retrieves founder info', () => {
    const results = retrieveKnowledge('founder');
    expect(results.length).toBeGreaterThan(0);
    const combined = results.map(r => r.doc.text.toLowerCase()).join(' ');
    expect(combined).toContain('edward schmidt');
  });

  it('retrieves release info', () => {
    const results = retrieveKnowledge('forgerems version');
    expect(results.length).toBeGreaterThan(0);
  });
});

describe('Kayla Knowledge Pipeline - Duplicate Detection', () => {
  it('has no duplicate app IDs', () => {
    const ids = apps.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has no duplicate aliases mapping to different IDs', () => {
    const aliasToId = new Map();
    for (const [alias, id] of Object.entries(appAliases)) {
      if (aliasToId.has(alias) && aliasToId.get(alias) !== id) {
        expect(true).toBe(false);
      }
      aliasToId.set(alias, id);
    }
  });

  it('has no duplicate release versions for same app', () => {
    const seen = new Map();
    for (const release of releases) {
      const key = `${release.appId}:${release.version}`;
      if (seen.has(key)) {
        expect(true).toBe(false);
      }
      seen.set(key, true);
    }
  });
});

describe('Kayla Knowledge Pipeline - Source Authority', () => {
  it('keeps ForgerEMS version and download synchronized across canonical registries', () => {
    const product = products.find(p => p.slug === 'forgerems');
    const release = releases.find(r => r.appId === 'forgerems');
    const download = downloads.find(d => d.appId === 'forgerems');
    expect(product?.version).toBe('v1.2.3-preview.1');
    expect(release?.version).toBe(product?.version);
    expect(download?.version).toBe(product?.version);
    expect(release?.downloads?.[0]).toBe(product?.downloadUrl);
    expect(download?.href).toBe(product?.downloadUrl);
  });
  it('kaylaKnowledge exports all required data', () => {
    expect(kaylaKnowledge.company).toBeDefined();
    expect(kaylaKnowledge.founder).toBeDefined();
    expect(kaylaKnowledge.apps.length).toBeGreaterThan(0);
    expect(kaylaKnowledge.roadmap.length).toBeGreaterThan(0);
    expect(kaylaKnowledge.downloads.length).toBeGreaterThan(0);
    expect(kaylaKnowledge.forged.length).toBeGreaterThan(0);
    expect(kaylaKnowledge.releases.length).toBeGreaterThan(0);
    expect(kaylaKnowledge.github.length).toBeGreaterThan(0);
    expect(kaylaKnowledge.sites.length).toBeGreaterThan(0);
    expect(kaylaKnowledge.relationships.length).toBeGreaterThan(0);
    expect(kaylaKnowledge.forgerems).toBeDefined();
  });
});
