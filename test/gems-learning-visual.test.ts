import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const visual = readFileSync(new URL('../src/components/GemsLearningSystem.astro', import.meta.url), 'utf8');
const story = readFileSync(new URL('../src/components/GemsStory.astro', import.meta.url), 'utf8');

describe('GEMS learning-system visual (homepage)', () => {
  it('renders the four lineages from the canonical data module', () => {
    expect(visual).toContain("import { gems } from '../data/gems'");
    expect(visual).toContain('gems.map');
    for (const gem of ['Topaz', 'Sapphire', 'Peridot', 'Garnet']) {
      // Names must come from the data module, not hardcoded copy.
      expect(visual).not.toContain(`>${gem}</span>`);
    }
    expect(visual).toContain("aria-label=\"GEMS research lineages\"");
  });

  it('shows the seven-stage learning cycle as a labeled ordered list', () => {
    expect(visual).toContain('aria-label="Training Grounds learning cycle"');
    for (const stage of ['Curriculum', 'Teach', 'Test', 'Diagnose', 'Refine', 'Verify', 'Advance']) {
      expect(visual).toContain(`'${stage}'`);
    }
    expect(visual).toMatch(/<ol class="gems-cycle"/);
  });

  it('keeps Training Grounds central with evidence-gated framing', () => {
    expect(visual).toContain('Training Grounds');
    expect(visual).toContain('Learning program');
    expect(visual).toContain('Evidence-gated advancement');
  });

  it('uses decorative-only SVG and stays screen-reader legible', () => {
    expect(visual).toMatch(/<svg class="gems-art"[^>]*aria-hidden="true"/);
    expect(visual).not.toMatch(/<svg[^>]*role="img"/);
  });

  it('respects reduced motion and forced colors', () => {
    expect(visual).toContain('@media (prefers-reduced-motion: reduce)');
    expect(visual).toContain('@media (forced-colors: active)');
  });

  it('restructures on mobile instead of scaling the desktop diagram down', () => {
    expect(visual).toMatch(/@media \(max-width: 640px\)[\s\S]*\.gems-art \{ display: none; \}/);
    expect(visual).toContain('order: 3');
  });

  it('carries no pretrained-foundation terminology and no old phase visual', () => {
    for (const file of [visual, story]) {
      expect(file).not.toMatch(/OLMo|Qwen2?\.?5?-?Coder|Mathstral|SmolVLM|FLUX|Phase 158|foundation selection/i);
    }
  });

  it('homepage section keeps heading, status strip, and CTA without a four-card grid', () => {
    expect(story).toContain('Four roles. One deliberate learning program.');
    expect(story).toContain('<GemsLearningSystem />');
    expect(story).toContain('From-Scratch Research');
    expect(story).toContain('Training Grounds');
    expect(story).toContain('Held-Out Evaluation');
    expect(story).toContain('Advancement by Evidence');
    expect(story).toContain('href="/projects/gems-training-grounds"');
    expect(story).not.toContain('VisualEvidence');
    expect(story).not.toContain('gemsFamily');
  });
});
