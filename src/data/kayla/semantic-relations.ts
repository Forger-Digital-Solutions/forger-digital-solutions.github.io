import { projects } from '../projects';
import { productRelationships } from './relationships';

/**
 * Canonical relationships between FDS entities.
 *
 * Phase 6's verifier could check individual facts — a version, a price, a
 * founder — but it had no notion of how entities relate, so a sentence built
 * entirely from true nouns could still assert something false:
 *
 *   "Sapphire is the model powering the free CodeForge release."
 *
 * Every noun there is real. The linkage is not, and the site says so in its
 * own words. This module is that missing dimension: a small typed set of
 * relationships FDS actually publishes, plus the ones it explicitly denies.
 *
 * Deliberately not a graph database. A public site with seven projects needs a
 * bounded, readable table that a maintainer can audit in one screen — not
 * inference infrastructure.
 */

/** Relationship shapes a generated sentence can assert about two entities. */
export type RelationPredicate =
  | 'powers'          // A provides the model/engine behind B
  | 'contains'        // A ships inside / is built into B
  | 'trains'          // A teaches or evaluates B
  | 'same-as'         // A and B are the same thing
  | 'part-of'         // A belongs to B's family/ecosystem
  | 'published-through' // A is distributed via B
  | 'related-to';     // A and B are associated, without a stronger claim

export interface CanonicalRelation {
  subject: string;
  predicate: RelationPredicate;
  object: string;
  /** Where in published site data this relationship comes from. */
  source: string;
}

export interface DeniedRelation {
  subject: string;
  predicate: RelationPredicate;
  object: string;
  /** The site's own words, so a rejection can explain itself. */
  reason: string;
}

/**
 * Relationships the published site establishes.
 *
 * The product-relationship table is the site's own machine-readable source, so
 * it is mapped rather than restated.
 */
export const canonicalRelations: CanonicalRelation[] = [
  // Every public project belongs to the FDS ecosystem.
  ...projects.map((project): CanonicalRelation => ({
    subject: project.slug,
    predicate: 'part-of',
    object: 'fds',
    source: 'projects.ts'
  })),
  // The site's own relationship table.
  ...productRelationships.flatMap((relation): CanonicalRelation[] => {
    const predicate: RelationPredicate | undefined =
      relation.relation === 'publishedThrough' ? 'published-through'
      : relation.relation === 'partOf' ? 'part-of'
      : relation.relation === 'relatedTo' || relation.relation === 'companionTo' || relation.relation === 'supports' ? 'related-to'
      : undefined;
    if (!predicate || relation.from === relation.to) return [];
    return [{ subject: relation.from, predicate, object: relation.to, source: 'relationships.ts productRelationships' }];
  })
];

/**
 * Relationships the site explicitly rules out. These are the highest-value
 * entries in the whole module: they are exactly the plausible-sounding links a
 * language model invents, and the site already answers each one directly.
 */
export const deniedRelations: DeniedRelation[] = [
  {
    subject: 'kayla-copilot',
    predicate: 'same-as',
    object: 'kayla-ai-publisher',
    reason: 'they share a name and nothing else'
  },
];

export function findCanonicalRelation(
  subject: string,
  predicate: RelationPredicate,
  object: string
): CanonicalRelation | undefined {
  return canonicalRelations.find(
    (relation) => relation.subject === subject && relation.predicate === predicate && relation.object === object
  );
}

export function findDeniedRelation(
  subject: string,
  predicate: RelationPredicate,
  object: string
): DeniedRelation | undefined {
  return deniedRelations.find(
    (relation) => relation.subject === subject && relation.predicate === predicate && relation.object === object
  );
}
