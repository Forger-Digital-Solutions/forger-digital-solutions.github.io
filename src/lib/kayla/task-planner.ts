import type { KaylaSafeAction, KaylaSource, KaylaPageContext, KaylaConversationMessage } from '../../data/kayla/types';
import { type VisitorGoal, classifyVisitorGoal, type VisitorGoalMatch } from '../../data/kayla/goals';
import { getKaylaEntity } from '../../data/kayla/entities';
import { products } from '../../data/products';
import { siteConfig } from '../../config/site';
import { validateSafeAction } from './action-validator';
import { dedupeActions } from './actions';

export interface KaylaTaskPlan {
  goal: VisitorGoal;
  secondaryGoals?: VisitorGoal[];
  entities: string[];
  requiredFacts: string[];
  recommendedSources: KaylaSource[];
  recommendedActions: KaylaSafeAction[];
  guidanceSteps?: string[];
  reason: string;
  providerNeeded: boolean;
  tradeoffExplanation?: string;
  isFalsePremise?: boolean;
}

function product(slug: string) {
  return products.find((p) => p.slug === slug || p.projectSlug === slug);
}

/**
 * Builds a deterministic task plan for a visitor query.
 * The plan selects canonical goals, entities, facts, sources, safe actions,
 * and multi-step guidance without calling any external provider.
 */
export function buildTaskPlan(
  query: string,
  context?: KaylaPageContext,
  history: KaylaConversationMessage[] = []
): KaylaTaskPlan {
  const match: VisitorGoalMatch = classifyVisitorGoal(query, context, history);
  const { primaryGoal, secondaryGoals, entities } = match;

  let recommendedSources: KaylaSource[] = [];
  let recommendedActions: KaylaSafeAction[] = [];
  let guidanceSteps: string[] | undefined;
  let requiredFacts: string[] = [];
  let providerNeeded = false;
  let tradeoffExplanation: string | undefined;
  let isFalsePremise = false;

  // 1. FALSE PREMISE DEFENSE
  if (/\b(codeforge\s+pro|pro\s+subscription|\$25|subscribe|subscription|purchase|buy\s+codeforge|buy\s+it|paid\s+plan|how\s+much\s+does.*cost)\b/i.test(query)) {
    isFalsePremise = true;
    requiredFacts = ['CodeForge is completely free and open source', 'No paid subscription or Pro tier exists'];
    recommendedSources = [{ label: 'CodeForge', kind: 'project', route: '/projects/codeforge' }];
    recommendedActions = [
      { type: 'OPEN_APP', label: 'View CodeForge', href: '/projects/codeforge' },
      { type: 'OPEN_DOWNLOAD', label: 'Download CodeForge (Free)', href: 'https://github.com/Forger-Digital-Solutions/CodeForge/releases/latest' },
      { type: 'OPEN_FORGED', label: 'Visit Forged', href: '/forged' }
    ];
    return {
      goal: 'DOWNLOAD_SOFTWARE',
      entities: ['codeforge'],
      requiredFacts,
      recommendedSources,
      recommendedActions: filterSafe(recommendedActions),
      reason: 'Correcting false purchase premise: CodeForge has no paid tiers or subscriptions',
      providerNeeded: false,
      isFalsePremise: true
    };
  }

  // 2. GOAL CONFLICT RESOLUTION (e.g. AI project I can download today)
  if (
    (/\b(ai|gems|model)\b/i.test(query) && /\b(download|run|use|install)\b/i.test(query) && !/codeforge/i.test(query)) ||
    (match.isMultiGoal && match.primaryGoal === 'FIND_RELEASED_SOFTWARE' && match.secondaryGoals?.includes('EXPLORE_AI_RESEARCH'))
  ) {
    tradeoffExplanation = 'FDS AI research (GEMS) is foundation research and evaluation; there are no downloadable model binaries. CodeForge is currently the only downloadable software release from FDS.';
    requiredFacts = ['GEMS has no public downloads', 'CodeForge is released and free on Forged'];
    recommendedSources = [
      { label: 'Forged', kind: 'page', route: '/forged' },
      { label: 'GEMS Training Grounds', kind: 'project', route: '/projects/gems-training-grounds' }
    ];
    recommendedActions = [
      { type: 'OPEN_FORGED', label: 'See Released Software', href: '/forged' },
      { type: 'OPEN_APP', label: 'Explore GEMS Research', href: '/projects/gems-training-grounds' }
    ];
    return {
      goal: 'FIND_RELEASED_SOFTWARE',
      secondaryGoals: ['EXPLORE_AI_RESEARCH'],
      entities: ['gems-training-grounds', 'codeforge'],
      requiredFacts,
      recommendedSources,
      recommendedActions: filterSafe(recommendedActions),
      tradeoffExplanation,
      reason: 'AI + download conflict: GEMS is research; CodeForge is downloadable',
      providerNeeded: false
    };
  }

  // 3. GOAL-SPECIFIC PLANNING
  switch (primaryGoal) {
    case 'DONATE_HARDWARE':
      requiredFacts = ['Hardware donation criteria', 'Refurbishment policy', 'Contact email'];
      recommendedSources = [
        { label: 'Hardware Donation Policy', kind: 'page', route: '/support/hardware' },
        { label: 'Support FDS', kind: 'page', route: '/support' }
      ];
      recommendedActions = [
        { type: 'OPEN_PAGE', label: 'Hardware Donation Policy', href: '/support/hardware' },
        { type: 'OPEN_CONTACT', label: 'Email FDS Support', href: `mailto:${siteConfig.supportEmail}` }
      ];
      guidanceSteps = [
        'Review the hardware donation criteria on the Hardware Support page.',
        'Verify your hardware meets FDS testing or refurbishment needs.',
        'Email FDS support to coordinate shipping or handoff.'
      ];
      break;

    case 'SUPPORT_FDS':
      requiredFacts = ['Cash App channel', 'Ko-fi channel', 'Hardware donation link'];
      recommendedSources = [{ label: 'Support FDS', kind: 'page', route: '/support' }];
      recommendedActions = [
        { type: 'OPEN_PAGE', label: 'Support FDS', href: '/support' },
        { type: 'OPEN_PAGE', label: 'Hardware Donation', href: '/support/hardware' },
        { type: 'OPEN_DONATE', label: 'Ko-fi', href: 'https://ko-fi.com/forgerdigitalsolutions' }
      ];
      guidanceSteps = [
        'Open the FDS Support page to view all official ways to contribute.',
        'Select your preferred avenue: Ko-fi, Cash App, or hardware donation.',
        'Follow the official link to complete your contribution safely.'
      ];
      break;

    case 'FOLLOW_FDS':
      requiredFacts = ['Discord server', 'GitHub organization', 'YouTube channel'];
      recommendedSources = [{ label: 'Support & Community', kind: 'page', route: '/support' }];
      recommendedActions = [
        { type: 'OPEN_PAGE', label: 'Community Links', href: '/support' },
        { type: 'OPEN_GITHUB', label: 'FDS GitHub', href: siteConfig.githubUrl }
      ];
      break;

    case 'DOWNLOAD_SOFTWARE': {
      const targetEntity = entities[0] || 'codeforge';
      const prod = product(targetEntity);
      if (prod?.downloadUrl && !prod.comingSoon) {
        requiredFacts = [`${prod.name} version ${prod.version}`, 'Download URL on GitHub Releases'];
        recommendedSources = [
          { label: 'Forged', kind: 'page', route: '/forged' },
          { label: prod.name, kind: 'project', route: `/projects/${prod.slug}` }
        ];
        recommendedActions = [
          { type: 'OPEN_DOWNLOAD', label: `Download ${prod.name}`, href: prod.downloadUrl },
          { type: 'OPEN_FORGED', label: 'Visit Forged', href: '/forged' }
        ];
        guidanceSteps = [
          `Navigate to ${prod.name} on Forged or GitHub Releases.`,
          'Download the installer for your platform.',
          'Run the installer to begin using the software.'
        ];
      } else {
        // Not downloadable
        const ent = getKaylaEntity(targetEntity);
        const name = ent?.name || targetEntity;
        requiredFacts = [`${name} has no public download`, 'Currently in research or development'];
        recommendedSources = [
          { label: name, kind: 'project', route: `/projects/${targetEntity}` },
          { label: 'Forged', kind: 'page', route: '/forged' }
        ];
        recommendedActions = [
          { type: 'OPEN_APP', label: `View ${name}`, href: `/projects/${targetEntity}` },
          { type: 'OPEN_FORGED', label: 'See what is available now', href: '/forged' }
        ];
      }
      break;
    }

    case 'VIEW_RELEASE':
      requiredFacts = ['CodeForge latest release v0.2.0', 'Forged catalogue'];
      recommendedSources = [
        { label: 'Forged', kind: 'page', route: '/forged' },
        { label: 'CodeForge', kind: 'project', route: '/projects/codeforge' }
      ];
      recommendedActions = [
        { type: 'OPEN_FORGED', label: 'View Releases on Forged', href: '/forged' },
        { type: 'OPEN_DOWNLOAD', label: 'GitHub Releases', href: 'https://github.com/Forger-Digital-Solutions/CodeForge/releases/latest' }
      ];
      break;

    case 'FIND_RELEASED_SOFTWARE':
      requiredFacts = ['CodeForge is released and downloadable', 'ForgerEMS has technician preview', 'Available on Forged'];
      recommendedSources = [{ label: 'Forged', kind: 'page', route: '/forged' }];
      recommendedActions = [
        { type: 'OPEN_FORGED', label: 'Visit Forged', href: '/forged' },
        { type: 'OPEN_APP', label: 'View CodeForge', href: '/projects/codeforge' }
      ];
      guidanceSteps = [
        'Open Forged, which catalogs all software with public builds.',
        'Choose the software you want to run (e.g. CodeForge).',
        'Use the official download link to get the latest release.'
      ];
      break;

    case 'FIND_DEVELOPER_PROJECTS':
      requiredFacts = ['CodeForge is the developer IDE / coding tool', 'CodeForge is free and available'];
      recommendedSources = [
        { label: 'CodeForge', kind: 'project', route: '/projects/codeforge' },
        { label: 'Forged', kind: 'page', route: '/forged' }
      ];
      recommendedActions = [
        { type: 'OPEN_APP', label: 'View CodeForge', href: '/projects/codeforge' },
        { type: 'OPEN_FORGED', label: 'Visit Forged', href: '/forged' }
      ];
      guidanceSteps = [
        'Examine CodeForge, FDS’s free-first developer workbench.',
        'Check features and roadmap on the CodeForge project page.',
        'Download the public release from Forged to test it.'
      ];
      break;

    case 'EXPLORE_AI_RESEARCH':
    case 'LEARN_GEMS':
      requiredFacts = ['GEMS Training Grounds', 'Topaz, Sapphire, Peridot, Garnet lineages', 'Evaluation framework'];
      recommendedSources = [
        { label: 'GEMS Training Grounds', kind: 'project', route: '/projects/gems-training-grounds' },
        { label: 'Lab Notes', kind: 'page', route: '/notes' }
      ];
      recommendedActions = [
        { type: 'OPEN_APP', label: 'Explore GEMS', href: '/projects/gems-training-grounds' },
        { type: 'OPEN_PAGE', label: 'Read Research Notes', href: '/notes' }
      ];
      guidanceSteps = [
        'Open the GEMS Training Grounds project page.',
        'Learn about the 4 specialized GEM lineages and foundation strategy.',
        'Explore technical research notes in the FDS Notes section.'
      ];
      break;

    case 'FIND_COMMUNITY_PROJECT':
      requiredFacts = ['We The People civic platform', 'FarmStand Finder local food', 'Community Impact overview'];
      recommendedSources = [
        { label: 'Community Impact', kind: 'page', route: '/community-impact' },
        { label: 'We The People', kind: 'project', route: '/projects/we-the-people' }
      ];
      recommendedActions = [
        { type: 'OPEN_PAGE', label: 'Community Impact', href: '/community-impact' },
        { type: 'OPEN_APP', label: 'View We The People', href: '/projects/we-the-people' }
      ];
      break;

    case 'COMPARE_PROJECTS':
      requiredFacts = ['Project status differences', 'Category and audience comparisons'];
      recommendedSources = [{ label: 'Projects', kind: 'page', route: '/projects' }];
      recommendedActions = [
        { type: 'SHOW_APPS', label: 'Compare Projects', href: '/projects' },
        { type: 'OPEN_FORGED', label: 'See Released Software', href: '/forged' }
      ];
      providerNeeded = true;
      break;

    case 'LEARN_PROJECT_STATUS':
      requiredFacts = ['Recognized project statuses', 'Development stages'];
      recommendedSources = [{ label: 'Projects', kind: 'page', route: '/projects' }];
      recommendedActions = [
        { type: 'SHOW_APPS', label: 'View All Projects', href: '/projects' },
        { type: 'OPEN_FORGED', label: 'Browse Forged', href: '/forged' }
      ];
      break;

    case 'FIND_TECHNOLOGY_INFO':
      requiredFacts = ['Open source stack', 'Local-first architecture'];
      recommendedSources = [{ label: 'Technology', kind: 'page', route: '/technology' }];
      recommendedActions = [
        { type: 'OPEN_PAGE', label: 'Technology Stack', href: '/technology' },
        { type: 'OPEN_GITHUB', label: 'GitHub Repositories', href: siteConfig.githubUrl }
      ];
      break;

    case 'FIND_LAB_INFO':
      requiredFacts = ['The Lab overview', 'Notes and technical writings'];
      recommendedSources = [
        { label: 'The Lab', kind: 'page', route: '/lab' },
        { label: 'Notes', kind: 'page', route: '/notes' }
      ];
      recommendedActions = [
        { type: 'OPEN_PAGE', label: 'Visit The Lab', href: '/lab' },
        { type: 'OPEN_PAGE', label: 'Read Notes', href: '/notes' }
      ];
      break;

    case 'LEARN_ABOUT_FDS':
      requiredFacts = ['Founder story', 'FDS mission and philosophy'];
      recommendedSources = [{ label: 'About FDS', kind: 'page', route: '/about' }];
      recommendedActions = [
        { type: 'OPEN_PAGE', label: 'About FDS', href: '/about' },
        { type: 'SHOW_APPS', label: 'View Projects', href: '/projects' }
      ];
      break;

    case 'EXPLORE_PROJECTS':
      requiredFacts = ['6 public projects across developer, AI, community, and publishing'];
      recommendedSources = [{ label: 'Projects', kind: 'page', route: '/projects' }];
      recommendedActions = [
        { type: 'SHOW_APPS', label: 'View All Projects', href: '/projects' },
        { type: 'OPEN_FORGED', label: 'See Released Software', href: '/forged' }
      ];
      break;

    case 'EXPLORE_FDS':
    default:
      requiredFacts = ['FDS overview', 'Forged released software', 'GEMS AI research', 'Projects index'];
      recommendedSources = [
        { label: 'Forged', kind: 'page', route: '/forged' },
        { label: 'Projects', kind: 'page', route: '/projects' }
      ];
      recommendedActions = [
        { type: 'OPEN_FORGED', label: 'See Available Software', href: '/forged' },
        { type: 'SHOW_APPS', label: 'Explore Projects', href: '/projects' },
        { type: 'OPEN_PAGE', label: 'About FDS', href: '/about' }
      ];
      guidanceSteps = [
        'If you want software you can run right now, start with Forged (/forged).',
        'If you are interested in AI foundation models and research, explore GEMS (/projects/gems-training-grounds).',
        'If you want to see everything FDS is actively building, browse Projects (/projects).',
        'If you want the mission and story behind FDS, read About (/about).'
      ];
      break;
  }

  // 4. MULTI-GOAL SYNTHESIS (e.g. Developer + AI)
  if (match.isMultiGoal && secondaryGoals?.length) {
    if (
      (primaryGoal === 'FIND_DEVELOPER_PROJECTS' && secondaryGoals.includes('EXPLORE_AI_RESEARCH')) ||
      (primaryGoal === 'EXPLORE_AI_RESEARCH' && secondaryGoals.includes('FIND_DEVELOPER_PROJECTS'))
    ) {
      recommendedSources = [
        { label: 'CodeForge', kind: 'project', route: '/projects/codeforge' },
        { label: 'GEMS Training Grounds', kind: 'project', route: '/projects/gems-training-grounds' }
      ];
      recommendedActions = [
        { type: 'OPEN_APP', label: 'View CodeForge', href: '/projects/codeforge' },
        { type: 'OPEN_APP', label: 'Explore GEMS', href: '/projects/gems-training-grounds' }
      ];
      guidanceSteps = [
        'For developer tooling: Check out CodeForge, FDS’s free-first developer workbench.',
        'For AI research: Explore GEMS and Training Grounds to see FDS model lineages.'
      ];
      providerNeeded = true;
    }
  }

  // 5. PAGE-AWARENESS PRIORITIZATION
  // If visitor is already on a page, prioritize direct sub-actions over redundant links to current page
  if (context?.route) {
    recommendedActions = prioritizePageActions(recommendedActions, context.route);
  }

  // 6. ACTION COUNT DISCIPLINE (1 primary, max 2 secondary, total max 3)
  const deduped = dedupeActions(filterSafe(recommendedActions)) || [];
  const disciplinedActions = deduped.slice(0, 3);

  return {
    goal: primaryGoal,
    secondaryGoals,
    entities,
    requiredFacts,
    recommendedSources,
    recommendedActions: disciplinedActions,
    guidanceSteps,
    reason: match.reason,
    providerNeeded,
    tradeoffExplanation,
    isFalsePremise
  };
}

function filterSafe(actions: KaylaSafeAction[]): KaylaSafeAction[] {
  return actions.filter((act) => validateSafeAction(act, { strictCanonical: true }).valid);
}

function prioritizePageActions(actions: KaylaSafeAction[], currentRoute: string): KaylaSafeAction[] {
  const normCurrent = currentRoute.replace(/\/+$/, '') || '/';
  // Move actions pointing to current route to the end
  return [...actions].sort((a, b) => {
    const aCurrent = a.href && (a.href.replace(/\/+$/, '') || '/') === normCurrent;
    const bCurrent = b.href && (b.href.replace(/\/+$/, '') || '/') === normCurrent;
    if (aCurrent && !bCurrent) return 1;
    if (!aCurrent && bCurrent) return -1;
    return 0;
  });
}

/**
 * Generate a task plan for a query, with optional match and context.
 */
export function generateTaskPlan(
  query: string,
  match?: VisitorGoalMatch,
  context?: KaylaPageContext,
  history: KaylaConversationMessage[] = []
): KaylaTaskPlan {
  void match;
  return buildTaskPlan(query, context, history);
}
