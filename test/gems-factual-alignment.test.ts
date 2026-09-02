import { describe, expect, it } from 'vitest';
import { gems } from '../src/data/gems';

describe('GEMS Phase 158 public alignment', () => {
  it('keeps each research identity distinct from its foundation candidate', () => {
    expect(gems.map((gem) => [gem.name, gem.role])).toEqual([
      ['Topaz', 'General intelligence and orchestration'],
      ['Sapphire', 'Software engineering and coding'],
      ['Peridot', 'Mathematics and technical reasoning'],
      ['Garnet', 'Multimodal and publishing intelligence']
    ]);

    expect(gems.every((gem) => gem.state === 'RESEARCH')).toBe(true);
    expect(gems.every((gem) => /not|no |paused|candidate/i.test(`${gem.foundationStrategy} ${gem.notClaimed}`))).toBe(true);
  });

  it('does not restore the superseded website taxonomy', () => {
    const publicCopy = JSON.stringify(gems).toLowerCase();
    expect(publicCopy).not.toContain('sapphire = optimization');
    expect(publicCopy).not.toContain('peridot = evaluation');
    expect(publicCopy).not.toContain('garnet = automation');
  });

  it('keeps Garnet vision-language and image-generation candidates separate', () => {
    const garnet = gems.find((gem) => gem.key === 'garnet');
    expect(garnet?.foundationStrategy).toContain('SmolVLM2');
    expect(garnet?.foundationStrategy).toContain('FLUX.1-schnell');
    expect(garnet?.notClaimed).toContain('SmolVLM2 is not credited with image generation');
  });
});
