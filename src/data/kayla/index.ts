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
      text: 'ForgerEMS is ' + forgerems.description.replace(/^Forger Engineering Maintenance Suite\s*/i, 'the Forger Engineering Maintenance Suite ').replace(/^ForgerEMS\s*/i, '') + ' It is currently in public preview and available for free on Windows.',
      actions: [
        { type: 'OPEN_DOWNLOAD', label: 'Download ForgerEMS', href: forgerems.download! },
        { type: 'OPEN_GITHUB', label: 'View on GitHub', href: 'https://github.com/forger-digital-solutions/ForgerEMS' }
      ],
      sources: ['forgerems-product']
    };
  }

  if ((q.includes('kayla copilot') && q.includes('publisher')) || q.includes('difference between kayla')) {
    return {
      text: 'Kayla Copilot is the guide embedded on the FDS website; it answers questions about FDS pages, projects, releases, and support. Kayla AI Publisher is a separate creative product being developed around manuscripts, chapters, revision, visual storytelling, and publishing preparation.',
      actions: [{ type: 'OPEN_APP', label: 'View Kayla AI Publisher', href: '/projects/kayla-ai-publisher' }],
      sources: ['app-kayla-ai-publisher', 'fds-company']
    };
  }

  if (q.includes('what is codeforge') || q === 'codeforge') {
    const app = apps.find(a => a.id === 'codeforge');
    return {
      text: `${app?.name || 'CodeForge'} is a released free-first autonomous software-engineering platform for Windows, CLI, and editor work. It inspects repositories, plans changes, uses controlled tools, runs verification, and refuses silent paid or local-model fallback through ForgeZero.`,
      actions: [{ type: 'OPEN_APP', label: 'View CodeForge', href: '/projects/codeforge' }],
      sources: ['app-codeforge', 'release-codeforge']
    };
  }

  if (q.includes('where can i download forgerems') || q.includes('download forgerems')) {
    const dl = getForgerEMSDownload();
    return {
      text: `ForgerEMS is in ${dl.version}. Canonical ${dl.platform} packages and version history are on GitHub Releases: ${dl.href}`,
      actions: [{ type: 'OPEN_DOWNLOAD', label: 'Download ForgerEMS', href: dl.href }],
      sources: ['forgerems-download']
    };
  }

  if (q.includes('how do i install forgerems') || q.includes('install forgerems')) {
    return {
      text: 'ForgerEMS offers portable and installer paths through GitHub Releases. Follow the release instructions, verify the published checksums, and review the preview notices before running it on Windows.',
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
      text: `FDS currently works on these initiatives:\n\n${appList}\n\nForged lists the software available now, including CodeForge and the ForgerEMS public preview.`,
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

  if ((q.includes('which') && q.includes('app')) || q.includes('which project') || q.includes('recommend')) {
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
        `• CodeForge engineers repositories and also contributes shared engineering foundations across FDS.\n` +
        `• GEMS develops specialized model intelligence; Training Grounds teaches and evaluates it.\n` +
        `• KyraBlox understands game projects, scripts, engines, approvals, and validation.\n` +
        `• Kayla AI Publisher keeps a complete creative project connected from manuscript toward publication.\n` +
        `• FarmStand Finder helps people find nearby farms, stands, markets, growers, and seasonal food.\n` +
        `• We The People makes public information and services easier to understand and navigate.\n` +
        `• ForgerEMS gives technicians diagnostics, USB, drive, driver, and maintenance tools.\n\n` +
        `Forged is the public shelf for software that can be downloaded, tested, or used now.`,
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
    const appId = q.includes('forgerems') ? 'forgerems' : q.includes('codeforge') ? 'codeforge' : context?.entity;
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
      text: `For project-aware game development, ${app?.name || 'KyraBlox'} inspects the game project, plans against its state, and governs proposed changes, validation, and recovery. Roblox has the deepest current integration; other engines have clearly labeled limits.`,
      actions: [{ type: 'OPEN_APP', label: 'View KyraBlox', href: '/projects/kyrablox' }],
      sources: ['app-kyrablox']
    };
  }

  if (q.includes('publish') || q.includes('writing') || q.includes('editing') || q.includes('multilingual') || q.includes('content')) {
    const app = apps.find(a => a.id === 'kayla-ai-publisher');
    return {
      text: `For manuscripts and publishing, ${app?.name || 'Kayla AI Publisher'} is the continuous creative workspace for chapters, characters, revision, visual storytelling, and publication preparation.`,
      actions: [{ type: 'OPEN_APP', label: 'View Kayla AI Publisher', href: '/projects/kayla-ai-publisher' }],
      sources: ['app-kayla-ai-publisher']
    };
  }

  if (q.includes('research') || q.includes('training') || q.includes('evaluation') || q.includes('ai model') || q.includes('adaptive compute')) {
    const app = apps.find(a => a.id === 'gems-training-grounds');
    return {
      text: `For model learning and evaluation, ${app?.name || 'GEMS / Training Grounds'} develops specialized intelligences through open foundations, post-training, curriculum, trials, and checkpoints.`,
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
      text: `For Windows technician work, ForgerEMS covers system information, drive validation, USB intelligence, toolkit creation, driver guidance, and local-first assistance. Releases: ${dl.href}`,
      actions: [{ type: 'OPEN_DOWNLOAD', label: 'Download ForgerEMS', href: dl.href }],
      sources: ['forgerems-product']
    };
  }

  return {
    text: 'It depends on the job. Choose CodeForge for repository engineering, GEMS / Training Grounds for model research, KyraBlox for game projects, Kayla AI Publisher for long-form creative work, FarmStand Finder for nearby food, We The People for civic information, or ForgerEMS for technician diagnostics and maintenance.',
    actions: [{ type: 'OPEN_PAGE', label: 'View Projects', href: '/projects' }],
    sources: apps.map(a => `app-${a.id}`)
  };
}

function compareApps(query: string): { text: string; title?: string; actions?: KaylaSafeAction[]; sources: string[] } {
  const q = normalize(query);

  if (q.includes('gems') && q.includes('kayla')) {
    return {
      text: `GEMS / Training Grounds vs Kayla AI Publisher:\n\n` +
        `• GEMS is a model family and learning program built around specialization, curriculum, trials, and evaluation.\n` +
        `• Kayla AI Publisher is a standalone creative-project workspace for manuscripts, revision, visual storytelling, and publishing preparation.\n` +
        `GEMS research may inform future model capability, but Kayla remains its own product.`,
      sources: ['app-gems-training-grounds', 'app-kayla-ai-publisher']
    };
  }

  if (q.includes('kyrablox') && q.includes('game')) {
    return {
      text: `KyraBlox is a local-first, project-aware game-development platform. Roblox has an integrated guarded transaction path; Unreal has a fixture-validated bridge; Unity and Godot are currently planning or file-workflow paths. It does not claim equal live integration across every engine.`,
      sources: ['app-kyrablox']
    };
  }

  if (q.includes('farmstand') && q.includes('we the people')) {
    return {
      text: `FarmStand Finder and We The People are both community-focused but serve different purposes:\n\n` +
        `• FarmStand Finder is a local discovery app for finding farm stands, growers, and markets.\n` +
        `• We The People focuses on understandable public information, services, and civic navigation.\n` +
        `FarmStand Finder is in active development; We The People remains in private development.`,
      sources: ['app-farmstand-finder', 'app-we-the-people']
    };
  }

  if (q.includes('forgerems') && q.includes('forged')) {
    return {
      text: `ForgerEMS is a specific product available through Forged:\n\n` +
        `• ForgerEMS is a Windows technician workbench for diagnostics, USB systems, drive validation, driver guidance, and maintenance.\n` +
        `• Forged is the public shelf for FDS software that can be downloaded, tested, or used now.\n` +
        `ForgerEMS is one product listed there; CodeForge is another.`,
      sources: ['forgerems-product', 'forged-page']
    };
  }

  return {
    text: 'FDS products serve different jobs. CodeForge engineers repositories. GEMS learns through Training Grounds. KyraBlox understands game projects. Kayla AI Publisher carries creative works toward publication. FarmStand Finder handles nearby food discovery. ForgerEMS is a technician workbench. We The People focuses on civic information.',
    sources: apps.slice(0, 3).map(a => `app-${a.id}`)
  };
}

function synthesizeEcosystem(): { text: string; title?: string; actions?: KaylaSafeAction[]; sources: string[] } {
  return {
    text: `Forger Digital Solutions (FDS) is an independent software and AI engineering studio.\n\n` +
      `Current products:\n` +
      `• CodeForge — released free-first autonomous software engineering for Windows.\n` +
      `• GEMS / Training Grounds — model specialization, curriculum, and evaluation research.\n` +
      `• KyraBlox — project-aware game development with honestly labeled engine maturity.\n` +
      `• Kayla AI Publisher — one connected workspace for long-form creative projects.\n` +
      `• FarmStand Finder — Community-focused local food discovery.\n` +
      `• We The People — Private civic technology platform.\n` +
      `• ForgerEMS — public-preview Windows technician workbench available through Forged.\n\n` +
      `Forged is the public shelf for software people can use now. Lab owns the investigation and validation method. Notes records recent changes and findings.\n\n` +
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
