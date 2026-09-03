import type { KaylaSafeAction, KaylaPageContext } from './types';
import { projects } from '../projects';
import { products } from '../products';
import { gems, affordability } from '../gems';
import { statusMeta } from '../status';
import { siteConfig } from '../../config/site';
import { fds } from './company/fds';
import { founder } from './company/founder';
import { matchEntities, getKaylaEntity, normalize } from './entities';
import { classifyIntents, type KaylaIntent } from './intents';

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
function recommendationAnswer(query: string): CanonicalAnswer | undefined {
  const words = distinctive(normalize(query)).filter((word) => !['should', 'would', 'could', 'which', 'recommend', 'need', 'help', 'want'].includes(word));
  if (words.length === 0) return undefined;

  const scored = projects.map((entry) => {
    const haystack = distinctive(normalize([
      entry.category, entry.name, entry.summary, entry.audience || '',
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

function navigationAnswer(entityId?: string): CanonicalAnswer | undefined {
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
  const hardware = /\b(hardware|equipment|computer|laptop|gpu|server|pc|old tech|drive|ram|monitor)\b/.test(normalize(query));
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
function premiseAnswer(query: string, entityIds: string[]): CanonicalAnswer | undefined {
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
  if (/\b(how many|how much)\b.{0,30}\b(users?|customers?|downloads?|installs?|revenue|subscribers?)\b/.test(text)
    || /\b\d+\s*(million|billion|thousand|k)\b.{0,25}\b(users?|customers?|downloads?|installs?)\b/.test(text)
    || /\b(benchmark|benchmarks|leaderboard|score[sd]?)\b.{0,25}\b(result|number|score|does|has|beat)\b/.test(text)) {
    return {
      text: 'FDS does not publish user counts, download totals, revenue, or benchmark results, so I have no figures to give you and will not estimate any. What I can tell you is what each project is and what state it is actually in.',
      actions: [{ type: 'SHOW_APPS', label: 'View Projects' }],
      sources: ['scope-boundary'],
      intent: 'capability',
      entityId: primary
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

  // A launch that has not happened.
  if (/\b(when|what date|which year)\b.{0,40}\b(launch|launched|release[d]?|came? out|shipped|went public)\b/.test(text)) {
    const productRecord = productFor(primary);
    if (!productRecord?.downloadUrl && project(primary)) {
      return {
        text: `${name} has not launched publicly, so there is no launch date. ${statusSentence(primary)}`,
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
export function canonicalAnswer(query: string, context?: KaylaPageContext): CanonicalAnswer | undefined {
  const intents = classifyIntents(query).map((match) => match.intent);
  const entityMatches = matchEntities(query);
  let entityIds = entityMatches.map((match) => match.entityId);

  // "Which GEM is for coding?" names a role rather than a lineage.
  if (!entityIds.some((id) => id.startsWith(GEM_PREFIX))) {
    const byRole = gemByRole(query);
    if (byRole) entityIds = [byRole, ...entityIds];
  }

  // A project page supplies the subject when the question does not name one.
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

  if (has('assistant_identity')) return { ...assistantIdentityAnswer(query), settled: true };

  // Correct a false premise before answering anything built on top of it.
  const premise = premiseAnswer(query, entityIds);
  if (premise) return { ...premise, settled: true };

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

  if (has('recommendation') && !entityIds.some((id) => getKaylaEntity(id)?.kind === 'project' || getKaylaEntity(id)?.kind === 'product')) {
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
      const answer = navigationAnswer(primaryEntity);
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

  if (has('navigation')) return navigationAnswer(primaryEntity);
  if (has('list')) return listAnswer();

  return undefined;
}
