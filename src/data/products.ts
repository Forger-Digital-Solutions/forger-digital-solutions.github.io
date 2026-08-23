export type ProductPricingModel = 'free' | 'paid' | 'donation' | 'coming-soon' | 'private-beta' | 'public-beta' | 'unavailable';

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
  projectSlug?: string;
  downloadUrl?: string;
  purchaseUrl?: string;
  docsUrl?: string;
  releaseNotesUrl?: string;
  featured?: boolean;
  comingSoon?: boolean;
}

export const products: Product[] = [
  {
    name: "ForgerEMS",
    slug: "forgerems",
    tagline: "Energy management and monitoring platform.",
    description: "ForgerEMS is an energy management application for monitoring, controlling, and optimizing energy usage across connected systems and environments.",
    category: "Application",
    platform: ["Windows"],
    status: "public-beta",
    version: "v1.2.4-preview.5",
    pricingModel: "free",
    downloadUrl: "/downloads/forger-ems/ForgerEMS-v1.2.4-preview.5.zip",
    docsUrl: "/projects/forgerems",
    featured: true,
    comingSoon: false,
  },
];

export const featuredProducts = products.filter((p) => p.featured);
