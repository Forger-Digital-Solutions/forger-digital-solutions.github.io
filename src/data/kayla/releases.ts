import type { KaylaRelease } from './types';
import { products } from '../products';

const forgeremsProduct = products.find((product) => product.slug === 'forgerems');

export const releases: KaylaRelease[] = [
  {
    appId: 'forgerems',
    version: forgeremsProduct?.version || '',
    status: 'preview',
    date: '2025-01-01',
    notes: 'Current public preview release of ForgerEMS. Windows-only Ventoy-based toolkit manager and downloader.',
    downloads: forgeremsProduct?.downloadUrl ? [forgeremsProduct.downloadUrl] : [],
    changelog: 'Preview release for testing and feedback. ZIP archive distribution.'
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
