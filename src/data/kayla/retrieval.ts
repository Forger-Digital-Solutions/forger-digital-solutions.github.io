import type { KaylaKnowledgeResult, KaylaPageContext } from './types';
import { forgerems } from './apps/forgerems';
import { faqs } from './support';
import { fds } from './company/fds';
import { founder } from './company/founder';
import { apps, appAliases } from './apps';
import { roadmap } from './roadmap';
import { community } from './community';
import { downloads } from './downloads';
import { releases } from './releases';
import { githubRepos } from './github';
import { officialSites } from './sites';

export interface KaylaDocument {
  id: string;
  type: KaylaKnowledgeResult['type'];
  title: string;
  text: string;
  route?: string;
  entityId?: string;
  tags: string[];
  weight: number;
}

export interface KaylaScoredResult {
  doc: KaylaDocument;
  score: number;
}

const FUZZY_THRESHOLD = 0.6;

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  return normalizeText(text).split(' ').filter(t => t.length > 0);
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export function fuzzySimilarity(a: string, b: string): number {
  const normalizedA = normalizeText(a);
  const normalizedB = normalizeText(b);
  if (normalizedA === normalizedB) return 1;
  if (normalizedA.length === 0 || normalizedB.length === 0) return 0;

  const distance = levenshteinDistance(normalizedA, normalizedB);
  const maxLen = Math.max(normalizedA.length, normalizedB.length);
  return 1 - distance / maxLen;
}

function fuzzyTokenMatch(queryToken: string, targetTokens: string[]): number {
  let bestScore = 0;
  for (const target of targetTokens) {
    if (target === queryToken) return 1;
    if (target.startsWith(queryToken) || queryToken.startsWith(target)) {
      bestScore = Math.max(bestScore, 0.85);
      continue;
    }
    if (queryToken.length >= 3) {
      const sim = fuzzySimilarity(queryToken, target);
      if (sim >= FUZZY_THRESHOLD) {
        bestScore = Math.max(bestScore, sim);
      }
    }
  }
  return bestScore;
}

function buildEntityIndex(): Map<string, KaylaDocument> {
  const index = new Map<string, KaylaDocument>();

  function addDoc(doc: KaylaDocument) {
    index.set(doc.id, doc);
  }

  addDoc({
    id: 'fds-company',
    type: 'company',
    title: fds.name,
    text: `${fds.name} ${fds.shortName} ${fds.description}`,
    route: '/about',
    tags: ['fds', 'forger digital solutions', 'company', 'about'],
    weight: 1.0
  });

  addDoc({
    id: 'fds-mission',
    type: 'company',
    title: 'FDS Mission',
    text: fds.mission,
    route: '/about',
    tags: ['mission', 'fds'],
    weight: 0.9
  });

  addDoc({
    id: 'fds-vision',
    type: 'company',
    title: 'FDS Vision',
    text: `${fds.vision.current} ${fds.vision.longTerm}`,
    route: '/about',
    tags: ['vision', 'fds', 'future', 'long-term'],
    weight: 0.9
  });

  addDoc({
    id: 'fds-philosophy',
    type: 'company',
    title: 'FDS Philosophy',
    text: fds.philosophy.join(' '),
    route: '/about',
    tags: ['philosophy', 'fds', 'principles'],
    weight: 0.8
  });

  addDoc({
    id: 'fds-research',
    type: 'company',
    title: 'FDS Research Goals',
    text: fds.publicResearchGoals.join(' '),
    route: '/about',
    tags: ['research', 'goals', 'fds', 'ai'],
    weight: 0.8
  });

  addDoc({
    id: 'fds-community',
    type: 'company',
    title: 'FDS Community Goals',
    text: fds.communityGoals.join(' '),
    route: '/community-impact',
    tags: ['community', 'goals', 'fds'],
    weight: 0.8
  });

  addDoc({
    id: 'fds-ecosystem',
    type: 'company',
    title: 'FDS Product Ecosystem',
    text: fds.productEcosystem.join(' '),
    route: '/projects',
    tags: ['ecosystem', 'products', 'apps', 'fds'],
    weight: 0.9
  });

  addDoc({
    id: 'fds-forged',
    type: 'company',
    title: 'Forged Storefront',
    text: fds.forged,
    route: '/forged',
    tags: ['forged', 'store', 'storefront', 'downloads', 'products'],
    weight: 0.9
  });

  addDoc({
    id: 'fds-support',
    type: 'company',
    title: 'Support FDS',
    text: `Support FDS via Cash App ${fds.cashAppHandle} or Ko-fi. Hardware donations via ${fds.supportEmail}.`,
    route: '/support',
    tags: ['support', 'donate', 'cash app', 'kofi', 'ko-fi', 'fds'],
    weight: 0.9
  });

  addDoc({
    id: 'founder-bio',
    type: 'founder',
    title: founder.name,
    text: `${founder.name} ${founder.role} ${founder.publicBio} ${founder.foundingStory}`,
    route: '/about',
    tags: ['founder', 'edward schmidt', 'who founded', 'bio', 'story'],
    weight: 1.0
  });

  addDoc({
    id: 'founder-vision',
    type: 'founder',
    title: `${founder.name} Vision`,
    text: `${founder.fdsVision} ${founder.developmentPhilosophy}`,
    route: '/about',
    tags: ['founder', 'vision', 'philosophy'],
    weight: 0.8
  });

  addDoc({
    id: 'founder-motivation',
    type: 'founder',
    title: `${founder.name} Motivation`,
    text: founder.motivation,
    route: '/about',
    tags: ['founder', 'motivation', 'why', 'purpose'],
    weight: 0.8
  });

  for (const app of apps) {
    const tags = [
      app.id,
      app.name.toLowerCase(),
      ...app.name.toLowerCase().split(/[\s\/]+/),
      ...(app.features || []).map(f => f.toLowerCase()),
      app.category.toLowerCase(),
      app.status.toLowerCase()
    ];

    addDoc({
      id: `app-${app.id}`,
      type: 'app',
      title: app.name,
      text: `${app.name} ${app.tagline} ${app.description}`,
      route: app.url,
      entityId: app.id,
      tags,
      weight: 1.0
    });

    if (app.description) {
      addDoc({
        id: `app-${app.id}-desc`,
        type: 'app',
        title: `${app.name} Details`,
        text: app.description,
        route: app.url,
        entityId: app.id,
        tags,
        weight: 0.9
      });
    }

    if (app.roadmap) {
      addDoc({
        id: `app-${app.id}-roadmap`,
        type: 'app',
        title: `${app.name} Roadmap`,
        text: app.roadmap,
        route: app.url,
        entityId: app.id,
        tags: [...tags, 'roadmap'],
        weight: 0.8
      });
    }

    if (app.downloads && app.downloads.length > 0) {
      addDoc({
        id: `download-${app.id}`,
        type: 'download',
        title: `Download ${app.name}`,
        text: `Download ${app.name} from ${app.downloads.join(' ')}`,
        route: app.downloads[0],
        entityId: app.id,
        tags: [...tags, 'download'],
        weight: 1.0
      });
    }

    if (app.docs) {
      addDoc({
        id: `docs-${app.id}`,
        type: 'app',
        title: `${app.name} Documentation`,
        text: `Documentation for ${app.name} available on GitHub`,
        route: app.docs,
        entityId: app.id,
        tags: [...tags, 'docs', 'documentation', 'github'],
        weight: 0.7
      });
    }
  }

  for (const dl of downloads) {
    addDoc({
      id: `dl-${dl.id}`,
      type: 'download',
      title: `Download ${dl.name}`,
      text: `${dl.name} ${dl.version || ''} for ${dl.platform || 'multiple platforms'}`,
      route: dl.href,
      entityId: dl.appId,
      tags: [dl.id, dl.name.toLowerCase(), 'download'],
      weight: 1.0
    });
  }

  for (const item of roadmap) {
    addDoc({
      id: `roadmap-${item.id}`,
      type: 'roadmap',
      title: item.name,
      text: `${item.name} (${item.status}): ${item.summary}`,
      route: `/projects/${item.id}`,
      entityId: item.id,
      tags: [item.id, item.name.toLowerCase(), 'roadmap', item.status],
      weight: 0.9
    });
  }

  for (const release of releases) {
    addDoc({
      id: `release-${release.appId}`,
      type: 'release',
      title: `${release.appId} Release`,
      text: `${release.appId} ${release.version} (${release.status}): ${release.notes || ''}`,
      route: release.downloads?.[0],
      entityId: release.appId,
      tags: [release.appId, 'release', release.status, release.version],
      weight: 0.9
    });
  }

  for (const repo of githubRepos) {
    addDoc({
      id: `github-${repo.repositoryName}`,
      type: 'github',
      title: `${repo.project} GitHub`,
      text: `${repo.project}: ${repo.description} Repository: ${repo.url}`,
      route: repo.url,
      entityId: repo.project.toLowerCase(),
      tags: [repo.project.toLowerCase(), 'github', 'repository', 'source'],
      weight: 0.8
    });
  }

  for (const site of officialSites) {
    addDoc({
      id: `site-${site.id}`,
      type: 'general',
      title: site.name,
      text: `Official FDS site: ${site.name} at ${site.origin}`,
      route: site.origin,
      tags: [site.id, 'official', 'site', 'fds'],
      weight: 0.7
    });
  }

  addDoc({
    id: 'community-impact',
    type: 'community',
    title: 'Community Impact',
    text: community.status + ' — affordable communities, gardens, technology reuse.',
    route: '/community-impact',
    tags: ['community', 'impact', 'affordable', 'gardens'],
    weight: 0.8
  });

  addDoc({
    id: 'hardware-donations',
    type: 'community',
    title: 'Hardware Donations',
    text: 'Donate laptops, workstations, GPUs, servers, and other usable equipment to support FDS.',
    route: '/support/hardware',
    tags: ['hardware', 'donate', 'donation', 'equipment', 'computer'],
    weight: 0.9
  });

  for (const f of faqs) {
    addDoc({
      id: `faq-${f.q.toLowerCase().replace(/\s+/g, '-').slice(0, 40)}`,
      type: 'faq',
      title: f.q,
      text: f.a,
      tags: tokenize(f.q),
      weight: 1.0
    });
  }

  addDoc({
    id: 'forged-page',
    type: 'app',
    title: 'Forged',
    text: fds.forged,
    route: '/forged',
    tags: ['forged', 'store', 'storefront', 'downloads', 'products'],
    weight: 0.9
  });

  addDoc({
    id: 'forgerems-product',
    type: 'app',
    title: 'ForgerEMS',
    text: `${forgerems.name} ${forgerems.tagline} ${forgerems.description} Status: ${forgerems.status}`,
    route: forgerems.url,
    entityId: 'forgerems',
    tags: ['forgerems', 'forger ems', 'ems', 'toolkit', 'ventoy', 'windows', 'download'],
    weight: 1.0
  });

  addDoc({
    id: 'forgerems-download',
    type: 'download',
    title: 'Download ForgerEMS',
    text: `Download ForgerEMS version ${forgerems.lastUpdated} for Windows from ${forgerems.download}`,
    route: forgerems.download,
    entityId: 'forgerems',
    tags: ['forgerems', 'download', 'installer', 'ventoy'],
    weight: 1.0
  });

  return index;
}

const entityIndex = buildEntityIndex();

export function resolveEntity(query: string): string | undefined {
  const normalized = normalizeText(query);
  if (appAliases[normalized]) return appAliases[normalized];

  const tokens = tokenize(query);
  for (const token of tokens) {
    if (appAliases[token]) return appAliases[token];
  }

  const fuzzyEntries = Object.entries(appAliases);
  for (const [alias, id] of fuzzyEntries) {
    const aliasTokens = tokenize(alias);
    for (const qt of tokens) {
      for (const at of aliasTokens) {
        if (fuzzySimilarity(qt, at) >= FUZZY_THRESHOLD) {
          return id;
        }
      }
    }
  }

  return undefined;
}

function scoreDocument(query: string, queryTokens: string[], doc: KaylaDocument, context?: KaylaPageContext): number {
  let score = 0;
  const titleTokens = tokenize(doc.title);
  const textTokens = tokenize(doc.text);
  const tagTokens = doc.tags;

  for (const qt of queryTokens) {
    for (const tt of titleTokens) {
      if (tt === qt) score += 15;
      else if (fuzzyTokenMatch(qt, [tt]) >= FUZZY_THRESHOLD) score += 8;
    }

    for (const tt of tagTokens) {
      if (tt === qt) score += 12;
      else if (tt.includes(qt) || qt.includes(tt)) score += 6;
      else if (fuzzyTokenMatch(qt, [tt]) >= FUZZY_THRESHOLD) score += 5;
    }

    for (const tt of textTokens) {
      if (tt === qt) score += 5;
      else if (tt.startsWith(qt) || qt.startsWith(tt)) score += 3;
      else if (fuzzyTokenMatch(qt, [tt]) >= FUZZY_THRESHOLD && qt.length >= 3) score += 2;
    }
  }

  const normalizedQuery = normalizeText(query);
  const normalizedTitle = normalizeText(doc.title);
  if (normalizedTitle.includes(normalizedQuery) || normalizedQuery.includes(normalizedTitle)) {
    score += 20;
  }

  if (context?.entity && doc.entityId === context.entity) {
    score += 25;
  }

  score *= doc.weight;

  return score;
}

export function retrieveKnowledge(query: string, context?: KaylaPageContext, limit = 5): KaylaScoredResult[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const results: KaylaScoredResult[] = [];

  for (const doc of entityIndex.values()) {
    const score = scoreDocument(query, queryTokens, doc, context);
    if (score > 10) {
      results.push({ doc, score });
    }
  }

  results.sort((a, b) => b.score - a.score);

  if (results.length === 0 && context?.entity) {
    const entityDoc = entityIndex.get(`app-${context.entity}`);
    if (entityDoc) {
      return [{ doc: entityDoc, score: 30 }];
    }
  }

  return results.slice(0, limit);
}

export function getDocumentsByIds(ids: string[]): KaylaDocument[] {
  return ids.map(id => entityIndex.get(id)).filter((d): d is KaylaDocument => Boolean(d));
}

export function getDocument(id: string): KaylaDocument | undefined {
  return entityIndex.get(id);
}

export function toKnowledgeResult(scored: KaylaScoredResult): KaylaKnowledgeResult {
  return {
    type: scored.doc.type,
    title: scored.doc.title,
    snippet: scored.doc.text,
    score: scored.score,
    id: scored.doc.id,
    route: scored.doc.route,
    sourceType: scored.doc.type
  };
}

export function getRetrievalIndexSize(): number {
  return entityIndex.size;
}
