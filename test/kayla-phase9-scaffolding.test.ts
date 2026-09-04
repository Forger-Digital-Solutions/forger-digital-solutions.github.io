import { describe, it, expect } from 'vitest';
import { checkAnswerShape } from '../src/lib/kayla/well-formed';

/**
 * Phase 9 — Expanded answer-shape (scaffolding / reasoning-leak) tests.
 *
 * Phase 8 certified the baseline set in kayla-answer-shape.test.ts.
 * These tests cover the additional patterns added in Phase 9 without
 * re-stating or duplicating Phase 8 cases.
 *
 * Rule: NEVER pad tests for vanity numbers. Every case here was reachable
 * from a real free-model family (Qwen, Mistral instruction-tuned, OpenAI
 * function-call JSON leaking) or from observed live behaviour (section headers
 * from reasoning-heavy fine-tuned models).
 */

describe('Phase 9 — additional control-token families', () => {
  // ChatML format used by many instruction-tuned models
  it('rejects <|im_start|> ChatML header', () => {
    const verdict = checkAnswerShape('<|im_start|>assistant\nCodeForge is free and released.');
    expect(verdict.ok).toBe(false);
    expect(verdict.kinds).toContain('control_token');
  });

  it('rejects <|im_end|> ChatML terminator mid-answer', () => {
    const verdict = checkAnswerShape('CodeForge is free.<|im_end|>');
    expect(verdict.ok).toBe(false);
    expect(verdict.kinds).toContain('control_token');
  });

  // Qwen / Mistral role marker
  it('rejects <|assistant|> Qwen role marker', () => {
    const verdict = checkAnswerShape('<|assistant|>\nForgerEMS is available for download on Windows.');
    expect(verdict.ok).toBe(false);
    expect(verdict.kinds).toContain('control_token');
  });
});

describe('Phase 9 — additional tool-call scaffolding patterns', () => {
  // OpenAI-style function_call JSON leaking as plain text
  it('rejects "function_call": JSON key leaking as prose', () => {
    const verdict = checkAnswerShape('{"function_call": {"name": "search", "arguments": {"q": "codeforge"}}}');
    expect(verdict.ok).toBe(false);
    expect(verdict.kinds).toContain('tool_call_scaffolding');
  });

  // Channel-addressed assistant turn
  it('rejects "assistant to=" channel address', () => {
    const verdict = checkAnswerShape('assistant to=FDS_Knowledge: query = "CodeForge status"');
    expect(verdict.ok).toBe(false);
    expect(verdict.kinds).toContain('tool_call_scaffolding');
  });

  // Raw XML tool block
  it('rejects <tool>...</tool> at line start', () => {
    const verdict = checkAnswerShape('<tool>search(query="forgerems")</tool>');
    expect(verdict.ok).toBe(false);
    expect(verdict.kinds).toContain('tool_call_scaffolding');
  });

  // Plain-text protocol labels
  it('rejects TOOL_CALL: label at line start', () => {
    const verdict = checkAnswerShape('TOOL_CALL: search {"query": "kyrablox status"}');
    expect(verdict.ok).toBe(false);
    expect(verdict.kinds).toContain('tool_call_scaffolding');
  });

  it('rejects FUNCTION_CALL: label at line start', () => {
    const verdict = checkAnswerShape('FUNCTION_CALL: lookup_project(id="codeforge")');
    expect(verdict.ok).toBe(false);
    expect(verdict.kinds).toContain('tool_call_scaffolding');
  });
});

describe('Phase 9 — additional reasoning-leak patterns', () => {
  // XML-style CoT wrappers
  it('rejects <analysis> XML CoT wrapper', () => {
    const verdict = checkAnswerShape('<analysis>The visitor wants to know about GEMS.</analysis>\nGEMS is a research project.');
    expect(verdict.ok).toBe(false);
    expect(verdict.kinds).toContain('reasoning_leak');
  });

  it('rejects <chain_of_thought> XML wrapper', () => {
    const verdict = checkAnswerShape('<chain_of_thought>Step 1: identify the entity. Step 2: find status.</chain_of_thought>\nKyraBlox is in ACTIVE DEVELOPMENT.');
    expect(verdict.ok).toBe(false);
    expect(verdict.kinds).toContain('reasoning_leak');
  });

  // Prose reasoning section headers at line start
  it('rejects "Analysis:" section header at line start', () => {
    const verdict = checkAnswerShape('Analysis:\nThe visitor is asking about CodeForge. CodeForge is free and released.\nCodeForge is available for Windows.');
    expect(verdict.ok).toBe(false);
    expect(verdict.kinds).toContain('reasoning_leak');
  });

  it('rejects "Chain of thought:" section header', () => {
    const verdict = checkAnswerShape('Chain of thought:\nFirst identify entity: FarmStand Finder.\nFarmStand Finder is in active development.');
    expect(verdict.ok).toBe(false);
    expect(verdict.kinds).toContain('reasoning_leak');
  });

  it('rejects "Internal reasoning:" section header', () => {
    const verdict = checkAnswerShape('Internal reasoning:\nThe question is about project status. We-The-People is in private development.\n\nWe The People is a civic platform in private development.');
    expect(verdict.ok).toBe(false);
    expect(verdict.kinds).toContain('reasoning_leak');
  });

  it('rejects "Let me think:" section header', () => {
    const verdict = checkAnswerShape('Let me think:\nThe visitor wants downloads. Only CodeForge and ForgerEMS are available.');
    expect(verdict.ok).toBe(false);
    expect(verdict.kinds).toContain('reasoning_leak');
  });

  // IMPORTANT: These must NOT be false-positived
  it('does not reject "analysis" used in ordinary prose mid-sentence', () => {
    // "analysis" in a sentence doesn't start at a line boundary
    const verdict = checkAnswerShape('FDS\'s technical analysis shows CodeForge handles repository inspection. It is free and available now.');
    expect(verdict.ok).toBe(true);
  });

  it('does not reject an answer that begins with a factual claim not a reasoning header', () => {
    const verdict = checkAnswerShape('CodeForge is a released, free-first autonomous software-engineering platform for Windows, CLI, and editor work.');
    expect(verdict.ok).toBe(true);
  });
});

describe('Phase 9 — combined / compound scaffolding', () => {
  it('reports multiple violation kinds when both control_token and tool_call appear', () => {
    const verdict = checkAnswerShape('<|im_start|>assistant\n[TOOL_CALLS] search(query="codeforge")');
    expect(verdict.ok).toBe(false);
    expect(verdict.kinds).toContain('control_token');
    expect(verdict.kinds).toContain('tool_call_scaffolding');
  });

  it('reports reasoning_leak alongside another violation when both present', () => {
    const verdict = checkAnswerShape('<think>Plan the response.</think>\n[TOOL_CALLS] lookup(id="kyrablox")');
    expect(verdict.ok).toBe(false);
    expect(verdict.kinds).toContain('reasoning_leak');
    expect(verdict.kinds).toContain('tool_call_scaffolding');
  });
});
