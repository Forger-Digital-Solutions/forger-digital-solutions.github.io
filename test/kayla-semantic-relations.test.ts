import { describe, it, expect } from 'vitest';
import { verifyAgainstCanon } from '../src/lib/kayla/verify';
import { verifyRelationsInText } from '../src/lib/kayla/verify-relations';
import { canonicalRelations, deniedRelations } from '../src/data/kayla/semantic-relations';

/**
 * Phase 7 semantic contradiction matrix.
 *
 * Phase 6 could reject a false *fact*. These cases are built entirely from
 * true facts joined by an invented *relationship* — the failure class Phase 6
 * explicitly listed as unresolved. Every rejection below must come from the
 * relationship dimension, not from a lucky collision with an older fact rule.
 */

const rejects = (text: string) => !verifyAgainstCanon(text).ok;
const relationKinds = (text: string) => verifyRelationsInText(text).map((violation) => violation.kind);

describe('Valid nouns, invented linkage', () => {
  it('rejects "Sapphire powers CodeForge" even though both entities are real', () => {
    const text = 'Sapphire is the free model powering the current CodeForge release.';
    expect(rejects(text)).toBe(true);
    expect(relationKinds(text)).toContain('denied_relation');
  });

  it('rejects Sapphire shipping inside CodeForge', () => {
    const text = 'Sapphire ships in CodeForge today.';
    expect(relationKinds(text).length).toBeGreaterThan(0);
  });

  it('rejects "Garnet powers Kayla" for the website assistant', () => {
    expect(rejects('Garnet powers Kayla Copilot and generates its answers.')).toBe(true);
  });

  it('rejects Garnet being built into Kayla AI Publisher', () => {
    expect(rejects('Garnet is built into Kayla AI Publisher.')).toBe(true);
  });

  it('rejects Kayla AI Publisher training a GEMS lineage', () => {
    expect(rejects('Kayla AI Publisher trains Sapphire on manuscript data.')).toBe(true);
  });
});

describe('False equivalence between distinct systems', () => {
  it('rejects Training Grounds being the same product as CodeForge', () => {
    const text = 'Training Grounds is another name for CodeForge.';
    expect(rejects(text)).toBe(true);
    expect(relationKinds(text)).toContain('false_equivalence');
  });

  it('rejects Kayla Copilot being the same product as Kayla AI Publisher', () => {
    expect(rejects('Kayla Copilot is the same product as Kayla AI Publisher.')).toBe(true);
  });
});

describe('Uncertainty wording does not buy a pass', () => {
  it('still rejects a hedged unsupported linkage', () => {
    expect(rejects('I think Sapphire probably powers CodeForge.')).toBe(true);
  });

  it('still rejects a confident-sounding hedge', () => {
    expect(rejects('Sapphire is basically the engine behind CodeForge.')).toBe(true);
  });
});

describe('Partial truth cannot rescue a fabricated fact', () => {
  it('rejects a true project statement carrying an invented price', () => {
    const verdict = verifyAgainstCanon('CodeForge is an FDS project and costs $49/month.');
    expect(verdict.ok).toBe(false);
    expect(verdict.violations.map((violation) => violation.kind)).toContain('price');
  });
});

describe('Canonical relationships are accepted', () => {
  it('accepts Training Grounds teaching the GEMS lineages', () => {
    expect(verifyRelationsInText('Training Grounds teaches Sapphire and evaluates its progress.')).toEqual([]);
  });

  it('accepts a project belonging to the FDS ecosystem', () => {
    expect(verifyRelationsInText('CodeForge is part of the broader Forger Digital Solutions ecosystem.')).toEqual([]);
  });

  it('accepts the site\'s own wording that Kayla Copilot is built into the FDS website', () => {
    expect(verifyRelationsInText('Kayla Copilot is built into the Forger Digital Solutions website.')).toEqual([]);
  });

  it('accepts a lineage belonging to the GEMS family', () => {
    expect(verifyRelationsInText('Sapphire is part of GEMS.')).toEqual([]);
  });
});

describe('Denials and negations are not assertions', () => {
  it('accepts the site stating Sapphire does not ship in CodeForge', () => {
    expect(verifyRelationsInText('No Sapphire capability is presented as shipping in CodeForge.')).toEqual([]);
  });

  it('accepts an explicit correction', () => {
    expect(verifyRelationsInText('Sapphire does not power CodeForge.')).toEqual([]);
  });

  it('does not treat a question as a claim', () => {
    expect(verifyRelationsInText('Does Sapphire power CodeForge?')).toEqual([]);
  });
});

describe('Relationship data integrity', () => {
  it('publishes canonical relationships derived from site data', () => {
    expect(canonicalRelations.length).toBeGreaterThan(0);
    for (const relation of canonicalRelations) {
      expect(relation.source, `${relation.subject}->${relation.object}`).toBeTruthy();
    }
  });

  it('every denial explains itself in the site\'s own terms', () => {
    expect(deniedRelations.length).toBeGreaterThan(0);
    for (const relation of deniedRelations) {
      expect(relation.reason.length, `${relation.subject}->${relation.object}`).toBeGreaterThan(10);
    }
  });

  it('never denies something it also asserts', () => {
    for (const denied of deniedRelations) {
      const conflict = canonicalRelations.find(
        (relation) => relation.subject === denied.subject
          && relation.predicate === denied.predicate
          && relation.object === denied.object
      );
      expect(conflict, `${denied.subject} ${denied.predicate} ${denied.object}`).toBeUndefined();
    }
  });
});
