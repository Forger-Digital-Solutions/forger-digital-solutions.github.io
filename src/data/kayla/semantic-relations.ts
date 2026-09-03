import { projects } from '../projects';
import { gems } from '../gems';
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

const GEM_IDS = gems.map((gem) => `gem-${gem.key}`);

/**
 * Relationships the published site establishes.
 *
 * The product-relationship table is the site's own machine-readable source, so
 * it is mapped rather than restated. The GEMS entries encode what the project
 * page and each lineage's `fit` text say about Training Grounds owning the
 * teaching and evaluation discipline.
 */
export const canonicalRelations: CanonicalRelation[] = [
  // Training Grounds is the environment that teaches and evaluates every GEM.
  // projects.ts: "Training Grounds owns the shared teaching, evaluation, and
  // advancement discipline"; gems.ts (Peridot): "Training Grounds—not Peridot
  // itself—owns the shared evaluation and advancement discipline".
  ...GEM_IDS.map((gemId): CanonicalRelation => ({
    subject: 'gems-training-grounds',
    predicate: 'trains',
    object: gemId,
    source: 'projects.ts gems-training-grounds sections; gems.ts fit'
  })),
  // Each lineage belongs to the GEMS family.
  ...GEM_IDS.map((gemId): CanonicalRelation => ({
    subject: gemId,
    predicate: 'part-of',
    object: 'gems-training-grounds',
    source: 'gems.ts family definition'
  })),
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
    subject: 'gem-sapphire',
    predicate: 'powers',
    object: 'codeforge',
    reason: 'no Sapphire capability is presented as shipping in CodeForge'
  },
  {
    subject: 'gem-sapphire',
    predicate: 'contains',
    object: 'codeforge',
    reason: 'no Sapphire capability is presented as shipping in CodeForge'
  },
  {
    subject: 'gem-sapphire',
    predicate: 'same-as',
    object: 'codeforge',
    reason: "Sapphire's role is distinct from CodeForge, which is already a public engineering product"
  },
  {
    subject: 'gem-garnet',
    predicate: 'powers',
    object: 'kayla-ai-publisher',
    reason: 'Garnet has potential relevance to Kayla Publisher while remaining a separate research lineage and system'
  },
  {
    subject: 'gem-garnet',
    predicate: 'contains',
    object: 'kayla-ai-publisher',
    reason: 'Garnet remains a separate research lineage and system'
  },
  {
    subject: 'gem-garnet',
    predicate: 'powers',
    object: 'kayla-copilot',
    reason: 'no trained Garnet model is available, and Kayla Copilot is the site guide rather than a GEMS deployment'
  },
  {
    subject: 'gem-garnet',
    predicate: 'contains',
    object: 'kayla-copilot',
    reason: 'no trained Garnet model is available'
  },
  {
    subject: 'gems-training-grounds',
    predicate: 'same-as',
    object: 'codeforge',
    reason: 'GEMS / Training Grounds is AI research; CodeForge is a released engineering product'
  },
  {
    subject: 'kayla-copilot',
    predicate: 'same-as',
    object: 'kayla-ai-publisher',
    reason: 'they share a name and nothing else'
  },
  {
    subject: 'kayla-ai-publisher',
    predicate: 'trains',
    object: 'gem-sapphire',
    reason: 'Training Grounds owns GEMS teaching and evaluation; Kayla AI Publisher is a creative product'
  },
  {
    subject: 'gem-topaz',
    predicate: 'part-of',
    object: 'gem-sapphire',
    reason: 'Topaz is not a shared base that every other GEM inherits'
  }
];

/** Every GEM is a research lineage, so none of them powers a shipping product. */
export function isResearchLineage(entityId: string): boolean {
  return GEM_IDS.includes(entityId);
}

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
