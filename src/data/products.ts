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
  videoUrl?: string;
}

export const products: Product[] = [
  {
    name: "ForgerEMS",
    slug: "forgerems",
    tagline: "Ventoy-based toolkit manager and downloader.",
    description: "ForgerEMS is a Ventoy-based toolkit manager and downloader for organizing, managing, and deploying bootable toolkits and utilities from a single portable environment.",
    category: "Toolkit",
    platform: ["Windows"],
    status: "public-beta",
    version: "v1.2.4-preview.5",
    pricingModel: "free",
    downloadUrl: "/downloads/forger-ems/ForgerEMS-v1.2.4-preview.5.zip",
    docsUrl: "https://github.com/forger-digital-solutions/ForgerEMS",
    videoUrl: "https://www.youtube.com/embed/ILKWS2dNIrg",
    featured: true,
    comingSoon: false,
  },
];

export const featuredProducts = products.filter((p) => p.featured);
