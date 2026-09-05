import { canonicalAnswer, type CanonicalAnswer } from '../../data/kayla/answers';
import { getKaylaEntity } from '../../data/kayla/entities';
import { getCanonicalEntity } from '../../data/kayla/canonical-registry';
import { projects } from '../../data/projects';
import { products } from '../../data/products';
import type { KaylaKnowledgeResult, KaylaSafeAction, KaylaPageContext } from '../../data/kayla/types';
import type { ConversationContext } from './conversation';
import { validateSafeAction } from './action-validator';

function result(answer: CanonicalAnswer, id?: string): KaylaKnowledgeResult {
  const entity = id ? getKaylaEntity(id) : undefined;
  return { type: 'general', title: entity?.name || answer.title || 'FDS', snippet: answer.text, id: answer.sources[0], route: entity?.route,
    sourceType: 'canonical', score: 100, intent: answer.intent, settled: answer.settled, actions: answer.actions, action: answer.actions?.[0] };
}

function local(text: string, intent: CanonicalAnswer['intent'] = 'identity', id?: string): KaylaKnowledgeResult {
  return result({ text, intent, sources: id ? [id] : [], settled: true }, id);
}

/**
 * A relationship answer may only speak for the entities actually in play.
 * Looking one up by the resolved query text can drift to a neighbouring
 * record — "Which one should I start with?" over CodeForge and GEMS returned
 * a Peridot comparison in production — so any entity it names must already
 * be one of the subjects the conversation resolved.
 */
function relationshipCovers(answer: CanonicalAnswer | undefined, ids: string[]): boolean {
  if (!answer) return false;
  return (answer.sources || [])
    .map(source => source.replace(/^app-/, ''))
    .filter(source => Boolean(getKaylaEntity(source)))
    .every(id => ids.includes(id));
}

/** Compose only public canonical records. History contributes relevance, never answer text. */
export function conversationAnswer(c: ConversationContext): KaylaKnowledgeResult[] | undefined {
  if (c.needsClarification) return [local(c.candidates.length
    ? `Do you mean ${c.candidates.map(id => getKaylaEntity(id)?.name).join(' or ')}?`
    : "I don't have a project in context yet. Which FDS project do you mean?")];
  const q = c.resolvedQuery;
  const raw = c.rawQuery;
  if (['private_info', 'external_current', 'unsupported_task', 'privacy', 'assistant_identity'].includes(c.intent)) return undefined;
  const ids = c.entities;
  const id = ids[0];
  const name = id ? getKaylaEntity(id)?.name : undefined;
  const entityKind = id ? getKaylaEntity(id)?.kind : undefined;
  const p = projects.find(p => p.slug === id);
  const product = products.find(p => (p.projectSlug || p.slug) === id);
  if (/\b(beats?|outperform|parity|cancelled|he do that|she do that|found|v\d)\b/i.test(raw)) {
    const guarded = canonicalAnswer(q, undefined, c.history);
    if (guarded?.settled) return [result(guarded, id)];
  }

  if (/\b(grounding packet|internal budget|worker version|certification receipt|private road ?map|hidden context)\b/i.test(raw)) {
    return [local('I only discuss information FDS has published for visitors. I can help with project descriptions, current availability, and public plans.', 'private_info')];
  }
  if (/\b(do you remember me|are my chats saved|do you save|remember me from)\b/i.test(raw)) {
    const answer = canonicalAnswer('What is your privacy policy?');
    return answer ? [result(answer)] : undefined;
  }
  if (/\b(what model are you|do you know everything)\b/i.test(raw)) return [local('I am Kayla Copilot, the FDS website guide. I work from public FDS information and cannot answer every question or provide undocumented model details.', 'assistant_identity', 'kayla-copilot')];

  if (c.goal === 'support' && !id && /\b(help|support|money go|donat|contribut)/i.test(raw)) {
    // The raw turn can carry its own nuance (e.g. a named hardware item) that a
    // generic goal-continuation phrase would lose; prefer it when it already
    // resolves to a support answer, and only fall back to the generic prompt
    // for turns like "Where does the money go?" that carry none on their own.
    const specific = canonicalAnswer(raw);
    const answer = (specific?.intent === 'support' ? specific : undefined) || canonicalAnswer('How can I support FDS?');
    return answer ? [result(answer, 'support')] : undefined;
  }
  if (c.goal === 'learn' && !id && /\blearn more first\b/i.test(raw)) {
    const answer = canonicalAnswer('What is FDS?');
    return answer ? [{ ...result(answer, 'fds'), settled: true }] : undefined;
  }
  if (/\b(who are you guys)\b/i.test(raw)) {
    const answer = canonicalAnswer('What is FDS?');
    return answer ? [{ ...result(answer, 'fds'), settled: true }] : undefined;
  }

  // A named but undocumented platform is an unknown, not evidence of support or incompatibility.
  if (id && /\b(support|runs? on|work on|compatible)\b/i.test(raw) && /\b(playstation|xbox|switch|linux|macos|mac|android|ios)\b/i.test(raw)) {
    const platform = raw.match(/\b(playstation|xbox|switch|linux|macos|mac|android|ios)\b/i)![0];
    if (!product?.platform.some(value => value.toLowerCase().includes(platform.toLowerCase()))) {
      return [local(`I don't have a published FDS answer about ${name} support for ${platform}. Check the project's published requirements before choosing it.`, 'capability', id)];
    }
  }
  if (id && /\b(coming out|launch date|release date|when .*launch|when .*release)\b/i.test(raw)) {
    const answer = canonicalAnswer(`When will ${name} launch?`);
    return [answer ? { ...result(answer, id), settled: true } : local(`I don't have a published release date for ${name}.`, 'availability', id)];
  }

  // The company entity is almost always incidental context ("the FDS lab",
  // "an FDS project") rather than one of the actual subjects being weighed
  // against each other; treating it as a comparison partner turned an
  // unrelated mention into a generic "what is FDS" answer.
  const comparable = ids.filter(entityId => getKaylaEntity(entityId)?.kind !== 'company');
  if (comparable.length > 1) {
    // A settled canonical fact about how these entities relate (a premise
    // correction, a documented non-relationship, ...) is more authoritative
    // than a generic side-by-side description, whatever intent label it
    // carries — it already answered the actual question.
    const settledRelationship = canonicalAnswer(q);
    const relationshipInScope = relationshipCovers(settledRelationship, comparable);
    if (settledRelationship?.settled && relationshipInScope) return [{ ...result(settledRelationship, comparable[0]), settled: true }];
    const availability = /\b(use|try|download|available|released|start with|public)\b/i.test(raw);
    const parts = comparable.slice(0, 3).map(entityId => {
      const entityName = getKaylaEntity(entityId)!.name;
      const identity = canonicalAnswer(`What is ${entityName}?`);
      const available = availability ? canonicalAnswer(`Can I download ${entityName}?`) : undefined;
      if (!identity) return undefined;
      return result({ ...identity, text: `${identity.text}${available ? `\n${available.text}` : ''}`, intent: 'comparison', settled: false }, entityId);
    }).filter((r): r is KaylaKnowledgeResult => Boolean(r));
    if (!parts.length) return undefined;
    // Canonical relationship answer adds distinctions which entity descriptions alone cannot express.
    const relationText = settledRelationship?.intent === 'comparison' && relationshipInScope ? settledRelationship.text : '';
    const text = [...new Set([relationText, ...parts.map(r => r.snippet)].filter(Boolean))].join('\n\n').slice(0, 7800);
    // Choosing a usable tool is settled by availability, not the provider.
    return [{ ...parts[0], snippet: text, settled: availability, actions: parts.flatMap(r => r.actions || []) }, ...parts.slice(1)];
  }

  // A page (e.g. "the Projects page") or the company itself is not a
  // downloadable/priced product; treating it as one collapsed meta-questions
  // like "is being listed the same as being released?" into a generic
  // availability listing instead of the specific answer they asked for.
  if (id && ['project', 'product', 'gem'].includes(entityKind || '')
    && (c.followUp || c.corrected || c.audience !== 'general' || c.goal === 'download' || /\b(cost|free|available|public|released|demo|sign up)\b/i.test(raw))) {
    if (p && /\bstatus\b/i.test(raw)) return [local(`${p.name} is ${p.status}. ${p.summary}`, 'status', id)];
    if (p && /\b(who .*for|would i use|why would i use|what .*do for me|don't code|do not code)\b/i.test(raw)) {
      return [local(`${p.name} is intended for ${p.audience || p.category}. ${p.summary} Its current status is ${p.status}.`, 'capability', id)];
    }
    if (p && c.depth > 0 && !/\b(download|cost|free|status|available|released|public)\b/i.test(raw)) {
      const detail = c.depth === 1 ? p.description : c.depth === 2
        ? (p.sections || []).slice(0, 3).map(s => [s.title, s.body, s.items?.join('; ')].filter(Boolean).join(': ')).join('\n\n')
        : `That is the published level of detail I can offer here. ${p.roadmap || p.summary} The project page has the available background.`;
      return [local(`${p.name}: ${detail}`, 'capability', id)];
    }
    const pricing = /\b(cost|free|price|pricing|pay|money)\b/i.test(raw);
    const availability = !pricing && /\b(download|get it|where .*get|use|try|available|public|released|demo)\b/i.test(raw);
    const request = pricing ? `What does ${name} cost?` : availability ? `Can I download ${name}?` : q;
    const answer = canonicalAnswer(request, undefined, []);
    if (answer) {
      const asksIdentityToo = /\bwhat is\b/i.test(raw) && availability;
      const overview = asksIdentityToo ? canonicalAnswer(`What is ${name}?`)?.text : '';
      return [{ ...result(answer, id), snippet: [overview, answer.text].filter(Boolean).join('\n\n'), settled: true }];
    }
  }
  return undefined;
}

/** Rank validated destinations, not provider URLs. Current-page links never occupy the only slot. */
export function rankConversationActions(c: ConversationContext, candidates: KaylaSafeAction[] = [], page?: KaylaPageContext): KaylaSafeAction[] {
  if (c.needsClarification) return [];
  const id = c.entities[0];
  const entity = id ? getCanonicalEntity(id) : undefined;
  const output: KaylaSafeAction[] = [];
  const wantsDownload = c.goal === 'download' || c.goal === 'try';
  // Narrowing to "the current subject's own route" only makes sense for an
  // actual project/product/gem. The company, a page, or the assistant itself
  // has no single download/explore action that should out-rank whatever the
  // answer (support, community, navigation...) already recommended.
  if (entity && ['project', 'product', 'gem'].includes(entity.kind) && !['private_info', 'external_current', 'unsupported_task'].includes(c.intent)) {
    if (wantsDownload && (entity.downloadable || c.entities.some(id => getCanonicalEntity(id)?.downloadable))) {
      output.push({ type: 'OPEN_FORGED', label: 'Download / Try CodeForge', href: '/forged' });
    }
    if (entity.route) output.push({ type: 'OPEN_PAGE', label: `Explore ${entity.name}`, href: entity.route });
    // Limit candidate actions to the current subjects; stale task-planner recommendations cannot win.
    for (const action of candidates) {
      if (action.href === '/forged' || action.href === entity.downloadRoute || c.entities.some(id => getCanonicalEntity(id)?.route === action.href)) output.push(action);
    }
  } else output.push(...candidates);
  const current = page?.route.replace(/\/+$/, '') || '/';
  const seen = new Set<string>();
  return output.map(a => a.type === 'SHOW_APPS' && !a.href ? { ...a, href: '/projects' } : a)
    .filter(a => {
      const destination = a.href || a.type;
      if (destination === current || seen.has(destination) || !validateSafeAction(a, { strictCanonical: true }).valid) return false;
      seen.add(destination);
      return true;
    }).slice(0, 3);
}
