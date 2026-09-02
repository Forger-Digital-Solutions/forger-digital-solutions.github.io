import type { KaylaRoadmapItem } from './types';
import { projects } from '../../data/projects';

export const roadmap: KaylaRoadmapItem[] = projects
  .filter((p): p is typeof projects[number] & { roadmap: string } => Boolean(p.roadmap))
  .map((p) => {
    let status: KaylaRoadmapItem['status'] = 'active';
    if (p.status === 'RESEARCH') status = 'research';
    else if (p.status === 'ACTIVE DEVELOPMENT') status = 'active';
    else if (p.status === 'PRIVATE DEVELOPMENT') status = 'active';
    else if (p.status === 'PREVIEW / BETA') status = 'preview';
    else if (p.status === 'CONCEPT') status = 'planned';
    else if (p.status === 'RELEASED') status = 'released';

    return {
      id: p.slug,
      name: p.name,
      status,
      summary: p.roadmap
    };
  });
