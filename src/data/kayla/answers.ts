import type { KaylaSafeAction, KaylaPageContext, KaylaConversationMessage } from './types';
import { projects } from '../projects';
import { products } from '../products';
import { gems, affordability } from '../gems';
import { statusMeta } from '../status';
import { siteConfig } from '../../config/site';
import { fds } from './company/fds';
import { founder } from './company/founder';
import { matchEntities, getKaylaEntity, normalize } from './entities';
import { classifyIntents, type KaylaIntent } from './intents';
import { downloadableNow, statusesInUse, byStatus, gemNames } from './availability';
import { findCanonicalRelation, findDeniedRelation, type RelationPredicate } from './semantic-relations';

/**
 * Canonical answer derivation.
 *
 * Every fact here is read from the site's own data (projects, products, gems,
 * status, site config) rather than restated. Adding a release or changing a
 * status in those files changes Kayla's answer with no edit in this file.
 * The model may rephrase these answers; it must never decide them.
 */

export interface CanonicalAnswer {
  text: string;
  title?: string;
  actions?: KaylaSafeAction[];
  sources: string[];
  intent: KaylaIntent;
  entityId?: string;
  /**
   * Settled facts and scope boundaries: correcting a false premise or refusing
   * an out-of-scope request must not be re-litigated by a model, so these are
   * served verbatim and never spend provider budget.
   */
  settled?: boolean;
}

const GEM_PREFIX = 'gem-';

function project(slug: string) {
  return projects.find((entry) => entry.slug === slug);
}

function productFor(slug: string) {
  return products.find((entry) => entry.slug === slug || entry.projectSlug === slug);
}

function gemFor(entityId: string) {
  return entityId.startsWith(GEM_PREFIX) ? gems.find((gem) => gem.key === entityId.slice(GEM_PREFIX.length)) : undefined;
}

function displayName(entityId: string): string {
  return getKaylaEntity(entityId)?.name || entityId;
}

function statusSentence(slug: string): string {
  const record = project(slug);
  if (!record) return '';
  const meta = statusMeta[record.status];
  const secondary = record.secondaryStatus ? ` It also remains in ${record.secondaryStatus.toLowerCase()}.` : '';
  return `${record.name} is ${record.status}: ${meta.short.charAt(0).toLowerCase()}${meta.short.slice(1)}${secondary}`;
}

function projectPageAction(slug: string): KaylaSafeAction {
  return { type: 'OPEN_APP', label: `View ${displayName(slug)}`, href: `/projects/${slug}` };
}

/** Availability is derived, never asserted: a download exists or it does not. */
function availabilityAnswer(entityId: string): CanonicalAnswer | undefined {
  const gem = gemFor(entityId);
  if (gem) {
    return {
      text: `${gem.name} is not downloadable. It is a ${gem.state.toLowerCase()} lineage inside GEMS — ${gem.notClaimed.charAt(0).toLowerCase()}${gem.notClaimed.slice(1)} There is no ${gem.name} release, version, or download to point you to.`,
      actions: [{ type: 'OPEN_APP', label: 'View GEMS research', href: '/projects/gems-training-grounds' }],
      sources: [`gem-${gem.key}`],
      intent: 'availability',
      entityId
    };
  }

  const record = project(entityId);
  const productRecord = productFor(entityId);

  if (productRecord?.downloadUrl && !productRecord.comingSoon) {
    const version = productRecord.version ? ` The current public version is ${productRecord.version}.` : '';
    const platform = productRecord.platform.length ? ` It runs on ${productRecord.platform.join(', ')}.` : '';
    return {
      text: `Yes. ${productRecord.name} is publicly available and free.${version}${platform} Downloads and version history are on GitHub Releases: ${productRecord.downloadUrl}`,
      actions: [{ type: 'OPEN_DOWNLOAD', label: `Download ${productRecord.name}`, href: productRecord.downloadUrl }],
      sources: [`product-${productRecord.slug}`],
      intent: 'availability',
      entityId
    };
  }

  if (record) {
    return {
      text: `No — there is no public ${record.name} download right now. ${statusSentence(entityId)} When something is ready to use, it is listed on Forged.`,
      actions: [projectPageAction(entityId), { type: 'OPEN_FORGED', label: 'See what is available now', href: '/forged' }],
      sources: [`app-${entityId}`],
      intent: 'availability',
      entityId
    };
  }

  return undefined;
}

function versionAnswer(entityId: string): CanonicalAnswer | undefined {
  const gem = gemFor(entityId);
  if (gem) {
    return {
      text: `${gem.name} has no version number. It is a ${gem.state.toLowerCase()} lineage — no trained ${gem.name} model has been released.`,
      sources: [`gem-${gem.key}`],
      intent: 'version',
      entityId
    };
  }

  const productRecord = productFor(entityId);
  if (productRecord?.version) {
    return {
      text: `${productRecord.name} is at ${productRecord.version}${productRecord.status === 'public-beta' ? ' (public preview)' : ''}. Canonical packages and version history live on GitHub Releases.`,
      actions: productRecord.downloadUrl
        ? [{ type: 'OPEN_DOWNLOAD', label: `Download ${productRecord.name}`, href: productRecord.downloadUrl }]
        : undefined,
      sources: [`product-${productRecord.slug}`],
      intent: 'version',
      entityId
    };
  }

  const record = project(entityId);
  if (record) {
    return {
      text: `There is no public version number for ${record.name}. ${statusSentence(entityId)}`,
      actions: [projectPageAction(entityId)],
      sources: [`app-${entityId}`],
      intent: 'version',
      entityId
    };
  }

  return undefined;
}

/** Price comes from the product record's pricing model, never from the model. */
function pricingAnswer(entityId?: string): CanonicalAnswer {
  const productRecord = entityId ? productFor(entityId) : undefined;
  if (productRecord) {
    return {
      text: `${productRecord.name} is free. FDS does not charge for it, and future paid tiers or pricing details are not finalized or documented. There is no subscription, licence fee, or paid tier published.`,
      actions: productRecord.downloadUrl
        ? [{ type: 'OPEN_DOWNLOAD', label: `Download ${productRecord.name}`, href: productRecord.downloadUrl }]
        : undefined,
      sources: [`product-${productRecord.slug}`],
      intent: 'pricing',
      entityId
    };
  }
  if (entityId && (project(entityId) || gemFor(entityId))) {
    const label = displayName(entityId);
    return {
      text: `There is no price for ${label} because there is nothing to buy yet — it has no public release. Everything FDS has published so far is free.`,
      sources: [entityId.startsWith(GEM_PREFIX) ? entityId : `app-${entityId}`],
      intent: 'pricing',
      entityId
    };
  }
  const free = products.filter((entry) => entry.downloadUrl).map((entry) => entry.name).join(' and ');
  return {
    text: `Everything FDS has released is free: ${free}. There are no subscriptions or paid tiers. Support is voluntary through Cash App or Ko-fi.`,
    actions: [{ type: 'OPEN_FORGED', label: 'Visit Forged', href: '/forged' }],
    sources: ['forged-page'],
    intent: 'pricing'
  };
}

function statusAnswer(entityId: string): CanonicalAnswer | undefined {
  const gem = gemFor(entityId);
  if (gem) {
    return {
      text: `${gem.name} is in ${gem.state} inside the GEMS program. ${gem.foundationStrategy} ${gem.notClaimed}`,
      actions: [{ type: 'OPEN_APP', label: 'View GEMS research', href: '/projects/gems-training-grounds' }],
      sources: [`gem-${gem.key}`],
      intent: 'status',
      entityId
    };
  }

  const record = project(entityId);
  if (!record) return undefined;
  const meta = statusMeta[record.status];
  const productRecord = productFor(entityId);
  const release = productRecord?.downloadUrl && productRecord.version
    ? ` The public build is ${productRecord.version}.`
    : '';
  return {
    text: `${record.name} is ${record.status}. ${meta.description}${release}`,
    actions: [projectPageAction(entityId)],
    sources: [`app-${entityId}`],
    intent: 'status',
    entityId
  };
}

function identityAnswer(entityId: string): CanonicalAnswer | undefined {
  const gem = gemFor(entityId);
  if (gem) {
    return {
      text: `${gem.name} is the GEMS lineage for ${gem.role.toLowerCase()}. ${gem.direction} It is currently in ${gem.state} — ${gem.notClaimed.charAt(0).toLowerCase()}${gem.notClaimed.slice(1)}`,
      title: gem.name,
      actions: [{ type: 'OPEN_APP', label: 'View GEMS', href: '/projects/gems-training-grounds' }],
      sources: [`gem-${gem.key}`],
      intent: 'identity',
      entityId
    };
  }

  const record = project(entityId);
  if (record) {
    const productRecord = productFor(entityId);
    const availability = productRecord?.downloadUrl
      ? ` It is publicly available${productRecord.version ? ` at ${productRecord.version}` : ''} and free.`
      : ` ${statusSentence(entityId)}`;
    return {
      text: `${record.name} — ${record.summary}${availability}`,
      title: record.name,
      actions: [projectPageAction(entityId)],
      sources: [`app-${entityId}`],
      intent: 'identity',
      entityId
    };
  }

  const productRecord = productFor(entityId);
  if (productRecord) {
    return {
      text: `${productRecord.name} — ${productRecord.description}${productRecord.version ? ` The current public version is ${productRecord.version}.` : ''}`,
      title: productRecord.name,
      actions: productRecord.downloadUrl
        ? [{ type: 'OPEN_DOWNLOAD', label: `Download ${productRecord.name}`, href: productRecord.downloadUrl }]
        : undefined,
      sources: [`product-${productRecord.slug}`],
      intent: 'identity',
      entityId
    };
  }

  return undefined;
}

function capabilityAnswer(entityId: string, query: string): CanonicalAnswer | undefined {
  const gem = gemFor(entityId);
  if (gem) {
    return {
      text: `${gem.name} is the ${gem.role.toLowerCase()} lineage. ${gem.direction} Nothing is shipping yet: it is in ${gem.state}, and ${gem.notClaimed.charAt(0).toLowerCase()}${gem.notClaimed.slice(1)} I have no benchmark scores, capability comparisons, or release claims for it.`,
      sources: [`gem-${gem.key}`],
      intent: 'capability',
      entityId
    };
  }

  const record = project(entityId);
  if (!record) return undefined;
  const focus = record.focusAreas?.length ? `\n\nFocus areas: ${record.focusAreas.join(', ')}.` : '';
  const limits = record.highlights?.length ? `\n\nWorth knowing:\n${record.highlights.map((line) => `• ${line}`).join('\n')}` : '';
  const metrics = /\b(users|customers|downloads|revenue|benchmark|market share)\b/.test(normalize(query))
    ? '\n\nFDS does not publish user counts, download totals, or benchmark results, so I have no figures to give you.'
    : '';
  return {
    text: `${record.name} — ${record.description}${focus}${limits}${metrics}`,
    actions: [projectPageAction(entityId)],
    sources: [`app-${entityId}`],
    intent: 'capability',
    entityId
  };
}

/**
 * Answering a question *about* a relationship, which is the mirror of the
 * verifier that rejects one. "Does Sapphire power CodeForge?" used to return a
 * CodeForge description that never addressed the question, and "When will
 * Sapphire ship in CodeForge?" opened with "Yes." — reading as confirmation of
 * a premise the site explicitly denies. An undocumented link has to be named as
 * undocumented rather than answered around.
 */
function relationshipAnswer(query: string, entityIds: string[]): CanonicalAnswer | undefined {
  const text = normalize(query);

  if (/\bgems?\b/.test(text) && /\btraining grounds?\b/.test(text) && /\b(relationship|between|connect|fit together|work together|difference)\b/.test(text)) {
    return {
      text: 'GEMS is the research family of specialized model lineages (Topaz, Sapphire, Peridot, Garnet), while Training Grounds is the environment that teaches, evaluates, and advances them. Training Grounds owns the shared evaluation and advancement discipline across all GEMS lineages.',
      actions: [{ type: 'OPEN_APP', label: 'View GEMS / Training Grounds', href: '/projects/gems-training-grounds' }],
      sources: ['app-gems-training-grounds', 'semantic-relations'],
      intent: 'comparison',
      settled: true
    };
  }

  const subjects = entityIds.filter((id) => getKaylaEntity(id));
  if (subjects.length < 2) return undefined;

  const [first, second] = subjects;
  const askedPredicate: RelationPredicate | undefined =
    // "part of" is membership, which the canonical table records as 'part-of';
    // testing it before the containment verbs keeps "Is X part of FDS?" from
    // being read as "does X ship inside FDS".
    /\bpart of\b|\bbelongs? to\b/.test(text) ? 'part-of'
    : /\b(powers?|powering|powered by|runs on|built on|which model|what model|drives|replaces?|replacing|models? used by|used by)\b/.test(text) ? 'powers'
    : /\b(ships? in|shipping in|built into|included in|inside|bundled|integrated into)\b/.test(text) ? 'contains'
    : /\b(same thing|same as|same product|another name for|identical|rebranded)\b/.test(text) ? 'same-as'
    : /\b(trains?|teaches|teaching)\b/.test(text) ? 'trains'
    : /\b(related|relate|relationship|connect|connects|connection|fit together|work together)\b/.test(text) ? 'related-to'
    : undefined;
  if (!askedPredicate) return undefined;

  const nameOf = (id: string) => displayName(id);

  // Forward-looking framing asks about a plan, not a current fact. FDS does not
  // publish dated roadmaps, so this must never be answered from architecture.
  const isFutureFraming = /\b(will|going to|plan|planned|roadmap|when will|eventually|replace|migrate|switch to)\b/.test(text);
  if (isFutureFraming) {
    return {
      text: `FDS has not publicly documented that. There is no published plan, timeline, or commitment connecting ${nameOf(first)} and ${nameOf(second)} that way — GEMS lineages are research with no released model, and FDS does not announce dates before work is ready.`,
      actions: [{ type: 'SHOW_APPS', label: 'View All Projects' }],
      sources: ['semantic-relations'],
      intent: 'capability',
      settled: true
    };
  }

  const denied = findDeniedRelation(first, askedPredicate, second) || findDeniedRelation(second, askedPredicate, first);
  if (denied) {
    return {
      text: `No. ${nameOf(denied.subject)} does not ${askedPredicate === 'same-as' ? 'mean the same thing as' : askedPredicate === 'powers' ? 'power' : askedPredicate === 'contains' ? 'ship inside' : 'train'} ${nameOf(denied.object)} — ${denied.reason}. They are separate systems in the published FDS information.`,
      actions: [{ type: 'SHOW_APPS', label: 'View All Projects' }],
      sources: ['semantic-relations'],
      intent: 'comparison',
      settled: true
    };
  }

  const supported = findCanonicalRelation(first, askedPredicate, second) || findCanonicalRelation(second, askedPredicate, first);
  if (supported) {
    const description = askedPredicate === 'trains'
      ? `${nameOf(supported.subject)} is the environment that teaches, evaluates, and advances ${nameOf(supported.object)}.`
      : askedPredicate === 'part-of' || askedPredicate === 'contains'
        ? `${nameOf(supported.subject)} is part of ${nameOf(supported.object)}.`
        : `${nameOf(supported.subject)} and ${nameOf(supported.object)} are related in published FDS information.`;
    return {
      text: description,
      actions: [{ type: 'SHOW_APPS', label: 'View All Projects' }],
      sources: ['semantic-relations'],
      intent: 'comparison'
    };
  }

  // "How are X and Y related?" with no strong claim asked: describe both and
  // let the separation stand rather than inventing a link.
  if (askedPredicate === 'related-to') return undefined;

  return {
    text: `FDS does not publish that relationship. ${nameOf(first)} and ${nameOf(second)} are described as separate things in the public FDS information, and nothing there establishes that ${askedPredicate === 'powers' ? 'one powers the other' : askedPredicate === 'contains' ? 'one ships inside the other' : askedPredicate === 'part-of' ? 'one belongs to the other' : askedPredicate === 'same-as' ? 'they are the same product' : 'one trains the other'}.`,
    actions: [{ type: 'SHOW_APPS', label: 'View All Projects' }],
    sources: ['semantic-relations'],
    intent: 'comparison',
    settled: true
  };
}

/**
 * What a status label means, and what it does not imply.
 *
 * A visible project page is not a release, and a public repository is not a
 * product. Answering these from `statusMeta` keeps the explanation identical to
 * what the project pages themselves render.
 */
function statusTaxonomyAnswer(query: string): CanonicalAnswer {
  const text = normalize(query);
  const inUse = statusesInUse();
  const named = inUse.find((entry) => text.includes(normalize(entry.status)));

  // "Is being on the Projects page the same as being released?" and friends.
  if (/\bprojects page\b|\bgithub repo|\brepository\b/.test(text)) {
    const downloads = downloadableNow();
    return {
      text: `No. Every FDS project has a public page, but a page is a description, not a release. Only ${downloads.map((entry) => `${entry.name}${entry.version ? ` (${entry.version})` : ''}`).join(' and ')} have public builds you can download today — everything else is still in development or research. A public GitHub repository does not mean a released application either.`,
      actions: [{ type: 'OPEN_FORGED', label: 'See what is available now', href: '/forged' }],
      sources: ['status-taxonomy'],
      intent: 'status_taxonomy',
      settled: true
    };
  }

  if (named) {
    const others = inUse.filter((entry) => entry.status !== named.status);
    const contrast = /\bdifference\b/.test(text) && others.length
      ? `\n\nFor contrast: ${others.slice(0, 3).map((entry) => `${entry.status} means ${entry.short.charAt(0).toLowerCase()}${entry.short.slice(1)}`).join('; ')}`
      : '';
    return {
      text: `${named.status} means ${named.description.charAt(0).toLowerCase()}${named.description.slice(1)}${named.projects.length ? ` Currently: ${named.projects.join(', ')}.` : ''}${contrast}`,
      actions: [{ type: 'SHOW_APPS', label: 'View All Projects' }],
      sources: ['status-taxonomy'],
      intent: 'status_taxonomy',
      settled: true
    };
  }

  const metaMatch = Object.entries(statusMeta).find(([key]) => text.includes(normalize(key)) || (key === 'PREVIEW / BETA' && /\b(preview|beta)\b/.test(text)));
  if (metaMatch) {
    const [statusKey, meta] = metaMatch;
    const projectMention = statusKey === 'PREVIEW / BETA'
      ? ' Currently, ForgerEMS is in public preview.'
      : ` No published FDS project is currently in ${statusKey.toLowerCase()}.`;
    return {
      text: `${statusKey} means ${meta.description.charAt(0).toLowerCase()}${meta.description.slice(1)}${projectMention}`,
      actions: [{ type: 'SHOW_APPS', label: 'View All Projects' }],
      sources: ['status-taxonomy'],
      intent: 'status_taxonomy',
      settled: true
    };
  }

  return {
    text: `FDS labels each project with the stage it is actually in:\n\n${inUse.map((entry) => `• ${entry.status} — ${entry.short.charAt(0).toLowerCase()}${entry.short.slice(1)} (${entry.projects.join(', ')})`).join('\n')}\n\nA project page existing does not mean the software is downloadable; Forged lists what you can actually use today.`,
    actions: [{ type: 'SHOW_APPS', label: 'View All Projects' }, { type: 'OPEN_FORGED', label: 'Visit Forged', href: '/forged' }],
    sources: ['status-taxonomy'],
    intent: 'status_taxonomy',
    settled: true
  };
}

/**
 * "What can I download?" is a narrower question than "what exists?", and
 * answering it with the full project list is what made these questions feel
 * like a catalogue dump rather than an answer.
 */
function availabilityListAnswer(query: string): CanonicalAnswer | undefined {
  const text = normalize(query);

  // A query asking which projects are PUBLICLY VISIBLE but NOT RELEASED/DOWNLOADABLE.
  // Must fire BEFORE the positive-availability pattern below, because that pattern
  // also matches the word "released" or "download" — without negation awareness — and
  // would incorrectly return only the released projects as the answer.
  // Signals: "visible/listed/public/page" combined with explicit negation of release.
  // "no download", "no public download", "no release", "not released", "not downloadable"
  // are all caught. The ordering ensures this fires before the download branch.
  const publicButNotReleased =
    (/\b(visible|listed|viewable|shown|pages?|on the site|publicly|projects?)\b/.test(text) &&
      (
        /\bnot\b.{0,25}\b(released|downloadable|available|out|public build)\b/.test(text) ||
        /\bno\b.{0,25}\b(download|release|public build|public download)\b/.test(text) ||
        /\b(unreleased|not yet released|no public build|no release)\b/.test(text)
      )) ||
    (/\b(show|list|which|what)\b/.test(text) && /\b(no|without)\s+(public\s+)?downloads?\b/.test(text));
  if (publicButNotReleased) {
    const notReleased = projects.filter((entry) =>
      !products.some((prod) =>
        (prod.projectSlug || prod.slug) === entry.slug && Boolean(prod.downloadUrl) && !prod.comingSoon
      )
    );
    const lines = notReleased
      .sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99))
      .map((entry) => `• ${entry.name} (${entry.status}): ${entry.summary}`)
      .join('\n');
    return {
      text: `Every FDS project has a public page, but a page is not a release. These projects are publicly listed but have no download today:\n\n${lines}\n\nOnly software on Forged has a public build you can actually run.`,
      actions: [{ type: 'SHOW_APPS', label: 'View All Projects' }, { type: 'OPEN_FORGED', label: 'See what is available now', href: '/forged' }],
      sources: notReleased.map((entry) => `app-${entry.slug}`),
      intent: 'availability',
      settled: true
    };
  }

  if (/\b(download|downloadable|installer|get the (software|app))\b/.test(text)) {
    const downloads = downloadableNow();
    return {
      text: `${downloads.map((entry) => `• ${entry.name}${entry.version ? ` (${entry.version})` : ''} — ${entry.route}`).join('\n')}\n\nThose are the only FDS builds with a public download right now. Everything else is in development or research with no public build. Forged is where released software is listed.`,
      actions: [{ type: 'OPEN_FORGED', label: 'Visit Forged', href: '/forged' }],
      sources: ['availability-matrix'],
      intent: 'availability',
      settled: true
    };
  }

  if (/\bprivate\b/.test(text)) {
    const privateProjects = byStatus('PRIVATE DEVELOPMENT');
    return {
      text: privateProjects.length
        ? `${privateProjects.map((entry) => `• ${entry.name}`).join('\n')}\n\n${privateProjects.length === 1 ? 'That project is' : 'Those projects are'} in PRIVATE DEVELOPMENT: active work with portions intentionally kept private. FDS does not publish a more specific reason than that.`
        : 'No FDS project is currently in private development.',
      actions: [{ type: 'SHOW_APPS', label: 'View All Projects' }],
      sources: ['availability-matrix'],
      intent: 'availability',
      settled: true
    };
  }

  return undefined;
}

/** No GEMS lineage has a released model, so "which GEMS are public" has one answer. */
function gemsAvailabilityAnswer(): CanonicalAnswer {
  return {
    text: `None of them. ${gemNames().join(', ')} are all research lineages inside GEMS — none has been trained to release, and there is no GEM model to download or run. The GEMS project page describes the research; it does not offer software.`,
    actions: [{ type: 'OPEN_APP', label: 'View GEMS research', href: '/projects/gems-training-grounds' }],
    sources: ['availability-matrix', 'gems-family'],
    intent: 'availability',
    settled: true
  };
}

function roadmapAnswer(entityId?: string): CanonicalAnswer {
  if (entityId) {
    const record = project(entityId);
    if (record?.roadmap) {
      return {
        text: `${record.name} roadmap direction: ${record.roadmap} That is direction, not a dated commitment.`,
        actions: [projectPageAction(entityId)],
        sources: [`roadmap-${entityId}`],
        intent: 'roadmap',
        entityId
      };
    }
  }
  const lines = projects
    .filter((entry) => entry.roadmap)
    .map((entry) => `• ${entry.name} (${entry.status}): ${entry.roadmap}`)
    .join('\n');
  return {
    text: `Current direction across FDS projects:\n\n${lines}\n\nThese are directions rather than dated promises.`,
    actions: [{ type: 'SHOW_APPS', label: 'View All Projects' }],
    sources: projects.filter((entry) => entry.roadmap).map((entry) => `roadmap-${entry.slug}`),
    intent: 'roadmap'
  };
}

/**
 * "Which projects can I use today?" and "which ones are still research?" are
 * the same list narrowed by a canonical field, so the filter is derived from
 * products.ts and each project's status rather than written out.
 */
function listFilter(query: string): { label: string; keep: (slug: string) => boolean } | undefined {
  const text = normalize(query);
  if (/\bresearch\b/.test(text)) {
    return { label: 'still in research', keep: (slug) => project(slug)?.status === 'RESEARCH' };
  }
  if (/\b(public|available|downloadable|use today|use now|actually use|out now|released|try today|can i use)\b/.test(text)) {
    return {
      label: 'available to use today',
      keep: (slug) => products.some((entry) => (entry.projectSlug || entry.slug) === slug && Boolean(entry.downloadUrl))
    };
  }
  if (/\b(private development|private)\b/.test(text)) {
    return { label: 'in private development', keep: (slug) => project(slug)?.status === 'PRIVATE DEVELOPMENT' };
  }
  if (/\b(in development|being built|active development|worked on|still building)\b/.test(text)) {
    return { label: 'in active development', keep: (slug) => Boolean(project(slug)?.status.includes('DEVELOPMENT')) };
  }
  return undefined;
}

function filteredListAnswer(query: string): CanonicalAnswer | undefined {
  const filter = listFilter(query);
  if (!filter) return undefined;
  const matching = projects.filter((entry) => filter.keep(entry.slug));
  const standalone = filter.label === 'available to use today'
    ? products.filter((entry) => entry.downloadUrl && !projects.some((p) => p.slug === (entry.projectSlug || entry.slug)))
    : [];

  if (matching.length === 0 && standalone.length === 0) {
    return {
      text: `Nothing is ${filter.label} right now.`,
      actions: [{ type: 'SHOW_APPS', label: 'View All Projects' }],
      sources: ['fds-ecosystem'],
      intent: 'list'
    };
  }

  const lines = [
    ...matching.map((entry) => {
      const productRecord = productFor(entry.slug);
      return `• ${entry.name} (${entry.status})${productRecord?.version ? ` — ${productRecord.version}` : ''}: ${entry.summary}`;
    }),
    ...standalone.map((entry) => `• ${entry.name} (${entry.status})${entry.version ? ` — ${entry.version}` : ''}: ${entry.tagline}`)
  ].join('\n');

  const heading = filter.label === 'available to use today'
    ? 'These are the FDS projects you can use today'
    : `These FDS projects are ${filter.label}`;

  return {
    text: `${heading}:\n\n${lines}`,
    actions: filter.label === 'available to use today'
      ? [{ type: 'OPEN_FORGED', label: 'Visit Forged', href: '/forged' }]
      : [{ type: 'SHOW_APPS', label: 'View All Projects' }],
    sources: matching.map((entry) => `app-${entry.slug}`),
    intent: 'list',
    settled: true
  };
}

function listAnswer(): CanonicalAnswer {
  const lines = projects
    .slice()
    .sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99))
    .map((entry) => {
      const productRecord = productFor(entry.slug);
      const suffix = productRecord?.downloadUrl ? ` — available now (${productRecord.version})` : '';
      return `• ${entry.name} (${entry.status})${suffix}: ${entry.summary}`;
    })
    .join('\n');
  const standalone = products
    .filter((entry) => !projects.some((p) => p.slug === (entry.projectSlug || entry.slug)))
    .map((entry) => `• ${entry.name} (${entry.status})${entry.version ? ` — ${entry.version}` : ''}: ${entry.tagline}`)
    .join('\n');
  return {
    text: `Forger Digital Solutions is currently building:\n\n${lines}${standalone ? `\n${standalone}` : ''}\n\nForged is the shelf for software you can download and use today.`,
    actions: [{ type: 'SHOW_APPS', label: 'View All Projects' }, { type: 'OPEN_FORGED', label: 'Visit Forged', href: '/forged' }],
    sources: ['fds-ecosystem', ...projects.map((entry) => `app-${entry.slug}`)],
    // Deliberately not settled: this same branch answers both a bare catalog
    // dump ("what software has an official release?") and an ecosystem
    // explanation ("explain all of FDS to me"), and the latter is exactly the
    // multi-record synthesis Phase 7 certified the provider for live. Settling
    // it here would silence that certified case along with the bare dump, so
    // the model stays eligible and this stands as its grounding evidence.
    intent: 'list'
  };
}

function comparisonAnswer(entityIds: string[]): CanonicalAnswer | undefined {
  if (entityIds.length < 2) return undefined;
  const [first, second] = entityIds;

  if ([first, second].includes('kayla-copilot') && [first, second].includes('kayla-ai-publisher')) {
    return {
      text: `We share a name and nothing else. I am Kayla Copilot — the guide built into this website. I answer questions about FDS, its projects, statuses, releases, downloads, and support routes.\n\nKayla AI Publisher is a separate FDS product: a creative-project workspace for manuscripts, chapters, characters, revision, visual storytelling, and publishing preparation. It is in ${project('kayla-ai-publisher')?.status || 'active development'} and has no public release yet.`,
      actions: [{ type: 'OPEN_APP', label: 'View Kayla AI Publisher', href: '/projects/kayla-ai-publisher' }],
      sources: ['kayla-copilot', 'app-kayla-ai-publisher'],
      intent: 'comparison'
    };
  }

  const describe = (id: string): string | undefined => {
    const gem = gemFor(id);
    if (gem) return `• ${gem.name} — ${gem.role} (${gem.state}).`;
    const record = project(id);
    if (record) {
      const productRecord = productFor(id);
      return `• ${record.name} (${record.status})${productRecord?.downloadUrl ? `, available now at ${productRecord.version}` : ''} — ${record.summary}`;
    }
    const productRecord = productFor(id);
    if (productRecord) return `• ${productRecord.name} (${productRecord.status}) — ${productRecord.tagline}`;
    if (id === 'forged') return `• Forged — ${fds.forged}`;
    if (id === 'fds') return `• Forger Digital Solutions — ${fds.mission}`;
    return undefined;
  };

  const parts = [describe(first), describe(second)].filter(Boolean);
  if (parts.length < 2) return undefined;
  return {
    text: `${displayName(first)} vs ${displayName(second)}:\n\n${parts.join('\n')}\n\nThey are separate products with separate purposes.`,
    sources: [first, second].map((id) => `app-${id}`),
    intent: 'comparison'
  };
}

/**
 * "Which FDS app should I use for X?" — scored against each project's own
 * category, tags, focus areas, and audience rather than a hand-written map, so
 * a new project becomes recommendable by existing in projects.ts.
 */
/** Words that describe the question rather than the subject of it. */
const QUESTION_WORDS = new Set(['should', 'would', 'could', 'which', 'recommend', 'need', 'needs', 'help', 'helps', 'want', 'wants', 'project', 'projects', 'product', 'products', 'application', 'applications', 'software', 'tool', 'tools', 'thing', 'things', 'involves', 'involve', 'focused', 'focus', 'about', 'look', 'looking', 'start', 'started', 'best', 'good', 'anything', 'something', 'stuff', 'work', 'works', 'using', 'used', 'fit', 'fits', 'suited']);

function recommendationAnswer(query: string): CanonicalAnswer | undefined {
  const words = distinctive(normalize(query)).filter((word) => !QUESTION_WORDS.has(word));
  if (words.length === 0) {
    return {
      text: 'It depends on the job. Choose CodeForge for repository engineering, GEMS / Training Grounds for model research, KyraBlox for game projects, Kayla AI Publisher for long-form creative work, FarmStand Finder for nearby food, We The People for civic information, or ForgerEMS for technician diagnostics and maintenance.',
      actions: [{ type: 'SHOW_APPS', label: 'View All Projects' }],
      sources: projects.map((p) => `app-${p.slug}`),
      intent: 'recommendation'
    };
  }

  const scored = projects.map((entry) => {
    // The problem and differentiation fields describe what a project is *for*
    // in a visitor's words ("coding assistants", "local food"), which is what a
    // recommendation question actually asks about.
    const haystack = distinctive(normalize([
      entry.category, entry.name, entry.summary, entry.audience || '',
      entry.problem || '', entry.differentiation || '',
      (entry.tags || []).join(' '), (entry.focusAreas || []).join(' ')
    ].join(' ')));
    let score = 0;
    for (const word of words) {
      if (haystack.some((candidate) => candidate === word || (word.length >= 5 && candidate.startsWith(word.slice(0, 5))))) score += 1;
    }
    return { entry, score };
  }).sort((a, b) => b.score - a.score);

  const productMatch = products.map((entry) => {
    const haystack = distinctive(normalize(`${entry.category} ${entry.name} ${entry.tagline} ${entry.description} ${entry.platform.join(' ')}`));
    let score = 0;
    for (const word of words) {
      if (haystack.some((candidate) => candidate === word || (word.length >= 5 && candidate.startsWith(word.slice(0, 5))))) score += 1;
    }
    return { entry, score };
  }).sort((a, b) => b.score - a.score)[0];

  const best = scored[0];
  const useProduct = productMatch && productMatch.score > (best?.score || 0) && !projects.some((p) => p.slug === (productMatch.entry.projectSlug || productMatch.entry.slug));

  if (useProduct && productMatch.score > 0) {
    return {
      text: `${productMatch.entry.name} — ${productMatch.entry.tagline} It is available now${productMatch.entry.version ? ` at ${productMatch.entry.version}` : ''}${productMatch.entry.downloadUrl ? `: ${productMatch.entry.downloadUrl}` : ''}`,
      actions: productMatch.entry.downloadUrl
        ? [{ type: 'OPEN_DOWNLOAD', label: `Download ${productMatch.entry.name}`, href: productMatch.entry.downloadUrl }]
        : undefined,
      sources: [`product-${productMatch.entry.slug}`],
      intent: 'recommendation'
    };
  }

  if (!best || best.score === 0) {
    return {
      text: `It depends on the job:\n${projects.map((entry) => `• ${entry.name} — ${entry.category}`).join('\n')}\n\nTell me what you are trying to do and I can point you at the right one.`,
      actions: [{ type: 'SHOW_APPS', label: 'View All Projects' }],
      sources: projects.map((entry) => `app-${entry.slug}`),
      intent: 'recommendation'
    };
  }

  const productRecord = productFor(best.entry.slug);
  const availability = productRecord?.downloadUrl
    ? ` It is available now at ${productRecord.version}.`
    : ` ${statusSentence(best.entry.slug)}`;
  return {
    text: `${best.entry.name} — ${best.entry.summary}${availability}`,
    actions: [projectPageAction(best.entry.slug)],
    sources: [`app-${best.entry.slug}`],
    intent: 'recommendation',
    entityId: best.entry.slug
  };
}

function navigationAnswer(entityId?: string, query?: string): CanonicalAnswer | undefined {
  if (query && /\b(github|repo|repository|source code)\b/i.test(query)) {
    return {
      text: `The official GitHub organization for Forger Digital Solutions is ${siteConfig.githubUrl}.`,
      actions: [{ type: 'OPEN_GITHUB', label: 'FDS on GitHub', href: siteConfig.githubUrl }],
      sources: ['site-navigation'],
      intent: 'navigation'
    };
  }
  if (entityId) {
    const entity = getKaylaEntity(entityId);
    if (entity?.route) {
      return {
        text: `${entity.name} lives at ${entity.route} on this site.`,
        actions: [{ type: 'OPEN_PAGE', label: `Open ${entity.name}`, href: entity.route }],
        sources: [`page-${entityId}`],
        intent: 'navigation',
        entityId
      };
    }
  }
  return {
    text: 'The main sections are Projects (/projects), Forged for downloadable software (/forged), Lab for the engineering method (/lab), Notes for build logs (/notes), Technology (/technology), About (/about), and Support (/support).',
    actions: [{ type: 'SHOW_APPS', label: 'View Projects' }, { type: 'OPEN_FORGED', label: 'Visit Forged', href: '/forged' }],
    sources: ['site-navigation'],
    intent: 'navigation'
  };
}

function supportAnswer(query: string): CanonicalAnswer {
  const hardware = /\b(hardware|equipment|computers?|laptops?|gpus?|servers?|pcs?|old tech|drives?|ram|monitors?)\b/.test(normalize(query));
  if (hardware) {
    return {
      text: `Yes — FDS accepts working computing equipment: ${siteConfig.hardwareExamples.slice(0, 6).join(', ')}, and similar gear. Email ${siteConfig.supportEmail} with the model, specs, condition, and your general location; logistics are arranged privately after that. No shipping address is published.`,
      actions: [
        { type: 'OPEN_PAGE', label: 'Hardware donations', href: '/support/hardware' },
        { type: 'OPEN_CONTACT', label: 'Email FDS', href: `mailto:${siteConfig.supportEmail}` }
      ],
      sources: ['hardware-donations'],
      intent: 'support'
    };
  }
  return {
    text: `You can support FDS development through Cash App (${siteConfig.cashAppHandle}) or Ko-fi (${siteConfig.kofiUrl}). Working hardware donations are also welcome — email ${siteConfig.supportEmail}. This supports development, operations, and hardware; it is not charitable giving, and community-project funding is not active yet.`,
    actions: [
      { type: 'OPEN_DONATE', label: 'Support FDS', href: '/support' },
      { type: 'OPEN_CONTACT', label: 'Donate Hardware', href: `mailto:${siteConfig.supportEmail}` }
    ],
    sources: ['fds-support'],
    intent: 'support'
  };
}

function assistantIdentityAnswer(query: string): CanonicalAnswer {
  const text = normalize(query);
  const publisherConfusion = /\b(kayla ai publisher|kayla publisher|the publisher|publish|manuscript|book|novel|chapter)\b/.test(text);
  if (publisherConfusion) {
    return {
      text: `No — I am Kayla Copilot, the guide built into the Forger Digital Solutions website. I answer questions about FDS, its projects, statuses, releases, downloads, and support routes.\n\nKayla AI Publisher is a different FDS product: a creative workspace for manuscripts, revision, visual storytelling, and publishing preparation. It is in ${project('kayla-ai-publisher')?.status || 'active development'} with no public release, and I cannot edit or publish anything for you.`,
      actions: [{ type: 'OPEN_APP', label: 'View Kayla AI Publisher', href: '/projects/kayla-ai-publisher' }],
      sources: ['kayla-copilot', 'app-kayla-ai-publisher'],
      intent: 'assistant_identity'
    };
  }
  return {
    text: `I am Kayla Copilot, the guide for the Forger Digital Solutions website. I can explain what FDS is and what it is building, tell you a project's real status, point you at what is downloadable today and what is not, cover releases and versions, explain the GEMS research family, and show you support and contact routes. I stay inside public FDS information — I am not a general-purpose assistant, and I share a name with Kayla AI Publisher without being that product.`,
    actions: [{ type: 'SHOW_APPS', label: 'View Projects' }],
    sources: ['kayla-copilot'],
    intent: 'assistant_identity'
  };
}

function founderAnswer(): CanonicalAnswer {
  return {
    text: `${founder.name} is the ${founder.role} of Forger Digital Solutions, based in ${siteConfig.location}. ${founder.publicBio}`,
    actions: [{ type: 'OPEN_PAGE', label: 'About FDS', href: '/about' }],
    sources: ['founder-bio'],
    intent: 'founder'
  };
}

function companyAnswer(): CanonicalAnswer {
  return {
    text: `Forger Digital Solutions (FDS) is an independent software and AI engineering studio. ${fds.mission} ${fds.vision.current}`,
    actions: [{ type: 'OPEN_PAGE', label: 'About FDS', href: '/about' }, { type: 'SHOW_APPS', label: 'View Projects' }],
    sources: ['fds-company', 'fds-mission'],
    intent: 'identity',
    entityId: 'fds'
  };
}

function boundaryAnswer(intent: KaylaIntent, query: string): CanonicalAnswer | undefined {
  if (intent === 'external_current') {
    return {
      text: 'I do not have live external data — no weather, news, prices, scores, or anything else happening in the world right now. I only know public information about Forger Digital Solutions and this site.',
      sources: ['scope-boundary'],
      intent
    };
  }
  if (intent === 'private_info') {
    return {
      text: 'That is not public information, and I do not have access to it. I only work from what FDS has published on this site — project descriptions, statuses, releases, downloads, and support routes. I will not guess at internal details, private code, unreleased work, finances, or credentials.',
      sources: ['scope-boundary'],
      intent
    };
  }
  if (intent === 'unsupported_task') {
    const text = normalize(query);
    if (/\b(manuscript|book|novel|chapter|story|draft)\b/.test(text)) {
      return {
        text: `I cannot — I am the website guide, not an editing tool. Kayla AI Publisher is the FDS product built for manuscripts, revision, and publishing preparation, and it is in ${project('kayla-ai-publisher')?.status || 'active development'} without a public release yet.`,
        actions: [{ type: 'OPEN_APP', label: 'View Kayla AI Publisher', href: '/projects/kayla-ai-publisher' }],
        sources: ['kayla-copilot', 'app-kayla-ai-publisher'],
        intent
      };
    }
    if (/\b(code|script|program|app|application|website|function|python|javascript|typescript|refactor|debug)\b/.test(text)) {
      return {
        text: `I do not write or run code — I am the guide for this website. CodeForge is the FDS product for that: a free, released autonomous software-engineering platform for Windows, CLI, and VS Code${productFor('codeforge')?.version ? ` (currently ${productFor('codeforge')?.version})` : ''}.`,
        actions: [{ type: 'OPEN_APP', label: 'View CodeForge', href: '/projects/codeforge' }],
        sources: ['kayla-copilot', 'app-codeforge'],
        intent
      };
    }
    if (/\b(computer|pc|laptop|drive|windows|machine|system)\b/.test(text)) {
      return {
        text: `I cannot diagnose your machine — I only answer questions about this website and FDS. ForgerEMS is the FDS product for technician work: diagnostics, drive validation, USB tooling, and driver guidance on Windows${productFor('forgerems')?.version ? ` (currently ${productFor('forgerems')?.version})` : ''}.`,
        actions: [{ type: 'OPEN_DOWNLOAD', label: 'Download ForgerEMS', href: productFor('forgerems')?.downloadUrl || '/forged' }],
        sources: ['kayla-copilot', 'product-forgerems'],
        intent
      };
    }
    return {
      text: 'That is outside what I do. I am the guide for the Forger Digital Solutions website — I can explain FDS projects, statuses, releases, downloads, and support routes.',
      sources: ['scope-boundary'],
      intent
    };
  }
  return undefined;
}

/**
 * "Which GEM is for coding?" names a role, not a GEM. Resolve it by scoring the
 * question against each lineage's own role and direction text.
 */
function gemByRole(query: string): string | undefined {
  const text = normalize(query);
  if (!/\bgems?\b/.test(text)) return undefined;
  // Only a selector question picks a lineage by role. "What is GEMS / Training
  // Grounds?" is about the programme, and used to resolve to Peridot because
  // that lineage's own text mentions Training Grounds.
  if (!/\b(which|what)\s+gems?\b/.test(text) && !/\bwhich\b/.test(text)) return undefined;
  const words = new Set(distinctive(text));
  if (words.size === 0) return undefined;

  // Stem-tolerant so "codes" matches "coding", "math" matches "mathematics",
  // and "orchestrates" matches "orchestration". An exact hit outranks a stem
  // hit, so "publishing" picks Garnet over Sapphire's "public engineering".
  const relatedness = (a: string, b: string): number => {
    if (a === b) return 3;
    if (a.length < 4 || b.length < 4) return 0;
    if (a.startsWith(b) || b.startsWith(a)) return 2;
    return a.slice(0, 5) === b.slice(0, 5) ? 1 : 0;
  };

  let best: { key: string; score: number } | undefined;
  for (const gem of gems) {
    const haystack = distinctive(normalize(`${gem.role} ${gem.direction} ${gem.fit}`));
    let score = 0;
    for (const word of words) {
      score += haystack.reduce((max, candidate) => Math.max(max, relatedness(word, candidate)), 0);
    }
    if (score > 0 && (!best || score > best.score)) best = { key: gem.key, score };
  }
  return best && best.score >= 1 ? `${GEM_PREFIX}${best.key}` : undefined;
}

function distinctive(text: string): string[] {
  const skip = new Set(['gem', 'gems', 'the', 'for', 'is', 'are', 'which', 'what', 'who', 'does', 'do', 'handles', 'handle', 'one', 'and', 'with', 'that', 'this', 'about', 'you', 'your', 'work', 'works']);
  return normalize(text).split(' ').filter((token) => token.length >= 4 && !skip.has(token));
}

/** Does the question lean on something already named in the conversation? */
function hasAnaphor(query: string): boolean {
  return /\b(it|its|it's|that|this|these|those|they|them|their|the same|one)\b/i.test(normalize(query));
}

function has1(intents: KaylaIntent[], intent: KaylaIntent): boolean {
  return intents.includes(intent);
}

/**
 * Entities named in the recent conversation, most recent first. Only the
 * visitor's own turns are trusted as subjects; an assistant turn can mention
 * several projects in passing and would drag the topic sideways.
 */
function entitiesFromHistory(history: KaylaConversationMessage[]): string[] {
  const found: string[] = [];
  for (let index = history.length - 1; index >= 0 && found.length < 2; index--) {
    const entry = history[index];
    if (!entry || entry.role !== 'user' || typeof entry.content !== 'string') continue;
    for (const match of matchEntities(entry.content)) {
      if (!found.includes(match.entityId)) found.push(match.entityId);
    }
  }
  return found;
}

/** Pull a named section straight out of the project record, so wording stays canonical. */
function sectionText(slug: string, title: string): string | undefined {
  return project(slug)?.sections?.find((section) => section.title.toLowerCase() === title.toLowerCase())?.body;
}

/**
 * False-premise correction.
 *
 * A question can assert something untrue — a version that does not exist, a
 * cancelled project, a launch that never happened, a benchmark result. These
 * are factual claims, so they are settled here rather than left to the model.
 */
/** Names outside the FDS founder that a question or a prior turn might assert. */
const FALSE_FOUNDER = /\b(elon\s+musk|musk|sam\s+altman|gates|zuckerberg|bezos)\b/i;
/** A pronoun follow-up asking about a founding action ("When did he do that?"). */
const FOUNDER_PRONOUN_FOLLOWUP = /\b(he|him|his|she|her|they|them)\b.{0,25}\b(do|did|does|found\w*|start\w*|creat\w*|establish\w*|built?)\b/i;

/** Did an earlier visitor turn (not Kayla's own reply) name a false founder? */
function priorTurnClaimedFalseFounder(history: KaylaConversationMessage[]): boolean {
  return history.some((entry) => entry?.role === 'user' && typeof entry.content === 'string' && FALSE_FOUNDER.test(entry.content));
}

function premiseAnswer(query: string, entityIds: string[], history: KaylaConversationMessage[] = []): CanonicalAnswer | undefined {
  const text = normalize(query);
  const primary = entityIds[0];
  const gemsInvolved = entityIds.some((id) => id.startsWith(GEM_PREFIX) || id === 'gems-training-grounds');

  // Political framing of the civic project.
  if (entityIds.includes('we-the-people') && /\b(republican|democrat|partisan|political party|politically|left wing|right wing|liberal|conservative|biased?)\b/.test(text)) {
    const neutrality = sectionText('we-the-people', 'Neutrality');
    return {
      text: `Neither. ${neutrality || 'We The People is nonpartisan. It is intended to clarify public information and civic processes without political advocacy or partisan framing.'}`,
      actions: [projectPageAction('we-the-people')],
      sources: ['app-we-the-people'],
      intent: 'capability',
      entityId: 'we-the-people'
    };
  }

  // Claimed parity with a frontier model.
  if (gemsInvolved && /\b(as (smart|good|capable|powerful|strong) as|better than|smarter than|beats?|outperforms?|surpass(es|ed)?|competitive with)\b/.test(text)) {
    return {
      text: `No, and FDS does not claim otherwise. ${affordability.target} Every GEMS lineage is in research: no GEM has been trained to release, independently benchmarked, or compared against a frontier model. ${affordability.lead} ${affordability.body}`,
      actions: [{ type: 'OPEN_APP', label: 'View GEMS', href: '/projects/gems-training-grounds' }],
      sources: ['gems-family'],
      intent: 'capability'
    };
  }

  // Claimed usage, revenue, or benchmark figures.
  if (/\b(how many|how much)\b.{0,30}\b(users?|customers?|downloads?|installs?|revenue|subscribers?|employees?|staff|people|developers?|contributors?)\b/.test(text)
    || /\b\d+\s*(million|billion|thousand|k)\b.{0,25}\b(users?|customers?|downloads?|installs?)\b/.test(text)
    || /\b(benchmark|benchmarks|leaderboard|score[sd]?)\b.{0,25}\b(result|number|score|does|has|have|beat|is)\b/.test(text)
    || /\bwhat (benchmark|score)\b/.test(text)
    || /\b(how much|what).{0,20}\b(funding|raised|valuation|worth|revenue|profit)\b/.test(text)
    || /\bhow (big|large) is (fds|the (team|company|studio))\b/.test(text)) {
    return {
      text: 'FDS does not publish headcount, user counts, download totals, funding, revenue, or benchmark results, so I have no figures to give you and will not estimate any. What I can tell you is what each project is and what state it is actually in.',
      actions: [{ type: 'SHOW_APPS', label: 'View Projects' }],
      sources: ['scope-boundary'],
      intent: 'capability',
      entityId: primary
    };
  }

  // False founder premise: Elon Musk or other non-canonical founders
  if (FALSE_FOUNDER.test(text)) {
    return {
      text: `${founder.name} founded Forger Digital Solutions, not Elon Musk or anyone else. FDS is an independent studio founded and operated by ${founder.name}.`,
      actions: [{ type: 'OPEN_PAGE', label: 'About FDS', href: '/about' }],
      sources: ['founder-bio'],
      intent: 'founder'
    };
  }

  // A pronoun follow-up to an already-claimed false founder ("When did he do
  // that?") must not be left unanswered, and must not let the false name back
  // in through an anaphor the entity/premise checks above don't parse as a
  // person. Only fires when this same conversation actually raised the false
  // name; an isolated "when did he found it" about nothing is left alone.
  if (FOUNDER_PRONOUN_FOLLOWUP.test(text) && priorTurnClaimedFalseFounder(history)) {
    return {
      text: `There is no founding date to give for that, because ${founder.name} — not Elon Musk or anyone else — founded Forger Digital Solutions. ${founder.name} is FDS's only founder.`,
      actions: [{ type: 'OPEN_PAGE', label: 'About FDS', href: '/about' }],
      sources: ['founder-bio'],
      intent: 'founder'
    };
  }

  // False pricing premise: an explicit dollar figure or a paid-tier/plan claim
  // attached to a real FDS entity. Delegates the actual price text to
  // pricingAnswer() so every entity (not just CodeForge) gets its own correct
  // free-or-no-price answer; this only prepends the specific rejection.
  if (primary && (project(primary) || gemFor(primary) || productFor(primary))) {
    const dollarMatch = query.match(/\$\s?(\d+(?:\.\d{1,2})?)/) || text.match(/\b(\d+(?:\.\d{1,2})?)\s*(?:dollars|usd)\b/);
    const paidTierMention = /\b(paid tier|paid plan|pro tier|pro plan|premium tier|premium plan|future tiers?|tier cost|pricing tier)\b/i.test(text);
    if (dollarMatch || paidTierMention) {
      const base = pricingAnswer(primary);
      // Deliberately does not echo the fabricated figure back (e.g. "$49"):
      // verifyAgainstCanon()'s price check has no negation awareness by
      // design, so repeating the exact amount here would make this settled
      // answer collide with the same rule that must reject a model asserting it.
      const rejection = dollarMatch ? `That is not a real published price for ${displayName(primary)}. ` : '';
      return { ...base, text: `${rejection}${base.text}` };
    }
  }

  // Fabricated download link check (e.g. example.com/kyrablox.zip)
  if (/\b(example[\s.]*com|kyrablox[\s.]*zip|\.zip|\.exe)\b/i.test(query) && /\b(kyrablox|sapphire|topaz|garnet|peridot|we the people)\b/i.test(text)) {
    return {
      text: 'No, that is completely false. KyraBlox has no public download, and https://example.com/kyrablox.zip is an invented link. KyraBlox is currently in active development with no public release.',
      actions: [{ type: 'OPEN_APP', label: 'View KyraBlox', href: '/projects/kyrablox' }],
      sources: ['app-kyrablox'],
      intent: 'availability',
      entityId: 'kyrablox'
    };
  }

  if (!primary) return undefined;
  const name = displayName(primary);

  // A version number that does not exist.
  const versionMention = text.match(/\bv\s?(\d+(?:\s\d+)*)\b/) || query.match(/\bv?(\d+\.\d+(?:\.\d+)?)/i);
  if (versionMention) {
    const mentioned = versionMention[1].replace(/\s+/g, '.');
    const productRecord = productFor(primary);
    const actual = productRecord?.version;
    const normalizedActual = actual ? actual.replace(/^v/i, '').toLowerCase() : undefined;
    if (normalizedActual && !normalizedActual.startsWith(mentioned.toLowerCase()) && !mentioned.toLowerCase().startsWith(normalizedActual)) {
      return {
        text: `There is no ${name} v${mentioned}. The current public version is ${actual}, and I have nothing documented beyond it — I will not describe features for a release that does not exist.`,
        actions: productRecord?.downloadUrl
          ? [{ type: 'OPEN_DOWNLOAD', label: `${name} ${actual}`, href: productRecord.downloadUrl }]
          : undefined,
        sources: [`product-${productRecord?.slug}`],
        intent: 'version',
        entityId: primary
      };
    }
    if (!actual && project(primary)) {
      return {
        text: `${name} has no public version numbers at all — there is no v${mentioned} and no other released build. ${statusSentence(primary)}`,
        actions: [projectPageAction(primary)],
        sources: [`app-${primary}`],
        intent: 'version',
        entityId: primary
      };
    }
  }

  // A cancellation that did not happen.
  if (/\b(cancell?ed|cancel|killed|discontinued|abandoned|scrapped|shut down|shelved|dead|defunct)\b/.test(text)) {
    const gem = gemFor(primary);
    if (gem) {
      return {
        text: `${gem.name} has not been cancelled. It is an active ${gem.state.toLowerCase()} lineage in GEMS for ${gem.role.toLowerCase()}. ${gem.foundationStrategy}`,
        actions: [{ type: 'OPEN_APP', label: 'View GEMS', href: '/projects/gems-training-grounds' }],
        sources: [`gem-${gem.key}`],
        intent: 'status',
        entityId: primary
      };
    }
    if (project(primary)) {
      return {
        text: `${name} has not been cancelled. ${statusSentence(primary)}`,
        actions: [projectPageAction(primary)],
        sources: [`app-${primary}`],
        intent: 'status',
        entityId: primary
      };
    }
  }

  // A launch date that does not exist, asked in any tense.
  if (/\b(when|what date|which year)\b.{0,40}\b(launch\w*|release\w*|ship\w*|came? out|coming out|went public|be (out|available|public))\b/.test(text)
    || /\b(launch|release|availability) date\b/.test(text)) {
    const productRecord = productFor(primary);
    const gem = gemFor(primary);
    if (gem) {
      return {
        text: `There is no ${gem.name} launch date. It is a ${gem.state.toLowerCase()} lineage, and FDS does not publish dates for research work — ${gem.notClaimed.charAt(0).toLowerCase()}${gem.notClaimed.slice(1)}`,
        actions: [{ type: 'OPEN_APP', label: 'View GEMS', href: '/projects/gems-training-grounds' }],
        sources: [`gem-${gem.key}`],
        intent: 'availability',
        entityId: primary
      };
    }
    if (!productRecord?.downloadUrl && project(primary)) {
      return {
        text: `${name} has not launched publicly and no launch date is published. ${statusSentence(primary)} FDS does not announce dates before work is ready.`,
        actions: [projectPageAction(primary)],
        sources: [`app-${primary}`],
        intent: 'availability',
        entityId: primary
      };
    }
  }

  return undefined;
}

/**
 * Deterministic answer for a query, or undefined when nothing canonical
 * applies and retrieval should take over.
 */
export function canonicalAnswer(
  query: string,
  context?: KaylaPageContext,
  history: KaylaConversationMessage[] = []
): CanonicalAnswer | undefined {
  const intents = classifyIntents(query).map((match) => match.intent);
  const entityMatches = matchEntities(query);
  let entityIds = entityMatches.map((match) => match.entityId);

  // "Which GEM is for coding?" names a role rather than a lineage.
  if (!entityIds.some((id) => id.startsWith(GEM_PREFIX))) {
    const byRole = gemByRole(query);
    if (byRole) entityIds = [byRole, ...entityIds];
  }

  // "Is it public yet?" carries its subject from the previous turn. Without
  // this, follow-up questions fell back to a generic answer because the
  // deterministic path never looked at the conversation.
  if (entityIds.length === 0 && hasAnaphor(query)) {
    const recalled = entitiesFromHistory(history);
    if (recalled.length > 0) entityIds = recalled;
  }

  // A comparison needs two subjects; the second usually came earlier.
  if (has1(intents, 'comparison') && entityIds.length === 1) {
    const recalled = entitiesFromHistory(history).filter((id) => id !== entityIds[0]);
    if (recalled.length > 0) entityIds = [entityIds[0], recalled[0]];
  }

  // A project page supplies the subject when nothing else did.
  if (entityIds.length === 0 && context?.entity && getKaylaEntity(context.entity)) {
    entityIds = [context.entity];
  }

  const primaryEntity = entityIds[0];
  const has = (intent: KaylaIntent) => intents.includes(intent);

  // Boundaries win over everything: never let an entity match turn a weather
  // question into a product pitch.
  for (const intent of ['private_info', 'external_current', 'unsupported_task'] as const) {
    if (has(intent)) {
      const answer = boundaryAnswer(intent, query);
      if (answer) return { ...answer, settled: true };
    }
  }

  // What a status label means is a question about the taxonomy, not about
  // whichever project happens to score highest in retrieval.
  if (has('status_taxonomy')) return statusTaxonomyAnswer(query);

  if (has('assistant_identity')) return { ...assistantIdentityAnswer(query), settled: true };

  // "Which GEMS are public?" is a question about the whole family and has one
  // canonical answer. It is matched on shape rather than intent because the
  // plural family form ("which GEMS are…") matches no entity by name — only
  // the role matcher, which would otherwise answer for one arbitrary lineage.
  // A question naming a specific GEM keeps its own per-lineage answer.
  const namesSpecificGem = entityMatches.some((match) => match.entityId.startsWith(GEM_PREFIX));
  if (!namesSpecificGem
    && /\bgems\b/.test(normalize(query))
    && /\b(public|available|downloadable|released|can i (use|run|get|download))\b/.test(normalize(query))) {
    return gemsAvailabilityAnswer();
  }

  // Availability questions asked across the whole catalogue rather than about
  // one entity: answer the narrow question instead of listing everything.
  if ((has('availability') || has('list')) && !entityIds.some((id) => project(id) || gemFor(id) || productFor(id))) {
    // When the visitor is on /forged, answer specifically for what is available on Forged
    if (context?.route === '/forged' || context?.pageType === 'forged') {
      const downloads = downloadableNow();
      return {
        text: `On Forged, these software downloads are available today:\n\n${downloads.map((entry) => `• ${entry.name}${entry.version ? ` (${entry.version})` : ''} — ${entry.route}`).join('\n')}`,
        actions: [{ type: 'OPEN_FORGED', label: 'Visit Forged', href: '/forged' }],
        sources: ['forged-page'],
        intent: 'availability',
        settled: true
      };
    }
    const availability = availabilityListAnswer(query);
    if (availability) return availability;
  }

  // Correct a false premise before answering anything built on top of it.
  const premise = premiseAnswer(query, entityIds, history);
  if (premise) return { ...premise, settled: true };

  // A question about how two entities relate must be answered as a question
  // about the relationship — not by describing whichever entity matched first.
  const relationship = relationshipAnswer(query, entityIds);
  if (relationship) return relationship;

  if (has('comparison')) {
    const subjects = entityIds.length >= 2
      ? entityIds
      : /\b(you|yourself)\b/.test(normalize(query)) && entityIds.length === 1
        ? ['kayla-copilot', entityIds[0]]
        : entityIds;
    const answer = comparisonAnswer(subjects);
    // The Copilot-vs-Publisher distinction is an identity boundary, not a
    // description a model should be free to blur.
    if (answer) return answer.sources.includes('kayla-copilot') ? { ...answer, settled: true } : answer;
  }

  if (has('support')) return supportAnswer(query);
  if (has('founder')) return founderAnswer();

  if (has('list') || has('recommendation')) {
    const filtered = filteredListAnswer(query);
    if (filtered) return filtered;
  }

  if (has('recommendation') && !entityIds.some((id) => getKaylaEntity(id)?.kind === 'project' || getKaylaEntity(id)?.kind === 'product' || getKaylaEntity(id)?.kind === 'gem')) {
    const answer = recommendationAnswer(query);
    if (answer) return answer;
  }

  if (has('privacy')) {
    return {
      text: 'This site uses no cookies, analytics, or trackers. Our conversation is held in your browser for this page only — it is not stored on a server and it disappears when you navigate away or close the tab. Your message and the page you are on are sent to the FDS Worker to produce an answer; nothing identifies you.',
      actions: [{ type: 'OPEN_PAGE', label: 'Privacy Policy', href: '/privacy' }],
      sources: ['privacy-policy'],
      intent: 'privacy'
    };
  }

  if (has('contact')) {
    return {
      text: `Email is the best route: ${siteConfig.supportEmail}. There is also a Discord community at ${siteConfig.discordUrl}, plus GitHub and YouTube links in the site footer.`,
      actions: [{ type: 'OPEN_CONTACT', label: 'Email FDS', href: `mailto:${siteConfig.supportEmail}` }],
      sources: ['fds-contact'],
      intent: 'contact'
    };
  }

  if (has('roadmap')) return roadmapAnswer(primaryEntity);

  if (has('list') && (!primaryEntity || primaryEntity === 'fds' || primaryEntity === 'projects' || primaryEntity === 'forged')) {
    if (primaryEntity === 'forged' && !has('list')) return undefined;
    return listAnswer();
  }

  if (has('pricing')) return pricingAnswer(primaryEntity);

  if (primaryEntity) {
    // Version before availability: "what version is public?" is a version
    // question even though it also reads as an availability question.
    if (has('version')) {
      const answer = versionAnswer(primaryEntity);
      if (answer) return answer;
    }
    if (has('availability')) {
      const answer = availabilityAnswer(primaryEntity);
      if (answer) return answer;
    }
    if (has('status')) {
      const answer = statusAnswer(primaryEntity);
      if (answer) return answer;
    }
    if (has('navigation')) {
      const answer = navigationAnswer(primaryEntity, query);
      if (answer) return answer;
    }
    if (has('capability')) {
      const answer = capabilityAnswer(primaryEntity, query);
      if (answer) return answer;
    }

    if (primaryEntity === 'fds') return companyAnswer();
    if (primaryEntity === 'kayla-copilot') return assistantIdentityAnswer(query);
    if (primaryEntity === 'forged') {
      return {
        text: `${fds.forged} Right now that means ${products.filter((entry) => entry.downloadUrl).map((entry) => `${entry.name} ${entry.version}`).join(' and ')}.`,
        actions: [{ type: 'OPEN_FORGED', label: 'Visit Forged', href: '/forged' }],
        sources: ['forged-page'],
        intent: 'identity',
        entityId: 'forged'
      };
    }

    const answer = identityAnswer(primaryEntity);
    if (answer) return answer;
  }

  if (has('availability') && !primaryEntity) {
    return {
      text: `Downloadable FDS software lives on Forged: ${products.filter((entry) => entry.downloadUrl).map((entry) => `${entry.name} (${entry.version})`).join(', ')}. Everything else is still in development or research and has no public build.`,
      actions: [{ type: 'OPEN_FORGED', label: 'Visit Forged', href: '/forged' }],
      sources: ['forged-page'],
      intent: 'availability'
    };
  }

  if (has('navigation')) return navigationAnswer(primaryEntity, query);
  if (has('list')) return listAnswer();

  return undefined;
}
