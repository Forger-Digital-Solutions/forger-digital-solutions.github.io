import type { KaylaPageContext } from '../../data/kayla/types';

export function getPageType(pathname: string): KaylaPageContext['pageType'] {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/projects/')) return 'project';
  if (pathname === '/projects') return 'projects';
  if (pathname === '/forged') return 'forged';
  if (pathname === '/lab') return 'lab';
  if (pathname.startsWith('/notes')) return 'notes';
  if (pathname === '/technology') return 'technology';
  if (pathname === '/about') return 'about';
  if (pathname === '/support/hardware') return 'hardware';
  if (pathname === '/support') return 'support';
  if (pathname === '/community-impact') return 'community';
  if (pathname === '/faq') return 'faq';
  if (pathname === '/privacy') return 'privacy';
  if (pathname === '/terms') return 'terms';
  return 'home';
}

export function getEntity(pathname: string): string | undefined {
  if (pathname.startsWith('/projects/')) {
    return pathname.replace('/projects/', '').split('/')[0];
  }
  if (pathname.startsWith('/notes/')) {
    return pathname.replace('/notes/', '').split('/')[0];
  }
  return undefined;
}

export function buildPageContext(pathname: string): KaylaPageContext {
  return {
    route: pathname,
    pageType: getPageType(pathname),
    entity: getEntity(pathname)
  };
}
