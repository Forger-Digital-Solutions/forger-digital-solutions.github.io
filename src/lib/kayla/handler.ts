import type { KaylaChatResponse, KaylaKnowledgeResult, KaylaErrorType, KaylaConfig } from '../../data/kayla/types';
import { createProvider, createAIProvider } from './provider';
import type { KaylaProviderConfig } from './provider';
import { createKaylaConfig, isAIEnabled } from './config';
import { validateChatRequest, isPromptInjectionAttempt } from './validate';
import { checkRateLimit } from './rateLimit';
import { isSensitiveQuery } from './systemPrompt';
import { verifyAgainstCanon } from './verify';

export interface KaylaEndpointConfig {
  providerConfig: KaylaProviderConfig;
  kaylaConfig?: KaylaConfig;
  getClientIp?: () => string;
  consumeRequestAllowance?: () => Promise<boolean>;
  consumeAIAllowance?: () => Promise<boolean>;
}

function getConfig(kaylaConfig?: KaylaConfig): KaylaConfig {
  return kaylaConfig || createKaylaConfig();
}

/** Canonical answers can offer more than one route; older results carry one. */
function localActions(result?: KaylaKnowledgeResult) {
  if (result?.actions?.length) return result.actions;
  return result?.action ? [result.action] : undefined;
}

/**
 * Intents whose answers are settled facts or scope boundaries. A model must
 * not decide whether something is downloadable, what version is public, or
 * whether Kayla can report the weather — and calling one to restate a fact the
 * site already owns spends provider budget for nothing.
 */
const DETERMINISTIC_INTENTS = new Set([
  'availability', 'version', 'status', 'pricing', 'support', 'contact',
  'navigation', 'privacy', 'founder', 'assistant_identity', 'external_current',
  'private_info', 'unsupported_task'
]);

function deterministicAnswer(sources: KaylaKnowledgeResult[]): KaylaKnowledgeResult | undefined {
  const top = sources[0];
  if (!top || top.sourceType !== 'canonical') return undefined;
  if (top.settled) return top;
  return top.intent && DETERMINISTIC_INTENTS.has(top.intent) ? top : undefined;
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
  const verdict = verifyAgainstCanon(text);
  if (verdict.ok) return { accepted: true, kinds: [] };
  const kinds = [...new Set(verdict.violations.map((violation) => violation.kind))];
  logCanonRejection(kinds);
  return { accepted: false, kinds };
}


function localResponse(topResult?: KaylaKnowledgeResult) {
  return {
    answer: topResult?.snippet || "I couldn't find that in the current public FDS knowledge base.",
    actions: localActions(topResult),
    mode: 'local' as const,
    sources: topResult?.id ? [{ id: topResult.id, title: topResult.title, type: topResult.type, route: topResult.route }] : []
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
    return {
      status: 200,
      response: {
        answer: "I can't help with that request. I'm here to answer questions about Forger Digital Solutions, our projects, and public resources. How can I help you learn about FDS?",
        mode: 'local',
        sources: []
      }
    };
  }

  const localProvider = createProvider();
  let sources: KaylaKnowledgeResult[];
  try {
    sources = await localProvider.search(message, context, history);
  } catch {
    return {
      status: 200,
      response: {
        answer: "I'm having trouble accessing the FDS knowledge base right now. Please try again in a moment.",
        mode: 'local',
        sources: []
      }
    };
  }

  const settled = deterministicAnswer(sources);
  if (settled) {
    return { status: 200, response: localResponse(settled) };
  }

  if (!isAIEnabled(kaylaConfig)) {
    return { status: 200, response: localResponse(sources[0]) };
  }

  const aiProvider = createAIProvider(config.providerConfig);
  if (!aiProvider) {
    const topResult = sources[0];
    return {
      status: 200,
      response: {
        answer: topResult?.snippet || "I couldn't find that in the current public FDS knowledge base.",
        actions: localActions(topResult),
        mode: 'local',
        sources: topResult?.id ? [{ id: topResult.id, title: topResult.title, type: topResult.type, route: topResult.route }] : []
      }
    };
  }

  if (config.consumeAIAllowance && !(await config.consumeAIAllowance())) {
    const topResult = sources[0];
    return { status: 200, response: { answer: topResult?.snippet || "I couldn't find that in the current public FDS knowledge base.", actions: localActions(topResult), mode: 'local', sources: topResult?.id ? [{ id: topResult.id, title: topResult.title, type: topResult.type, route: topResult.route }] : [] } };
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
    if (!acceptGenerated(aiResponse.content).accepted) {
      return { status: 200, response: localResponse(sources[0]) };
    }

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
        }))
      }
    };
  } catch {
    const topResult = sources[0];
    return {
      status: 200,
      response: {
        answer: `Kayla's conversational AI is temporarily unavailable, but I can still search the FDS knowledge base.\n\n${topResult?.snippet || ''}`,
        actions: localActions(topResult),
        mode: 'local',
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
    yield JSON.stringify({
      content: "I can't help with that request. I'm here to answer questions about Forger Digital Solutions.",
      mode: 'local',
      done: true
    });
    return;
  }

  const localProvider = createProvider();
  const sources = await localProvider.search(message, context, history);

  const settled = deterministicAnswer(sources);
  if (settled) {
    yield JSON.stringify({ content: settled.snippet, actions: localActions(settled), mode: 'local', done: true });
    return;
  }

  if (!isAIEnabled(kaylaConfig)) {
    const topResult = sources[0];
    yield JSON.stringify({
      content: topResult?.snippet || "I couldn't find that in the current public FDS knowledge base.",
      actions: localActions(topResult),
      mode: 'local',
      done: true
    });
    return;
  }

  const aiProvider = createAIProvider(config.providerConfig);
  if (!aiProvider || !aiProvider.stream) {
    const topResult = sources[0];
    yield JSON.stringify({
      content: topResult?.snippet || "I couldn't find that in the current public FDS knowledge base.",
      actions: localActions(topResult),
      mode: 'local',
      done: true
    });
    return;
  }

  if (config.consumeAIAllowance && !(await config.consumeAIAllowance())) {
    const topResult = sources[0];
    yield JSON.stringify({ content: topResult?.snippet || "I couldn't find that in the current public FDS knowledge base.", actions: localActions(topResult), mode: 'local', done: true });
    return;
  }

  try {
    let providerFailed = false;
    let providerContentReceived = false;
    let bufferedText = '';
    const topResult = sources[0];

    for await (const chunk of aiProvider.stream({ message, history, context, sources })) {
      if (chunk.type === 'error') {
        providerFailed = true;
        break;
      }

      if (chunk.type === 'content' && chunk.content) {
        providerContentReceived = true;
        bufferedText += chunk.content;
      }

      if (chunk.type === 'done') {
        if (!providerContentReceived) {
          providerFailed = true;
        }
        break;
      }
    }

    if (providerFailed || !providerContentReceived) {
      const fallback = {
        content: `Kayla's conversational AI is temporarily unavailable, but I can still answer from the FDS knowledge base.\n\n${topResult?.snippet || ''}`,
        actions: localActions(topResult),
        mode: 'local',
        done: true,
        replace: true
      };
      yield JSON.stringify(fallback);
      return;
    }

    // Full buffer canonical verification: never stream unverified tokens to the visitor
    if (!acceptGenerated(bufferedText).accepted) {
      yield JSON.stringify({
        replace: true,
        content: topResult?.snippet || "I couldn't find that in the current public FDS knowledge base.",
        actions: localActions(topResult),
        mode: 'local',
        done: true
      });
      return;
    }

    // Verified output: safe to emit
    yield JSON.stringify({ mode: 'ai', actions: localActions(topResult) });
    yield JSON.stringify({ type: 'content', content: bufferedText });
    yield JSON.stringify({ type: 'done', done: true });
  } catch {
    const topResult = sources[0];
    yield JSON.stringify({
      content: `Kayla's conversational AI is temporarily unavailable, but I can still search the FDS knowledge base.\n\n${topResult?.snippet || ''}`,
      actions: localActions(topResult),
      mode: 'local',
      done: true,
      replace: true
    });
  }
}
