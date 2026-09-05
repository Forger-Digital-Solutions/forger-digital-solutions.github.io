import { entities as catalogue, matchEntities, getKaylaEntity, normalize } from '../../data/kayla/entities';
import { classifyIntent, type KaylaIntent } from '../../data/kayla/intents';
import type { KaylaConversationMessage, KaylaPageContext } from '../../data/kayla/types';
import { isPromptInjectionAttempt } from './validate';
import { canonicalAnswer } from '../../data/kayla/answers';

export interface ConversationContext {
  rawQuery: string;
  resolvedQuery: string;
  entities: string[];
  recentEntities: string[];
  candidates: string[];
  needsClarification: boolean;
  intent: KaylaIntent;
  goal: 'learn' | 'try' | 'download' | 'support' | 'compare' | 'unknown';
  audience: 'general' | 'developer' | 'simple';
  depth: number;
  followUp: boolean;
  corrected: boolean;
  history: KaylaConversationMessage[];
}

// "that"/"this" as a bare demonstrative ("is that available?") refers back to
// a prior entity; as a relative pronoun opening a restrictive clause
// ("projects that have no download today") it names no entity at all — the
// negative lookahead tells the two apart so ordinary prose isn't mistaken for
// an unresolved reference.
const REFERENTIAL = /\b(it|its|that(?!\s+(?:have|has|is|are|was|were|can|could|will|would|do|does|did|includes?|contains?|works?|runs?|supports?))|this(?!\s+(?:have|has|is|are|was|were|can|could|will|would|do|does|did|includes?|contains?|works?|runs?|supports?))|them|both|those|these|they|which one|other (one|project)|one you mentioned)\b/i;
const FOLLOWUP = /^(?:(?:okay|ok|and|but)\s+)*(?:why|how|and|more|what else|tell me more|go deeper|keep going|explain it simply|what do you mean|who is it for|why would i use that|would i use that|okay show me)[?.!\s]*$/i;
const DEEP = /\b(tell me more|more|go deeper|keep going|how (does|do)|how|why|what else)\b/i;
const BOUNDARY = new Set<KaylaIntent>(['private_info', 'external_current', 'unsupported_task', 'privacy', 'assistant_identity']);
const name = (id: string) => getKaylaEntity(id)?.name || id;

/** Explicit correction is scoped to the clause it negates, never a bag of words. */
function positiveClause(text: string): string {
  const correction = text.match(/\b(?:i (?:mean|meant)|actually|instead|rather)\s+(.+)$/i);
  if (correction && matchEntities(correction[1]).length) return correction[1];
  return text.replace(/\b(?:not|don't|do not)\s+[^,;—]+[,;—]\s*/gi, '');
}

function mentioned(text: string): string[] {
  const q = positiveClause(text).replace(/\bG\.?E\.?M\.?S\./gi, 'GEMS');
  const hits = matchEntities(q);
  // Preserve mention order for first/second selection, rather than alias length.
  const found = hits.sort((a, b) => normalize(q).indexOf(a.matched) - normalize(q).indexOf(b.matched)).map(m => m.entityId);
  if (/\bwhich gems?\b/i.test(q)) {
    const selected = canonicalAnswer(q)?.entityId;
    if (selected?.startsWith('gem-')) return [selected];
  }
  if (!found.length && /\b(?:the )?coding (?:one|project|thing|tool)\b/i.test(q)) found.push('codeforge');
  if (!found.length && /\b(?:the )?(?:model|training) (?:one|project|thing)\b/i.test(q)) found.push('gems-training-grounds');
  return [...new Set(found)].slice(0, 4);
}

function goalFor(q: string): ConversationContext['goal'] {
  if (/\b(?:don't|do not)\b.*\bdownload\b.*\blearn\b/i.test(q)) return 'learn';
  if (/\b(support|help|donate|contribute)\b/i.test(q)) return 'support';
  if (/\b(download|where .*get|where .*find)\b/i.test(q)) return 'download';
  if (/\b(try|use|usable|get it|start with)\b/i.test(q)) return 'try';
  if (/\b(compare|comparison|versus|vs)\b/i.test(q)) return 'compare';
  if (/\b(learn|read|explore)\b/i.test(q)) return 'learn';
  return 'unknown';
}

/** Stateless replay of at most ten messages. Text can select public IDs, never facts. */
export function resolveConversation(message: string, supplied: KaylaConversationMessage[] = [], page?: KaylaPageContext): ConversationContext {
  const history = supplied.slice(-10).map(h => ({ role: h.role, content: h.content.slice(0, 2000) }));
  // Older clients include the current message in history. Do not replay it twice.
  if (history.at(-1)?.role === 'user' && history.at(-1)?.content.trim() === message.trim()) history.pop();
  let active: string[] = [];
  let recent: string[] = [];
  let pending: { candidates: string[]; question: string } | undefined;
  let goal: ConversationContext['goal'] = 'unknown';
  let audience: ConversationContext['audience'] = 'general';
  let depth = 0;
  let previousQuestion = '';
  for (let i = 0; i < history.length; i++) {
    const turn = history[i];
    if (isPromptInjectionAttempt(turn.content)) continue;
    if (turn.role === 'assistant') {
      // Recognize only our bounded clarification form, not arbitrary assistant instructions.
      if (/^Do you mean .+\?$/i.test(turn.content.trim())) {
        pending = { candidates: mentioned(turn.content), question: previousQuestion };
      } else if (!active.length && previousQuestion && /\b(developer|websites|new here|should i look|should i try)\b/i.test(previousQuestion)) {
        // A recommendation's first sentence can nominate a referent. Its facts are never reused.
        const first = mentioned(turn.content.split(/[.!?]\s|\n/)[0]);
        if (first.length === 1) { active = first; recent = [...new Set([...first, ...recent])].slice(0, 4); }
      }
      continue;
    }
    // Failed/cancelled turns carry no conversational authority.
    const next = history[i + 1];
    if (next?.role === 'assistant' && /^(Response cancelled\.|Kayla (?:has received|is temporarily)|Kayla's live service)/.test(next.content)) continue;
    const turnGoal = goalFor(turn.content);
    if (turnGoal !== 'unknown') goal = turnGoal;
    if (/\b(not technical|nontechnical|don't code|do not code|explain .*simply)\b/i.test(turn.content)) audience = 'simple';
    else if (/\b(i.?m a developer|i am a developer|i build websites)\b/i.test(turn.content)) audience = 'developer';
    let ids = mentioned(turn.content);
    if (!ids.length && audience === 'developer' && /\b(should|try|look at|show me|actually use)\b/i.test(turn.content)) ids = ['codeforge'];
    if (pending) {
      const ordinal = /\b(first|second)\b/i.exec(turn.content)?.[1].toLowerCase();
      if (!ids.length && ordinal) ids = pending.candidates[ordinal === 'first' ? 0 : 1] ? [pending.candidates[ordinal === 'first' ? 0 : 1]] : [];
      pending = undefined;
    }
    if (ids.length) { active = ids; recent = [...new Set([...ids, ...recent])].slice(0, 4); depth = 0; }
    else if (BOUNDARY.has(classifyIntent(turn.content))) active = [];
    else if (DEEP.test(turn.content)) depth = Math.min(3, depth + 1);
    previousQuestion = turn.content;
  }

  const rawQuery = message;
  let query = positiveClause(message);
  const corrected = query !== message || /\b(no,? i meant|actually)\b/i.test(message);
  let ids = mentioned(query);
  const explicit = ids.length > 0;
  const followUp = FOLLOWUP.test(query.trim()) || REFERENTIAL.test(query);
  const intent = classifyIntent(query);
  const currentGoal = goalFor(query);
  if (currentGoal !== 'unknown') goal = currentGoal;
  if (/\b(not technical|nontechnical|don't code|do not code|simply|simple terms)\b/i.test(query)) audience = 'simple';
  else if (/\b(i.?m a developer|i am a developer|i build websites)\b/i.test(query)) audience = 'developer';

  if (pending) {
    const ordinal = /\b(first|second)\b/i.exec(query)?.[1].toLowerCase();
    const selected = ids.length === 1 && pending.candidates.includes(ids[0]) ? ids[0]
      : ordinal ? pending.candidates[ordinal === 'first' ? 0 : 1] : undefined;
    if (selected && (normalize(query).split(' ').length <= 7 || corrected)) {
      ids = [selected];
      query = `${pending.question} ${name(selected)}`;
    }
  }

  const plural = /\b(both|them|those|these|they|which one|which (?:of|project)|the two)\b/i.test(query);
  const comparison = intent === 'comparison' || /\b(same thing|different|compare|relationship)\b/i.test(query);
  let candidates: string[] = [];
  if (!BOUNDARY.has(intent) && !isPromptInjectionAttempt(message)) {
    if (/\bother (?:one|project|ai project)\b/i.test(query)) {
      const other = recent.filter(id => !active.includes(id));
      if (other.length === 1) ids = other;
      else candidates = other.length ? other : recent;
    } else if (!ids.length && /\b(?:the )?ai (?:one|thing|side|project)\b/i.test(query)) {
      const ai = [...new Set([...active, ...recent])].filter(id => ['codeforge', 'gems-training-grounds', 'kayla-copilot', 'kayla-ai-publisher', 'kyrablox'].includes(id));
      if (ai.length === 1) ids = ai;
      else candidates = ai.length ? ai : ['codeforge', 'gems-training-grounds'];
    } else if (!ids.length && followUp) {
      const scope = (plural || comparison) && recent.length > 1 ? recent.slice(0, 2) : active;
      if (scope.length === 1 || ((plural || comparison) && scope.length > 1)) ids = scope;
      else candidates = scope;
      if (!scope.length) {
        const route = page?.route.replace(/\/+$/, '') || '/';
        const mapped = catalogue.filter(e => e.kind === 'project' && e.route === route);
        if (mapped.length === 1) ids = [mapped[0].id];
        else if (route === '/about') ids = ['fds'];
      }
    } else if (ids.length === 1 && comparison && active.some(id => id !== ids[0])) {
      ids = [...ids, ...active.filter(id => id !== ids[0])].slice(0, 2);
    }
  }

  // Developer discovery is an explicit stated activity, not inferred profiling.
  if (!ids.length && audience === 'developer' && /\b(should|try|look at|show me|actually use)\b/i.test(query)) ids = ['codeforge'];
  const needsClarification = !BOUNDARY.has(intent) && intent !== 'founder' && !isPromptInjectionAttempt(message) && (candidates.length > 0 || (!ids.length && followUp));
  if (needsClarification) ids = [];
  if (explicit && !followUp) depth = 0;
  if (DEEP.test(query) && followUp) depth = Math.min(3, depth + 1);
  const resolvedQuery = ids.length && (followUp || corrected || !explicit || query !== message)
    ? `${query} ${ids.map(name).join(' and ')}`.slice(0, 2400) : query;
  return { rawQuery, resolvedQuery, entities: ids, recentEntities: recent, candidates, needsClarification, intent: classifyIntent(query), goal, audience, depth, followUp, corrected, history };
}
