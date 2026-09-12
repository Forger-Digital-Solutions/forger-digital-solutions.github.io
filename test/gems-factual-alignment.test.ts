import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { gems, gemsCurrentStatus } from '../src/data/gems';

const projectsData = readFileSync(new URL('../src/data/projects.ts', import.meta.url), 'utf8');

describe('GEMS public alignment', () => {
  it('keeps each research identity distinct', () => {
    expect(gems.map((gem) => [gem.name, gem.role])).toEqual([
      ['Topaz', 'General intelligence and orchestration'],
      ['Sapphire', 'Software engineering and coding'],
      ['Peridot', 'Mathematics and technical reasoning'],
      ['Garnet', 'Multimodal and publishing intelligence']
    ]);

    expect(gems.every((gem) => gem.state === 'RESEARCH')).toBe(true);
    expect(gems.every((gem) => /not|no /i.test(`${gem.researchStatus} ${gem.notClaimed}`))).toBe(true);
    // Lineage copy describes foundation strategy generically; it must never name
    // specific third-party model families or imply a specific acquired checkpoint.
    expect(gems.every((gem) => !/OLMo|Qwen|Mathstral|SmolVLM|FLUX/i.test(gem.researchStatus))).toBe(true);
  });

  it('does not claim every GEM begins from scratch', () => {
    // The obsolete blanket claim — that all lineages are from-scratch and none
    // begins from a pretrained checkpoint — must not return.
    const serialized = JSON.stringify(gems).toLowerCase();
    expect(serialized).not.toContain('no lineage begins from an acquired pretrained checkpoint');
    expect(serialized).not.toContain('from-scratch model research and evaluation');
    expect(gemsCurrentStatus.phase).not.toMatch(/from-scratch/i);
    // Current strategy language must be present on the GEMS project record.
    expect(projectsData).toContain('strong open or pretrained foundations where appropriate');
  });

  it('does not claim Sapphire checkpoints were never trained or evaluated', () => {
    const sapphire = gems.find((gem) => gem.key === 'sapphire');
    expect(sapphire).toBeDefined();
    expect(JSON.stringify(gems)).not.toContain('No checkpoint has been trained or evaluated');
    expect(sapphire?.researchStatus).toContain('experimental research checkpoints evaluated through Training Grounds');
    expect(sapphire?.notClaimed).toContain('No Sapphire model is presented as a public production model');
  });

  it('does not restore the superseded website taxonomy', () => {
    const publicCopy = JSON.stringify(gems).toLowerCase();
    expect(publicCopy).not.toContain('sapphire = optimization');
    expect(publicCopy).not.toContain('peridot = evaluation');
    expect(publicCopy).not.toContain('garnet = automation');
  });

  it('keeps Garnet image generation a separate, unclaimed module direction', () => {
    const garnet = gems.find((gem) => gem.key === 'garnet');
    expect(garnet?.researchStatus).toContain('separate');
    expect(garnet?.notClaimed).toContain('image generation is not claimed');
  });
});
