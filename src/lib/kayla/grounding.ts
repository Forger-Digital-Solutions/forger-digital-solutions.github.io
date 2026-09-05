import { projects } from '../../data/projects';
import { products } from '../../data/products';
import { gems } from '../../data/gems';
import { CANONICAL_INTERNAL_ROUTES, getCanonicalEntity } from '../../data/kayla/canonical-registry';
import { matchEntities } from '../../data/kayla/entities';
import type { KaylaKnowledgeResult } from '../../data/kayla/types';
import { isPromptInjectionAttempt } from './validate';

export const GROUNDING_BUDGET = { sources: 5, sourceChars: 6000, totalChars: 12000, answerChars: 8000 } as const;
export interface GroundingPacket {
  entities: string[];
  facts: { id: string; text: string; route?: string }[];
  allowedUrls: string[];
  chars: number;
  duplicatesRemoved: number;
}
const routeKey = (s: string) => s.replace(/\/+$/, '') || '/';

/** Selected public material has explicit size limits and no operational metadata. */
export function buildGroundingPacket(sources: KaylaKnowledgeResult[]): GroundingPacket {
  const facts: GroundingPacket['facts'] = [];
  const seen = new Set<string>();
  const ids = new Set<string>();
  const urls = new Set<string>();
  let chars = 0;
  let duplicatesRemoved = 0;
  for (const source of sources.slice(0, GROUNDING_BUDGET.sources)) {
    if (isPromptInjectionAttempt(source.snippet)) continue;
    const text = source.snippet.slice(0, Math.min(GROUNDING_BUDGET.sourceChars, GROUNDING_BUDGET.totalChars - chars));
    if (!text) continue;
    if (seen.has(text)) { duplicatesRemoved++; continue; }
    seen.add(text);
    chars += text.length;
    for (const match of matchEntities(text)) ids.add(match.entityId);
    const route = source.route;
    if (route && ((CANONICAL_INTERNAL_ROUTES as readonly string[]).includes(routeKey(route)) || /^\/notes\/[a-z0-9-]+$/.test(route))) urls.add(routeKey(route));
    facts.push({ id: source.id || 'public-fds', text, ...(route && urls.has(routeKey(route)) ? { route } : {}) });
  }
  for (const id of ids) {
    const entity = getCanonicalEntity(id);
    if (entity?.route) urls.add(entity.route);
    const p = projects.find(p => p.slug === id);
    const product = products.find(p => (p.projectSlug || p.slug) === id);
    for (const url of [p?.githubUrl, p?.websiteUrl, p?.documentationUrl, product?.downloadUrl, product?.docsUrl, product?.releaseNotesUrl]) if (url) urls.add(url);
  }
  return { entities: [...ids].slice(0, 20), facts, allowedUrls: [...urls], chars, duplicatesRemoved };
}

/** Authority text is rebuilt from canonical owners, never from retrieval or history. */
function authorityFor(id: string): string {
  const p = projects.find(p => p.slug === id);
  const product = products.find(p => (p.projectSlug || p.slug) === id);
  const gem = gems.find(g => `gem-${g.key}` === id);
  return JSON.stringify({ p, product, gem }).toLowerCase();
}

/** Additional slot checks; this is deliberately not a claim of universal semantic verification. */
export function verifyGroundedSlots(text: string, packet: GroundingPacket): { ok: boolean; kinds: string[] } {
  const kinds = new Set<string>();
  if (text.length > GROUNDING_BUDGET.answerChars) kinds.add('output_bound');
  if (/\b(grounding packet|system prompt|aiDailyUsed|requestSeq|worker version|daily budget|certification receipt)\b|[A-Z]:\\|sk-or-/i.test(text)) kinds.add('internal');
  if (isPromptInjectionAttempt(text)) kinds.add('instruction');
  let previous: string[] = [];
  for (const sentence of text.split(/(?<=[.!?])\s+|\n+/).filter(Boolean)) {
    const explicit = matchEntities(sentence).map(m => m.entityId).filter(id => !['fds', 'projects', 'about', 'forged'].includes(id));
    const ids = explicit.length ? explicit : previous.length ? previous : packet.entities;
    if (explicit.length) previous = explicit;
    const authority = ids.map(authorityFor).join('\n');
    const negative = /\b(not|no|never|cannot|can't|isn't|aren't|hasn't|doesn't|won't|without|unknown|undocumented|unpublished)\b/i.test(sentence);
    const plain = sentence.toLowerCase();

    // Exact links, including nonexistent paths under otherwise approved hosts.
    for (const match of sentence.matchAll(/https?:\/\/[^\s)<>\]"']+|(?<![\w/:])\/[a-z][a-z0-9/_-]*/gi)) {
      const url = match[0].replace(/[.,;:]+$/, '');
      if (!packet.allowedUrls.some(allowed => routeKey(allowed).toLowerCase() === routeKey(url).toLowerCase()) && !(CANONICAL_INTERNAL_ROUTES as readonly string[]).includes(routeKey(url))) kinds.add('url');
    }
    // High-risk numerical slots must occur exactly in the selected entities' public records.
    for (const match of sentence.matchAll(/\bv?\d+(?:\.\d+){1,3}(?:[-a-z][a-z0-9.-]*)?|\b\d{4}-\d{2}-\d{2}\b/gi)) {
      if (!authority.includes(match[0].toLowerCase())) kinds.add('numeric_slot');
    }
    if (/[$€£¥]\s*\d|\b(?:\d+|one|ten|twenty|fifty|hundred)\s+(?:dollars?|euros?|pounds?|usd|eur|gbp)\b/i.test(sentence)) kinds.add('price');
    if (/\b(?:january|february|march|april|june|july|august|september|october|november|december|tomorrow|next (?:week|month|year)|20\d{2})\b/i.test(sentence) && /\b(?:launch|release|ship|arriv|available|scheduled|coming)\w*\b/i.test(sentence) && !negative) kinds.add('date');

    if (!negative) {
      for (const platform of ['PlayStation', 'Xbox', 'Android', 'iOS', 'Linux', 'macOS', 'Nintendo']) {
        if (new RegExp(`\\b${platform}\\b`, 'i').test(sentence) && !authority.includes(platform.toLowerCase())) kinds.add('platform');
      }
      for (const match of sentence.matchAll(/\b(?:GPT[- ]?\d[\w.-]*|Claude(?:\s+[\w.-]+){0,2}|Llama[- \d.]*|Gemini[- \d.]*|Qwen[\w.-]*|OLMo(?:\s+\d)?|Mathstral|SmolVLM[\w.-]*)/gi)) {
        if (/\b(powered|uses?|runs? on|includes?|model is|built on|ships? with)\b/i.test(sentence) && !authority.includes(match[0].toLowerCase())) kinds.add('model');
      }
      for (const id of ids) {
        const record = getCanonicalEntity(id);
        if (!record || ['company', 'page', 'assistant'].includes(record.kind)) continue;
        if (!record.downloadable && /\b(downloadable|released|publicly available|available (?:now|today|for download)|you can (?:download|install|use)|free to (?:use|download)|public (?:beta|preview)|production ready)\b/i.test(sentence)) kinds.add('availability');
        if (!record.downloadable && /\b(?:is|will be|costs?)\s+(?:completely\s+)?free\b/i.test(sentence)) kinds.add('price');
        for (const status of ['private development', 'active development', 'research', 'released', 'concept']) {
          if (new RegExp(`\\b(?:is|remains|status is|currently in|still in)\\s+(?:in\\s+)?${status}\\b`, 'i').test(plain) && !authority.includes(status)) kinds.add('status');
        }
      }
    }
    // Negation does not excuse a second affirmative clause about a different project.
    if (negative && /\bbut\b/i.test(sentence)) {
      const tail = sentence.split(/\bbut\b/i).slice(1).join('but');
      if (tail.trim()) for (const kind of verifyGroundedSlots(tail, { ...packet, entities: ids }).kinds) kinds.add(kind);
    }
  }
  return { ok: kinds.size === 0, kinds: [...kinds] };
}
