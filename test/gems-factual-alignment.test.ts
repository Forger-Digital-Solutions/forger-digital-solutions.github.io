import { describe, expect, it } from 'vitest';
import { gems } from '../src/data/gems';

describe('GEMS public alignment', () => {
  it('keeps each research identity distinct and from-scratch', () => {
    expect(gems.map((gem) => [gem.name, gem.role])).toEqual([
      ['Topaz', 'General intelligence and orchestration'],
      ['Sapphire', 'Software engineering and coding'],
      ['Peridot', 'Mathematics and technical reasoning'],
      ['Garnet', 'Multimodal and publishing intelligence']
    ]);

    expect(gems.every((gem) => gem.state === 'RESEARCH')).toBe(true);
    expect(gems.every((gem) => /not|no /i.test(`${gem.researchStatus} ${gem.notClaimed}`))).toBe(true);
    // GEMS is from-scratch research; no lineage should describe itself as beginning
    // from an acquired pretrained checkpoint.
    expect(gems.every((gem) => !/OLMo|Qwen|Mathstral|SmolVLM|FLUX/i.test(gem.researchStatus))).toBe(true);
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
