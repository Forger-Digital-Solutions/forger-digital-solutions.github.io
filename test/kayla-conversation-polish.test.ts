import { describe, it, expect } from 'vitest';
import { resolveConversation } from '../src/lib/kayla/conversation';
import { conversationAnswer, rankConversationActions } from '../src/lib/kayla/conversation-answer';
import { canonicalAnswer } from '../src/data/kayla/answers';
import { getFollowUpSuggestions } from '../src/components/KaylaCopilot';

/**
 * Conversation-UX polish regressions.
 *
 * Each case here reproduces a defect actually observed in a live production
 * conversation (not a hypothetical), found before any fix was written.
 */

describe('action labels name the entity actually being discussed', () => {
  it('does not offer a "Download / Try CodeForge" action for a ForgerEMS question', () => {
    // Live production served exactly this action label on a ForgerEMS
    // answer — a hardcoded literal, not parameterized by entity.
    const context = resolveConversation('Can I download ForgerEMS?', []);
    const composed = conversationAnswer(context) || [];
    const actions = rankConversationActions(context, composed[0]?.actions || []);
    for (const action of actions) {
      expect(action.label, JSON.stringify(actions)).not.toContain('CodeForge');
    }
    const forgedAction = actions.find((a) => a.href === '/forged');
    if (forgedAction) expect(forgedAction.label).toContain('ForgerEMS');
  });

  it('still offers a correctly-named download action for CodeForge itself', () => {
    const context = resolveConversation('Can I download CodeForge?', []);
    const composed = conversationAnswer(context) || [];
    const actions = rankConversationActions(context, composed[0]?.actions || []);
    const forgedAction = actions.find((a) => a.href === '/forged');
    expect(forgedAction?.label).toContain('CodeForge');
  });
});

describe('a "what version" question is not rewritten into an availability question', () => {
  it('keeps the clean version answer (no pasted URL) even when the question also says "public"', () => {
    // Live production answered this with "Yes. CodeForge is publicly
    // available and free... Downloads and version history are on GitHub
    // Releases: https://..." — the availability answer for a question that
    // was never about availability, because "public" matched the broader
    // availability-rewrite regex before version phrasing could win.
    const context = resolveConversation('What version of CodeForge is public?', []);
    const composed = conversationAnswer(context);
    const answer = composed?.[0]?.snippet ?? canonicalAnswer('What version of CodeForge is public?')?.text ?? '';
    expect(answer).not.toMatch(/https?:\/\//);
    expect(answer.toLowerCase()).toContain('v0.2.0');
  });
});

describe('the Kayla Copilot vs Kayla AI Publisher comparison speaks status in prose', () => {
  it('does not surface the raw ALL-CAPS status token', () => {
    const answer = canonicalAnswer('How is Kayla AI Publisher different from Kayla Copilot?');
    expect(answer?.text).not.toMatch(/ACTIVE DEVELOPMENT|PRIVATE DEVELOPMENT|RESEARCH\b/);
    expect(answer?.text.toLowerCase()).toContain('active development');
  });
});

describe('follow-up suggestions do not repeat the question just asked', () => {
  it('drops "How does it compare?" after a comparison question', () => {
    const followUps = getFollowUpSuggestions('How is ForgerEMS different from CodeForge?');
    expect(followUps.some((s) => /compare/i.test(s))).toBe(false);
  });

  it('still offers "How does it compare?" after a plain identity question', () => {
    const followUps = getFollowUpSuggestions('Tell me about CodeForge');
    expect(followUps).toContain('How does it compare?');
  });
});
