import type { KaylaRelease } from './types';
import { products } from '../products';

const codeforgeProduct = products.find((product) => product.slug === 'codeforge');
const forgeremsProduct = products.find((product) => product.slug === 'forgerems');

export const releases: KaylaRelease[] = [
  {
    appId: 'codeforge',
    version: codeforgeProduct?.version || 'v0.2.0',
    status: 'paused',
    date: '2026-08-29',
    notes: 'The last version listed on this website was v0.2.0. Downloads are temporarily paused while the release is updated.',
    downloads: [],
    changelog: 'No current installer or portable build is offered on this website.'
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
