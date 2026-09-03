import { projects } from '../projects';
import { products } from '../products';
import { gems } from '../gems';

/**
 * Entity resolution for Kayla.
 *
 * The previous resolver compared every query token against every alias token
 * with a 0.6 Levenshtein threshold. Because "we the people" tokenizes to
 * ["we", "the", "people"], the word "the" in any question resolved to that
 * project, and "Forger" fuzzy-matched "forge" and resolved to CodeForge.
 * Matching is therefore phrase-based here, and single-word aliases must be
 * distinctive rather than common English words.
 */

export type KaylaEntityKind = 'project' | 'product' | 'gem' | 'page' | 'company' | 'assistant';

export interface KaylaEntity {
  id: string;
  kind: KaylaEntityKind;
  name: string;
  /** Alias phrases. Multi-word aliases match as contiguous phrases. */
  aliases: string[];
  route?: string;
}

/** Words that must never resolve an entity on their own. */
const STOPWORDS = new Set([
  'a', 'about', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'been', 'best', 'but', 'by',
  'can', 'could', 'day', 'did', 'do', 'does', 'doing', 'done', 'for', 'from', 'get', 'go', 'good',
  'has', 'have', 'help', 'her', 'here', 'him', 'his', 'how', 'i', 'if', 'in', 'is', 'it', 'its',
  'just', 'know', 'like', 'make', 'many', 'me', 'more', 'most', 'much', 'my', 'need', 'new', 'no',
  'not', 'now', 'of', 'off', 'on', 'one', 'only', 'or', 'other', 'our', 'out', 'over', 'own',
  'please', 'said', 'same', 'see', 'she', 'should', 'show', 'so', 'some', 'tell', 'than', 'that',
  'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'those', 'to', 'today', 'too',
  'up', 'us', 'use', 'used', 'very', 'want', 'was', 'we', 'were', 'what', 'when', 'where', 'which',
  'while', 'who', 'why', 'will', 'with', 'work', 'would', 'you', 'your'
]);

/** Single-word aliases shorter than this are only accepted as exact tokens. */
const MIN_FUZZY_LENGTH = 6;
/**
 * Fuzzy acceptance for one distinctive word: typo tolerance, not synonym
 * tolerance. At 0.82 a single edit in a six-letter word was accepted, so the
 * brand stem "Forger" matched the Forged storefront. 0.875 needs a longer word
 * before it forgives an edit, which still resolves run-together typos like
 * "WeThePeple".
 */
const FUZZY_THRESHOLD = 0.875;

export function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function tokenize(text: string): string[] {
  return normalize(text).split(' ').filter(Boolean);
}

/** Query tokens carrying real meaning: used as the retrieval relevance floor. */
export function distinctiveTokens(text: string): string[] {
  return tokenize(text).filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

/** "farm stand finder" and "farmstandfinder" should compare equal. */
function squash(text: string): string {
  return normalize(text).replace(/\s+/g, '');
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let previous = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let i = 1; i <= b.length; i++) {
    const current = [i];
    for (let j = 1; j <= a.length; j++) {
      current[j] = b[i - 1] === a[j - 1]
        ? previous[j - 1]
        : Math.min(previous[j - 1], current[j - 1], previous[j]) + 1;
    }
    previous = current;
  }
  return previous[a.length];
}

export function similarity(a: string, b: string): number {
  const x = normalize(a);
  const y = normalize(b);
  if (x === y) return 1;
  if (!x.length || !y.length) return 0;
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length);
}

/** Extra aliases people actually type. Deliberately distinctive: no generic nouns. */
const EXTRA_ALIASES: Record<string, string[]> = {
  codeforge: ['code forge', 'codeforge cli', 'forgezero', 'forge zero'],
  'gems-training-grounds': ['gems', 'gem', 'training grounds', 'training ground', 'gems training'],
  kyrablox: ['kyra blox', 'kyrablocks'],
  'kayla-ai-publisher': ['kayla ai publisher', 'kayla publisher', 'ai publisher'],
  'we-the-people': ['we the people', 'wethepeople', 'wtp'],
  'farmstand-finder': ['farmstand finder', 'farm stand finder', 'farmstand', 'farm stand'],
  forgerems: ['forgerems', 'forger ems', 'forger engineering maintenance suite', 'engineering maintenance suite', 'ems']
};

const PAGE_ENTITIES: KaylaEntity[] = [
  { id: 'forged', kind: 'page', name: 'Forged', aliases: ['forged', 'forged store', 'forged storefront'], route: '/forged' },
  { id: 'lab', kind: 'page', name: 'FDS Lab', aliases: ['fds lab', 'the lab'], route: '/lab' },
  { id: 'notes', kind: 'page', name: 'Notes', aliases: ['fds notes', 'build notes', 'build log'], route: '/notes' },
  { id: 'technology', kind: 'page', name: 'Technology', aliases: ['technology page', 'tech stack'], route: '/technology' },
  { id: 'support', kind: 'page', name: 'Support', aliases: ['support page', 'donations page'], route: '/support' },
  { id: 'about', kind: 'page', name: 'About', aliases: ['about page', 'about fds'], route: '/about' },
  { id: 'projects', kind: 'page', name: 'Projects', aliases: ['projects page', 'all projects'], route: '/projects' }
];

const COMPANY_ENTITY: KaylaEntity = {
  id: 'fds',
  kind: 'company',
  name: 'Forger Digital Solutions',
  aliases: ['forger digital solutions', 'forger digital', 'fds'],
  route: '/about'
};

const ASSISTANT_ENTITY: KaylaEntity = {
  id: 'kayla-copilot',
  kind: 'assistant',
  name: 'Kayla Copilot',
  aliases: ['kayla copilot', 'copilot'],
  route: '/'
};

function projectEntity(project: typeof projects[number]): KaylaEntity {
  const base = [project.name, project.shortName, project.slug].filter((value): value is string => Boolean(value));
  return {
    id: project.slug,
    kind: 'project',
    name: project.name,
    aliases: [...base, ...(EXTRA_ALIASES[project.slug] || [])],
    route: `/projects/${project.slug}`
  };
}

function gemEntity(gem: typeof gems[number]): KaylaEntity {
  return {
    id: `gem-${gem.key}`,
    kind: 'gem',
    name: gem.name,
    aliases: [gem.name, `${gem.name} gem`],
    route: '/projects/gems-training-grounds'
  };
}

export const entities: KaylaEntity[] = [
  COMPANY_ENTITY,
  ASSISTANT_ENTITY,
  ...projects.map(projectEntity),
  ...products
    .filter((product) => !projects.some((project) => project.slug === (product.projectSlug || product.slug)))
    .map((product): KaylaEntity => ({
      id: product.slug,
      kind: 'product',
      name: product.name,
      aliases: [product.name, product.slug, ...(EXTRA_ALIASES[product.slug] || [])],
      route: '/forged'
    })),
  ...gems.map(gemEntity),
  ...PAGE_ENTITIES
];

interface CompiledAlias {
  entityId: string;
  phrase: string;
  squashed: string;
  wordCount: number;
}

const compiledAliases: CompiledAlias[] = entities
  .flatMap((entity) => entity.aliases.map((alias) => {
    const phrase = normalize(alias);
    return { entityId: entity.id, phrase, squashed: squash(alias), wordCount: phrase.split(' ').length };
  }))
  .filter((alias) => alias.phrase.length > 1 && !(alias.wordCount === 1 && STOPWORDS.has(alias.phrase)))
  // Longest phrases first so "kayla ai publisher" outranks "kayla".
  .sort((a, b) => b.phrase.length - a.phrase.length);

export interface EntityMatch {
  entityId: string;
  matched: string;
  confidence: number;
}

/**
 * Resolve every entity mentioned in a query, strongest match first.
 * Returns an empty array rather than guessing.
 */
export function matchEntities(query: string): EntityMatch[] {
  const normalized = normalize(query);
  const squashedQuery = squash(query);
  const tokens = tokenize(query);
  const found = new Map<string, EntityMatch>();

  const record = (match: EntityMatch) => {
    const existing = found.get(match.entityId);
    if (!existing || existing.confidence < match.confidence) found.set(match.entityId, match);
  };

  for (const alias of compiledAliases) {
    if (alias.wordCount > 1) {
      // Multi-word aliases match as contiguous phrases, with or without spaces.
      if (normalized.includes(alias.phrase) || squashedQuery.includes(alias.squashed)) {
        record({ entityId: alias.entityId, matched: alias.phrase, confidence: 1 });
      }
      continue;
    }
    if (tokens.includes(alias.phrase)) {
      record({ entityId: alias.entityId, matched: alias.phrase, confidence: 1 });
      continue;
    }
    if (alias.phrase.length >= MIN_FUZZY_LENGTH) {
      for (const token of tokens) {
        if (token.length < MIN_FUZZY_LENGTH) continue;
        if (similarity(token, alias.phrase) >= FUZZY_THRESHOLD) {
          record({ entityId: alias.entityId, matched: token, confidence: 0.8 });
          break;
        }
      }
    }
  }

  return [...found.values()].sort((a, b) => b.confidence - a.confidence || b.matched.length - a.matched.length);
}

/** Highest-confidence entity for a query, or undefined when nothing distinctive matched. */
export function matchEntity(query: string): string | undefined {
  return matchEntities(query)[0]?.entityId;
}

export function getKaylaEntity(id: string): KaylaEntity | undefined {
  return entities.find((entity) => entity.id === id);
}
