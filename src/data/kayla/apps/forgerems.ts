import type { KaylaApp } from '../types';
import { products } from '../../../data/products';
const product = products.find((item) => item.slug === 'forgerems');

export const forgerems: KaylaApp = {
  id: 'forgerems',
  name: 'ForgerEMS',
  aliases: ['forgerems', 'ems', 'forger ems', 'technician workbench', 'diagnostics', 'usb toolkit'],
  tagline: product?.tagline || 'Windows technician workbench for diagnostics, repair, USB systems, and maintenance.',
  description: product?.description || 'ForgerEMS brings diagnostics, USB tooling, drive validation, driver guidance, system information, and local-first assistance into one Windows technician application.',
  status: 'public-beta',
  category: 'Technician Workbench',
  summary: 'Windows technician workbench for diagnostics, repair, USB systems, and maintenance.',
  purpose: 'Give technicians one Windows application for system information, drive and USB checks, toolkit work, vendor guidance, and assisted troubleshooting.',
  platforms: product?.platform || ['Windows'],
  requirements: 'Windows 10/11 x64. Some technician operations may require administrator approval or user-supplied media.',
  release: product?.version,
  downloads: product?.downloadUrl ? [product.downloadUrl] : [],
  download: product?.downloadUrl,
  docs: product?.docsUrl,
  documentation: product?.docsUrl,
  repository: product?.docsUrl,
  website: undefined,
  relatedProducts: [],
  roadmap: 'Continued public-preview development across technician diagnostics, safe hardware intelligence, USB tooling, Dr. Forge integration, and Kyra assistance. Later repository work is not represented as part of the v1.2.3-preview.1 download until it is released.',
  limitations: ['Preview release — may contain bugs or incomplete features.'],
  faq: [
    { q: 'What is ForgerEMS?', a: 'ForgerEMS is a Windows technician workbench for system information, drive validation, USB and port intelligence, toolkit creation, driver guidance, and local-first Kyra assistance.' },
    { q: 'What platform does ForgerEMS support?', a: 'ForgerEMS is built for Windows.' },
    { q: 'How do I install ForgerEMS?', a: 'Download the ZIP archive, extract the contents, and run the executable on a Windows PC.' }
  ],
  lastUpdated: product?.version,
  url: '/forged'
};

export function getForgerEMSDownload(): { href: string; version: string; platform: string; kind: 'installer' | 'portable' | 'archive' | 'source' } {
  const product = products.find((p) => p.slug === 'forgerems');
  return {
    href: product?.downloadUrl ?? 'https://github.com/Forger-Digital-Solutions/ForgerEMS/releases',
    version: product?.version ?? 'Public Preview',
    platform: product?.platform?.join(', ') ?? 'Windows',
    kind: 'archive'
  };
}
