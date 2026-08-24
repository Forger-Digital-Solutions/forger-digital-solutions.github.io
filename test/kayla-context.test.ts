import { describe, it, expect } from 'vitest';
import { getPageType, getEntity, buildPageContext } from '../src/lib/kayla/context';

describe('Kayla Page Context', () => {
  it('detects home page', () => {
    expect(getPageType('/')).toBe('home');
  });

  it('detects project page', () => {
    expect(getPageType('/projects/gems-training-grounds')).toBe('project');
  });

  it('detects projects list', () => {
    expect(getPageType('/projects')).toBe('projects');
  });

  it('detects forged page', () => {
    expect(getPageType('/forged')).toBe('forged');
  });

  it('detects support page', () => {
    expect(getPageType('/support')).toBe('support');
  });

  it('detects hardware page', () => {
    expect(getPageType('/support/hardware')).toBe('hardware');
  });

  it('detects community page', () => {
    expect(getPageType('/community-impact')).toBe('community');
  });

  it('extracts entity from project slug', () => {
    expect(getEntity('/projects/gems-training-grounds')).toBe('gems-training-grounds');
  });

  it('extracts entity from notes slug', () => {
    expect(getEntity('/notes/test-note')).toBe('test-note');
  });

  it('builds complete page context', () => {
    const ctx = buildPageContext('/projects/kyrablox');
    expect(ctx.route).toBe('/projects/kyrablox');
    expect(ctx.pageType).toBe('project');
    expect(ctx.entity).toBe('kyrablox');
  });
});
