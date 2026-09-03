import type { KaylaKnowledgeProvider, KaylaKnowledgeResult, KaylaSafeAction, KaylaAIProvider, KaylaAIRequest } from '../../data/kayla/types';
import { LocalKaylaProvider, kaylaKnowledge } from '../../data/kayla/index';
import { evaluateModelPolicy, isApprovedProviderEndpoint, OPENROUTER_ENDPOINT, OPENROUTER_FREE_MODEL } from './model-policy';
import { buildChatMessages } from './systemPrompt';

/** Bounds the response so a simple question cannot produce an unbounded essay. */
const MAX_RESPONSE_TOKENS = 700;

function preferredActions(sources: KaylaKnowledgeResult[]): KaylaSafeAction[] | undefined {
  const top = sources[0];
  if (!top) return undefined;
  if (top.actions?.length) return top.actions;
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
}

export function createAIProvider(config: KaylaProviderConfig): KaylaAIProvider | null {
  const providerId = config.provider?.toLowerCase();

  if (!providerId || providerId === 'none') {
    return null;
  }

  if (providerId === 'mock' || providerId === 'test') {
    return new MockAIProvider();
  }

  if (providerId === 'openrouter') {
    const policy = evaluateModelPolicy(providerId, config.model || OPENROUTER_FREE_MODEL);
    if (!policy.eligible || !isApprovedProviderEndpoint(providerId, config.endpoint)) return null;
    return new OpenRouterAIProvider(config);
  }

  return null;
}

class MockAIProvider implements KaylaAIProvider {
  id = 'mock';
  name = 'Mock Provider';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async chat(request: { message: string; sources: KaylaKnowledgeResult[] }): Promise<{ content: string; actions?: KaylaSafeAction[] }> {
    const sourceTexts = request.sources.slice(0, 3).map(s => `[${s.title}] ${s.snippet}`).join('\n\n');
    return {
      content: `[Mock AI] I found ${request.sources.length} relevant sources about your question. Here is what the FDS knowledge base says:\n\n${sourceTexts || 'No specific sources found.'}`,
      actions: request.sources[0]?.action ? [request.sources[0].action] : undefined
    };
  }

  async *stream(request: { message: string; sources: KaylaKnowledgeResult[] }): AsyncIterable<{ type: 'content' | 'done' | 'error'; content?: string; error?: string }> {
    const response = await this.chat(request);
    const words = response.content.split(' ');
    for (const word of words) {
      yield { type: 'content', content: word + ' ' };
    }
    yield { type: 'done' };
  }
}

class OpenRouterAIProvider implements KaylaAIProvider {
  id = 'openrouter';
  name = 'OpenRouter';
  private config: KaylaProviderConfig;

  constructor(config: KaylaProviderConfig) {
    this.config = config;
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.config.apiKey);
  }

  async chat(request: KaylaAIRequest): Promise<{ content: string; actions?: KaylaSafeAction[] }> {
    if (!this.config.apiKey) {
      throw new Error('NO_PROVIDER');
    }

    const endpoint = OPENROUTER_ENDPOINT;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs || 12000);

    let response: Response;
    try { response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': 'https://forger-digital-solutions.github.io',
        'X-Title': 'Kayla Copilot - FDS'
      },
      body: JSON.stringify({
        model: this.config.model || OPENROUTER_FREE_MODEL,
        messages: buildChatMessages(request),
        max_tokens: MAX_RESPONSE_TOKENS
      }),
      signal: controller.signal
    }); } catch (error) {
      clearTimeout(timeout);
      if (controller.signal.aborted) throw new Error('TIMEOUT');
      throw new Error('NETWORK_FAILURE');
    }

    if (!response.ok) {
      clearTimeout(timeout);
      if (response.status === 401 || response.status === 403) {
        throw new Error('AUTH_FAILURE');
      }
      if (response.status === 429) {
        throw new Error('RATE_LIMITED');
      }
      if (response.status === 402) {
        throw new Error('QUOTA_EXHAUSTED');
      }
      throw new Error('PROVIDER_FAILURE');
    }

    let data: { choices?: { message?: { content?: string } }[] };
    try {
      data = await response.json() as { choices?: { message?: { content?: string } }[] };
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

    return { content, actions: preferredActions(request.sources) };
  }

  async *stream(request: KaylaAIRequest): AsyncIterable<{ type: 'content' | 'done' | 'error'; content?: string; error?: string }> {
    if (!this.config.apiKey) {
      yield { type: 'error', error: 'NO_PROVIDER' };
      return;
    }

    const endpoint = OPENROUTER_ENDPOINT;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs || 12000);

    let response: Response;
    try { response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': 'https://forger-digital-solutions.github.io',
        'X-Title': 'Kayla Copilot - FDS'
      },
      body: JSON.stringify({
        model: this.config.model || OPENROUTER_FREE_MODEL,
        messages: buildChatMessages(request),
        max_tokens: MAX_RESPONSE_TOKENS,
        stream: true
      }),
      signal: controller.signal
    }); } catch {
      clearTimeout(timeout);
      yield { type: 'error', error: controller.signal.aborted ? 'TIMEOUT' : 'NETWORK_FAILURE' };
      return;
    }

    if (!response.ok) {
      clearTimeout(timeout);
      if (response.status === 401 || response.status === 403) {
        yield { type: 'error', error: 'AUTH_FAILURE' };
      } else if (response.status === 429) {
        yield { type: 'error', error: 'RATE_LIMITED' };
      } else if (response.status === 402) {
        yield { type: 'error', error: 'QUOTA_EXHAUSTED' };
      } else {
        yield { type: 'error', error: 'PROVIDER_FAILURE' };
      }
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
