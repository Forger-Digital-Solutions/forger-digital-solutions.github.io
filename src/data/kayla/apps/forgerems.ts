import type { KaylaApp } from '../types';
import { products } from '../../../data/products';
const product = products.find((item) => item.slug === 'forgerems');

const releaseUrl = 'https://github.com/Forger-Digital-Solutions/ForgerEMS/releases/tag/v1.2.4-preview.1';

export const forgerems: KaylaApp = {
  id: 'forgerems',
  name: 'ForgerEMS',
  aliases: ['forgerems', 'ems', 'forger ems', 'technician workbench', 'diagnostics', 'usb toolkit'],
  tagline: product?.tagline || 'Windows technician workbench for diagnostics, repair, USB systems, and maintenance.',
  description: product?.description || 'ForgerEMS brings diagnostics, USB tooling, drive validation, driver guidance, system information, and local-first diagnostics into one Windows technician application.',
  status: 'public-beta',
  category: 'Technician Workbench',
  summary: 'Windows technician workbench for diagnostics, repair, USB systems, and maintenance.',
  purpose: 'Give technicians one Windows application for system information, drive and USB checks, toolkit work, vendor guidance, and assisted troubleshooting.',
  platforms: product?.platform || ['Windows'],
  requirements: 'Windows 10 build 19041 (20H1) or later, or Windows 11 x64. Some technician operations may require administrator approval or user-supplied media.',
  release: product?.version,
  downloads: [...new Set([product?.downloadUrl ?? releaseUrl, releaseUrl])],
  download: product?.downloadUrl ?? releaseUrl,
  docs: 'https://github.com/Forger-Digital-Solutions/ForgerEMS',
  documentation: 'https://github.com/Forger-Digital-Solutions/ForgerEMS',
  repository: 'https://github.com/Forger-Digital-Solutions/ForgerEMS',
  website: 'https://forgerdigitalsolutions.com/forgerems',
  relatedProducts: [],
  roadmap: 'Continued public-preview development across technician diagnostics, safe hardware intelligence, USB tooling, and local-first diagnostics. Later repository work is not represented as part of a published download until it is released.',
  limitations: [
    'Preview release — may contain bugs or incomplete features.',
    'v1.2.4-preview.1 binaries are unsigned; Windows may show an unknown-publisher warning.',
    'Installer lifecycle certification is not complete.',
  ],
  faq: [
    { q: 'What is ForgerEMS?', a: 'ForgerEMS is a Windows technician workbench for system information, drive validation, USB and port intelligence, toolkit creation, driver guidance, and local-first diagnostics.' },
    { q: 'What platform does ForgerEMS support?', a: 'ForgerEMS is built for Windows 10/11 x64.' },
    { q: 'Is it free?', a: 'The public preview is distributed at no cost.' },
    { q: 'Do I need to install it?', a: 'No — the portable ZIP runs without installation. A separate installer EXE is also available.' },
    { q: 'How do I install ForgerEMS?', a: 'Download the ZIP archive from the official release page, verify the SHA-256, extract the contents, and run ForgerEMS.exe or START_HERE.bat on a Windows PC.' },
    { q: 'Where is the latest download?', a: 'The official release is on GitHub at ' + releaseUrl }
  ],
  lastUpdated: product?.version,
  url: '/forgerems'
};

export function getForgerEMSDownload(): { href: string; version: string; platform: string; kind: 'installer' | 'portable' | 'archive' | 'source' } {
  const product = products.find((p) => p.slug === 'forgerems');
  return {
    href: product?.downloadUrl ?? releaseUrl,
    version: product?.version ?? 'v1.2.4-preview.1',
    platform: product?.platform?.join(', ') ?? 'Windows',
    kind: 'archive'
  };
}
