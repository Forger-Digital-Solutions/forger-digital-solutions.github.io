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

/**
 * The place a source actually points a visitor to. Two results can be
 * distinct KaylaKnowledgeResult entries (a project's summary doc and its
 * roadmap doc, say) that both resolve to the same page — showing both wastes
 * a source slot on a link the visitor already has.
 */
function destinationKey(source: KaylaSource): string {
  return `${source.kind}:${source.url || source.route || source.label}`.toLowerCase();
}

/**
 * Structured sources for the top N *distinct destinations*, skipping any
 * result with nothing attributable and any result that would only repeat a
 * link already included. Scored highest-relevance-first, so the first result
 * reaching a destination is the one that keeps the slot.
 */
export function toKaylaSources(results: KaylaKnowledgeResult[], limit = 3): KaylaSource[] {
  const seen = new Set<string>();
  const sources: KaylaSource[] = [];
  for (const result of results) {
    if (sources.length >= limit) break;
    const source = toKaylaSource(result);
    if (!source) continue;
    const key = destinationKey(source);
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push(source);
  }
  return sources;
}
