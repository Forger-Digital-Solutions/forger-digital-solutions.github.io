export type ProductPricingModel = 'released' | 'free' | 'paid' | 'donation' | 'coming-soon' | 'private-beta' | 'public-beta' | 'unavailable';

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
    name: "CodeForge",
    slug: "codeforge",
    tagline: "Free-first autonomous software engineering for Windows.",
    description: "CodeForge inspects repositories, plans engineering work, edits code through controlled tools, runs checks, and reviews the result. ForgeZero enforces verified zero-cost cloud routing with no silent paid or local-model fallback.",
    category: "Developer Tool",
    platform: ["Windows", "CLI", "VS Code"],
    status: "released",
    version: "v0.2.0",
    pricingModel: "free",
    projectSlug: "codeforge",
    downloadUrl: "https://github.com/Forger-Digital-Solutions/CodeForge/releases/latest",
    docsUrl: "https://github.com/Forger-Digital-Solutions/CodeForge",
    releaseNotesUrl: "https://github.com/Forger-Digital-Solutions/CodeForge/releases/tag/v0.2.0",
    featured: true,
    comingSoon: false,
  },
  {
    name: "ForgerEMS",
    slug: "forgerems",
    tagline: "Windows technician workbench for diagnostics, repair, USB systems, and maintenance.",
    description: "Forger Engineering Maintenance Suite brings USB toolkit creation, drive validation, USB and port intelligence, system information, driver guidance, and local-first Kyra assistance into one technician application.",
    category: "Technician Workbench",
    platform: ["Windows"],
    status: "public-beta",
    version: "v1.2.3-preview.1",
    pricingModel: "free",
    downloadUrl: "https://github.com/Forger-Digital-Solutions/ForgerEMS/releases",
    docsUrl: "https://github.com/Forger-Digital-Solutions/ForgerEMS",
    videoUrl: "https://www.youtube.com/embed/ILKWS2dNIrg",
    featured: true,
    comingSoon: false,
  },
];

export const featuredProducts = products.filter((p) => p.featured);
