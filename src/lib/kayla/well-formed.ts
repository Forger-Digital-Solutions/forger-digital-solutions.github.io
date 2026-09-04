/**
 * Answer-shape checks.
 *
 * Canonical verification asks whether an answer is *true*. It cannot ask
 * whether it is an *answer*. A live production response routed through the
 * free model returned this, and canonical verification passed it — nothing in
 * it contradicts the site, because nothing in it is a claim at all:
 *
 *   <|tool_call_start|>[FDS_Knowledge(query='GEMS Training Grounds ...')]
 *
 * The free router fronts several models, so which one answers varies between
 * requests, and some of them emit control tokens or reasoning scaffolding as
 * ordinary text. Buffer-then-validate already holds the whole answer before a
 * visitor sees any of it, so the shape check costs nothing extra here.
 *
 * These reject rather than strip: a partially-scaffolded answer is one whose
 * remaining prose was written by a model that was not answering the question,
 * and the canonical answer is already computed and waiting.
 */

export type AnswerShapeViolation = 'control_token' | 'tool_call_scaffolding' | 'reasoning_leak' | 'empty_answer';

export interface AnswerShapeVerdict {
  ok: boolean;
  kinds: AnswerShapeViolation[];
}

/**
 * Special-token delimiters. No legitimate prose about FDS contains `<|…|>`;
 * it is the delimiter shape used by Llama, Qwen, GPT-OSS and others for turn,
 * channel, and tool markers.
 */
const CONTROL_TOKEN = /<\|[^|>]{0,64}\|>/;

/** Tool-call scaffolding in the shapes the common open-weight models emit. */
const TOOL_SCAFFOLDING = /<\/?tool_call\b|\[TOOL_CALLS\]|<\/?function_call\b|<\/?tool_response\b|^\s*\[?\s*\w+\(query\s*=/im;

/** Chain-of-thought markers that were never meant to reach a reader. */
const REASONING_LEAK = /<\/?think\b|<\/?thinking\b|<\/?reasoning\b|<\/?scratchpad\b/i;

/**
 * Whether generated text is shaped like an answer a visitor can read.
 * Deliberately narrow: it looks for machine scaffolding, never for tone,
 * length, or whether the model sounded confident.
 */
export function checkAnswerShape(text: string): AnswerShapeVerdict {
  const kinds: AnswerShapeViolation[] = [];

  if (!text || !text.trim()) {
    return { ok: false, kinds: ['empty_answer'] };
  }
  if (CONTROL_TOKEN.test(text)) kinds.push('control_token');
  if (TOOL_SCAFFOLDING.test(text)) kinds.push('tool_call_scaffolding');
  if (REASONING_LEAK.test(text)) kinds.push('reasoning_leak');

  return { ok: kinds.length === 0, kinds };
}
