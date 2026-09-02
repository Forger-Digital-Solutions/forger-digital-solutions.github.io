import { siteConfig } from '../../config/site';

export const supportInfo = {
  email: siteConfig.supportEmail,
  cashApp: siteConfig.cashAppHandle,
  cashAppUrl: siteConfig.cashAppUrl,
  kofiUrl: siteConfig.kofiUrl,
  githubUrl: siteConfig.githubUrl,
  youtubeUrl: siteConfig.youtubeUrl,
  discordUrl: siteConfig.discordUrl,
  linkedinUrl: siteConfig.linkedinUrl,
  tiktokUrl: siteConfig.tiktokUrl
};

export const faqs: { q: string; a: string }[] = [
  {
    q: 'What is Forger Digital Solutions?',
    a: 'FDS is an independent software and AI engineering studio building developer tools, model research, game-creation software, publishing tools, civic information, local discovery, and technician applications.'
  },
  {
    q: 'What does FDS build?',
    a: 'Work spans CodeForge, GEMS and Training Grounds, KyraBlox, Kayla AI Publisher, We The People, FarmStand Finder, and ForgerEMS.'
  },
  {
    q: 'Are FDS projects open source?',
    a: 'Most projects are in active development or research. Public descriptions are intentionally high-level while the work is being shaped. Where a project has a public repository or release, it will be linked from its page.'
  },
  {
    q: 'How can I support FDS?',
    a: 'FDS is independently developed. You can support via Cash App ($ForgerDigital) or Ko-fi, or donate hardware. Community-impact funding is not yet active.'
  },
  {
    q: 'How do I get in touch?',
    a: 'Email is the best way to reach us: ' + siteConfig.supportEmail + '. You can also join the Discord for more casual conversation.'
  },
  {
    q: 'Do you collect my data when I visit?',
    a: 'The site itself uses no cookies, analytics, or trackers. See the Privacy Policy for full details.'
  },
  {
    q: 'Where can I follow updates?',
    a: 'Check the Notes section for build logs and research write-ups, and subscribe on YouTube or join Discord for ongoing updates.'
  }
];
