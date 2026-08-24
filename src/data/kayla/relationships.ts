import type { KaylaProductRelationship } from './types';

export const productRelationships: KaylaProductRelationship[] = [
  {
    from: 'gems-training-grounds',
    to: 'kyrablox',
    relation: 'relatedTo',
    description: 'Both explore AI-assisted development, but GEMS focuses on training/evaluation while KyraBlox focuses on game creation tooling.'
  },
  {
    from: 'gems-training-grounds',
    to: 'kayla-ai-publisher',
    relation: 'relatedTo',
    description: 'GEMS research on intelligent systems informs the AI-assisted workflows explored in Kayla AI Publisher.'
  },
  {
    from: 'kayla-ai-publisher',
    to: 'kayla-ai-publisher',
    relation: 'partOf',
    description: 'Kayla AI Publisher is part of the broader FDS ecosystem and also powers the Kayla Copilot interface.'
  },
  {
    from: 'forgerems',
    to: 'forged',
    relation: 'publishedThrough',
    description: 'ForgerEMS is published and distributed through the Forged storefront.'
  },
  {
    from: 'we-the-people',
    to: 'farmstand-finder',
    relation: 'supports',
    description: 'Both are community-focused platforms, with We The People providing civic infrastructure and FarmStand Finder providing local discovery.'
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
