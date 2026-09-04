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

export type AnswerShapeViolation = 'control_token' | 'tool_call_scaffolding' | 'reasoning_leak' | 'empty_answer' | 'pathological_repetition' | 'oversized_answer';

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
 * A free router can front a model that gets stuck looping rather than
 * emitting scaffolding — the same failure mode, a different shape. This is
 * deliberately conservative: it only fires on a whole sentence or paragraph
 * repeated back to back several times, never on ordinary short repetition
 * ("CodeForge is free. It has no subscription.") that legitimate FDS prose
 * produces.
 */
const MIN_REPEATED_UNIT_LENGTH = 12;
const REPEATED_UNIT_THRESHOLD = 4;

/** provider.ts bounds the request to 700 tokens; ~4 chars/token plus slack. */
const MAX_ANSWER_CHARS = 6000;

function paragraphs(text: string): string[] {
  return text.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
}

function sentenceUnits(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= MIN_REPEATED_UNIT_LENGTH);
}

/**
 * A paragraph or sentence repeated back-to-back several times in a row —
 * the loop shape a stuck free-router model produces. Counts consecutive
 * runs only, so a fact stated once early and echoed once later (ordinary,
 * legitimate re-emphasis) never trips it.
 */
function hasPathologicalRepetition(text: string): boolean {
  for (const units of [paragraphs(text), sentenceUnits(text)]) {
    let run = 1;
    for (let i = 1; i < units.length; i++) {
      run = units[i] === units[i - 1] ? run + 1 : 1;
      if (run >= REPEATED_UNIT_THRESHOLD) return true;
    }
  }
  return false;
}

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
  if (text.length > MAX_ANSWER_CHARS) kinds.push('oversized_answer');
  if (hasPathologicalRepetition(text)) kinds.push('pathological_repetition');

  return { ok: kinds.length === 0, kinds };
}
