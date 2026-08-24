import type { KaylaKnowledgeResult, KaylaSafeAction, KaylaPageContext } from './types';
import { forgerems, getForgerEMSDownload } from './apps/forgerems';
import { founder } from './company/founder';
import { fds } from './company/fds';
import { apps } from './apps';
import { roadmap } from './roadmap';
import { downloads } from './downloads';
import { forged } from './ecosystem/forged';
import { releases } from './releases';
import { githubRepos } from './github';
import { officialSites } from './sites';
import { productRelationships } from './relationships';
import { retrieveKnowledge, toKnowledgeResult, resolveEntity } from './retrieval';

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function knownAnswer(query: string, context?: KaylaPageContext): { text: string; title?: string; actions?: KaylaSafeAction[]; sources: string[] } | undefined {
  const q = normalize(query);

  if (q === 'what is fds' || q.includes('what is forger digital solutions') || q === 'forger digital solutions') {
    return {
      text: `${fds.name} (FDS) is ${fds.mission.charAt(0).toLowerCase()}${fds.mission.slice(1)} ${fds.vision.current}`,
      actions: [{ type: 'OPEN_PAGE', label: 'Explore FDS', href: '/about' }],
      sources: ['fds-company', 'fds-mission']
    };
  }

  if (q.includes('what is forgerems') || q === 'forgerems') {
    return {
      text: forgerems.description + ' It is currently in public-beta and available for free on Windows.',
      actions: [
        { type: 'OPEN_DOWNLOAD', label: 'Download ForgerEMS', href: forgerems.download! },
        { type: 'OPEN_GITHUB', label: 'View on GitHub', href: 'https://github.com/forger-digital-solutions/ForgerEMS' }
      ],
      sources: ['forgerems-product']
    };
  }

  if (q.includes('where can i download forgerems') || q.includes('download forgerems')) {
    const dl = getForgerEMSDownload();
    return {
      text: `ForgerEMS download: You can download ForgerEMS v${dl.version} for ${dl.platform} here: ${dl.href}`,
      actions: [{ type: 'OPEN_DOWNLOAD', label: 'Download ForgerEMS', href: dl.href }],
      sources: ['forgerems-download']
    };
  }

  if (q.includes('how do i install forgerems') || q.includes('install forgerems')) {
    return {
      text: 'ForgerEMS is distributed as a ZIP archive. Download it, extract the contents, and run the executable on a Windows PC. For detailed instructions, see the GitHub repository.',
      actions: [{ type: 'OPEN_GITHUB', label: 'View Docs on GitHub', href: 'https://github.com/forger-digital-solutions/ForgerEMS' }],
      sources: ['forgerems-download']
    };
  }

  if (q.includes('what platform is forgerems') || q.includes('forgerems platform')) {
    return {
      text: `ForgerEMS is built for Windows.`,
      actions: [{ type: 'OPEN_DOWNLOAD', label: 'Download ForgerEMS', href: forgerems.download! }],
      sources: ['forgerems-product']
    };
  }

  if (q.includes('where can i learn more about forgerems') || q.includes('learn more about forgerems')) {
    return {
      text: 'You can learn more about ForgerEMS on its GitHub repository, which includes documentation and usage details.',
      actions: [{ type: 'OPEN_GITHUB', label: 'View on GitHub', href: 'https://github.com/forger-digital-solutions/ForgerEMS' }],
      sources: ['forgerems-product']
    };
  }

  if (q.includes('show me all apps') || q.includes('list all apps') || q.includes('what apps') || q.includes('all apps')) {
    const appList = apps.map(a => `• ${a.name} (${a.status})`).join('\n');
    return {
      text: `FDS currently works on these initiatives:\n\n${appList}\n\nForgerEMS is also available as a published product on the Forged page.`,
      actions: [{ type: 'SHOW_APPS', label: 'View All Projects' }],
      sources: apps.map(a => `app-${a.id}`)
    };
  }

  if (q.includes('who founded fds') || q.includes('who is the founder') || q.includes('who created fds')) {
    return {
      text: `${founder.name} is the Founder & Developer of Forger Digital Solutions, based in New Jersey, United States. ${founder.publicBio}`,
      actions: [{ type: 'OPEN_PAGE', label: 'About FDS', href: '/about' }],
      sources: ['founder-bio']
    };
  }

  if (q.includes('why was fds created') || q.includes('why does fds exist') || q.includes('fds motivation')) {
    return {
      text: founder.motivation,
      actions: [{ type: 'OPEN_PAGE', label: 'About FDS', href: '/about' }],
      sources: ['founder-vision']
    };
  }

  if (q.includes('what is fds trying to build') || q.includes('what is fds building') || q.includes('what does fds build')) {
    return {
      text: fds.mission + ' ' + fds.vision.current,
      actions: [{ type: 'OPEN_PAGE', label: 'Explore Projects', href: '/projects' }],
      sources: ['fds-mission', 'fds-vision']
    };
  }

  if (q.includes('what is on the roadmap') || q.includes('roadmap') || q.includes('what is ahead')) {
    const roadmapText = roadmap.map(r => `• ${r.name} (${r.status}): ${r.summary}`).join('\n');
    return {
      text: `Here is the current direction for FDS projects:\n\n${roadmapText}`,
      actions: [{ type: 'SHOW_ROADMAP', label: 'View Roadmap' }],
      sources: roadmap.map(r => `roadmap-${r.id}`)
    };
  }

  if (q.includes('how can i support fds') || q.includes('support fds') || q.includes('donate')) {
    return {
      text: `You can support FDS development through Cash App (${fds.cashAppHandle}) or Ko-fi. You can also donate hardware by emailing ${fds.supportEmail}. Community-impact funding is not yet active.`,
      actions: [
        { type: 'OPEN_DONATE', label: 'Support FDS', href: '/support' },
        { type: 'OPEN_CONTACT', label: 'Donate Hardware', href: `mailto:${fds.supportEmail}` }
      ],
      sources: ['fds-support', 'hardware-donations']
    };
  }

  if (q.includes('which app should i use') || q.includes('which project') || q.includes('recommend')) {
    return recommendApp(query);
  }

  if (q.includes('explain all of fds') || q.includes('explain fds ecosystem') || q.includes('how do all the apps fit together')) {
    return synthesizeEcosystem();
  }

  if (q.includes('what is the difference between') || q.includes('compare') || q.includes('how is .* different')) {
    return compareApps(query);
  }

  if (q.includes('how do the apps fit together') || q.includes('ecosystem')) {
    return {
      text: `FDS builds a coherent ecosystem of practical software:\n\n` +
        `• GEMS / Training Grounds is the research foundation — it explores how intelligent systems can be trained, evaluated, and governed.\n` +
        `• KyraBlox applies AI-assisted development to game creation tooling.\n` +
        `• Kayla AI Publisher explores intelligent publishing workflows and is also the public face of FDS AI capability.\n` +
        `• FarmStand Finder connects communities with local food sources.\n` +
        `• We The People explores civic technology infrastructure.\n` +
        `• ForgerEMS provides practical toolkit management and is published through Forged.\n\n` +
        `Research projects become published software through Forged when they reach a releasable state.`,
      actions: [{ type: 'SHOW_APPS', label: 'View All Projects' }],
      sources: ['fds-ecosystem', 'fds-forged']
    };
  }

  if (q.includes('can i donate old hardware') || q.includes('donate hardware') || q.includes('hardware donation')) {
    return {
      text: `Yes! FDS accepts donations of laptops, workstations, GPUs, servers, storage, and other usable computing equipment. Logistics are coordinated privately after initial contact. Email ${fds.supportEmail} with details about what you have available.`,
      actions: [{ type: 'OPEN_CONTACT', label: 'Donate Hardware', href: `mailto:${fds.supportEmail}` }],
      sources: ['hardware-donations']
    };
  }

  if (q.includes('what is forged') || q.includes('forged store') || q.includes('forged app')) {
    return {
      text: fds.forged,
      actions: [{ type: 'OPEN_FORGED', label: 'Visit Forged', href: '/forged' }],
      sources: ['forged-page']
    };
  }

  if (q.includes('gems') || q.includes('training grounds')) {
    const app = apps.find(a => a.id === 'gems-training-grounds');
    if (app) {
      return {
        text: `${app.name}: ${app.tagline} ${app.description}`,
        title: app.name,
        actions: [{ type: 'OPEN_APP', label: 'View GEMS', href: app.url! }],
        sources: [`app-${app.id}`]
      };
    }
  }

  if (q.includes('what version is this') || q.includes('current version') || q.includes('latest version') || q.includes('what version')) {
    const appId = context?.entity;
    const release = appId ? releases.find(r => r.appId === appId) : releases[0];
    if (release) {
      return {
        text: `The current version is ${release.version} (${release.status}).`,
        actions: [{ type: 'OPEN_DOWNLOAD', label: 'Download', href: release.downloads?.[0] || forgerems.download! }],
        sources: [`release-${release.appId}`]
      };
    }
  }

  return undefined;
}

function recommendApp(query: string): { text: string; title?: string; actions?: KaylaSafeAction[]; sources: string[] } {
  const q = normalize(query);

  if (q.includes('game') || q.includes('development tool') || q.includes('engine') || q.includes('roblox') || q.includes('unreal') || q.includes('unity')) {
    const app = apps.find(a => a.id === 'kyrablox');
    return {
      text: `For game development and AI-assisted tooling, ${app?.name || 'KyraBlox'} is the FDS project exploring specialized developer workflows across modern game engines.`,
      actions: [{ type: 'OPEN_APP', label: 'View KyraBlox', href: '/projects/kyrablox' }],
      sources: ['app-kyrablox']
    };
  }

  if (q.includes('publish') || q.includes('writing') || q.includes('editing') || q.includes('multilingual') || q.includes('content')) {
    const app = apps.find(a => a.id === 'kayla-ai-publisher');
    return {
      text: `For publishing workflows and AI-assisted writing, ${app?.name || 'Kayla AI Publisher'} explores intelligent content tooling from draft through production.`,
      actions: [{ type: 'OPEN_APP', label: 'View Kayla AI Publisher', href: '/projects/kayla-ai-publisher' }],
      sources: ['app-kayla-ai-publisher']
    };
  }

  if (q.includes('research') || q.includes('training') || q.includes('evaluation') || q.includes('ai model') || q.includes('adaptive compute')) {
    const app = apps.find(a => a.id === 'gems-training-grounds');
    return {
      text: `For AI research and training infrastructure, ${app?.name || 'GEMS / Training Grounds'} is FDS's flagship research initiative.`,
      actions: [{ type: 'OPEN_APP', label: 'View GEMS', href: '/projects/gems-training-grounds' }],
      sources: ['app-gems-training-grounds']
    };
  }

  if (q.includes('local food') || q.includes('farm stand') || q.includes('grower') || q.includes('market') || q.includes('discovery')) {
    const app = apps.find(a => a.id === 'farmstand-finder');
    return {
      text: `For local food discovery, ${app?.name || 'FarmStand Finder'} helps connect people with nearby farm stands, growers, and markets.`,
      actions: [{ type: 'OPEN_APP', label: 'View FarmStand Finder', href: '/projects/farmstand-finder' }],
      sources: ['app-farmstand-finder']
    };
  }

  if (q.includes('toolkit') || q.includes('utility') || q.includes('bootable') || q.includes('download') || q.includes('windows')) {
    const dl = getForgerEMSDownload();
    return {
      text: `For Windows toolkit management, ForgerEMS organizes and deploys bootable toolkits. You can download it here: ${dl.href}`,
      actions: [{ type: 'OPEN_DOWNLOAD', label: 'Download ForgerEMS', href: dl.href }],
      sources: ['forgerems-product']
    };
  }

  return {
    text: 'It depends on your needs. For AI research and training, see GEMS / Training Grounds. For game development tooling, see KyraBlox. For publishing workflows, see Kayla AI Publisher. For local food discovery, see FarmStand Finder. For general utilities, check ForgerEMS on the Forged page.',
    actions: [{ type: 'OPEN_PAGE', label: 'View Projects', href: '/projects' }],
    sources: apps.map(a => `app-${a.id}`)
  };
}

function compareApps(query: string): { text: string; title?: string; actions?: KaylaSafeAction[]; sources: string[] } {
  const q = normalize(query);

  if (q.includes('gems') && q.includes('kayla')) {
    return {
      text: `GEMS / Training Grounds vs Kayla AI Publisher:\n\n` +
        `• GEMS is AI research and training infrastructure — it explores how models are trained, evaluated, and governed.\n` +
        `• Kayla AI Publisher is a publishing platform — it explores AI-assisted writing, editing, and content workflows.\n` +
        `They are complementary: GEMS produces the research, Kayla applies AI assistance to creative and publishing tasks.`,
      sources: ['app-gems-training-grounds', 'app-kayla-ai-publisher']
    };
  }

  if (q.includes('kyrablox') && q.includes('game')) {
    return {
      text: `KyraBlox is an AI-assisted game development platform exploring tooling for multiple engines (Roblox, Unreal, Unity, Godot). Unlike game engines themselves, KyraBlox focuses on developer tooling and workflows — helping builders while keeping creative direction in human hands.`,
      sources: ['app-kyrablox']
    };
  }

  if (q.includes('farmstand') && q.includes('we the people')) {
    return {
      text: `FarmStand Finder and We The People are both community-focused but serve different purposes:\n\n` +
        `• FarmStand Finder is a local discovery app for finding farm stands, growers, and markets.\n` +
        `• We The People is a broader civic technology platform for accessible digital tools and infrastructure.\n` +
        `FarmStand Finder is in active development; We The People remains in private development.`,
      sources: ['app-farmstand-finder', 'app-we-the-people']
    };
  }

  if (q.includes('forgerems') && q.includes('forged')) {
    return {
      text: `ForgerEMS is a specific product available through Forged:\n\n` +
        `• ForgerEMS is the Ventoy-based toolkit manager and downloader.\n` +
        `• Forged is the FDS storefront that publishes and distributes ForgerEMS and future products.\n` +
        `Think of Forged as the app store and ForgerEMS as one of the apps available there.`,
      sources: ['forgerems-product', 'forged-page']
    };
  }

  return {
    text: 'FDS apps serve different purposes. GEMS is research infrastructure. KyraBlox is game development tooling. Kayla AI Publisher is publishing software. FarmStand Finder is local discovery. ForgerEMS is a Windows toolkit manager. We The People is private civic technology. Which area interests you?',
    sources: apps.slice(0, 3).map(a => `app-${a.id}`)
  };
}

function synthesizeEcosystem(): { text: string; title?: string; actions?: KaylaSafeAction[]; sources: string[] } {
  return {
    text: `Forger Digital Solutions (FDS) is an independent software research and development studio focused on intelligent systems, developer infrastructure, creative technology, and experimental computing.\n\n` +
      `Current products:\n` +
      `• GEMS / Training Grounds — Flagship AI research initiative exploring adaptable model training, evaluation, and evidence-driven development.\n` +
      `• KyraBlox — AI-assisted game development tooling across multiple engines.\n` +
      `• Kayla AI Publisher — AI-assisted publishing and content workflows.\n` +
      `• FarmStand Finder — Community-focused local food discovery.\n` +
      `• We The People — Private civic technology platform.\n` +
      `• ForgerEMS — Published toolkit manager available on Forged.\n\n` +
      `Research direction: GEMS explores adaptive compute, evaluation systems, and governed intelligence.\n\n` +
      `Forged is the FDS app storefront where releasable software is published.\n\n` +
      `Community plans include affordable-community concepts, technology reuse, hardware donations, and community gardens — all currently in the concept/exploration phase.\n\n` +
      `The ecosystem is designed so research findings become reusable architecture after surviving real-world use, and projects become published software through Forged when ready.`,
    actions: [{ type: 'SHOW_APPS', label: 'View All Projects' }],
    sources: ['fds-company', 'fds-vision', 'fds-forged', 'fds-ecosystem']
  };
}

export class LocalKaylaProvider {
  async search(query: string, context?: KaylaPageContext): Promise<KaylaKnowledgeResult[]> {
    const known = knownAnswer(query, context);
    if (known) {
      const result: KaylaKnowledgeResult = {
        type: 'general',
        title: known.title || 'Answer',
        snippet: known.text,
        action: known.actions?.[0],
        score: 100,
        sourceType: 'known-answer'
      };
      return [result];
    }

    const entityId = resolveEntity(query);
    if (entityId) {
      const app = apps.find(a => a.id === entityId);
      if (app) {
        const action: KaylaSafeAction = app.url
          ? { type: 'OPEN_APP', label: `Open ${app.name}`, href: app.url }
          : { type: 'OPEN_PAGE', label: `View ${app.name}`, href: '/projects' };
        return [{
          type: 'app',
          title: app.name,
          snippet: `${app.name}: ${app.tagline || app.description}`,
          action,
          score: 90,
          id: `app-${app.id}`,
          route: app.url,
          sourceType: 'entity-match'
        }];
      }
    }

    const retrieved = retrieveKnowledge(query, context, 5);

    if (retrieved.length === 0) {
      return [{
        type: 'general',
        title: 'No results',
        snippet: "I couldn't find that in the current public FDS knowledge base.",
        score: 0,
        sourceType: 'none'
      }];
    }

    return retrieved.map(toKnowledgeResult);
  }
}

export const kaylaKnowledge = {
  company: fds,
  founder,
  apps,
  roadmap,
  downloads,
  forged,
  releases,
  github: githubRepos,
  sites: officialSites,
  relationships: productRelationships,
  support: { email: fds.supportEmail, cashApp: fds.cashAppHandle, cashAppUrl: fds.cashAppUrl, kofiUrl: fds.kofiUrl, githubUrl: fds.githubUrl, youtubeUrl: fds.youtubeUrl, discordUrl: fds.discordUrl, linkedinUrl: fds.linkedinUrl, tiktokUrl: fds.tiktokUrl },
  faqs: [],
  forgerems
};
