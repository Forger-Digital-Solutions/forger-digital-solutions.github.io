import type { KaylaProductRelationship } from './types';

export const productRelationships: KaylaProductRelationship[] = [
  {
    from: 'kayla-ai-publisher',
    to: 'kayla-ai-publisher',
    relation: 'companionTo',
    description: 'Kayla AI Publisher is the standalone creative workspace. Kayla Copilot is the guide embedded on the FDS website; they share a name, not a product surface.'
  },
  {
    from: 'forgerems',
    to: 'forged',
    relation: 'publishedThrough',
    description: 'ForgerEMS is listed through Forged, with packages and version history sourced from GitHub Releases.'
  },
  {
    from: 'we-the-people',
    to: 'farmstand-finder',
    relation: 'supports',
    description: 'Both serve community needs: We The People focuses on public information and services, while FarmStand Finder focuses on nearby food and producers.'
  },
  {
    from: 'kayla-ai-publisher',
    to: 'forged',
    relation: 'publishedThrough',
    description: 'When Kayla AI Publisher reaches a releasable state, it would be published through Forged.'
  },
  {
    from: 'farmstand-finder',
    to: 'forged',
    relation: 'publishedThrough',
    description: 'When FarmStand Finder reaches a releasable state, it would be published through Forged.'
  }
];

export function getRelationshipsForApp(appId: string): KaylaProductRelationship[] {
  return productRelationships.filter(r => r.from === appId || r.to === appId);
}
