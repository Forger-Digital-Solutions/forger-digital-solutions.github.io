import type { KaylaChatResponse, KaylaKnowledgeResult, KaylaErrorType, KaylaConfig, KaylaRouteMode } from '../../data/kayla/types';
import { createProvider, createAIProvider } from './provider';
import type { KaylaProviderConfig } from './provider';
import { createKaylaConfig, isAIEnabled } from './config';
import { validateChatRequest, isPromptInjectionAttempt } from './validate';
import { checkRateLimit } from './rateLimit';
import { isSensitiveQuery } from './systemPrompt';
import { canonicalEntitiesIn, verifyAgainstCanon } from './verify';
import { checkAnswerShape } from './well-formed';
import { toKaylaSources } from './sources';
import { dedupeActions } from './actions';
import { classifyIntent } from '../../data/kayla/intents';
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
function localActions(result?: KaylaKnowledgeResult) {
  if (result?.actions?.length) return dedupeActions(result.actions);
  return result?.action ? [result.action] : undefined;
}

/**
 * Intents whose answers are settled facts or scope boundaries. A model must
 * not decide whether something is downloadable, what version is public, or
 * whether Kayla can report the weather — and calling one to restate a fact the
 * site already owns spends provider budget for nothing.
 */
const DETERMINISTIC_INTENTS = new Set([
  'status_taxonomy', 'availability', 'version', 'status', 'pricing', 'support', 'contact',
  'navigation', 'privacy', 'founder', 'assistant_identity', 'external_current',
  'private_info', 'unsupported_task'
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
 * Accept generated text only when it agrees with canonical FDS data.
 * Returns the text to use, and whether the model's version was discarded.
 */
function acceptGenerated(text: string): { accepted: boolean; kinds: string[] } {
  // Shape before substance. Canonical verification asks whether an answer is
  // true, which it cannot do for text that makes no claim — raw tool-call
  // scaffolding passed verification in production and was served to a visitor.
  const shape = checkAnswerShape(text);
  if (!shape.ok) {
    logCanonRejection(shape.kinds);
    return { accepted: false, kinds: shape.kinds };
  }

  const verdict = verifyAgainstCanon(text);
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

/** Classify a thrown provider error into a failure class plus upstream status. */
function providerFailureFrom(error: unknown): Pick<KaylaDiagnostics, 'providerFailure' | 'upstreamStatus'> {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const { code, status } = parseProviderError(message);
  return { providerFailure: classifyProviderError(code), upstreamStatus: status };
}

function localResponse(topResult?: KaylaKnowledgeResult, routeMode?: KaylaRouteMode) {
  return {
    answer: topResult?.snippet || "I couldn't find that in the current public FDS knowledge base.",
    actions: localActions(topResult),
    mode: 'local' as const,
    sources: topResult?.id ? [{ id: topResult.id, title: topResult.title, type: topResult.type, route: topResult.route }] : [],
    sourceLinks: topResult ? toKaylaSources([topResult]) : [],
    routeMode: routeMode ?? classifyLocalRoute(topResult)
  };
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

  const { message, history, context } = validation.data;

  if (isPromptInjectionAttempt(message) || isSensitiveQuery(message)) {
    reportDiagnostics(config, undefined, 'deterministic', { fallbackReason: 'refused_unsafe_request' });
    return {
      status: 200,
      response: {
        answer: "I can't help with that request. I'm here to answer questions about Forger Digital Solutions, our projects, and public resources. How can I help you learn about FDS?",
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
    sources = await localProvider.search(message, context, history);
  } catch {
    reportDiagnostics(config, undefined, 'no_results', { fallbackReason: 'retrieval_failure' });
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

  const settled = deterministicAnswer(sources);
  if (settled) {
    reportDiagnostics(config, settled, 'deterministic');
    return { status: 200, response: localResponse(settled, 'deterministic') };
  }

  if (!isAIEnabled(kaylaConfig)) {
    const routeMode = classifyLocalRoute(sources[0]);
    reportDiagnostics(config, sources[0], routeMode, { fallbackReason: 'ai_disabled' });
    return { status: 200, response: localResponse(sources[0]) };
  }

  // Adaptive routing: only call provider when it would add value
  if (!isProviderEligible(message, sources, config.providerConfig)) {
    const routeMode = classifyLocalRoute(sources[0]);
    reportDiagnostics(config, sources[0], routeMode, {
      providerAttempted: false,
      providerOutcome: 'not_attempted',
      fallbackReason: 'deterministic_or_retrieval_sufficient'
    });
    return { status: 200, response: localResponse(sources[0]) };
  }

  const aiProvider = createAIProvider(config.providerConfig);
  if (!aiProvider) {
    reportDiagnostics(config, sources[0], 'provider_failed_fallback', {
      providerOutcome: 'failed',
      providerFailure: 'not_configured',
      fallbackReason: 'provider_not_constructed'
    });
    return { status: 200, response: localResponse(sources[0], 'provider_failed_fallback') };
  }

  // The local daily allowance is spent before the provider is ever contacted,
  // so this branch means *we* declined, not the provider. Phase 6 could not
  // tell these two apart in production; that ambiguity is the whole reason the
  // live-provider gap could only be guessed at.
  if (config.consumeAIAllowance && !(await config.consumeAIAllowance())) {
    reportDiagnostics(config, sources[0], 'provider_failed_fallback', {
      providerOutcome: 'failed',
      providerFailure: 'budget_exhausted',
      fallbackReason: 'local_ai_budget_denied'
    });
    return { status: 200, response: localResponse(sources[0], 'provider_failed_fallback') };
  }

  try {
    const aiResponse = await aiProvider.chat({
      message,
      history,
      context,
      sources
    });

    // The model may phrase a canonical fact; it may not change one. When the
    // generated answer contradicts the site's data, the canonical answer that
    // was already computed above is served instead.
    const verdict = acceptGenerated(aiResponse.content);
    if (!verdict.accepted) {
      reportDiagnostics(config, sources[0], 'provider_replaced', {
        providerAttempted: true,
        providerOutcome: 'rejected_replaced',
        verificationOutcome: 'rejected',
        verificationKinds: verdict.kinds,
        fallbackReason: 'canonical_verification_rejected'
      });
      return { status: 200, response: localResponse(sources[0], 'provider_replaced') };
    }

    reportDiagnostics(config, sources[0], 'provider_accepted', {
      providerAttempted: true,
      providerOutcome: 'accepted',
      verificationOutcome: 'passed',
      sourceCount: toKaylaSources(sources).length,
      actionCount: aiResponse.actions?.length ?? 0,
      resolvedModel: aiResponse.resolvedModel
    });
    return {
      status: 200,
      response: {
        answer: aiResponse.content,
        actions: aiResponse.actions,
        mode: 'ai',
        sources: sources.slice(0, 3).map(s => ({
          id: s.id || s.title,
          title: s.title,
          type: s.type,
          route: s.route
        })),
        sourceLinks: toKaylaSources(sources),
        routeMode: 'provider_accepted'
      }
    };
  } catch (error) {
    const topResult = sources[0];
    reportDiagnostics(config, topResult, 'provider_failed_fallback', {
      providerAttempted: true,
      providerOutcome: 'failed',
      fallbackReason: 'provider_threw',
      ...providerFailureFrom(error)
    });
    return {
      status: 200,
      response: {
        answer: `Kayla's conversational AI is temporarily unavailable, but I can still search the FDS knowledge base.\n\n${topResult?.snippet || ''}`,
        actions: localActions(topResult),
        mode: 'local',
        routeMode: 'provider_failed_fallback',
        sourceLinks: topResult ? toKaylaSources([topResult]) : [],
        sources: topResult?.id ? [{ id: topResult.id, title: topResult.title, type: topResult.type, route: topResult.route }] : []
      }
    };
  }
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

  const { message, history, context } = validation.data;

  if (isPromptInjectionAttempt(message) || isSensitiveQuery(message)) {
    reportDiagnostics(config, undefined, 'deterministic', { fallbackReason: 'refused_unsafe_request' });
    yield JSON.stringify({
      content: "I can't help with that request. I'm here to answer questions about Forger Digital Solutions.",
      mode: 'local',
      done: true,
      routeMode: 'deterministic',
      sourceLinks: []
    });
    return;
  }

  const localProvider = createProvider();
  const sources = await localProvider.search(message, context, history);

  const settled = deterministicAnswer(sources);
  if (settled) {
    reportDiagnostics(config, settled, 'deterministic');
    yield JSON.stringify({ content: settled.snippet, actions: localActions(settled), mode: 'local', done: true, routeMode: 'deterministic', sourceLinks: toKaylaSources([settled]) });
    return;
  }

  if (!isAIEnabled(kaylaConfig)) {
    const topResult = sources[0];
    reportDiagnostics(config, topResult, classifyLocalRoute(topResult), { fallbackReason: 'ai_disabled' });
    yield JSON.stringify({
      content: topResult?.snippet || "I couldn't find that in the current public FDS knowledge base.",
      actions: localActions(topResult),
      mode: 'local',
      done: true,
      routeMode: classifyLocalRoute(topResult),
      sourceLinks: topResult ? toKaylaSources([topResult]) : []
    });
    return;
  }

  // Adaptive routing: only call provider when it would add value
  if (!isProviderEligible(message, sources, config.providerConfig)) {
    const topResult = sources[0];
    const routeMode = classifyLocalRoute(topResult);
    reportDiagnostics(config, topResult, routeMode, {
      providerAttempted: false,
      providerOutcome: 'not_attempted',
      fallbackReason: 'deterministic_or_retrieval_sufficient'
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

  const aiProvider = createAIProvider(config.providerConfig);
  if (!aiProvider || !aiProvider.stream) {
    const topResult = sources[0];
    reportDiagnostics(config, topResult, 'provider_failed_fallback', {
      providerOutcome: 'failed',
      providerFailure: 'not_configured',
      fallbackReason: 'provider_not_constructed'
    });
    yield JSON.stringify({
      content: topResult?.snippet || "I couldn't find that in the current public FDS knowledge base.",
      actions: localActions(topResult),
      mode: 'local',
      done: true,
      routeMode: 'provider_failed_fallback',
      sourceLinks: topResult ? toKaylaSources([topResult]) : []
    });
    return;
  }

  // See the JSON path: this branch is *our* allowance declining, not the
  // provider's, and the two must stay distinguishable in production logs.
  if (config.consumeAIAllowance && !(await config.consumeAIAllowance())) {
    const topResult = sources[0];
    reportDiagnostics(config, topResult, 'provider_failed_fallback', {
      providerOutcome: 'failed',
      providerFailure: 'budget_exhausted',
      fallbackReason: 'local_ai_budget_denied'
    });
    yield JSON.stringify({ content: topResult?.snippet || "I couldn't find that in the current public FDS knowledge base.", actions: localActions(topResult), mode: 'local', done: true, routeMode: 'provider_failed_fallback', sourceLinks: topResult ? toKaylaSources([topResult]) : [] });
    return;
  }

  try {
    let providerFailed = false;
    let providerContentReceived = false;
    let bufferedText = '';
    let providerErrorCode: string | undefined;
    const topResult = sources[0];

    for await (const chunk of aiProvider.stream({ message, history, context, sources })) {
      if (chunk.type === 'error') {
        providerFailed = true;
        providerErrorCode = chunk.error;
        break;
      }

      if (chunk.type === 'content' && chunk.content) {
        providerContentReceived = true;
        bufferedText += chunk.content;
      }

      if (chunk.type === 'done') {
        if (!providerContentReceived) {
          providerFailed = true;
          providerErrorCode = providerErrorCode ?? 'EMPTY_RESPONSE';
        }
        break;
      }
    }

    if (providerFailed || !providerContentReceived) {
      const { code, status } = parseProviderError(providerErrorCode ?? 'EMPTY_RESPONSE');
      reportDiagnostics(config, topResult, 'provider_failed_fallback', {
        providerAttempted: true,
        providerOutcome: 'failed',
        providerFailure: classifyProviderError(code),
        upstreamStatus: status,
        fallbackReason: 'provider_stream_failed'
      });
      const fallback = {
        content: `Kayla's conversational AI is temporarily unavailable, but I can still answer from the FDS knowledge base.\n\n${topResult?.snippet || ''}`,
        actions: localActions(topResult),
        mode: 'local',
        done: true,
        replace: true,
        routeMode: 'provider_failed_fallback',
        sourceLinks: topResult ? toKaylaSources([topResult]) : []
      };
      yield JSON.stringify(fallback);
      return;
    }

    // Full buffer canonical verification: never stream unverified tokens to the visitor
    const verdict = acceptGenerated(bufferedText);
    if (!verdict.accepted) {
      reportDiagnostics(config, topResult, 'provider_replaced', {
        providerAttempted: true,
        providerOutcome: 'rejected_replaced',
        verificationOutcome: 'rejected',
        verificationKinds: verdict.kinds,
        fallbackReason: 'canonical_verification_rejected'
      });
      yield JSON.stringify({
        replace: true,
        content: topResult?.snippet || "I couldn't find that in the current public FDS knowledge base.",
        actions: localActions(topResult),
        mode: 'local',
        done: true,
        routeMode: 'provider_replaced',
        sourceLinks: topResult ? toKaylaSources([topResult]) : []
      });
      return;
    }

    // Verified output: safe to emit
    reportDiagnostics(config, topResult, 'provider_accepted', {
      providerAttempted: true,
      providerOutcome: 'accepted',
      verificationOutcome: 'passed',
      sourceCount: toKaylaSources(sources).length
    });
    yield JSON.stringify({ mode: 'ai', actions: localActions(topResult) });
    yield JSON.stringify({ type: 'content', content: bufferedText });
    yield JSON.stringify({ type: 'done', done: true, routeMode: 'provider_accepted', sourceLinks: toKaylaSources(sources) });
  } catch (error) {
    const topResult = sources[0];
    reportDiagnostics(config, topResult, 'provider_failed_fallback', {
      providerAttempted: true,
      providerOutcome: 'failed',
      fallbackReason: 'provider_threw',
      ...providerFailureFrom(error)
    });
    yield JSON.stringify({
      content: `Kayla's conversational AI is temporarily unavailable, but I can still search the FDS knowledge base.\n\n${topResult?.snippet || ''}`,
      actions: localActions(topResult),
      mode: 'local',
      done: true,
      replace: true,
      routeMode: 'provider_failed_fallback',
      sourceLinks: topResult ? toKaylaSources([topResult]) : []
    });
  }
}
