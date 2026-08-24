import type { KaylaApp } from '../types';
import { products } from '../../../data/products';

export const forged: KaylaApp[] = products.map((p) => ({
  id: p.slug,
  name: p.name,
  aliases: [p.slug, p.name.toLowerCase(), p.category.toLowerCase()],
  tagline: p.tagline,
  summary: p.tagline,
  description: p.description,
  purpose: p.description,
  status: p.status,
  category: p.category,
  platforms: p.platform,
  downloads: p.downloadUrl ? [p.downloadUrl] : undefined,
  docs: p.docsUrl,
  download: p.downloadUrl,
  documentation: p.docsUrl,
  lastUpdated: p.version,
  url: '/forged'
}));
