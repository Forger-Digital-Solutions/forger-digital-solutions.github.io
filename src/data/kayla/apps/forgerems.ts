import type { KaylaApp } from '../types';
import { products } from '../../../data/products';
const product = products.find((item) => item.slug === 'forgerems');

export const forgerems: KaylaApp = {
  id: 'forgerems',
  name: 'ForgerEMS',
  aliases: ['forgerems', 'ems', 'forger ems', 'toolkit', 'ventoy'],
  tagline: 'Ventoy-based toolkit manager and downloader.',
  description: 'ForgerEMS is a Ventoy-based toolkit manager and downloader for organizing, managing, and deploying bootable toolkits and utilities from a single portable environment.',
  status: 'public-beta',
  category: 'Toolkit',
  summary: 'Ventoy-based toolkit manager and downloader.',
  purpose: 'Organize, manage, and deploy bootable toolkits and utilities from a single portable Windows environment.',
  platforms: product?.platform || ['Windows'],
  requirements: 'Windows PC. Sufficient storage for toolkit archives.',
  release: product?.version,
  downloads: product?.downloadUrl ? [product.downloadUrl] : [],
  download: product?.downloadUrl,
  docs: product?.docsUrl,
  documentation: product?.docsUrl,
  repository: product?.docsUrl,
  website: undefined,
  relatedProducts: [],
  roadmap: 'Continued development of toolkit management and download features.',
  limitations: ['Preview release — may contain bugs or incomplete features.'],
  faq: [
    { q: 'What is ForgerEMS?', a: 'ForgerEMS is a Ventoy-based toolkit manager and downloader for organizing, managing, and deploying bootable toolkits and utilities.' },
    { q: 'What platform does ForgerEMS support?', a: 'ForgerEMS is built for Windows.' },
    { q: 'How do I install ForgerEMS?', a: 'Download the ZIP archive, extract the contents, and run the executable on a Windows PC.' }
  ],
  lastUpdated: product?.version,
  url: '/forged'
};

export function getForgerEMSDownload(): { href: string; version: string; platform: string; kind: 'installer' | 'portable' | 'archive' | 'source' } {
  const product = products.find((p) => p.slug === 'forgerems');
  return {
    href: product?.downloadUrl ?? '/downloads/forger-ems/ForgerEMS-v1.2.4-preview.5.zip',
    version: product?.version ?? 'v1.2.4-preview.5',
    platform: product?.platform?.join(', ') ?? 'Windows',
    kind: 'archive'
  };
}
