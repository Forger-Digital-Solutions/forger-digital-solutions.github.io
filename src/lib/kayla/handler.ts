import type { KaylaChatResponse, KaylaKnowledgeResult, KaylaErrorType, KaylaConfig, KaylaRouteMode, KaylaSafeAction, KaylaLane } from '../../data/kayla/types';
import { createProvider, createAIProvider, createProviderChain } from './provider';
import type { KaylaProviderConfig, KaylaChainRoute } from './provider';
import { createKaylaConfig, isAIEnabled } from './config';
import { validateChatRequest, isPromptInjectionAttempt } from './validate';
import { checkRateLimit } from './rateLimit';
import { isSensitiveQuery } from './systemPrompt';
import { canonicalEntitiesIn, verifyAgainstCanon } from './verify';
import { checkAnswerShape } from './well-formed';
import { toKaylaSources } from './sources';
import { dedupeActions } from './actions';
import { classifyIntent } from '../../data/kayla/intents';
import { buildTaskPlan, type KaylaTaskPlan } from './task-planner';
import { resolveConversation } from './conversation';
import { conversationAnswer, rankConversationActions } from './conversation-answer';
import { buildGroundingPacket, verifyGroundedSlots } from './grounding';
import { classifyLane } from './lanes';
import {
  classifyProviderError,
  emptyDiagnostics,
  parseProviderError,
  type KaylaDiagnostics
} from './diagnostics';

export interface KaylaEndpointConfig {
  providerConfig: KaylaProviderConfig;
  kaylaConfig?: KaylaConfig;
  getClientIp?: () => string;
  consumeRequestAllowance?: () => Promise<boolean>;
  consumeAIAllowance?: () => Promise<boolean>;
  /**
   * Operator-facing diagnostics for this request. Called at most once, on the
   * branch that actually produced the answer. Never receives the prompt, the
   * answer, or anything identifying the visitor.
   */
  onDiagnostics?: (diagnostics: KaylaDiagnostics) => void;
}

function getConfig(kaylaConfig?: KaylaConfig): KaylaConfig {
  return kaylaConfig || createKaylaConfig();
}

/** Canonical answers can offer more than one route; older results carry one. */
function localActions(result?: KaylaKnowledgeResult, taskPlan?: KaylaTaskPlan) {
  const combined: KaylaSafeAction[] = [];
  if (result?.actions?.length) combined.push(...result.actions);
  else if (result?.action) combined.push(result.action);

  if (taskPlan?.recommendedActions?.length) {
    for (const a of taskPlan.recommendedActions) {
      if (combined.length >= 3) break;
      const isDuplicate = combined.some(
        existing => existing.href && existing.href === a.href
      );
      if (!isDuplicate) {
        combined.push(a);
      }
    }
  }

  if (combined.length > 0) {
    const deduped = dedupeActions(combined);
    return deduped ? deduped.slice(0, 3) : undefined;
  }
  return undefined;
}

/**
 * Intents whose answers are settled facts or scope boundaries. A model must
 * not decide whether something is downloadable, what version is public, or
 * whether Kayla can report the weather — and calling one to restate a fact the
 * site already owns spends provider budget for nothing.
 *
 * Kayla 2.0: 'unsupported_task' is no longer in this set. The tasks it used to
 * refuse outright — write code, diagnose a machine, draft prose — are
 * ordinary general-assistant work now, so an unsettled boundary result falls
 * through to the lane classifier like anything else. The two boundaries that
 * remain real (acting on the visitor's device, managing accounts/credentials)
 * still arrive settled from the canonical layer and never reach a provider.
 */
const DETERMINISTIC_INTENTS = new Set([
  'status_taxonomy', 'availability', 'version', 'status', 'pricing', 'support', 'contact',
  'navigation', 'privacy', 'founder', 'assistant_identity', 'external_current',
  'private_info'
]);

/**
 * Intents where a model earns its call: the visitor is asking for several
 * canonical records to be weighed against each other, not for one fact to be
 * read back. Capability and roadmap are deliberately absent — they are gated
 * on retrieval strength below, because when the site already answers them the
 * model only paraphrases.
 */
const PROVIDER_ELIGIBLE_INTENTS = new Set(['comparison', 'recommendation', 'list']);

/**
 * Phrasing that asks how things stand in relation to each other rather than
 * what one thing is. These questions are answered by weighing several records
 * together, which is the one job a model does better than a lookup.
 */
const RELATIONAL_QUESTION = /\b(?:related|relationship|relates?|fit together|works? together|works with|differs?|differences?|compared?|comparison|versus|vs|connected|connects?|interacts?|overlaps?|apart from|instead of)\b/i;

/** A retrieval hit at or above this score already answers the question. */
const STRONG_CANONICAL_SCORE = 90;
const STRONG_RETRIEVAL_SCORE = 50;
const ADEQUATE_RETRIEVAL_SCORE = 40;

/**
 * Whether a provider call would add anything beyond what canonical data and
 * retrieval already produced. This is a budget decision, not a safety one:
 * every lane below still passes through the same canonical verification, so
 * declining a call can only cost synthesis quality, never correctness.
 *
 * Phase 7 proved the model lane went dark because our own daily allowance was
 * spent restating facts the site already owned. Spending it only where it buys
 * something is what keeps the lane lit for the questions that need it.
 */
export function isProviderEligible(message: string, sources: KaylaKnowledgeResult[], providerConfig?: KaylaProviderConfig): boolean {
  // Scripted providers exist to exercise the provider path in tests; gating
  // them here would make the tests assert the gate instead of the path.
  const providerId = providerConfig?.provider?.toLowerCase();
  if (providerId === 'mock' || providerId === 'test') return true;

  const intent = classifyIntent(message);
  if (DETERMINISTIC_INTENTS.has(intent)) return false;
  if (PROVIDER_ELIGIBLE_INTENTS.has(intent)) return true;

  const top = sources[0];
  const score = top?.score ?? 0;

  // An identity-classified question can still be a relationship question:
  // "how are GEMS and Training Grounds related?" and "how do the FDS apps fit
  // together?" both land on 'identity' but are exactly the synthesis the model
  // earned in Phase 7. Two signals keep them on the provider lane — naming more
  // than one canonical entity, and relational phrasing — because neither alone
  // catches both ("fit together" names no entity; "CodeForge vs ForgerEMS"
  // uses no relational verb).
  const relational = RELATIONAL_QUESTION.test(message);
  if (intent === 'identity' && !relational && canonicalEntitiesIn(message).length <= 1) {
    if (top && (top.sourceType === 'canonical' || top.sourceType === 'known-answer' || top.sourceType === 'entity-match') && score >= STRONG_CANONICAL_SCORE) return false;
    if (top && top.sourceType === 'retrieval' && score >= STRONG_RETRIEVAL_SCORE) return false;
  }

  // Roadmap and capability answers are worth synthesising only when retrieval
  // came back thin; a solid hit is already the documented answer.
  if ((intent === 'roadmap' || intent === 'capability') && score >= ADEQUATE_RETRIEVAL_SCORE) return false;

  return true;
}

/**
 * Whether a top result is a settled fact the handler serves without ever
 * consulting isProviderEligible. Exported so an offline evaluation script can
 * classify a corpus's real routing outcome — settled vs. provider-eligible vs.
 * neither — without constructing a live provider, which isProviderEligible's
 * own return value cannot do alone (a settled canonical answer short-circuits
 * before that gate runs at all).
 */
export function deterministicAnswer(sources: KaylaKnowledgeResult[]): KaylaKnowledgeResult | undefined {
  const top = sources[0];
  if (!top || top.sourceType !== 'canonical') return undefined;
  if (top.settled) return top;
  return top.intent && DETERMINISTIC_INTENTS.has(top.intent) ? top : undefined;
}

/**
 * Which lane produced a local (non-provider) answer, for tests and live
 * verification to prove rather than assume. A canonical/known-answer result
 * is a settled or near-settled fact; an entity match or retrieved document is
 * assembled from site content; "none" is honest absence of evidence.
 */
function classifyLocalRoute(top?: KaylaKnowledgeResult): KaylaRouteMode {
  if (!top) return 'no_results';
  if (top.sourceType === 'none') return 'no_results';
  if (top.sourceType === 'canonical' || top.sourceType === 'known-answer') return 'deterministic';
  return 'retrieval';
}

/**
 * Aggregate-only telemetry: which canonical rules a generated answer broke.
 * Never the question, the answer, or anything identifying the visitor.
 */
function logCanonRejection(kinds: string[]): void {
  try {
    console.log(JSON.stringify({ event: 'kayla_canon_rejection', kinds }));
  } catch { /* logging must never break a response */ }
}

/**
 * The generic public copy for the two states that can reach a visitor. No
 * provider names, no route names, no quota or failure-class detail — the
 * specific failure is server-side diagnostics, not visitor copy.
 */
export const GENERAL_UNAVAILABLE =
  "Kayla is temporarily unavailable for that request. Please try again in a moment.";

const UNSAFE_REFUSAL =
  "I can't help with that request. Is there something else I can help you with?";

/**
 * Accept generated text only when it agrees with canonical FDS data.
 * Returns the text to use, and whether the model's version was discarded.
 *
 * Kayla 2.0: `lane` decides which checks apply. The FDS lanes ('fds', 'mixed')
 * keep the full battery — grounded slots plus strict canon verification —
 * because every generated sentence is expected to respect FDS facts. The
 * general lane runs shape checks (with code fences allowed: coding answers
 * need them) and the entity-scoped canon verifier, so an answer about
 * recursion is not rejected for containing a version number, while a
 * hallucinated "CodeForge v9" inside a general answer still is.
 */
function acceptGenerated(
  text: string,
  sources: KaylaKnowledgeResult[] = [],
  lane: KaylaLane = 'fds'
): { accepted: boolean; kinds: string[] } {
  // Shape before substance. Canonical verification asks whether an answer is
  // true, which it cannot do for text that makes no claim — raw tool-call
  // scaffolding passed verification in production and was served to a visitor.
  const shape = checkAnswerShape(text, { allowCodeFences: lane === 'general' });
  if (!shape.ok) {
    logCanonRejection(shape.kinds);
    return { accepted: false, kinds: shape.kinds };
  }

  if (lane === 'general') {
    const verdict = verifyAgainstCanon(text, 'general');
    if (verdict.ok) return { accepted: true, kinds: [] };
    const kinds = [...new Set(verdict.violations.map((violation) => violation.kind))];
    logCanonRejection(kinds);
    return { accepted: false, kinds };
  }

  // The canonical verifier protects the known FDS facts. The grounding packet
  // also constrains the generated slots that are easy to invent safely enough
  // to evade a fact match: URLs, prices, dates, platforms, model names, and
  // availability language. It is built from the exact bounded evidence sent
  // to the provider for this request.
  const grounded = verifyGroundedSlots(text, buildGroundingPacket(sources));
  if (!grounded.ok) {
    logCanonRejection(grounded.kinds);
    return { accepted: false, kinds: grounded.kinds };
  }

  const verdict = verifyAgainstCanon(text, 'strict');
  if (verdict.ok) return { accepted: true, kinds: [] };
  const kinds = [...new Set(verdict.violations.map((violation) => violation.kind))];
  logCanonRejection(kinds);
  return { accepted: false, kinds };
}


/**
 * Build the diagnostics record for a completed request. Kept beside the
 * response shaping so a new branch can't quietly ship without saying which
 * lane it took and why.
 */
function reportDiagnostics(
  config: KaylaEndpointConfig,
  top: KaylaKnowledgeResult | undefined,
  routeMode: KaylaRouteMode,
  overrides: Partial<KaylaDiagnostics> = {}
): void {
  if (!config.onDiagnostics) return;
  try {
    config.onDiagnostics({
      ...emptyDiagnostics(),
      routeMode,
      intent: top?.intent,
      entity: top?.id,
      sourceCount: top ? toKaylaSources([top]).length : 0,
      actionCount: localActions(top)?.length ?? 0,
      ...overrides
    });
  } catch { /* diagnostics must never break a response */ }
}

function localResponse(topResult?: KaylaKnowledgeResult, routeMode?: KaylaRouteMode, taskPlan?: KaylaTaskPlan) {
  const acts = localActions(topResult, taskPlan);
  const srcLinks = topResult ? toKaylaSources([topResult]) : (taskPlan?.recommendedSources || []);
  return {
    answer: topResult?.snippet || "I couldn't find that in the current public FDS knowledge base.",
    actions: acts,
    mode: 'local' as const,
    sources: topResult?.id ? [{ id: topResult.id, title: topResult.title, type: topResult.type, route: topResult.route }] : [],
    sourceLinks: srcLinks,
    routeMode: routeMode ?? classifyLocalRoute(topResult)
  };
}

/**
 * The degraded-mode answer when every inference route is down. FDS lanes
 * still have local knowledge to serve, so the visitor gets the best public
 * snippet rather than a bare refusal; the general lane has nothing else to
 * serve and must say so generically. Neither copy names what failed.
 */
function degradedAnswer(topResult: KaylaKnowledgeResult | undefined, lane: KaylaLane): string {
  if (lane !== 'general' && topResult?.snippet) {
    return `I can't give you the full answer right now, but here's what the public FDS knowledge says:\n\n${topResult.snippet}`;
  }
  return GENERAL_UNAVAILABLE;
}

/**
 * Resolve the inference chain for this endpoint. A configured route list
 * goes through the full chain builder; a bare provider/model goes through
 * the original single-provider factory — which is also the seam the scripted
 * test suite intercepts, so tests that mock createAIProvider keep proving
 * the routing behaviour they were written for.
 */
function providerChainFor(providerConfig: KaylaProviderConfig): KaylaChainRoute[] {
  if (providerConfig.routes?.length) return createProviderChain(providerConfig);
  const provider = createAIProvider(providerConfig);
  if (!provider) return [];
  return [{
    route: {
      id: `${providerConfig.provider}:${providerConfig.model}`,
      provider: providerConfig.provider || '',
      model: providerConfig.model || '',
      apiKey: providerConfig.apiKey,
      endpoint: providerConfig.endpoint
    },
    provider
  }];
}

/**
 * AI is usable when the deployment is enabled AND some credential path
 * exists: the legacy single-provider key, or at least one configured route
 * carrying a key. Route-chain deployments store keys per provider
 * (GROQ_API_KEY, ...) and leave KAYLA_API_KEY empty — without this, a chain
 * deployment reads as "AI disabled" and every general-lane question answers
 * unavailable even though two working routes are configured.
 */
function aiUsable(config: KaylaEndpointConfig): boolean {
  const kaylaConfig = config.kaylaConfig;
  if (!kaylaConfig?.enabled) return false;
  if (isAIEnabled(kaylaConfig)) return true;
  return Boolean(config.providerConfig.routes?.some((route) => route.apiKey));
}

interface ChainAttempt {
  ok: boolean;
  /** Rejected by verification — FDS lanes replace with the local answer. */
  rejected?: boolean;
  rejectionKinds?: string[];
  text?: string;
  actions?: KaylaSafeAction[];
  resolvedModel?: string;
  /** Route id that produced `text`; undefined when nothing succeeded. */
  routeId?: string;
  attempted: string[];
  lastFailure?: string;
  upstreamStatus?: number;
}

/**
 * Walk the admitted free-route chain, primary first. A route error (429,
 * timeout, 5xx, network failure, malformed body) moves on to the next route —
 * failover is silent to the visitor and fully visible in diagnostics.
 *
 * A verification rejection is different: for the general lane there is no
 * canonical answer to replace the output with, so the next route is worth
 * one attempt; for the FDS lanes the canonical answer is already a better
 * answer than a different model's second guess, so the chain stops and the
 * caller serves the local replacement.
 */
async function attemptChatChain(
  chain: { route: { id: string }; provider: import('../../data/kayla/types').KaylaAIProvider }[],
  request: { message: string; history: import('../../data/kayla/types').KaylaConversationMessage[]; context?: import('../../data/kayla/types').KaylaPageContext; sources: KaylaKnowledgeResult[]; lane: KaylaLane },
  sources: KaylaKnowledgeResult[],
  lane: KaylaLane
): Promise<ChainAttempt> {
  const attempted: string[] = [];
  let lastFailure: string | undefined;
  let upstreamStatus: number | undefined;

  for (const { route, provider } of chain) {
    attempted.push(route.id);
    try {
      const response = await provider.chat(request);
      const verdict = acceptGenerated(response.content, sources, lane);
      if (verdict.accepted) {
        return { ok: true, text: response.content, actions: response.actions, resolvedModel: response.resolvedModel, routeId: route.id, attempted };
      }
      if (lane === 'general') {
        lastFailure = `rejected:${verdict.kinds.join('|')}`;
        continue;
      }
      return { ok: false, rejected: true, rejectionKinds: verdict.kinds, routeId: route.id, attempted };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error ?? '');
      const { code, status } = parseProviderError(message);
      lastFailure = code;
      upstreamStatus = status;
      continue;
    }
  }
  return { ok: false, attempted, lastFailure, upstreamStatus };
}

/**
 * Streaming twin of attemptChatChain. Each route's stream is fully buffered
 * before acceptance — the same guarantee the single-provider path had — so a
 * mid-stream failure just becomes the next route's turn, and nothing
 * unverified ever reaches the wire.
 */
async function attemptStreamChain(
  chain: { route: { id: string }; provider: import('../../data/kayla/types').KaylaAIProvider }[],
  request: { message: string; history: import('../../data/kayla/types').KaylaConversationMessage[]; context?: import('../../data/kayla/types').KaylaPageContext; sources: KaylaKnowledgeResult[]; lane: KaylaLane },
  sources: KaylaKnowledgeResult[],
  lane: KaylaLane
): Promise<ChainAttempt> {
  const attempted: string[] = [];
  let lastFailure: string | undefined;
  let upstreamStatus: number | undefined;

  for (const { route, provider } of chain) {
    attempted.push(route.id);
    if (!provider.stream) {
      lastFailure = 'not_configured';
      continue;
    }
    let buffered = '';
    let errorCode: string | undefined;

    for await (const chunk of provider.stream(request)) {
      if (chunk.type === 'error') { errorCode = chunk.error; break; }
      if (chunk.type === 'content' && chunk.content) buffered += chunk.content;
      if (chunk.type === 'done') break;
    }

    if (errorCode || !buffered) {
      const { code, status } = parseProviderError(errorCode ?? 'EMPTY_RESPONSE');
      lastFailure = code;
      upstreamStatus = status;
      continue;
    }

    const verdict = acceptGenerated(buffered, sources, lane);
    if (verdict.accepted) {
      return { ok: true, text: buffered, routeId: route.id, attempted };
    }
    if (lane === 'general') {
      lastFailure = `rejected:${verdict.kinds.join('|')}`;
      continue;
    }
    return { ok: false, rejected: true, rejectionKinds: verdict.kinds, routeId: route.id, attempted };
  }
  return { ok: false, attempted, lastFailure, upstreamStatus };
}

export async function handleKaylaChat(
  body: unknown,
  config: KaylaEndpointConfig
): Promise<{ status: number; response: KaylaChatResponse | { error: string; errorType?: KaylaErrorType } }> {
  const kaylaConfig = getConfig(config.kaylaConfig);

  const allowed = config.consumeRequestAllowance
    ? await config.consumeRequestAllowance()
    : checkRateLimit(config.getClientIp?.() || 'anonymous', kaylaConfig.rateLimitPerMinute).allowed;
  if (!allowed) {
    return {
      status: 429,
      response: {
        error: 'Too many requests. Please try again later.',
        errorType: 'RATE_LIMITED'
      }
    };
  }

  const validation = validateChatRequest(body, kaylaConfig);
  if (!validation.valid) {
    return {
      status: 400,
      response: {
        error: validation.errors.map(e => e.message).join('; '),
        errorType: 'VALIDATION_ERROR'
      }
    };
  }

  const { message: rawMessage, context } = validation.data;
  const conversation = resolveConversation(rawMessage, validation.data.history, context);
  const message = conversation.resolvedQuery;
  const history = conversation.history;
  const taskPlan = buildTaskPlan(message, context, history);
  const taskDiag = { goal: taskPlan.goal, plannedEntityCount: taskPlan.entities.length };

  if (isPromptInjectionAttempt(message) || isSensitiveQuery(message)) {
    reportDiagnostics(config, undefined, 'deterministic', { fallbackReason: 'refused_unsafe_request', ...taskDiag });
    return {
      status: 200,
      response: {
        answer: UNSAFE_REFUSAL,
        mode: 'local',
        sources: [],
        sourceLinks: [],
        routeMode: 'deterministic'
      }
    };
  }

  const localProvider = createProvider();
  let sources: KaylaKnowledgeResult[];
  try {
    const retrieved = await localProvider.search(message, context, history);
    const composed = conversationAnswer(conversation);
    // conversationAnswer only returns a defined result for turns it is
    // narrowly scoped to handle (clarification, corrections, goal or entity
    // continuity, multi-entity synthesis, high-risk overrides); every other
    // turn falls through undefined and the standalone canonical/retrieval
    // lane below remains authoritative.
    sources = composed && composed.length ? composed : (retrieved.length ? retrieved : []);
    const actions = rankConversationActions(conversation, [...(sources[0]?.actions || []), ...taskPlan.recommendedActions], context);
    taskPlan.recommendedActions = actions;
    if (sources[0]) sources[0] = { ...sources[0], actions, action: actions[0] };
  } catch {
    reportDiagnostics(config, undefined, 'no_results', { fallbackReason: 'retrieval_failure', ...taskDiag });
    return {
      status: 200,
      response: {
        answer: "I'm having trouble accessing the FDS knowledge base right now. Please try again in a moment.",
        mode: 'local',
        sources: [],
        sourceLinks: [],
        routeMode: 'no_results'
      }
    };
  }

  const intent = classifyIntent(message);
  const lane = classifyLane({ message, intent, sources, entities: conversation.entities });

  const settled = deterministicAnswer(sources);
  if (settled) {
    reportDiagnostics(config, settled, 'deterministic', { lane: 'deterministic', ...taskDiag });
    return { status: 200, response: localResponse(settled, 'deterministic', taskPlan) };
  }

  if (!aiUsable(config)) {
    // The general lane has no honest local answer at all — only the generic
    // unavailable state. A mixed lane degrades to a local answer only when the
    // top result is a composed canonical answer ("How is Topaz different from
    // Sapphire?" still gets the canonical comparison); a bare retrieval hit
    // only covers the FDS half of the question, so serving it alone would be
    // a different answer than the visitor asked for.
    const mixedHasAnswer = lane === 'mixed' && classifyLocalRoute(sources[0]) === 'deterministic';
    if (lane === 'general' || (lane === 'mixed' && !mixedHasAnswer)) {
      // 'no_results', not 'provider_failed_fallback': nothing local answered
      // and no provider actually ran — the failure reason lives in
      // fallbackReason, the route label stays honest about what executed.
      reportDiagnostics(config, sources[0], 'no_results', { lane, fallbackReason: 'ai_disabled', ...taskDiag });
      return {
        status: 200,
        response: { answer: GENERAL_UNAVAILABLE, mode: 'unavailable', sources: [], sourceLinks: [], routeMode: 'no_results' }
      };
    }
    const routeMode = classifyLocalRoute(sources[0]);
    reportDiagnostics(config, sources[0], routeMode, { lane, fallbackReason: 'ai_disabled', ...taskDiag });
    return { status: 200, response: localResponse(sources[0], undefined, taskPlan) };
  }

  // Adaptive routing: the FDS lane only calls a provider when it would add
  // anything beyond what canonical data and retrieval already produced. The
  // general and mixed lanes always need inference — there is no local answer
  // for them to fall back to quality-wise.
  if (lane === 'fds' && !isProviderEligible(message, sources, config.providerConfig)) {
    const routeMode = classifyLocalRoute(sources[0]);
    reportDiagnostics(config, sources[0], routeMode, {
      lane,
      providerAttempted: false,
      providerOutcome: 'not_attempted',
      fallbackReason: 'deterministic_or_retrieval_sufficient',
      ...taskDiag
    });
    return { status: 200, response: localResponse(sources[0], undefined, taskPlan) };
  }

  const chain = providerChainFor(config.providerConfig);
  if (!chain.length) {
    reportDiagnostics(config, sources[0], 'provider_failed_fallback', {
      lane,
      providerOutcome: 'failed',
      providerFailure: 'not_configured',
      fallbackReason: 'provider_not_constructed',
      ...taskDiag
    });
    return degradedJson(sources[0], lane, taskPlan);
  }

  // The local daily allowance is spent before the provider is ever contacted,
  // so this branch means *we* declined, not the provider. Phase 6 could not
  // tell these two apart in production; that ambiguity is the whole reason the
  // live-provider gap could only be guessed at.
  if (config.consumeAIAllowance && !(await config.consumeAIAllowance())) {
    reportDiagnostics(config, sources[0], 'provider_failed_fallback', {
      lane,
      providerOutcome: 'failed',
      providerFailure: 'budget_exhausted',
      fallbackReason: 'local_ai_budget_denied',
      ...taskDiag
    });
    return degradedJson(sources[0], lane, taskPlan);
  }

  const attempt = await attemptChatChain(
    chain,
    { message, history, context, sources, lane },
    sources,
    lane
  );

  if (attempt.rejected) {
    // The model may phrase a canonical fact; it may not change one. When the
    // generated answer contradicts the site's data, the canonical answer that
    // was already computed above is served instead.
    reportDiagnostics(config, sources[0], 'provider_replaced', {
      lane,
      providerAttempted: true,
      providerOutcome: 'rejected_replaced',
      verificationOutcome: 'rejected',
      verificationKinds: attempt.rejectionKinds,
      fallbackReason: 'canonical_verification_rejected',
      providerRoute: attempt.routeId,
      attemptedRoutes: attempt.attempted,
      ...taskDiag
    });
    return { status: 200, response: localResponse(sources[0], 'provider_replaced', taskPlan) };
  }

  if (!attempt.ok) {
    const { code, status } = attempt.lastFailure
      ? parseProviderError(attempt.lastFailure)
      : { code: 'EMPTY_RESPONSE', status: attempt.upstreamStatus };
    reportDiagnostics(config, sources[0], 'provider_failed_fallback', {
      lane,
      providerAttempted: true,
      providerOutcome: 'failed',
      providerFailure: classifyProviderError(code),
      upstreamStatus: status ?? attempt.upstreamStatus,
      fallbackReason: 'all_routes_failed',
      attemptedRoutes: attempt.attempted,
      ...taskDiag
    });
    return degradedJson(sources[0], lane, taskPlan);
  }

  const finalActions = lane === 'general'
    ? undefined
    : taskPlan.recommendedActions.length > 0
      ? dedupeActions(taskPlan.recommendedActions)?.slice(0, 3)
      : localActions(sources[0], taskPlan);

  reportDiagnostics(config, sources[0], 'provider_accepted', {
    lane,
    providerAttempted: true,
    providerOutcome: 'accepted',
    verificationOutcome: 'passed',
    sourceCount: lane === 'general' ? 0 : toKaylaSources(sources).length,
    actionCount: finalActions?.length ?? 0,
    resolvedModel: attempt.resolvedModel,
    providerRoute: attempt.routeId,
    attemptedRoutes: attempt.attempted,
    ...taskDiag
  });
  return {
    status: 200,
    response: {
      answer: attempt.text!,
      actions: finalActions,
      mode: 'ai',
      sources: lane === 'general' ? [] : sources.slice(0, 3).map(s => ({
        id: s.id || s.title,
        title: s.title,
        type: s.type,
        route: s.route
      })),
      sourceLinks: lane === 'general' ? [] : toKaylaSources(sources),
      routeMode: 'provider_accepted'
    }
  };
}

function degradedJson(
  topResult: KaylaKnowledgeResult | undefined,
  lane: KaylaLane,
  taskPlan?: KaylaTaskPlan
): { status: number; response: KaylaChatResponse } {
  const answer = degradedAnswer(topResult, lane);
  const hasLocal = lane !== 'general' && Boolean(topResult?.snippet);
  return {
    status: 200,
    response: {
      answer,
      actions: hasLocal ? localActions(topResult, taskPlan) : undefined,
      mode: hasLocal ? 'local' : 'unavailable',
      routeMode: 'provider_failed_fallback',
      sourceLinks: hasLocal && topResult ? toKaylaSources([topResult]) : [],
      sources: hasLocal && topResult?.id ? [{ id: topResult.id, title: topResult.title, type: topResult.type, route: topResult.route }] : []
    }
  };
}

export async function* streamKaylaChat(
  body: unknown,
  config: KaylaEndpointConfig
): AsyncIterable<string> {
  const kaylaConfig = getConfig(config.kaylaConfig);

  const allowed = config.consumeRequestAllowance
    ? await config.consumeRequestAllowance()
    : checkRateLimit(config.getClientIp?.() || 'anonymous', kaylaConfig.rateLimitPerMinute).allowed;
  if (!allowed) {
    yield JSON.stringify({ error: 'Too many requests', errorType: 'RATE_LIMITED' });
    return;
  }

  const validation = validateChatRequest(body, kaylaConfig);
  if (!validation.valid) {
    yield JSON.stringify({ error: 'Invalid request', errorType: 'VALIDATION_ERROR' });
    return;
  }

  const { message: rawMessage, context } = validation.data;
  const conversation = resolveConversation(rawMessage, validation.data.history, context);
  const message = conversation.resolvedQuery;
  const history = conversation.history;
  const taskPlan = buildTaskPlan(message, context, history);
  const taskDiag = { goal: taskPlan.goal, plannedEntityCount: taskPlan.entities.length };

  if (isPromptInjectionAttempt(message) || isSensitiveQuery(message)) {
    reportDiagnostics(config, undefined, 'deterministic', { fallbackReason: 'refused_unsafe_request', ...taskDiag });
    yield JSON.stringify({
      content: UNSAFE_REFUSAL,
      mode: 'local',
      done: true,
      routeMode: 'deterministic',
      sourceLinks: []
    });
    return;
  }

  const localProvider = createProvider();
  const retrieved = await localProvider.search(message, context, history);
  const composed = conversationAnswer(conversation);
  const sources = composed && composed.length ? composed : (retrieved.length ? retrieved : []);
  const actions = rankConversationActions(conversation, [...(sources[0]?.actions || []), ...taskPlan.recommendedActions], context);
  taskPlan.recommendedActions = actions;
  if (sources[0]) sources[0] = { ...sources[0], actions, action: actions[0] };

  const intent = classifyIntent(message);
  const lane = classifyLane({ message, intent, sources, entities: conversation.entities });

  const settled = deterministicAnswer(sources);
  if (settled) {
    reportDiagnostics(config, settled, 'deterministic', { lane: 'deterministic', ...taskDiag });
    yield JSON.stringify({ content: settled.snippet, actions: localActions(settled, taskPlan), mode: 'local', done: true, routeMode: 'deterministic', sourceLinks: toKaylaSources([settled]) });
    return;
  }

  if (!aiUsable(config)) {
    const mixedHasAnswer = lane === 'mixed' && classifyLocalRoute(sources[0]) === 'deterministic';
    if (lane === 'general' || (lane === 'mixed' && !mixedHasAnswer)) {
      reportDiagnostics(config, sources[0], 'no_results', { lane, fallbackReason: 'ai_disabled', ...taskDiag });
      yield JSON.stringify({
        content: GENERAL_UNAVAILABLE,
        mode: 'unavailable',
        done: true,
        routeMode: 'no_results',
        sourceLinks: []
      });
      return;
    }
    const topResult = sources[0];
    reportDiagnostics(config, topResult, classifyLocalRoute(topResult), { lane, fallbackReason: 'ai_disabled', ...taskDiag });
    yield JSON.stringify({
      content: topResult?.snippet || "I couldn't find that in the current public FDS knowledge base.",
      actions: localActions(topResult, taskPlan),
      mode: 'local',
      done: true,
      routeMode: classifyLocalRoute(topResult),
      sourceLinks: topResult ? toKaylaSources([topResult]) : (taskPlan.recommendedSources || [])
    });
    return;
  }

  // Adaptive routing: the FDS lane only calls a provider when it would add
  // value; general and mixed lanes always need inference.
  if (lane === 'fds' && !isProviderEligible(message, sources, config.providerConfig)) {
    const topResult = sources[0];
    const routeMode = classifyLocalRoute(topResult);
    reportDiagnostics(config, topResult, routeMode, {
      lane,
      providerAttempted: false,
      providerOutcome: 'not_attempted',
      fallbackReason: 'deterministic_or_retrieval_sufficient',
      ...taskDiag
    });
    yield JSON.stringify({
      content: topResult?.snippet || "I couldn't find that in the current public FDS knowledge base.",
      actions: localActions(topResult),
      mode: 'local',
      done: true,
      routeMode: routeMode,
      sourceLinks: topResult ? toKaylaSources([topResult]) : []
    });
    return;
  }

  const chain = providerChainFor(config.providerConfig);
  if (!chain.length) {
    const topResult = sources[0];
    reportDiagnostics(config, topResult, 'provider_failed_fallback', {
      lane,
      providerOutcome: 'failed',
      providerFailure: 'not_configured',
      fallbackReason: 'provider_not_constructed',
      ...taskDiag
    });
    yield JSON.stringify(degradedStreamChunk(topResult, lane, taskPlan));
    return;
  }

  // See the JSON path: this branch is *our* allowance declining, not the
  // provider's, and the two must stay distinguishable in production logs.
  if (config.consumeAIAllowance && !(await config.consumeAIAllowance())) {
    const topResult = sources[0];
    reportDiagnostics(config, topResult, 'provider_failed_fallback', {
      lane,
      providerOutcome: 'failed',
      providerFailure: 'budget_exhausted',
      fallbackReason: 'local_ai_budget_denied',
      ...taskDiag
    });
    yield JSON.stringify(degradedStreamChunk(topResult, lane, taskPlan));
    return;
  }

  const attempt = await attemptStreamChain(
    chain,
    { message, history, context, sources, lane },
    sources,
    lane
  );
  const topResult = sources[0];

  if (attempt.rejected) {
    reportDiagnostics(config, topResult, 'provider_replaced', {
      lane,
      providerAttempted: true,
      providerOutcome: 'rejected_replaced',
      verificationOutcome: 'rejected',
      verificationKinds: attempt.rejectionKinds,
      fallbackReason: 'canonical_verification_rejected',
      providerRoute: attempt.routeId,
      attemptedRoutes: attempt.attempted,
      ...taskDiag
    });
    yield JSON.stringify({
      replace: true,
      content: topResult?.snippet || "I couldn't find that in the current public FDS knowledge base.",
      actions: localActions(topResult, taskPlan),
      mode: 'local',
      done: true,
      routeMode: 'provider_replaced',
      sourceLinks: topResult ? toKaylaSources([topResult]) : []
    });
    return;
  }

  if (!attempt.ok) {
    const { code, status } = attempt.lastFailure
      ? parseProviderError(attempt.lastFailure)
      : { code: 'EMPTY_RESPONSE', status: attempt.upstreamStatus };
    reportDiagnostics(config, topResult, 'provider_failed_fallback', {
      lane,
      providerAttempted: true,
      providerOutcome: 'failed',
      providerFailure: classifyProviderError(code),
      upstreamStatus: status ?? attempt.upstreamStatus,
      fallbackReason: 'all_routes_failed',
      attemptedRoutes: attempt.attempted,
      ...taskDiag
    });
    const degraded = degradedStreamChunk(topResult, lane, taskPlan);
    yield JSON.stringify({ ...degraded, replace: true });
    return;
  }

  const finalActions = lane === 'general'
    ? undefined
    : taskPlan.recommendedActions.length > 0
      ? dedupeActions(taskPlan.recommendedActions)?.slice(0, 3)
      : localActions(topResult, taskPlan);

  // Verified output: safe to emit
  reportDiagnostics(config, topResult, 'provider_accepted', {
    lane,
    providerAttempted: true,
    providerOutcome: 'accepted',
    verificationOutcome: 'passed',
    sourceCount: lane === 'general' ? 0 : toKaylaSources(sources).length,
    actionCount: finalActions?.length ?? 0,
    providerRoute: attempt.routeId,
    attemptedRoutes: attempt.attempted,
    ...taskDiag
  });
  yield JSON.stringify({ mode: 'ai', actions: finalActions });
  yield JSON.stringify({ type: 'content', content: attempt.text });
  yield JSON.stringify({
    type: 'done',
    done: true,
    routeMode: 'provider_accepted',
    sourceLinks: lane === 'general' ? [] : (taskPlan.recommendedSources.length > 0 ? taskPlan.recommendedSources : toKaylaSources(sources))
  });
}

function degradedStreamChunk(
  topResult: KaylaKnowledgeResult | undefined,
  lane: KaylaLane,
  taskPlan?: KaylaTaskPlan
): Record<string, unknown> {
  const answer = degradedAnswer(topResult, lane);
  const hasLocal = lane !== 'general' && Boolean(topResult?.snippet);
  return {
    content: answer,
    actions: hasLocal ? localActions(topResult, taskPlan) : undefined,
    mode: hasLocal ? 'local' : 'unavailable',
    done: true,
    routeMode: 'provider_failed_fallback',
    sourceLinks: hasLocal && topResult ? toKaylaSources([topResult]) : []
  };
}
