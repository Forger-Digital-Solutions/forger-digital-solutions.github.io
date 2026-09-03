import type { KaylaKnowledgeResult, KaylaSource, KaylaSourceKind } from '../../data/kayla/types';

/**
 * Structured source metadata for a knowledge result.
 *
 * Kayla's canonical answers already carry an id, title, type, and route on
 * every KaylaKnowledgeResult — this derives a visitor-facing "where did this
 * come from" record from that existing data rather than inventing a new
 * source purely so every answer has one. A result with nothing attributable
 * (no id, or the "nothing matched" placeholder) yields no source.
 */
function deriveKind(result: KaylaKnowledgeResult): KaylaSourceKind {
  const route = result.route || '';
  if (result.type === 'github' || /(^|\/\/)github\.com/i.test(route)) return 'github';
  if (result.type === 'release' || (result.id || '').startsWith('release-')) return 'release';
  if (route.startsWith('/projects/') || result.type === 'app') return 'project';
  if (route.startsWith('/')) return 'page';
  return 'canonical';
}

export function toKaylaSource(result: KaylaKnowledgeResult): KaylaSource | undefined {
  if (!result.id || result.sourceType === 'none') return undefined;
  const route = result.route || '';
  const kind = deriveKind(result);
  const isExternal = /^https?:\/\//i.test(route);
  return {
    label: result.title,
    kind,
    ...(isExternal ? { url: route } : route ? { route } : {})
  };
}

/** Structured sources for the top N results, skipping any with nothing attributable. */
export function toKaylaSources(results: KaylaKnowledgeResult[], limit = 3): KaylaSource[] {
  return results
    .slice(0, limit)
    .map(toKaylaSource)
    .filter((source): source is KaylaSource => Boolean(source));
}
