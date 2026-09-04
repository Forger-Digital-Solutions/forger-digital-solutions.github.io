import { describe, it, expect } from 'vitest';
import { checkAnswerShape } from '../src/lib/kayla/well-formed';
import { canonicalAnswer } from '../src/data/kayla/answers';
import { createProvider } from '../src/lib/kayla/provider';

/**
 * Answer-shape verification.
 *
 * Found live, not in review: a production request routed through the free
 * model returned tool-call scaffolding, canonical verification passed it
 * (scaffolding makes no claim, so it contradicts nothing) and the visitor was
 * served model control tokens as an answer.
 */

describe('machine scaffolding is not an answer', () => {
  // The exact string observed in production, request 77b88132.
  const observedLive = "<|tool_call_start|>[FDS_Knowledge(query='GEMS Training Grounds relationship GEMS research lineages generalist software engineering quantitative reasoning multimodal'), FDS_Knowledge(query='GEMS lineages')]";

  it('rejects the answer that actually reached a visitor', () => {
    const verdict = checkAnswerShape(observedLive);
    expect(verdict.ok).toBe(false);
    expect(verdict.kinds).toContain('control_token');
  });

  const scaffolding: [string, string][] = [
    ['control_token', '<|im_start|>assistant CodeForge is free.'],
    ['control_token', 'CodeForge is free.<|im_end|>'],
    ['control_token', '<|channel|>analysis'],
    ['tool_call_scaffolding', '<tool_call>{"name":"search"}</tool_call>'],
    ['tool_call_scaffolding', '[TOOL_CALLS] search(query="codeforge")'],
    ['tool_call_scaffolding', '<function_call>lookup</function_call>'],
    ['tool_call_scaffolding', "FDS_Knowledge(query='codeforge')"],
    ['reasoning_leak', '<think>The visitor wants CodeForge.</think> CodeForge is free.'],
    ['reasoning_leak', '<reasoning>step one</reasoning>'],
    ['empty_answer', '   ']
  ];

  for (const [kind, text] of scaffolding) {
    it(`rejects ${kind}: ${JSON.stringify(text.slice(0, 46))}`, () => {
      const verdict = checkAnswerShape(text);
      expect(verdict.ok).toBe(false);
      expect(verdict.kinds).toContain(kind);
    });
  }
});

/**
 * A free router can also fail by looping rather than by leaking scaffolding —
 * the same "this is not an answer" problem in a different shape. Part 14.
 */
describe('pathological repetition is not an answer', () => {
  it('rejects a sentence repeated back to back several times', () => {
    const text = Array(5).fill('CodeForge is free.').join(' ');
    const verdict = checkAnswerShape(text);
    expect(verdict.ok).toBe(false);
    expect(verdict.kinds).toContain('pathological_repetition');
  });

  it('rejects a paragraph looped back to back', () => {
    const paragraph = 'CodeForge is a free, released autonomous software-engineering platform for Windows.';
    const text = Array(4).fill(paragraph).join('\n\n');
    const verdict = checkAnswerShape(text);
    expect(verdict.ok).toBe(false);
    expect(verdict.kinds).toContain('pathological_repetition');
  });

  it('does not reject a fact stated once and echoed once later', () => {
    const text = 'CodeForge is free. It is released for Windows, CLI, and editor work. ' +
      'To recap: CodeForge is free, and there is no paid tier.';
    expect(checkAnswerShape(text).ok).toBe(true);
  });

  it('does not reject an ordinary bullet list of distinct short lines', () => {
    const text = '• CodeForge (RELEASED)\n• ForgerEMS (public preview)\n• KyraBlox (ACTIVE DEVELOPMENT)\n• GEMS (RESEARCH)';
    expect(checkAnswerShape(text).ok).toBe(true);
  });
});

describe('an oversized answer is not an answer a visitor should read', () => {
  it('rejects text far beyond what a 700-token provider response should produce', () => {
    const text = 'CodeForge is free and released for Windows. '.repeat(200);
    const verdict = checkAnswerShape(text);
    expect(verdict.ok).toBe(false);
    expect(verdict.kinds).toContain('oversized_answer');
  });

  it('accepts an ordinary long-form canonical answer', () => {
    const text = 'Forger Digital Solutions is currently building:\n\n' +
      Array.from({ length: 8 }, (_, i) => `• Project ${i} (RELEASED): a distinct one-line summary of project ${i}.`).join('\n');
    expect(checkAnswerShape(text).ok).toBe(true);
  });
});

describe('real answers are not mistaken for scaffolding', () => {
  const legitimate = [
    'CodeForge is a free-first autonomous software-engineering platform for Windows.',
    'GEMS is the research lineage; Training Grounds is where those models are trained and evaluated.',
    'I don\'t have that documented in the current public FDS knowledge base.',
    'CodeForge and ForgerEMS differ in purpose: one is a coding platform, the other a technician workbench.',
    'You can reach FDS at the support address on the Support page.',
    'The comparison is straightforward (CodeForge vs ForgerEMS) and both are free.',
    'Think of GEMS as research rather than a product.',
    'A function call in CodeForge is inspected before it runs.'
  ];

  for (const text of legitimate) {
    it(`accepts: ${JSON.stringify(text.slice(0, 52))}`, () => {
      expect(checkAnswerShape(text).ok).toBe(true);
    });
  }

  it('accepts every canonical answer Kayla produces', async () => {
    // The same false-positive sweep the canonical verifier is held to: if the
    // shape check ever rejects the site's own words, it is the check that is
    // wrong.
    const provider = createProvider();
    const questions = [
      'What is CodeForge?', 'What is KyraBlox?', 'Who founded FDS?',
      'What are GEMS?', 'Which projects can I download?', 'What does ACTIVE DEVELOPMENT mean?',
      'How much does CodeForge cost?', 'What is Training Grounds?', 'Is We The People part of FDS?'
    ];
    for (const question of questions) {
      const results = await provider.search(question, { route: '/', pageType: 'home' }, []);
      for (const result of results.slice(0, 3)) {
        const verdict = checkAnswerShape(result.snippet);
        expect(verdict.ok, `${question} -> ${result.snippet.slice(0, 80)}`).toBe(true);
      }
    }
    expect(canonicalAnswer).toBeTypeOf('function');
  });
});
