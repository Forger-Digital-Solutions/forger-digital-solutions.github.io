import type { ProjectImage } from '../types';
import { visualAssets } from './visuals';
import { manifestById, canonicalStatusLabels, type CanonicalStatus } from './manifest';

export type ProductPricingModel = 'released' | 'free' | 'paid' | 'donation' | 'coming-soon' | 'private-beta' | 'public-beta' | 'unavailable';

export type ProductVisual = ProjectImage & { state: 'release' | 'development' | 'research' | 'conceptual' };

export interface Product {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  category: string;
  platform: string[];
  status: ProductPricingModel;
  version?: string;
  price?: string;
  pricingModel: ProductPricingModel;
  icon?: string;
  image?: string;
  gallery?: string[];
  visual?: ProductVisual;
  projectSlug?: string;
  downloadUrl?: string;
  upgradeUrl?: string;
  purchaseUrl?: string;
  docsUrl?: string;
  releaseNotesUrl?: string;
  featured?: boolean;
  comingSoon?: boolean;
  videoUrl?: string;
}

/**
 * Shelf products are derived from the canonical product manifest so names,
 * versions, taglines, and download routes can never drift between pages.
 */
const productPricingByStatus: Record<CanonicalStatus, ProductPricingModel> = {
  'public-release': 'released',
  'public-preview': 'public-beta',
  'active-development': 'coming-soon',
  'active-ai-research': 'unavailable',
  'private-development': 'private-beta',
  concept: 'coming-soon',
};

const buildProduct = (
  id: string,
  { description, platform, ...overrides }: Partial<Product> & { description: string; platform: string[] }
): Product => {
  const entry = manifestById[id];
  if (!entry) throw new Error(`manifest entry missing for product: ${id}`);
  return {
    name: entry.name,
    slug: entry.id,
    tagline: entry.tagline,
    description,
    category: entry.category,
    platform,
    status: productPricingByStatus[entry.canonicalStatus],
    version: entry.version,
    pricingModel: 'free',
    projectSlug: entry.projectUrl?.replace('/projects/', ''),
    downloadUrl: entry.releaseUrl,
    docsUrl: entry.docsUrl,
    featured: false,
    comingSoon: false,
    ...overrides,
  };
};

export const products: Product[] = [
  buildProduct('codeforge', {
    description:
      'CodeForge inspects repositories, plans engineering work, edits code through controlled tools, runs checks, and reviews the result. Dynamic routing selects only verified zero-cost cloud models, and ForgeZero fails closed instead of silently falling back to paid or local-model inference.',
    platform: ['Windows', 'CLI', 'VS Code'],
    upgradeUrl: '/codeforge/upgrade',
    releaseNotesUrl: 'https://github.com/Forger-Digital-Solutions/CodeForge/releases/tag/v0.2.0',
    visual: visualAssets.codeforgeWorkspace,
    featured: true,
  }),
  buildProduct('forgerems', {
    description:
      'Forger Engineering Maintenance Suite brings USB toolkit creation, drive validation, USB and port intelligence, system information, driver guidance, and local-first Kyra assistance into one technician application.',
    platform: ['Windows'],
    videoUrl: 'https://www.youtube.com/embed/ILKWS2dNIrg',
    featured: true,
  }),
];

export const statusLabels = canonicalStatusLabels;

export const featuredProducts = products.filter((p) => p.featured);
