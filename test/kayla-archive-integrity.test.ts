import { describe, it, expect } from 'vitest';
import { archiveIntegrityAnswer } from '../src/data/kayla/answers';
import { resolveConversation } from '../src/lib/kayla/conversation';
import { conversationAnswer } from '../src/lib/kayla/conversation-answer';

/**
 * Archive-integrity paraphrase routing.
 *
 * The certified exact query ("How do I verify the SHA-256?") always worked.
 * Natural paraphrases did not: several resolved to an unrelated project card
 * (KyraBlox, Kayla AI Publisher, CodeForge itself), the company card, or the
 * ask-which-project clarification. The canonical integrity walkthrough is the
 * one correct answer for every shape below, including questions that name no
 * project at all and questions that name one — naming CodeForge does not make
 * a checksum question a CodeForge product question.
 */

const HOME = { route: '/', pageType: 'home' };

const integrityQuestions = [
  'How do I verify the SHA-256?',
  'How do I check the checksum?',
  'How do I verify the CodeForge ZIP?',
  'How can I tell if the archive changed?',
  'How do I validate a downloaded project archive?',
  'Is there a hash for the CodeForge source ZIP?',
  'How do I know the ZIP matches what FDS published?',
  "What's the checksum for the CodeForge archive?",
  'How do I verify a project download?',
  'How do I check file integrity?',
  'How can I verify the checksum of the project download?',
  'How do I check that this ZIP is legit?',
  'Is this download authentic?',
  'How do I know the file was not changed?',
  'How do I compare the checksum?',
  'How can I verify the source archive?'
];

describe('archive integrity paraphrases reach the canonical walkthrough', () => {
  it.each(integrityQuestions)('%s', (question) => {
    const answer = archiveIntegrityAnswer(question);
    expect(answer).toBeDefined();
    expect(answer?.sources).toContain('forged-page');
    // Grounded process, in the site's own documented commands.
    expect(answer?.text).toContain('SHA-256');
    expect(answer?.text).toContain('certutil -hashfile FILENAME SHA256');
    expect(answer?.text).toContain('shasum -a 256 FILENAME');
    expect(answer?.text).toContain('64-character');
    // Correct integrity claim: bytes match, authorship is not proven.
    expect(answer?.text).toContain('downloaded bytes match the archive FDS published');
  });

  it('answers through the conversation layer, ahead of clarification and entity cards', () => {
    // Names no project — must not be answered with "which project do you mean?".
    const noSubject = conversationAnswer(resolveConversation('How do I check that this ZIP is legit?', [], HOME));
    expect(noSubject?.[0]?.snippet).toContain('SHA-256');
    // Names a project — must not be answered with the CodeForge product card.
    const namedSubject = conversationAnswer(resolveConversation('Is there a hash for the CodeForge source ZIP?', [], HOME));
    expect(namedSubject?.[0]?.snippet).toContain('SHA-256');
    expect(namedSubject?.[0]?.snippet).not.toContain('free-first autonomous software-engineering platform');
  });

  it('does not hijack availability, changelog, or install questions', () => {
    const untouched = [
      'Can I download CodeForge?',
      'What can I download?',
      'How do I download project archives?',
      'What changed in the latest release?',
      'How do I install CodeForge?',
      'Where are the downloads?'
    ];
    for (const question of untouched) {
      expect(archiveIntegrityAnswer(question)).toBeUndefined();
    }
  });
});
