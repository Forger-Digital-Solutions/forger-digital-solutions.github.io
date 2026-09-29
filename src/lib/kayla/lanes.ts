import type { KaylaKnowledgeResult, KaylaLane } from '../../data/kayla/types';
import type { KaylaIntent } from '../../data/kayla/intents';
import { matchEntities, normalize, tokenize, distinctiveTokens, similarity } from '../../data/kayla/entities';
import { getDocument } from '../../data/kayla/retrieval';

/**
 * Kayla 2.0 lane classification — deterministic heuristics only.
 *
 * The visitor never sees this. It decides server-side whether a request is
 * answered by settled FDS knowledge, FDS-grounded inference, general
 * inference, or a blend of the last two. The rules are deliberately simple:
 *
 *   deterministic  - the canonical answer layer already settled it (identity,
 *                    status, availability, version, pricing, navigation,
 *                    privacy, boundary intents, ...). No provider quota spent.
 *   fds            - the question is about FDS and needs synthesis beyond the
 *                    settled answer, e.g. multi-record comparisons.
 *   mixed          - the question joins an FDS entity to a general topic
 *                    ("how does CodeForge differ from a normal coding
 *                    agent?"). Provider sees grounded FDS material and is
 *                    instructed to answer the rest normally.
 *   general        - no FDS signal at all: ordinary conversation, coding,
 *                    writing, explanations, math, general tech questions.
 */

/**
 * Whether retrieval found a real FDS document. Scores are cumulative per
 * token, so raw score alone cannot separate a genuine hit from body-text
 * noise — a below-threshold score on a document that shares the question's
 * distinctive vocabulary in its title/tags still counts (the serve-ready
 * threshold stays in the handler).
 */

/** Generic markers that, next to an FDS entity, mean the visitor wants both. */
const GENERAL_CROSS_MARKERS = [
  /\b(compare|compared|comparison|versus|vs\.?|difference|different|contrast|like|similar|same as|alternative|equivalent|better than|worse than)\b/,
  /\b(normal|typical|ordinary|standard|regular|usual|other|generic|conventional|traditional)\b.{0,30}\b(ai|assistant|agent|tool|product|app|software|model|approach|way|one)/,
  /\b(explain|how does|how do|why does|why do|what happens|in general|generally|usually)\b.{0,40}\b(versus|vs\.?|compared|difference|outside|beyond|not just)\b/
];

/** Composed answers only exist because canonical matching found an FDS subject. */
const COMPOSED_SOURCE_TYPES = new Set(['canonical', 'known-answer', 'entity-match']);
/** How far down the result list to look for a high-signal field overlap. */
const FIELD_SIGNAL_DEPTH = 3;

/**
 * Possessive phrasing that can only be about FDS — "your newsletter", "your
 * apps", "the site's roadmap". The visitor is asking about something the
 * site owns, so this is an FDS question even when retrieval is thin.
 */
const SITE_POSSESSIVE = /\b(?:your|the sites?|this sites?|fdss?)\b.{0,30}\b(newsletters?|emails?|mails?|updates?|discord|community|support|team|docs?|documentation|privacy|policy|terms|contacts?|store|shop|roadmap|blogs?|notes?|apps?|projects?|products?|software|tools?|models?|gems?)\b/i;

/**
 * Questions shaped like FDS product questions (availability, capability,
 * version, status) are FDS signals when a product document tops retrieval —
 * "what can I actually use right now?" names no entity and shares no title
 * vocabulary, but it is plainly asking about released FDS software.
 */
const FDS_PRODUCT_INTENTS: ReadonlySet<KaylaIntent> = new Set(['availability', 'capability', 'version', 'status', 'roadmap']);
const PRODUCT_DOC_TYPES = new Set(['app', 'download', 'release', 'gem']);

/**
 * Does a retrieved document share one of the question's distinctive words in
 * its title or tags? Body-text overlap alone is not enough — retrieval
 * scoring accumulates a point or two per common word, so an unrelated prompt
 * ("write a haiku about rain" matching "write-ups" in a newsletter FAQ) can
 * out-score a genuine FDS question ("what community resources exist?"). Title
 * and tags are the curated high-signal fields a real hit has to touch.
 */
function touchesField(result: KaylaKnowledgeResult, meaningful: string[]): boolean {
  const doc = result.id ? getDocument(result.id) : undefined;
  const fields = new Set<string>();
  for (const t of tokenize(doc?.title || result.title || '')) fields.add(t);
  for (const tag of doc?.tags || []) for (const t of tokenize(tag)) fields.add(t);
  if (!fields.size) return false;
  return meaningful.some(token => {
    if (fields.has(token)) return true;
    if (token.length < 5) return false;
    for (const field of fields) {
      if (field.length >= 5 && similarity(token, field) >= 0.85) return true;
    }
    return false;
  });
}

/**
 * Does the message carry a real FDS signal — a named entity match, a
 * site-possessive phrase, a composed canonical answer, a product-intent
 * question with a product document on top, or a retrieval hit whose document
 * shares distinctive query vocabulary in its title/tags? The word "code"
 * alone must not route to the FDS lane; an entity match is required.
 */
export function hasFdsSignal(message: string, sources: KaylaKnowledgeResult[], intent?: KaylaIntent): boolean {
  if (matchEntities(message).length > 0) return true;
  if (SITE_POSSESSIVE.test(message)) return true;
  const meaningful = distinctiveTokens(message);
  return sources.slice(0, FIELD_SIGNAL_DEPTH).some(result => {
    if (!result || typeof result.score !== 'number' || result.score <= 0) return false;
    if (COMPOSED_SOURCE_TYPES.has(result.sourceType || '')) return true;
    if (intent && FDS_PRODUCT_INTENTS.has(intent) && PRODUCT_DOC_TYPES.has(result.sourceType || '')) return true;
    return meaningful.length > 0 && touchesField(result, meaningful);
  });
}

/**
 * Does the message ask for something beyond FDS facts even though an FDS
 * entity is present — comparison against the outside world, general
 * explanation, or a task (write, debug, explain) that just happens to
 * reference an FDS name?
 */
export function hasGeneralCrossing(message: string): boolean {
  const text = normalize(message);
  return GENERAL_CROSS_MARKERS.some((pattern) => pattern.test(text));
}

/**
 * Intents that always produce an honest settled answer even without an
 * entity in play. Entity-dependent intents (identity, availability, version,
 * status) are deliberately absent: "what version of Python should I use?" or
 * "explain how a hash map works" only get a canonical answer when an FDS
 * entity is named, and must reach the general lane otherwise.
 */
const SETTLED_INTENTS: ReadonlySet<KaylaIntent> = new Set([
  'status_taxonomy',
  'pricing',
  'support',
  'contact',
  'navigation',
  'privacy',
  'founder',
  'assistant_identity',
  'external_current',
  'private_info'
]);

export function classifyLane(input: {
  message: string;
  intent?: KaylaIntent;
  sources: KaylaKnowledgeResult[];
  /** Entities the conversation layer resolved — includes alias heuristics
   *  like "the coding thing" that raw entity matching cannot see. */
  entities?: string[];
}): KaylaLane {
  const { message, intent, sources, entities } = input;
  const fdsSignal = (entities?.length ?? 0) > 0 || hasFdsSignal(message, sources, intent);

  if (intent && SETTLED_INTENTS.has(intent)) {
    return 'deterministic';
  }

  if (intent === 'unsupported_task') {
    // A task the old boundary refused. Kayla 2.0 answers it: pure task =>
    // general lane; task referencing an FDS entity => grounded mixed lane.
    return fdsSignal ? 'mixed' : 'general';
  }

  // Remaining intents (comparison, capability, recommendation, list, roadmap,
  // synthesis-like queries) need at least one FDS signal to be an FDS lane.
  if (!fdsSignal) return 'general';

  return hasGeneralCrossing(message) ? 'mixed' : 'fds';
}
