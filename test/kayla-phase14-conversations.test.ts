import { describe, it, expect } from 'vitest';
import { handleKaylaChat, streamKaylaChat } from '../src/lib/kayla/handler';
import { createKaylaConfig } from '../src/lib/kayla/config';
import { resolveConversation } from '../src/lib/kayla/conversation';
import { validateSafeAction } from '../src/lib/kayla/action-validator';
import { buildGroundingPacket, verifyGroundedSlots } from '../src/lib/kayla/grounding';
import { conversationCases } from './kayla/conversations';
import type { KaylaChatResponse, KaylaConversationMessage, KaylaPageContext } from '../src/data/kayla/types';

const endpoint = () => ({
  providerConfig: { provider: 'openrouter', model: 'openrouter/free', apiKey: 'test-only' },
  kaylaConfig: { ...createKaylaConfig({}), enabled: true },
  consumeRequestAllowance: async () => true,
  consumeAIAllowance: async () => false
});
describe('Phase 14 conversation goldens', () => {
  for (const scenario of conversationCases) it(`${scenario.category}: ${scenario.name}`, async () => {
    const history: KaylaConversationMessage[] = [];
    const page: KaylaPageContext = { route: scenario.page || '/', pageType: scenario.page?.startsWith('/projects/') ? 'project' : 'home' };
    for (const turn of scenario.turns) {
      const bounded = history.slice(-10);
      const context = resolveConversation(turn.message, bounded, page);
      if (turn.entity) expect(context.entities, turn.message).toEqual([turn.entity]);
      if (turn.clarify !== undefined) expect(context.needsClarification, turn.message).toBe(turn.clarify);
      const result = await handleKaylaChat({ message: turn.message, history: bounded, context: page }, endpoint());
      expect(result.status).toBe(200);
      const answer = result.response as KaylaChatResponse;
      for (const fact of turn.includes || []) expect(answer.answer.toLowerCase(), turn.message).toContain(fact.toLowerCase());
      for (const fact of turn.excludes || []) expect(answer.answer.toLowerCase(), turn.message).not.toContain(fact.toLowerCase());
      if (turn.action) expect(answer.actions?.[0]?.href, turn.message).toBe(turn.action);
      if (turn.clarify) expect(answer.answer).toMatch(/\?/);
      expect(answer.answer.length).toBeLessThanOrEqual(8000);
      expect(answer.actions?.length || 0).toBeLessThanOrEqual(3);
      for (const action of answer.actions || []) expect(validateSafeAction(action, { strictCanonical: true }).valid).toBe(true);
      history.push({ role: 'user', content: turn.message }, { role: 'assistant', content: answer.answer.slice(0, 2000) });
    }
  });
});

describe('context bounds and isolation', () => {
  for (const count of [10, 25, 50]) it(`${count} simultaneous independent conversations`, async () => {
    await Promise.all(Array.from({ length: count }, async (_, i) => {
      const name = i % 2 ? 'GEMS' : 'CodeForge';
      const history: KaylaConversationMessage[] = [{ role: 'user', content: `Tell me about ${name}.` }];
      const result = await handleKaylaChat({ message: 'Can I download it?', history }, endpoint());
      const response = result.response as KaylaChatResponse;
      expect(response.answer).toContain(name);
      expect(response.actions?.[0]?.href).toBe(i % 2 ? '/projects/gems-training-grounds' : '/forged');
    }));
  });
  it('forgets entities outside the bounded window', () => {
    const history: KaylaConversationMessage[] = [{ role: 'user', content: 'CodeForge' }, ...Array.from({ length: 10 }, () => ({ role: 'user' as const, content: 'okay' }))];
    const resolved = resolveConversation('Can I use it?', history);
    expect(resolved.entities).toEqual([]);
    expect(resolved.needsClarification).toBe(true);
  });
  it('does not trust contradictory page entity metadata', () => {
    const resolved = resolveConversation('Is this available?', [], { route: '/missing', pageType: 'project', entity: 'codeforge' });
    expect(resolved.needsClarification).toBe(true);
  });
  it('normalizes a duplicate current user turn sent by older clients', () => {
    const history: KaylaConversationMessage[] = [{ role: 'user', content: 'CodeForge and GEMS' }, { role: 'assistant', content: 'CodeForge and GEMS are FDS projects.' }, { role: 'user', content: 'Can I download it?' }];
    expect(resolveConversation('Can I download it?', history).needsClarification).toBe(true);
  });
  it('stream and JSON clarify consistently and never spend allowance', async () => {
    const body = { message: 'Can I download it?', history: [{ role: 'user', content: 'CodeForge and GEMS' }] };
    let allowances = 0;
    const config = { ...endpoint(), consumeAIAllowance: async () => { allowances++; return false; } };
    const json = await handleKaylaChat(body, config);
    const chunks: Record<string, unknown>[] = [];
    for await (const chunk of streamKaylaChat(body, config)) chunks.push(JSON.parse(chunk));
    expect(chunks.map(c => c.content || '').join('')).toBe((json.response as KaylaChatResponse).answer);
    expect(allowances).toBe(0);
  });
});

describe('grounded slot guard', () => {
  const packet = buildGroundingPacket([{
    id: 'codeforge',
    sourceType: 'canonical',
    title: 'CodeForge',
    snippet: 'CodeForge is a released, downloadable developer tool for Windows, with public documentation.',
    route: '/projects/codeforge'
  }]);
  it.each([
    ['invented version', 'CodeForge is available in v9.9.9.'],
    ['invented price', 'CodeForge costs $499.'],
    ['invented date', 'CodeForge will launch next month.'],
    ['invented platform', 'CodeForge is available on PlayStation.'],
    ['invented model', 'CodeForge is powered by GPT-9.'],
    ['unapproved route', 'Download it at /admin/secrets.']
  ])('rejects %s', (_name, answer) => {
    const verdict = verifyGroundedSlots(answer, packet);
    expect(verdict.ok).toBe(false);
    expect(verdict.kinds.length).toBeGreaterThan(0);
  });
  it('keeps grounded canonical slots', () => {
    expect(verifyGroundedSlots('CodeForge is a released developer tool. See /projects/codeforge.', packet).ok).toBe(true);
  });
});
