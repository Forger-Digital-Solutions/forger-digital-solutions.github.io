import type { KaylaProductRelationship } from './types';

export const productRelationships: KaylaProductRelationship[] = [
  {
    from: 'gems-training-grounds',
    to: 'kyrablox',
    relation: 'relatedTo',
    description: 'GEMS develops model intelligence; KyraBlox applies project awareness, governed planning, and engine-specific capability to game creation.'
  },
  {
    from: 'gems-training-grounds',
    to: 'kayla-ai-publisher',
    relation: 'relatedTo',
    description: 'GEMS research may inform future model capability, while Kayla AI Publisher remains a distinct creative-project product.'
  },
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
    from: 'gems-training-grounds',
    to: 'forged',
    relation: 'publishedThrough',
    description: 'When GEMS research reaches a releasable state, it would be published through Forged.'
  },
  {
    from: 'kyrablox',
    to: 'forged',
    relation: 'publishedThrough',
    description: 'When KyraBlox reaches a releasable state, it would be published through Forged.'
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
