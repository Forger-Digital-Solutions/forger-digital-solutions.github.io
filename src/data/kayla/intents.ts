import { normalize } from './entities';

/**
 * Intent classification for Kayla.
 *
 * The previous fallback had no intent dimension: once an entity resolved it
 * returned that project's summary regardless of what was asked, so "Can I
 * download KyraBlox?", "Is KyraBlox a public beta?" and "Tell me about
 * CodeForge v9.0" all produced the same paragraph. Intents are matched by
 * pattern here and combined with an entity to derive an answer from canonical
 * data.
 */

export type KaylaIntent =
  | 'status_taxonomy'
  | 'pricing'
  | 'recommendation'
  | 'availability'
  | 'version'
  | 'status'
  | 'comparison'
  | 'capability'
  | 'roadmap'
  | 'list'
  | 'founder'
  | 'support'
  | 'contact'
  | 'navigation'
  | 'privacy'
  | 'assistant_identity'
  | 'unsupported_task'
  | 'external_current'
  | 'private_info'
  | 'identity';

interface IntentRule {
  intent: KaylaIntent;
  patterns: RegExp[];
}

/**
 * Ordered most specific first. Several intents can match one question; the
 * answer layer decides which combination it can serve.
 */
const RULES: IntentRule[] = [
  {
    // Asks about the meaning of a status label itself, not about a project.
    // Ordered first: "what does ACTIVE DEVELOPMENT mean" would otherwise fall
    // through to retrieval and come back with whichever project happens to
    // score highest, which is how this class of question used to be answered.
    intent: 'status_taxonomy',
    patterns: [
      /\bwhat (does|do) (active development|private development|research|released|(?:public\s+)?preview|(?:public\s+)?beta|concept)\b.{0,20}\b(mean|indicate|imply)\b/,
      /\bwhat (is|are) (an? )?(active development|private development|research|released|(?:public\s+)?preview(\s*\/\s*beta)?|concept)\b/,
      /\bdifference between\b.{0,40}\b(research|development|released|preview|concept|private)\b/,
      /\bwhat do (the |your )?(status|statuses|labels?|stages?|badges?)\b/,
      /\b(status|statuses) (mean|meanings?|explained)\b/,
      /\bis being (on|listed on) the projects page the same as\b/,
      /\bdoes (a|an) (project page|github repo(sitory)?|projects page)\b.{0,30}\bmean\b/
    ]
  },
  {
    intent: 'private_info',
    patterns: [
      /\b(how much (money|revenue|funding)|what.{0,12}(revenue|profit|salary|net worth))\b/,
      /\b(private|internal|secret|unreleased|confidential|hidden)\b.{0,40}\b(code|model|feature|project|plan|road ?map|detail|information|prompt|instruction)/,
      /\b(api|secret|private|access)\s*key\b/,
      /\b(password|credential|token|env(ironment)? (var|file))\b/,
      /\b(system prompt|internal prompt|your instructions)\b/,
      /\bwhat.{0,20}(training|being (trained|built))\s+(today|right now|privately)\b/
    ]
  },
  {
    intent: 'external_current',
    patterns: [
      /\b(weather|forecast|temperature outside)\b/,
      /\b(news|headlines|current events)\b/,
      /\b(stock|share) price\b/,
      /\b(bitcoin|crypto|ethereum)\b.{0,20}\bprice\b/,
      /\bprice of (bitcoin|gold|oil|[a-z]+ stock)\b/,
      /\bwho won\b/,
      /\b(score|game) (last night|yesterday|today)\b/,
      /\bwhat (day|time) is it\b/
    ]
  },
  {
    intent: 'unsupported_task',
    patterns: [
      /\b(write|build|create|generate|code|refactor|debug|fix)\s+(me\s+)?(a|an|my|this|some)\s+(python|javascript|typescript|java|c\+\+|rust|go|php|ruby|swift|kotlin|sql|html|css|bash|powershell|script|program|app|application|website|function|class|game)\b/,
      /\b(edit|proofread|rewrite|revise|publish|format|translate)\s+(my|this|the)\s+(manuscript|book|novel|chapter|story|draft|document|essay|paper)\b/,
      /\b(diagnose|fix|repair|troubleshoot)\b.{0,25}\b(my\s+)?(computer|pc|laptop|drive|windows|machine|system)\b/,
      /\bdo my (homework|taxes|assignment)\b/
    ]
  },
  {
    intent: 'assistant_identity',
    patterns: [
      /\b(who|what) are you\b/,
      /\bare you (kayla ai publisher|kayla publisher|the publisher|chatgpt|gpt|claude|an? (ai|bot|human))\b/,
      /\bwhat (can|do) you do\b/,
      /\bwhat kind of (assistant|ai|bot) are you\b/,
      /\byour (name|identity|purpose)\b/
    ]
  },
  {
    intent: 'recommendation',
    patterns: [
      /\bwhich .{0,20}(app|application|product|tool|project|software|one) (should|would|do|can|is best)\b/,
      /\b(which|what) .{0,20}(app|application|product|tool|project|software|one|thing)\b.{0,20}\b(is|are|does|do|involves?|handles?|covers?|helps?( with)?|focus(es|ed)? on|for)\b/,
      /\bwhat (should|would) i (use|look at|start with|try)\b/,
      /\brecommend\b/,
      /\bwhich .{0,20}(is best|works best|fits) for\b/,
      /\bi need (help )?(with|to)\b/,
      /\bwhat do you have for\b/,
      // "a developer"/"someone" is as common a subject here as "I" — the
      // original only matched the first person and missed the third.
      /\bwhere (should|would) (i|a \w+|someone|you) start\b/
    ]
  },
  {
    intent: 'comparison',
    patterns: [
      /\bdifference between\b/,
      /\b(compare|versus|vs\.?)\b/,
      /\bhow (is|are|does) .{2,40}\bdifferent\b/,
      /\bwhich (one|of (them|these))\b/,
      /\b(same (thing|product)|related to each other)\b/
    ]
  },
  {
    intent: 'version',
    patterns: [
      /\b(what|which)\s+version\b/,
      /\b(current|latest|newest|public|released)\s+(version|release|build)\b/,
      /\bversion (number|is (this|it|out))\b/,
      /\bwhat.{0,10}\bon\b.{0,20}\brelease[sd]?\b/
    ]
  },
  {
    intent: 'pricing',
    patterns: [
      /\b(how much (does|is|would)|what does .{0,25}cost|what.{0,6}s the (price|cost)|price of)\b/,
      /\bis (it|this|that|[a-z]+) (free|paid|open source|a subscription)\b/,
      /\b(pricing|subscription|licen[cs]e fee|paywall|monthly fee)\b/,
      /\bdo i (have to |need to )?pay\b/,
      /\b(what will .{0,25}cost|does .{0,25}cost|why does .{0,25}cost|paid (tier|plan|subscription)|tier cost|pricing tier)\b/,
      // Follow-up to an already-claimed price/tier ("What do I get with that
      // plan?"): the plan itself carries the pricing subject, no cost word needed.
      /\b(what (do|would|does) (i|it|that|you) (get|include|come with)|what.{0,10}(is |comes )?included)\b.{0,20}\b(plan|tier|subscription)\b/
    ]
  },
  {
    intent: 'availability',
    patterns: [
      // A single adverb between the pronoun and the verb ("can I actually
      // download", "can I really use") is ordinary phrasing that the earlier,
      // stricter pattern missed entirely — the question fell through to
      // keyword retrieval instead of the canonical availability answer.
      /\b(can|could|may) (i|we|you|anyone) (?:\w+\s+)?(download|install|get|buy|use|try|run|access)\b/,
      /\b(where|how) (can|do|would) (i|we|you) (?:\w+\s+)?(download|get|find|install|buy|try)\b/,
      /\bis (it|there|this|that) (available|out|public|released|downloadable|free|open)\b/,
      /\bis [a-z0-9 /]{2,30} (available|out|public|released|downloadable)\b/,
      /\b(has|have) .{0,30}(launched|released|shipped|come out)\b/,
      /\bwhen (did|is|will|does) .{0,40}(launch|launching|release|releasing|ship|shipping|come out|be (out|available|public))\b/,
      /\b(launch|release|availability) date\b/,
      /\b(download|get) (it|this|codeforge|forgerems|kyrablox|gems|topaz|sapphire|peridot|garnet)\b/,
      /\bwhere are the downloads?\b/,
      /\b(what|which)\s+downloads?\b/,
      /\bdownloads?\s+(are|can i|available|here)\b/,
      /\bcan i use it yet\b/,
      /\bis it out yet\b/
    ]
  },
  {
    intent: 'status',
    patterns: [
      /\b(what.{0,6}s|what is) the status\b/,
      /\bis (it|this|that|[a-z]+) (still|already|currently)?\s*(in )?(development|research|beta|preview|active|finished|done|dead|cancell?ed|abandoned|deprecated)\b/,
      /\bis [a-z0-9 /]{2,30} a (public )?(beta|preview|release)\b/,
      /\bwhy did .{0,30}\b(cancel|kill|stop|discontinue)\b/,
      /\bhow (far along|mature|ready)\b/,
      /\bproduction ready\b/
    ]
  },
  {
    intent: 'roadmap',
    patterns: [
      /\broad ?map\b/,
      /\bwhat.{0,6}s (next|ahead|coming|planned)\b/,
      /\b(coming soon|future plans|what will you build)\b/,
      /\bwhat are you (working on|building) next\b/
    ]
  },
  {
    intent: 'support',
    patterns: [
      /\b(support|donate|donation|contribute|fund|sponsor|back) (fds|you|the (project|studio|work))\b/,
      /\bhow (can|do) i (support|donate|help|contribute)\b/,
      /\b(cash ?app|ko-?fi|patreon|paypal|venmo|github sponsors)\b/,
      /\bdonate .{0,20}(hardware|computers?|laptops?|gpus?|equipment|tech|pcs?|servers?)\b/,
      /\b(hardware|equipment|old (tech|computer)) donation\b/,
      /\bgive .{0,20}(old|used) (tech|hardware|computers?|laptops?)\b/,
      /\b(donation|donate|donating|support|supporting)\s+(routes?|channels?|links?|methods?|options?|pages?|ways?)\b/,
      /\b(where|how)\s+can\s+i\s+(send|give)\s+(money|donations?|funds?|support)\b/,
      /\bwhat\s+(is|are)\s+(the\s+)?(official\s+)?(donation|support|funding)\s+(routes?|channels?|links?|methods?|options?|pages?|ways?)\b/
    ]
  },
  {
    intent: 'contact',
    patterns: [
      /\b(contact|get in touch|reach (you|fds|out)|email address|send .{0,10}(an )?email)\b/,
      /\b(discord|community server)\b/
    ]
  },
  {
    intent: 'privacy',
    patterns: [
      /\b(do you|does (this|the) (site|website)) (track|store|save|collect|record|log)\b/,
      /\b(cookies|analytics|trackers?|my data|personal (data|information))\b/,
      /\bis this conversation (private|saved|stored|logged)\b/,
      /\bdo you remember\b/
    ]
  },
  {
    intent: 'founder',
    patterns: [
      /\bwho (founded|created|started|built|makes|made|runs|owns|is behind)\b/,
      /\b(the )?founder\b/,
      /\bwho.{0,6}s behind\b/,
      /\b(when|did|why|how)\b.{0,25}\b(?:founder|founded)\b/,
      /\b(elon\s+musk|musk)\b/
    ]
  },
  {
    intent: 'list',
    patterns: [
      // A single descriptive adjective before the category noun ("what AI
      // projects", "which ML tools") is ordinary phrasing the bare form
      // missed, and fell through to keyword retrieval instead of the
      // ecosystem-aware canonical listing.
      /\b(what|which) (fds |your |the )?(ai |ml |machine learning |research |software |developer )?(projects?|apps?|applications?|products?|software|tools?)\b/,
      /\bwhich (ones?|of (them|these))\b.{0,30}\b(public|available|released|research|development|downloadable|use)\b/,
      /\b(show|list|see) (me )?(all |the )?(projects?|apps?|applications?|products?|software|everything)\b/,
      /\bwhat (do|does) (you|fds|they) (build|make|do|offer|work on)\b/,
      /\bwhat.{0,6}s (available|out) (now|today)\b/,
      /\beverything (you|fds) (build|make|offer)\b/,
      /\becosystem\b/,
      /\bexplain (all of|everything about|the whole)\b/,
      /\ball of fds\b/,
      /\bhow do (all )?the (fds )?(apps|projects|products) fit together\b/,
      /\b(quick )?tour\b.{0,20}\b(projects|apps|fds|ecosystem)\b/
    ]
  },
  {
    intent: 'navigation',
    patterns: [
      /\bwhere (can|do|would) i (learn|read|find out|see) more\b/,
      /\bwhere (is|are|can i find) the\b/,
      /\b(link|links|page|url) (to|for)\b/,
      /\btake me to\b/,
      /\bwhich page\b/
    ]
  },
  {
    intent: 'capability',
    patterns: [
      /\b(what|which) .{0,20}(can|does) (it|he|she|they|codeforge|forgerems|kyrablox|kayla|gems|topaz|sapphire|peridot|garnet) (do|support|handle|cover)\b/,
      /\bdoes (it|this|that|[a-z]+) (support|work with|handle|include|have|generate|beat|outperform|use|route|rely|fall back|require|need|run)\b/,
      /\bhow (well|good) does .{0,30}(perform|score|compare)\b/,
      /\b(benchmark|benchmarks|accuracy|users|downloads|customers|revenue)\b/,
      /\b(is|are) .{0,25}(as (smart|good|capable|powerful) as|better than|smarter than|comparable to)\b/,
      /\bwhat (features|capabilities)\b/,
      /\bwhat (is|does) .{0,30}\b(for|used for|specialize|specializes) (in)?\b/,
      /\bwhich gem\b/
    ]
  },
  {
    intent: 'identity',
    patterns: [
      /\bwhat (is|are|was)\b/,
      /\btell me about\b/,
      /\bexplain\b/,
      /\bdescribe\b/,
      /\bwhat.{0,6}s\b/,
      /\bwho is\b/
    ]
  }
];

export interface IntentMatch {
  intent: KaylaIntent;
  matched: string;
}

/** All intents a query expresses, ordered by rule specificity. */
export function classifyIntents(query: string): IntentMatch[] {
  const text = normalize(query);
  const matches: IntentMatch[] = [];
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      const hit = text.match(pattern);
      if (hit) {
        matches.push({ intent: rule.intent, matched: hit[0] });
        break;
      }
    }
  }
  return matches;
}

export function hasIntent(query: string, intent: KaylaIntent): boolean {
  return classifyIntents(query).some((match) => match.intent === intent);
}

/** Primary intent, or 'identity' when nothing more specific matched. */
export function classifyIntent(query: string): KaylaIntent {
  return classifyIntents(query)[0]?.intent || 'identity';
}
