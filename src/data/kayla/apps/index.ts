import type { KaylaApp } from '../types';
import { projects } from '../../../data/projects';
import { products } from '../../../data/products';

function mapProject(p: typeof projects[number]): KaylaApp {
  const app: KaylaApp = {
    id: p.id,
    name: p.name,
    aliases: p.tags.map(t => t.toLowerCase()),
    tagline: p.summary,
    description: p.description,
    status: p.status,
    category: p.category,
    summary: p.summary,
    purpose: p.description,
    features: p.focusAreas,
    targetUsers: p.focusAreas,
    platforms: undefined,
    requirements: undefined,
    release: undefined,
    downloads: undefined,
    docs: p.documentationUrl,
    repository: p.githubUrl,
    website: p.websiteUrl,
    relatedProducts: projects
      .filter((other) => other.slug !== p.slug && other.tags.some((t) => p.tags.includes(t)))
      .slice(0, 3)
      .map((other) => other.name),
    roadmap: p.roadmap,
    limitations: p.privacyNotice ? [p.privacyNotice] : undefined,
    faq: undefined,
    lastUpdated: undefined,
    url: `/projects/${p.slug}`,
    accentColor: p.accentColor
  };
  return app;
}

function mapProduct(prod: typeof products[number]): KaylaApp {
  const app: KaylaApp = {
    id: prod.slug,
    name: prod.name,
    aliases: [prod.slug, prod.category.toLowerCase(), prod.name.toLowerCase()],
    tagline: prod.tagline,
    description: prod.description,
    status: prod.status,
    category: prod.category,
    summary: prod.tagline,
    purpose: prod.description,
    features: [],
    platforms: prod.platform,
    requirements: undefined,
    release: prod.version,
    downloads: prod.downloadUrl ? [prod.downloadUrl] : undefined,
    docs: prod.docsUrl,
    repository: undefined,
    website: undefined,
    relatedProducts: [],
    roadmap: undefined,
    limitations: prod.comingSoon ? ['Coming soon — not yet available'] : undefined,
    faq: undefined,
    lastUpdated: prod.version,
    url: '/forged'
  };
  return app;
}

export const apps: KaylaApp[] = [
  ...projects.map(mapProject),
  ...products.map(mapProduct)
];

export const appAliases: Record<string, string> = {
  'gems': 'gems-training-grounds',
  'training grounds': 'gems-training-grounds',
  'gems training': 'gems-training-grounds',
  'kyrablox': 'kyrablox',
  'kayla': 'kayla-ai-publisher',
  'kayla publisher': 'kayla-ai-publisher',
  'kayla ai': 'kayla-ai-publisher',
  'publisher': 'kayla-ai-publisher',
  'we the people': 'we-the-people',
  'wethepeople': 'we-the-people',
  'wtp': 'we-the-people',
  'farmstand': 'farmstand-finder',
  'farm stand': 'farmstand-finder',
  'farmstand finder': 'farmstand-finder',
  'finder': 'farmstand-finder',
  'forgerems': 'forgerems',
  'ems': 'forgerems',
  'forger ems': 'forgerems',
  'toolkit': 'forgerems',
  'ventoy': 'forgerems'
};

export function resolveAppId(query: string): string | undefined {
  const normalized = query.toLowerCase().trim();
  if (appAliases[normalized]) return appAliases[normalized];
  const exact = apps.find(a => a.id === normalized || a.name.toLowerCase() === normalized);
  if (exact) return exact.id;
  const partial = apps.find(a => a.name.toLowerCase().includes(normalized) || a.id.includes(normalized));
  return partial?.id;
}
