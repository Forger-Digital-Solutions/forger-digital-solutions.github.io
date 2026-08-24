import { describe, it, expect } from 'vitest';
import { apps, appAliases, resolveAppId } from '../src/data/kayla/apps';
import { forgerems, getForgerEMSDownload } from '../src/data/kayla/apps/forgerems';
import { roadmap } from '../src/data/kayla/roadmap';
import { community } from '../src/data/kayla/community';
import { downloads } from '../src/data/kayla/downloads';
import { forged } from '../src/data/kayla/ecosystem/forged';
import { fds } from '../src/data/kayla/company/fds';
import { founder } from '../src/data/kayla/company/founder';
import { faqs } from '../src/data/kayla/support';

describe('Kayla Knowledge - Apps', () => {
  it('discovers all five current apps plus ForgerEMS', () => {
    expect(apps.length).toBeGreaterThanOrEqual(6);
  });

  it('includes ForgerEMS in knowledge', () => {
    const ems = apps.find(a => a.id === 'forgerems');
    expect(ems).toBeDefined();
    expect(ems?.name).toBe('ForgerEMS');
  });

  it('ForgerEMS installer resolves correctly', () => {
    const dl = getForgerEMSDownload();
    expect(dl.href).toBe('/downloads/forger-ems/ForgerEMS-v1.2.4-preview.5.zip');
    expect(dl.version).toBe('v1.2.4-preview.5');
    expect(dl.platform).toBe('Windows');
    expect(dl.kind).toBe('archive');
  });

  it('app aliases resolve correctly', () => {
    expect(resolveAppId('gems')).toBe('gems-training-grounds');
    expect(resolveAppId('kyrablox')).toBe('kyrablox');
    expect(resolveAppId('kayla')).toBe('kayla-ai-publisher');
    expect(resolveAppId('we the people')).toBe('we-the-people');
    expect(resolveAppId('farmstand')).toBe('farmstand-finder');
    expect(resolveAppId('forgerems')).toBe('forgerems');
    expect(resolveAppId('ems')).toBe('forgerems');
    expect(resolveAppId('toolkit')).toBe('forgerems');
  });
});

describe('Kayla Knowledge - ForgerEMS', () => {
  it('has correct metadata', () => {
    expect(forgerems.id).toBe('forgerems');
    expect(forgerems.status).toBe('public-beta');
    expect(forgerems.category).toBe('Toolkit');
    expect(forgerems.platforms).toEqual(['Windows']);
    expect(forgerems.documentation).toBe('https://github.com/forger-digital-solutions/ForgerEMS');
  });
});

describe('Kayla Knowledge - Roadmap', () => {
  it('contains all projects with roadmap data', () => {
    expect(roadmap.length).toBeGreaterThanOrEqual(5);
  });

  it('roadmap states are valid', () => {
    const validStates = new Set(['released', 'active', 'experimental', 'planned', 'research', 'aspirational']);
    for (const item of roadmap) {
      expect(validStates.has(item.status)).toBe(true);
    }
  });
});

describe('Kayla Knowledge - Founder and Company', () => {
  it('founder knowledge loads', () => {
    expect(founder.name).toBe('Edward Schmidt');
    expect(founder.role).toBe('Founder & Developer');
    expect(founder.publicLinks.length).toBeGreaterThan(0);
  });

  it('company knowledge loads', () => {
    expect(fds.name).toBe('Forger Digital Solutions');
    expect(fds.shortName).toBe('FDS');
    expect(fds.philosophy.length).toBeGreaterThan(0);
    expect(fds.productEcosystem.length).toBeGreaterThan(0);
  });
});

describe('Kayla Knowledge - Community', () => {
  it('community knowledge loads', () => {
    expect(community.status).toBe('Exploring');
    expect(community.donations.cashApp).toBe('$ForgerDigital');
    expect(community.hardwareDonations.email).toBe('forgerdigisolsupport@gmail.com');
  });
});

describe('Kayla Knowledge - Downloads', () => {
  it('download registry includes ForgerEMS', () => {
    const emsDl = downloads.find(d => d.appId === 'forgerems');
    expect(emsDl).toBeDefined();
    expect(emsDl?.href).toBe('/downloads/forger-ems/ForgerEMS-v1.2.4-preview.5.zip');
  });
});

describe('Kayla Knowledge - Forged', () => {
  it('forged products load', () => {
    expect(forged.length).toBeGreaterThanOrEqual(1);
    expect(forged[0].name).toBe('ForgerEMS');
  });
});

describe('Kayla Knowledge - FAQ', () => {
  it('faq entries exist', () => {
    expect(faqs.length).toBeGreaterThan(0);
    const qs = faqs.map(f => f.q.toLowerCase());
    expect(qs.some(q => q.includes('forger digital solutions'))).toBe(true);
  });
});
