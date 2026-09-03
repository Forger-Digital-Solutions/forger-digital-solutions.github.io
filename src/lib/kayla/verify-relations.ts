import { projects } from '../../data/projects';
import { products } from '../../data/products';
import { gems } from '../../data/gems';
import {
  findCanonicalRelation,
  findDeniedRelation,
  isResearchLineage,
  type RelationPredicate
} from '../../data/kayla/semantic-relations';

/**
 * Relationship verification.
 *
 * Phase 6's verifier validated facts in isolation, so a sentence assembled from
 * individually true nouns could still assert an invented linkage — "Sapphire is
 * the model powering the free CodeForge release" contains no false noun and no
 * false price, yet the site explicitly denies the connection.
 *
 * This finds subject/predicate/object triples between recognised FDS entities
 * and rejects the ones canonical data does not support. It is deliberately
 * conservative: it only inspects a small set of high-risk linkage verbs, and
 * anything negated, hedged into a question, or merely co-occurring is left
 * alone. A false rejection here would suppress the site's own true prose, which
 * is a worse failure than missing an exotic phrasing.
 */

export type RelationViolationKind = 'denied_relation' | 'unsupported_relation' | 'false_equivalence';

export interface RelationViolation {
  kind: RelationViolationKind;
  detail: string;
  sentence: string;
}

interface EntityMention {
  id: string;
  index: number;
  /** End offset, so a verb pattern matching inside the name itself is ignored. */
  end: number;
  name: string;
}

/**
 * The company itself is the umbrella every project sits under, not a peer
 * product. "Kayla Copilot is built into the Forger Digital Solutions website"
 * and "GEMS is part of FDS" are ordinary true statements, so linkage claims
 * involving FDS carry none of the hallucination risk this check exists for.
 */
const UMBRELLA_ENTITIES = new Set(['fds']);

/** Display names that identify an entity inside generated prose. */
const ENTITY_NAMES: { id: string; patterns: string[] }[] = [
  ...projects.map((project) => ({
    id: project.slug,
    patterns: [project.name, project.shortName].filter((value): value is string => Boolean(value))
  })),
  ...products
    .filter((product) => !projects.some((project) => project.slug === (product.projectSlug || product.slug)))
    .map((product) => ({ id: product.slug, patterns: [product.name] })),
  ...gems.map((gem) => ({ id: `gem-${gem.key}`, patterns: [gem.name] })),
  { id: 'kayla-copilot', patterns: ['Kayla Copilot'] },
  { id: 'gems-training-grounds', patterns: ['Training Grounds', 'GEMS'] },
  { id: 'fds', patterns: ['Forger Digital Solutions', 'FDS'] }
];

/**
 * Verbs that assert a linkage strong enough to be worth checking. Weak
 * associations ("relates to", "sits alongside") are not policed: the site makes
 * plenty of those claims legitimately, and a model repeating them is harmless.
 */
const PREDICATE_PATTERNS: { predicate: RelationPredicate; pattern: RegExp }[] = [
  { predicate: 'powers', pattern: /\b(powers?|powering|powered by|drives|driving|runs on|running on|is built on|built upon|is the (?:model|engine|brain|intelligence)\s+(?:behind|powering|for|used by))\b/gi },
  { predicate: 'contains', pattern: /\b(is built into|built into|is embedded in|embedded in|is integrated into|integrated into|ships? (?:in|inside|with)|shipping in|is included in|included in|is inside|lives inside|is bundled (?:in|with))\b/gi },
  // Finite verb forms only. "training" and "teaching" are nouns far more often
  // than verbs in this corpus — "Training Grounds" is a proper name and
  // "post-training" is a technique — so the gerunds are deliberately excluded.
  { predicate: 'trains', pattern: /\b(trains|teaches|is training|is teaching|fine-?tunes)\b/gi },
  { predicate: 'same-as', pattern: /\b(is another name for|is just another name for|is the same (?:as|thing as|product as)|are the same(?: thing| product)?|is rebranded as|is simply|is basically|is essentially)\b/gi }
];

/** Only these carry enough weight that an unsupported claim is a violation. */
const STRONG_PREDICATES = new Set<RelationPredicate>(['powers', 'contains', 'trains', 'same-as']);

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * A denial or a question is not an assertion. The site's own wording — "no
 * Sapphire capability is presented as shipping in CodeForge" — must survive
 * this check unflagged, so negation is tested across the whole sentence.
 */
function isNegatedOrHypothetical(sentence: string): boolean {
  if (sentence.trim().endsWith('?')) return true;
  return /\b(not|no|never|isn't|is not|aren't|are not|doesn't|does not|don't|do not|cannot|can't|won't|will not|nor|neither|without|rather than|instead of|separate from|distinct from|has not|have not|hasn't|haven't)\b/i.test(sentence);
}

function findEntities(sentence: string): EntityMention[] {
  const found: EntityMention[] = [];
  for (const entity of ENTITY_NAMES) {
    for (const pattern of entity.patterns) {
      // Word-boundary match so "GEMS" does not fire inside another word.
      const regex = new RegExp(`\\b${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      const match = regex.exec(sentence);
      if (match && match.index >= 0) {
        found.push({ id: entity.id, index: match.index, end: match.index + match[0].length, name: pattern });
        break;
      }
    }
  }
  return found.sort((a, b) => a.index - b.index);
}

/**
 * Pair a linkage verb with the nearest entity on each side. Approximate by
 * design: a full parse is not warranted for a seven-project site, and the
 * conservative gates above keep the approximation from over-firing.
 */
function extractTriples(sentence: string): { subject: EntityMention; predicate: RelationPredicate; object: EntityMention }[] {
  const entities = findEntities(sentence);
  if (entities.length < 2) return [];

  const triples: { subject: EntityMention; predicate: RelationPredicate; object: EntityMention }[] = [];
  for (const { predicate, pattern } of PREDICATE_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(sentence)) !== null) {
      const verbIndex = match.index;
      // A verb pattern landing inside an entity's own name is part of that
      // name, not a claim about it.
      if (entities.some((entity) => verbIndex >= entity.index && verbIndex < entity.end)) continue;
      const subject = [...entities].reverse().find((entity) => entity.end <= verbIndex);
      const object = entities.find((entity) => entity.index > verbIndex);
      if (subject && object && subject.id !== object.id) {
        triples.push({ subject, predicate, object });
      }
    }
  }
  return triples;
}

export function verifyRelationsInText(text: string): RelationViolation[] {
  const violations: RelationViolation[] = [];

  for (const sentence of sentences(text)) {
    if (isNegatedOrHypothetical(sentence)) continue;

    for (const { subject, predicate, object } of extractTriples(sentence)) {
      const denied = findDeniedRelation(subject.id, predicate, object.id)
        || findDeniedRelation(object.id, predicate, subject.id);
      if (denied) {
        violations.push({
          kind: predicate === 'same-as' ? 'false_equivalence' : 'denied_relation',
          detail: `${subject.name} ${predicate} ${object.name} contradicts canonical data: ${denied.reason}`,
          sentence
        });
        continue;
      }

      if (!STRONG_PREDICATES.has(predicate)) continue;
      if (UMBRELLA_ENTITIES.has(subject.id) || UMBRELLA_ENTITIES.has(object.id)) continue;
      if (findCanonicalRelation(subject.id, predicate, object.id)) continue;

      // A research lineage cannot be asserted to power or ship inside anything:
      // no GEM has been trained to release, so any such claim is invented.
      const researchClaim = (predicate === 'powers' || predicate === 'contains') && isResearchLineage(subject.id);
      violations.push({
        kind: predicate === 'same-as' ? 'false_equivalence' : 'unsupported_relation',
        detail: researchClaim
          ? `${subject.name} is a GEMS research lineage with no released model, so it cannot ${predicate === 'powers' ? 'power' : 'ship inside'} ${object.name}`
          : `FDS does not publish a "${predicate}" relationship between ${subject.name} and ${object.name}`,
        sentence
      });
    }
  }

  return violations;
}
