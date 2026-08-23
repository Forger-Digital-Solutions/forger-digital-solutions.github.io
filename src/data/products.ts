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

export const products: Product[] = [];

export const featuredProducts = products.filter((p) => p.featured);
