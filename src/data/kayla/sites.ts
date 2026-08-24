import type { KaylaFdsSite } from './types';

export const officialSites: KaylaFdsSite[] = [
  {
    id: 'fds-website',
    name: 'Forger Digital Solutions Official Website',
    origin: 'https://forger-digital-solutions.github.io',
    authority: 1.0,
    enabled: true
  },
  {
    id: 'forged-page',
    name: 'Forged — FDS App Storefront',
    origin: 'https://forger-digital-solutions.github.io/forged',
    authority: 0.95,
    enabled: true
  }
];

export function getOfficialSite(id: string): KaylaFdsSite | undefined {
  return officialSites.find(s => s.id === id);
}

export function getEnabledOfficialSites(): KaylaFdsSite[] {
  return officialSites.filter(s => s.enabled);
}
