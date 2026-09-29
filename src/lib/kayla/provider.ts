import type { KaylaKnowledgeProvider, KaylaKnowledgeResult, KaylaSafeAction, KaylaAIProvider, KaylaAIRequest, KaylaAIResponse, KaylaRouteSpec } from '../../data/kayla/types';
import { LocalKaylaProvider, kaylaKnowledge } from '../../data/kayla/index';
import { evaluateModelPolicy, evaluateRoutePolicy, isApprovedProviderEndpoint, endpointForProvider, providerHeaders, OPENROUTER_ENDPOINT, OPENROUTER_FREE_MODEL } from './model-policy';
import { buildChatMessages } from './systemPrompt';
import { dedupeActions } from './actions';

/** Bounds the response so a simple question cannot produce an unbounded essay. */
const MAX_RESPONSE_TOKENS = 700;

/**
 * Map an upstream HTTP status to a stable error code, carrying the status
 * itself after a colon. Phase 6 collapsed every non-401/403/429/402 status into
 * a bare "PROVIDER_FAILURE", which meant a dead model id, a bad request, and a
 * provider outage were indistinguishable in production — the exact reason the
 * Phase 6 live-provider gap could only be guessed at. The status is a bare
 * integer: it carries no key, header, or response body.
 */
export function providerErrorCode(status: number): string {
  if (status === 401 || status === 403) return `AUTH_FAILURE:${status}`;
  if (status === 429) return `RATE_LIMITED:${status}`;
  if (status === 402) return `QUOTA_EXHAUSTED:${status}`;
  if (status === 404) return `MODEL_UNAVAILABLE:${status}`;
  return `PROVIDER_FAILURE:${status}`;
}

function preferredActions(sources: KaylaKnowledgeResult[]): KaylaSafeAction[] | undefined {
  const top = sources[0];
  if (!top) return undefined;
  if (top.actions?.length) return dedupeActions(top.actions);
  return top.action ? [top.action] : undefined;
}

export { kaylaKnowledge };

export function createProvider(): KaylaKnowledgeProvider {
  return new LocalKaylaProvider();
}

export interface KaylaProviderConfig {
  provider?: string;
  model?: string;
  apiKey?: string;
  endpoint?: string;
  timeoutMs?: number;
  /**
   * Kayla 2.0 — the admitted route chain, ordered primary-first. When set it
   * supersedes the single provider/model/apiKey triple, which remains for
   * backward compatibility with tests and older endpoint configs.
   */
  routes?: KaylaRouteSpec[];
}

/**
 * Build the single-provider case. Mock/test stay special-cased; every real
 * provider goes through the same admission policy and the shared
 * OpenAI-compatible transport.
 */
export function createAIProvider(config: KaylaProviderConfig): KaylaAIProvider | null {
  const providerId = config.provider?.toLowerCase();

  if (!providerId || providerId === 'none') {
    return null;
  }

  if (providerId === 'mock' || providerId === 'test') {
    return new MockAIProvider();
  }

  const model = config.model || (providerId === 'openrouter' ? OPENROUTER_FREE_MODEL : '');
  const policy = evaluateModelPolicy(providerId, model);
  if (!policy.eligible || !isApprovedProviderEndpoint(providerId, config.endpoint)) return null;
  return new OpenAICompatibleProvider({
    id: `${providerId}:${model}`,
    provider: providerId,
    model,
    apiKey: config.apiKey,
    endpoint: config.endpoint
  }, config.timeoutMs);
}

export interface KaylaChainRoute {
  route: KaylaRouteSpec;
  provider: KaylaAIProvider;
}

/**
 * Build the ordered failover chain. Admission happens per route — provider
 * approved, model on the verified-free list, key present — and ineligible
 * routes drop out silently from the caller's perspective: the rest of the
 * chain still serves. The caller reports the admitted vs configured count in
 * diagnostics so a bad entry is visible to operators, never to visitors.
 */
export function createProviderChain(config: KaylaProviderConfig): KaylaChainRoute[] {
  if (!config.routes?.length) {
    const single = createAIProvider(config);
    if (!single) return [];
    const singleRoute: KaylaRouteSpec = {
      id: `${config.provider}:${config.model}`,
      provider: config.provider || '',
      model: config.model || '',
      apiKey: config.apiKey,
      endpoint: config.endpoint
    };
    return [{ route: singleRoute, provider: single }];
  }

  const chain: KaylaChainRoute[] = [];
  for (const route of config.routes) {
    const providerId = route.provider.toLowerCase();
    let provider: KaylaAIProvider | null = null;
    if (providerId === 'mock' || providerId === 'test') {
      provider = new MockAIProvider();
    } else {
      const policy = evaluateRoutePolicy(route);
      if (!policy.eligible || !isApprovedProviderEndpoint(providerId, route.endpoint)) continue;
      provider = new OpenAICompatibleProvider(route, config.timeoutMs);
    }
    chain.push({ route, provider });
  }
  return chain;
}

class MockAIProvider implements KaylaAIProvider {
  id = 'mock';
  name = 'Mock Provider';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async chat(request: KaylaAIRequest): Promise<KaylaAIResponse> {
    const sourceTexts = request.sources.slice(0, 3).map(s => `[${s.title}] ${s.snippet}`).join('\n\n');
    return {
      content: `[Mock AI] I found ${request.sources.length} relevant sources about your question. Here is what the FDS knowledge base says:\n\n${sourceTexts || 'No specific sources found.'}`,
      actions: request.sources[0]?.action ? [request.sources[0].action] : undefined,
      resolvedModel: 'mock-model'
    };
  }

  async *stream(request: KaylaAIRequest): AsyncIterable<{ type: 'content' | 'done' | 'error'; content?: string; error?: string }> {
    const response = await this.chat(request);
    const words = response.content.split(' ');
    for (const word of words) {
      yield { type: 'content', content: word + ' ' };
    }
    yield { type: 'done' };
  }
}

/**
 * Shared transport for every OpenAI-compatible upstream Kayla uses: Groq,
 * OpenRouter, and the Gemini OpenAI-compat endpoint all speak the same
 * /chat/completions wire. Differences live in route config (endpoint, extra
 * headers), not in code paths, so a new admitted route is data, not a new
 * provider class.
 */
class OpenAICompatibleProvider implements KaylaAIProvider {
  id: string;
  name: string;
  private route: KaylaRouteSpec;
  private timeoutMs?: number;

  constructor(route: KaylaRouteSpec, timeoutMs?: number) {
    this.route = route;
    this.id = route.id;
    this.name = 'Kayla inference route';
    this.timeoutMs = timeoutMs;
  }

  private endpoint(): string {
    return endpointForProvider(this.route.provider) || this.route.endpoint || OPENROUTER_ENDPOINT;
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.route.apiKey}`,
      ...providerHeaders(this.route.provider)
    };
  }

  private requestBody(request: KaylaAIRequest, stream: boolean): string {
    return JSON.stringify({
      model: this.route.model,
      messages: buildChatMessages(request),
      max_tokens: MAX_RESPONSE_TOKENS,
      temperature: 0.3,
      ...(stream ? { stream: true } : {})
    });
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.route.apiKey);
  }

  async chat(request: KaylaAIRequest): Promise<{ content: string; actions?: KaylaSafeAction[]; resolvedModel?: string }> {
    if (!this.route.apiKey) {
      throw new Error('NO_PROVIDER');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs || 9000);

    let response: Response;
    try { response = await fetch(this.endpoint(), {
      method: 'POST',
      headers: this.headers(),
      body: this.requestBody(request, false),
      signal: controller.signal
    }); } catch (error) {
      clearTimeout(timeout);
      if (controller.signal.aborted) throw new Error('TIMEOUT');
      throw new Error('NETWORK_FAILURE');
    }

    if (!response.ok) {
      clearTimeout(timeout);
      throw new Error(providerErrorCode(response.status));
    }

    let data: { choices?: { message?: { content?: string } }[]; model?: string };
    try {
      data = await response.json() as { choices?: { message?: { content?: string } }[]; model?: string };
    } catch {
      if (controller.signal.aborted) throw new Error('TIMEOUT');
      throw new Error('MALFORMED_RESPONSE');
    } finally {
      clearTimeout(timeout);
    }
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('MALFORMED_RESPONSE');
    }

    // Phase 9: capture the underlying model OpenRouter actually used, when it
    // exposes it in the response body. Never log prompt or answer content.
    const resolvedModel = typeof data.model === 'string' && data.model.length > 0 ? data.model : undefined;

    return { content, actions: preferredActions(request.sources), resolvedModel };
  }

  async *stream(request: KaylaAIRequest): AsyncIterable<{ type: 'content' | 'done' | 'error'; content?: string; error?: string }> {
    if (!this.route.apiKey) {
      yield { type: 'error', error: 'NO_PROVIDER' };
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs || 9000);

    let response: Response;
    try { response = await fetch(this.endpoint(), {
      method: 'POST',
      headers: this.headers(),
      body: this.requestBody(request, true),
      signal: controller.signal
    }); } catch {
      clearTimeout(timeout);
      yield { type: 'error', error: controller.signal.aborted ? 'TIMEOUT' : 'NETWORK_FAILURE' };
      return;
    }

    if (!response.ok) {
      clearTimeout(timeout);
      yield { type: 'error', error: providerErrorCode(response.status) };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      clearTimeout(timeout);
      yield { type: 'error', error: 'MALFORMED_RESPONSE' };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            yield { type: 'done' };
            return;
          }
          try {
            const parsed = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield { type: 'content', content };
            }
          } catch {
            continue;
          }
        }
      }
    } catch {
      yield { type: 'error', error: controller.signal.aborted ? 'TIMEOUT' : 'NETWORK_FAILURE' };
      return;
    } finally {
      clearTimeout(timeout);
    }

    yield { type: 'done' };
  }
}
