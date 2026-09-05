import type { KaylaPageContext, KaylaConversationMessage } from './types';
import { normalize, matchEntities, getKaylaEntity } from './entities';

export type VisitorGoal =
  | 'EXPLORE_FDS'
  | 'EXPLORE_PROJECTS'
  | 'FIND_RELEASED_SOFTWARE'
  | 'FIND_DEVELOPER_PROJECTS'
  | 'EXPLORE_AI_RESEARCH'
  | 'COMPARE_PROJECTS'
  | 'LEARN_PROJECT_STATUS'
  | 'DOWNLOAD_SOFTWARE'
  | 'VIEW_RELEASE'
  | 'LEARN_GEMS'
  | 'FIND_COMMUNITY_PROJECT'
  | 'SUPPORT_FDS'
  | 'DONATE_HARDWARE'
  | 'FOLLOW_FDS'
  | 'LEARN_ABOUT_FDS'
  | 'FIND_TECHNOLOGY_INFO'
  | 'FIND_LAB_INFO'
  | 'UNKNOWN';

export interface VisitorGoalMatch {
  primaryGoal: VisitorGoal;
  secondaryGoals?: VisitorGoal[];
  entities: string[];
  confidence: 'high' | 'medium' | 'low';
  isMultiGoal: boolean;
  isTopicShift: boolean;
  reason: string;
}

interface GoalRule {
  goal: VisitorGoal;
  patterns: RegExp[];
}

const GOAL_RULES: GoalRule[] = [
  {
    goal: 'DONATE_HARDWARE',
    patterns: [
      /\b(donate|giving|give|send|ship|mail|drop off)\b.{0,30}\b(old\s+)?(hardware|computer|pc|laptop|desktop|server|parts?|ram|drive|equipment|gpus?)\b/i,
      /\b(old|spare|unused|surplus)\s+(hardware|computer|pc|laptop|desktop|server|parts?|equipment|gpus?)\b.{0,25}\b(donate|give|send|ship|hand over|recycle)\b/i,
      /\bhardware\s+donation\b/i,
      /\b(ship|send)\s+(physical\s+)?(computer|hardware|parts?|equipment)\b/i,
      /\bcan i donate (an? )?(old )?(computer|laptop|pc|hardware)\b/i,
      /\bwhere\s+can\s+i\s+send\s+equipment\b/i
    ]
  },
  {
    goal: 'SUPPORT_FDS',
    patterns: [
      /\bhow\s+(can|do)\s+i\s+(support|help|fund|sponsor|back)\b/i,
      /\b(support|help|fund|sponsor)\s+(fds|forger digital solutions|the project)\b/i,
      /\b(want to|like to|ways to)\s+(support|help|fund|donate)\b/i,
      /\b(financial|monetary)\s+(support|contribution|donation)\b/i,
      /\b(cash\s*app|ko-?fi|patreon|paypal|donate money|charge me|credit card)\b/i,
      /\bcan i donate\b/i
    ]
  },
  {
    goal: 'COMPARE_PROJECTS',
    patterns: [
      /\bhow\s+(does|do)\s+(.+)\s+compare\s+to\b/i,
      /\bcompare\s+(.+)\s+(to|with|and)\b/i,
      /\b(difference|differences|compare|comparison|tradeoffs?)\s+(between|of)\b/i,
      /\bshow\s+me\s+the\s+difference\s+between\s+(the\s+)?projects\b/i,
      /\bhow\s+do\s+(.+)\s+and\s+(.+)\s+(connect|compare|relate|differ)\b/i,
      /\bversus\b|\bvs\.?\b/i
    ]
  },
  {
    goal: 'LEARN_GEMS',
    patterns: [
      /\b(download|get|install|run)\s+(the\s+)?(gems\s+ai|gems\s+model|gems\s+binary|gems)\b/i,
      /\b(explore|visit|see|learn about|read about|explain)\s+(the\s+)?(gems|training grounds)\b/i,
      /\bgems\s+training\s+grounds\b/i,
      /\btraining\s+grounds\b/i,
      /\bhow\s+does\s+gems\s+work\b/i,
      /\bwhat\s+(is|are)\s+(the\s+)?gems\b/i,
      /\bgems\s+(architecture|strategy|lineage|lineages|models?|family)\b/i,
      /\bwhat\s+is\s+training\s+grounds\b/i,
      /\bmeet\s+the\s+gems\b/i,
      /\bhow\s+does\s+training\s+grounds\s+work\b/i
    ]
  },
  {
    goal: 'LEARN_PROJECT_STATUS',
    patterns: [
      /\bwhat('?s| is)\s+(actually\s+)?public\s+versus\s+still\s+being\s+built\b/i,
      /\bwhat('?s| is)\s+still\s+(being\s+built|in\s+development|research|private)\b/i,
      /\bwhat('?s| is)\s+the\s+(current\s+)?(stage|status|state)\s+of\b/i,
      /\b(current\s+)?status\s+of\b/i,
      /\bwhat\s+(stage|status|state)\s+is\b/i,
      /\b(is|are)\s+(.+)\s+(released|in development|preview|beta|public|private|available\s+yet|still in active development|in active development)\b/i,
      /\b(stage|status|state)\s+of\s+development\b/i,
      /\b(still\s+in\s+)?active\s+development\b/i,
      /\bwhich\s+projects\s+are\s+(released|in development|research)\b/i
    ]
  },
  {
    goal: 'VIEW_RELEASE',
    patterns: [
      /\b(release\s+notes|changelog|version\s+history|latest\s+version|current\s+version|what\s+version)\b/i,
      /\b(latest|recent)\s+release\s+info\b/i,
      /\bwhat\s+came\s+out\s+in\s+the\s+.*release\b/i,
      /\brelease\s+notes\s+for\b/i,
      /\bwhere\s+are\s+the\s+releases\b/i,
      /\bwhere\s+(can|do)\s+i\s+see\s+what\s+fds\s+has\s+released\b/i,
      /\bwhat\s+has\s+fds\s+released\b/i
    ]
  },
  {
    goal: 'DOWNLOAD_SOFTWARE',
    patterns: [
      /\b(buy|purchase|subscribe|subscription|cost|price|pay for)\s+(codeforge|forgerems|the software|the app)\b/i,
      /\bhow\s+do\s+i\s+(buy|purchase|pay for|subscribe to)\b/i,
      /\b(downlaod|download|get|install|grab|run)\s+(codeforge|forgerems|sapphire|topaz|peridot|garnet|kyrablox|we the people|farmstand finder|kayla)\b/i,
      /\bwhere\s+(can|do)\s+i\s+(download|install|get)\s+(this|it|the software|codeforge|forgerems|the app)\b/i,
      /\b(how|where)\s+to\s+download\b/i,
      /\bdownload\s+(link|button|binary|installer|dmg|zip|exe)\b/i,
      /\b(install|download|downlaod)\s+codeforge\b/i,
      /\binstall\s+(codeforge|forgerems)\b/i
    ]
  },
  {
    goal: 'FIND_RELEASED_SOFTWARE',
    patterns: [
      /\bwhat\s+(can|could)\s+i\s+(actually\s+)?(download|use|run|try|install)\s*(today|now|right now)?\b/i,
      /\b(something|anything|stuff)\s+(i\s+can\s+)?(actually\s+)?(download|run|use|install)\b/i,
      /\b(show|tell)\s+me\s+(stuff|software|apps|projects)\s+that('?s| is|\s+are)\s+(actually\s+)?(usable|downloadable|released|available|ready)\b/i,
      /\bwhat('?s| is|\s+are)\s+(actually\s+)?(public|downloadable|available to (use|download|run))\b/i,
      /\b(released|downloadable|available)\s+(software|apps|programs|tools|builds)\b/i,
      /\bwhich\s+(apps|software|projects)\s+are\s+(ready|available|released)\b/i,
      /\b(is\s+)?anything\s+ready\s+(for\s+me\s+)?to\s+(try|use|download|run)\b/i,
      /\bready\s+to\s+(download|use|install|run)\b/i,
      /\bwhat can i get today\b/i
    ]
  },
  {
    goal: 'FIND_DEVELOPER_PROJECTS',
    patterns: [
      /\bi('?m| am|\s+m)\s+(a\s+)?(developer|programmer|software engineer|coder)\b/i,
      /\bwhat\s+should\s+(i|a developer|a programmer)\s+(look at|check out|try|explore|start with)\b/i,
      /\b(code|coding|software|developer|programming)\s+(editor|editors|ide|ides|tool|tools|tooling|workbench|app)\b/i,
      /\bwhere('?s| is)\s+the\s+coding\s+(tool|app|project)\b/i,
      /\bwhat('?s| is)\s+aimed\s+at\s+(developers|programmers|coders)\b/i,
      /\bwhat('?s| is)\s+worth\s+looking\s+at\s+as\s+a\s+programmer\b/i
    ]
  },
  {
    goal: 'EXPLORE_AI_RESEARCH',
    patterns: [
      /\b(understand|learn about|explore|interested in|see|tell me about)\s+(your|the|fds'?s?)?\s*(ai\s+research|ai\s+work|ai|artificial\s+intelligence|synthetic\s+intelligence|models?|machine learning|foundation models?)\b/i,
      /\bwhat\s+(are\s+(your\s+)?)?(ai|artificial\s+intelligence|synthetic\s+intelligence)\s+(work|research|projects?|models?|architecture)\b/i,
      /\bi('?m| am|\s+m)\s+(mainly\s+)?here\s+for\s+ai\b/i,
      /\bwhat\s+ai\s+models\s+are\s+being\s+trained\b/i,
      /\b(tell|show)\s+me\s+about\s+(your\s+)?(ai|artificial\s+intelligence)\b/i,
      /\b(ai\s+reserch|ai\s+research)\b/i,
      /\b(artificial\s+intelligence|synthetic\s+intelligence|foundation\s+model|large\s+language\s+model)\b/i
    ]
  },
  {
    goal: 'FIND_COMMUNITY_PROJECT',
    patterns: [
      /\b(community|civic|local|public interest)\s+(projects?|initiatives?|impact|focus|software)\b/i,
      /\b(something|projects?)\s+community-?focused\b/i,
      /\b(civic|local\s+growers?|growers?|farmers?|community\s+growers?)\b/i,
      /\b(what\s+is\s+|tell\s+me\s+about\s+)(farmstand\s*finder|we\s+the\s+people)\b/i,
      /\bhow\s+does\s+fds\s+help\s+(the\s+)?community\b/i
    ]
  },
  {
    goal: 'FOLLOW_FDS',
    patterns: [
      /\bwhere\s+(can|do)\s+i\s+(follow|stay updated|find)\s+(fds|forger digital solutions|you|updates)\b/i,
      /\b(follow|connect with)\s+(fds|forger digital solutions|us)\b/i,
      /\b(discord|youtube|twitter|x\.com|social media|github\s+org|github\s+organization|github\s+link|mailing\s+list)\b/i,
      /\bhow\s+do\s+i\s+join\s+(the\s+)?(community|discord)\b/i,
      /\b(join|online)\s+(the\s+)?community\b/i,
      /\bcommunity\s+(chat|channels?|server|discord)\b/i
    ]
  },
  {
    goal: 'FIND_LAB_INFO',
    patterns: [
      /\b(the\s+lab|lab\s+experiments|research\s+notes|technical\s+notes|fds\s+notes|homelab|home\s+lab|lab\s+hardware|lab\s+infrastructure|hardware\s+testbed)\b/i,
      /\bwhat('?s| is)\s+in\s+the\s+lab\b/i,
      /\bwhat\s+hardware\s+do\s+you\s+run\b/i
    ]
  },
  {
    goal: 'FIND_TECHNOLOGY_INFO',
    patterns: [
      /\b(tech\s+stack|technology|technologies|infrastructure|architecture|open\s+source\s+tech)\b/i,
      /\bwhat\s+technologies\s+does\s+fds\s+use\b/i
    ]
  },
  {
    goal: 'LEARN_ABOUT_FDS',
    patterns: [
      /\b(who\s+founded|who\s+created|who\s+runs|who\s+is\s+behind)\s+(fds|forger\s+digital\s+solutions)\b/i,
      /\b(story|history|mission|philosophy)\s+(behind|of)\s+(fds|forger\s+digital\s+solutions)\b/i,
      /\b(history|story|founder|mission|origin|background)\s+(of|and)\b/i,
      /\babout\s+(fds|forger\s+digital\s+solutions)\b/i
    ]
  },
  {
    goal: 'EXPLORE_PROJECTS',
    patterns: [
      /\b(show|see|list|explore)\s+(me\s+)?(all\s+)?(the\s+)?projects\b/i,
      /\bwhat\s+(is|are)\s+fds\s+(building|working on|making)\b/i,
      /\bwhat\s+(kind\s+of\s+)?(software\s+)?projects\s+do\s+you\s+have\b/i,
      /\bwhat\s+kind\s+of\s+software\s+are\s+you(\s+guys)?\s+(building|making|working\s+on)\b/i,
      /\b(projcts|projects)\s+(list|directory|catalog)\b/i,
      /\bcatalog\s+of\s+projects\b/i
    ]
  },
  {
    goal: 'EXPLORE_FDS',
    patterns: [
      /\bwhat\s+is\s+forger\s+digital\s+solutions\b/i,
      /\bwhat\s+is\s+fds\b/i,
      /\b(best\s+place\s+to\s+start|where\s+should\s+i\s+start|where\s+do\s+i\s+start|wher\s+shuld\s+i\s+begin|where\s+to\s+begin)\b/i,
      /\bbegin\s+exploring\b/i,
      /\bi('?m| am|\s+m)\s+new\s+(here|to fds)\b/i,
      /\bgive\s+me\s+a\s+tour\b/i,
      /\bshow\s+me\s+around\b/i,
      /\bstart\s+here\b/i,
      /\bnewcomer\b/i
    ]
  }
];

const TOPIC_SHIFT_PATTERNS = [
  /\b(actually|instead|rather|never\s*mind|forget\s+(that|about|it)|switch\s+to|on\s+second\s+thought)\b/i,
  /\bbut\s+what\s+about\b/i,
  /\bwhat\s+about\s+(the\s+)?ai\b/i,
  /\bwhat\s+about\s+(the\s+)?software\b/i
];

const ANAPHOR_PATTERNS = [
  /\b(it|this|that|the app|the tool|the project|the software)\b/i
];

function hasTopicShift(query: string): boolean {
  return TOPIC_SHIFT_PATTERNS.some((p) => p.test(query));
}

function hasAnaphor(query: string): boolean {
  return ANAPHOR_PATTERNS.some((p) => p.test(query));
}

function entitiesFromHistory(history: KaylaConversationMessage[]): string[] {
  const ids: string[] = [];
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    const matches = matchEntities(msg.content);
    for (const m of matches) {
      if (!ids.includes(m.entityId)) ids.push(m.entityId);
    }
    if (ids.length > 0) break;
  }
  return ids;
}

/**
 * Classifies a visitor's goal deterministically using query patterns,
 * page context, conversation history, and entity matching.
 */
export function classifyVisitorGoal(
  query: string,
  context?: KaylaPageContext,
  history: KaylaConversationMessage[] = []
): VisitorGoalMatch {
  const normalized = normalize(query);
  const shift = hasTopicShift(query);
  let entityMatches = matchEntities(query);
  let entityIds = entityMatches.map((m) => m.entityId);

  // If topic shifted, we do not inherit older history entities
  if (!shift && entityIds.length === 0 && hasAnaphor(query)) {
    const historical = entitiesFromHistory(history);
    if (historical.length > 0) {
      entityIds = historical;
    }
  }

  // Page context supplies subject if no entity detected and not shifting topic
  if (!shift && entityIds.length === 0 && context?.entity && getKaylaEntity(context.entity)) {
    entityIds = [context.entity];
  }

  // Check matching rules
  const matchedGoals: VisitorGoal[] = [];
  for (const rule of GOAL_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(query) || pattern.test(normalized))) {
      if (!matchedGoals.includes(rule.goal)) {
        matchedGoals.push(rule.goal);
      }
    }
  }

  // Context-directed goal overrides:
  // "Where do I download this?" on /projects/codeforge -> DOWNLOAD_SOFTWARE
  if (entityIds.length > 0 && /\b(download|get|install)\b/i.test(normalized)) {
    if (!matchedGoals.includes('DOWNLOAD_SOFTWARE')) {
      matchedGoals.unshift('DOWNLOAD_SOFTWARE');
    }
  }

  // Multi-goal detection (e.g. developer + AI research)
  const isMultiGoal = matchedGoals.length > 1;
  const primaryGoal = matchedGoals[0] || (entityIds.length > 0 ? 'EXPLORE_PROJECTS' : 'UNKNOWN');
  const secondaryGoals = matchedGoals.slice(1);

  return {
    primaryGoal,
    secondaryGoals: secondaryGoals.length > 0 ? secondaryGoals : undefined,
    entities: entityIds,
    confidence: matchedGoals.length > 0 ? 'high' : entityIds.length > 0 ? 'medium' : 'low',
    isMultiGoal,
    isTopicShift: shift,
    reason: `Deterministic classification: ${primaryGoal}${secondaryGoals.length ? ` (+${secondaryGoals.join(', ')})` : ''}`
  };
}
