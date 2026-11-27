import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const homepage = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
const header = readFileSync(new URL('../src/components/Header.astro', import.meta.url), 'utf8');
const ecosystemGraph = readFileSync(new URL('../src/components/EcosystemGraph.astro', import.meta.url), 'utf8');
const jaspiliteWorkbench = readFileSync(new URL('../src/components/JaspiliteWorkbench.astro', import.meta.url), 'utf8');
const productShowcase = readFileSync(new URL('../src/components/ProductShowcase.astro', import.meta.url), 'utf8');

describe('homepage Operation Digital Forge presentation contract', () => {
  it('keeps the company wordmark and exposes the seven institutional navigation domains', () => {
    expect(header).toContain('Forger Digital Solutions');
    for (const domain of ['Models', 'Products', 'Solutions', 'Research', 'Developers', 'Studio', 'Company']) {
      expect(header).toContain(domain);
    }
    for (const route of ['/models/', '/products/', '/solutions/', '/research/', '/developers/', '/studio/', '/company/', '/downloads/', '/contact/']) {
      expect(header).toContain(route);
    }
    expect(header).not.toContain('Support FDS');
  });

  it('leads with the FDS AI studio headline, mission, and heritage slogan', () => {
    expect(homepage).toContain('Specialized intelligence.<br />Extraordinary worlds.');
    expect(homepage).toContain('Explore Our Models');
    expect(homepage).toContain('Discover Our Research');
    expect(homepage).toContain('companyProfile.heritageSlogan');
    expect(homepage).not.toContain('hero__support');
  });

  it('renders the interactive seven-flagship ecosystem graph and registry-backed flagships', () => {
    expect(homepage).toContain('<EcosystemGraph />');
    expect(homepage).toContain('<JaspiliteWorkbench />');
    expect(homepage).toContain('<ProjectForgeGraph');
    for (const flagship of ['Alexandrite', 'Hackmanite', 'Cinnabar', 'Jaspilite', 'BattleVerse', 'Project Forge', 'State Lines']) {
      expect(homepage).toContain(flagship);
      expect(ecosystemGraph).toContain(flagship);
    }
    expect(jaspiliteWorkbench).toContain('Auto');
    expect(jaspiliteWorkbench).toContain('Meld');
    expect(jaspiliteWorkbench).toContain('Solo');
  });

  it('labels non-claims, conceptual visuals, and model boundaries honestly', () => {
    expect(homepage).toContain('Qwen/Qwen3.8-27B');
    expect(homepage).toContain('openai/gpt-oss-120b');
    expect(homepage).toContain('Concept Art — Work in Progress (Not Gameplay');
    expect(productShowcase).toContain('not a product screenshot');
    expect(productShowcase).toContain('Potential integrations · unverified');
    expect(productShowcase).toContain('not gameplay footage');
  });
});
