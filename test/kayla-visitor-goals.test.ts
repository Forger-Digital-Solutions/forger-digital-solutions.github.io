import { describe, it, expect } from 'vitest';
import { classifyVisitorGoal } from '../src/data/kayla/goals';
import { getFollowUpSuggestions } from '../src/components/KaylaCopilot';

describe('Kayla Visitor Goal Classification (Phase 11)', () => {
  it('classifies all 17 visitor goals and off-topic unknown', () => {
    const goalsToTest = [
      { q: 'Where should I start?', expected: 'EXPLORE_FDS' },
      { q: 'Show me all the projects', expected: 'EXPLORE_PROJECTS' },
      { q: 'What can I use right now?', expected: 'FIND_RELEASED_SOFTWARE' },
      { q: 'I am a software engineer, what tools do you have for me?', expected: 'FIND_DEVELOPER_PROJECTS' },
      { q: 'What are your AI research projects?', expected: 'EXPLORE_AI_RESEARCH' },
      { q: 'How does CodeForge compare to GEMS?', expected: 'COMPARE_PROJECTS' },
      { q: 'What is the current status of FarmStand Finder?', expected: 'LEARN_PROJECT_STATUS' },
      { q: 'Where can I download CodeForge?', expected: 'DOWNLOAD_SOFTWARE' },
      { q: 'Where are the release notes for CodeForge?', expected: 'VIEW_RELEASE' },
      { q: 'What is the GEMS project?', expected: 'LEARN_GEMS' },
      { q: 'Do you have any community or local projects?', expected: 'FIND_COMMUNITY_PROJECT' },
      { q: 'How can I support Forger Digital Solutions?', expected: 'SUPPORT_FDS' },
      { q: 'Can I donate old hardware or servers to FDS?', expected: 'DONATE_HARDWARE' },
      { q: 'Where can I follow FDS online?', expected: 'FOLLOW_FDS' },
      { q: 'Who founded Forger Digital Solutions and what is your mission?', expected: 'LEARN_ABOUT_FDS' },
      { q: 'What technology stack and architectures do you use?', expected: 'FIND_TECHNOLOGY_INFO' },
      { q: 'Tell me about the homelab infrastructure', expected: 'FIND_LAB_INFO' },
      { q: 'What is the speed of light in vacuum?', expected: 'UNKNOWN' }
    ];

    for (const { q, expected } of goalsToTest) {
      const match = classifyVisitorGoal(q);
      expect(match.primaryGoal, `Failed on query "${q}"`).toBe(expected);
      expect(match.reason).toBeTruthy();
    }
  });

  it('detects multi-goal queries with primary and secondary goals', () => {
    const multi = classifyVisitorGoal('I am a developer interested in your AI research projects');
    expect(multi.isMultiGoal).toBe(true);
    expect(multi.primaryGoal).toBeDefined();
    expect(multi.secondaryGoals?.length).toBeGreaterThan(0);
  });

  it('detects topic shift and disregards previous conversation history entities', () => {
    const history = [
      { role: 'user' as const, content: 'Tell me about CodeForge.' },
      { role: 'assistant' as const, content: 'CodeForge is our offline code editor.' }
    ];

    // With topic shift
    const shifted = classifyVisitorGoal(
      'Actually, forget that. How can I donate hardware to your lab?',
      undefined,
      history
    );
    expect(shifted.isTopicShift).toBe(true);
    expect(shifted.primaryGoal).toBe('DONATE_HARDWARE');
    expect(shifted.entities).not.toContain('codeforge');

    // Without topic shift, anaphor inherits CodeForge
    const followUp = classifyVisitorGoal(
      'Where do I download it?',
      undefined,
      history
    );
    expect(followUp.isTopicShift).toBe(false);
    expect(followUp.primaryGoal).toBe('DOWNLOAD_SOFTWARE');
    expect(followUp.entities).toContain('codeforge');
  });

  it('resolves entity from page context when query uses anaphora without naming entity', () => {
    const ctx = {
      route: '/projects/codeforge',
      pageType: 'project' as const,
      entity: 'codeforge'
    };

    const result = classifyVisitorGoal('Is this available yet?', ctx);
    expect(result.primaryGoal).toBe('LEARN_PROJECT_STATUS');
    expect(result.entities).toContain('codeforge');
  });

  it('provides contextual follow-up chips based on last query and actions', () => {
    const codeforgeFollowUps = getFollowUpSuggestions('Tell me about CodeForge');
    expect(codeforgeFollowUps).toContain('See the release');
    expect(codeforgeFollowUps).toContain('How does it compare?');

    const gemsFollowUps = getFollowUpSuggestions('What is GEMS?');
    expect(gemsFollowUps).toContain('Is GEMS available to download?');

    const supportFollowUps = getFollowUpSuggestions('How can I support FDS?');
    expect(supportFollowUps).toContain('What hardware can I donate?');

    const startFollowUps = getFollowUpSuggestions('Where should I start?');
    expect(startFollowUps).toContain('What can I use now?');
  });
});
