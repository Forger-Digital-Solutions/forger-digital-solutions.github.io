import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const homepage = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
const header = readFileSync(new URL('../src/components/Header.astro', import.meta.url), 'utf8');
const ecosystemGraph = readFileSync(new URL('../src/components/EcosystemGraph.astro', import.meta.url), 'utf8');
const jaspiliteWorkbench = readFileSync(new URL('../src/components/JaspiliteWorkbench.astro', import.meta.url), 'utf8');
const productShowcase = readFileSync(new URL('../src/components/ProductShowcase.astro', import.meta.url), 'utf8');

describe('homepage Phase III-C Studio Intelligence Hub presentation contract', () => {
  it('keeps the company wordmark, exposes all seven institutional domains, and prioritizes Studio Intelligence Hub', () => {
    expect(header).toContain('Forger Digital Solutions');
    expect(header).toContain('/solutions/studio-intelligence-hub/');
    expect(header).toContain('Book a Pilot Call');
    for (const domain of ['Solutions', 'Models', 'Products', 'Research', 'Developers', 'Studio', 'Company']) {
      expect(header).toContain(domain);
    }
    for (const route of ['/solutions/', '/models/', '/products/', '/research/', '/developers/', '/studio/', '/company/', '/downloads/', '/contact/']) {
      expect(header).toContain(route);
    }
    expect(header).not.toContain('Support FDS');
  });

  it('leads with the FDS Studio Intelligence Hub headline, pilot CTAs, and heritage slogan', () => {
    expect(homepage).toContain("Your Game Studio's Knowledge.<br />Connected.");
    expect(homepage).toContain('/solutions/studio-intelligence-hub/');
    expect(homepage).toContain('Book a Pilot Call');
    expect(homepage).toContain('companyProfile.heritageSlogan');
    expect(homepage).not.toContain('hero__support');
  });

  it('renders the interactive Hub investigation trace, architecture flow, and subordinate FDS ecosystem', () => {
    expect(homepage).toContain('<HubArchitectureFlow');
    expect(homepage).toContain('<HubInvestigationPreview');
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
