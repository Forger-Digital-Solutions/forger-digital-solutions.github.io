import type { KaylaRelease } from './types';
import { products } from '../products';

const forgeremsProduct = products.find((product) => product.slug === 'forgerems');

export const releases: KaylaRelease[] = [
  {
    appId: 'codeforge', version: 'v0.2.0', status: 'stable', date: '2026-08-29',
    notes: 'Released Windows build of the free-first autonomous software-engineering platform.',
    downloads: ['https://github.com/Forger-Digital-Solutions/CodeForge/releases/latest'],
    changelog: 'Installer and portable builds with published SHA-256 checksums.'
  },
  {
    appId: 'forgerems',
    version: forgeremsProduct?.version || 'Public Preview',
    status: 'preview',
    date: '2026-07-02',
    notes: 'ForgerEMS public preview: Windows technician diagnostics, USB systems, drive validation, system information, driver guidance, and local-first assistance.',
    downloads: forgeremsProduct?.downloadUrl ? [forgeremsProduct.downloadUrl] : [],
    changelog: 'Canonical version and assets are maintained on GitHub Releases.'
  }
];

export function getReleaseForApp(appId: string): KaylaRelease | undefined {
  return releases.find(r => r.appId === appId);
}

export function getLatestRelease(appId: string): KaylaRelease | undefined {
  const appReleases = releases.filter(r => r.appId === appId);
  if (appReleases.length === 0) return undefined;
  return appReleases.sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
}
