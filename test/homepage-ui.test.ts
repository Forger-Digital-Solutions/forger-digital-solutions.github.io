import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const homepage = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
const header = readFileSync(new URL('../src/components/Header.astro', import.meta.url), 'utf8');
const footer = readFileSync(new URL('../src/components/Footer.astro', import.meta.url), 'utf8');
const companyPage = readFileSync(new URL('../src/pages/company/index.astro', import.meta.url), 'utf8');
const hackmanitePage = readFileSync(new URL('../src/pages/models/hackmanite/index.astro', import.meta.url), 'utf8');
const productsPage = readFileSync(new URL('../src/pages/products/index.astro', import.meta.url), 'utf8');
const researchPage = readFileSync(new URL('../src/pages/research/project-forge.astro', import.meta.url), 'utf8');
const stateLinesPage = readFileSync(new URL('../src/pages/studio/state-lines.astro', import.meta.url), 'utf8');
const ecosystemGraph = readFileSync(new URL('../src/components/EcosystemGraph.astro', import.meta.url), 'utf8');
const jaspiliteWorkbench = readFileSync(new URL('../src/components/JaspiliteWorkbench.astro', import.meta.url), 'utf8');
const productShowcase = readFileSync(new URL('../src/components/ProductShowcase.astro', import.meta.url), 'utf8');

describe('homepage Studio Intelligence Hub presentation contract', () => {
  it('keeps the company wordmark, optimized header/footer logos, seven institutional domains, and prioritizes Studio Intelligence Hub', () => {
    expect(header).toContain('Forger Digital Solutions');
    expect(header).toContain('/images/brand/fds-logo-sm.webp');
    expect(header).toContain('/images/brand/fds-logo-sm.png');
    expect(header).not.toContain('/images/brand/fds-logo.png');
    expect(footer).toContain('/images/brand/fds-logo-sm.webp');
    expect(footer).toContain('/images/brand/fds-logo-sm.png');
    expect(footer).not.toContain('/images/brand/fds-logo.png');
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

  it('keeps the homepage focused on the Hub story plus a compact Also from FDS strip while detailed showcases live on dedicated pages', () => {
    expect(homepage).toContain('<HubArchitectureFlow');
    expect(homepage).toContain('<HubInvestigationPreview');
    expect(homepage).toContain('id="also-from-fds"');
    for (const route of ['/models/', '/products/', '/research/', '/news/']) {
      expect(homepage).toContain(route);
    }
    // Moved deep showcases live on their dedicated institutional pages
    expect(homepage).not.toContain('<EcosystemGraph');
    expect(homepage).not.toContain('<JaspiliteWorkbench');
    expect(homepage).not.toContain('<ProjectForgeGraph');
    expect(companyPage).toContain('<EcosystemGraph />');
    expect(productsPage).toContain('<JaspiliteWorkbench');
    expect(researchPage).toContain('<ProjectForgeGraph');
    for (const flagship of ['Alexandrite', 'Hackmanite', 'Cinnabar', 'Jaspilite', 'BattleVerse', 'Project Forge', 'State Lines']) {
      expect(ecosystemGraph).toContain(flagship);
    }
    expect(jaspiliteWorkbench).toContain('Auto');
    expect(jaspiliteWorkbench).toContain('Meld');
    expect(jaspiliteWorkbench).toContain('Solo');
  });

  it('labels non-claims, conceptual visuals, and model boundaries honestly on their dedicated pages', () => {
    expect(hackmanitePage).toContain('Qwen/Qwen3.8-27B');
    expect(hackmanitePage).toContain('openai/gpt-oss-120b');
    expect(stateLinesPage).toMatch(/Concept Art/i);
    expect(productShowcase).toContain('not a product screenshot');
    expect(productShowcase).toContain('Potential integrations · unverified');
    expect(productShowcase).toContain('not gameplay footage');
  });
});
