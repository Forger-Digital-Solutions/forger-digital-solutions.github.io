import type { KaylaDownload } from './types';
import { products } from '../../data/products';

export const downloads: KaylaDownload[] = products
  .filter((p): p is typeof products[number] & { downloadUrl: string } => Boolean(p.downloadUrl))
  .map((p) => ({
    id: p.slug,
    appId: p.slug,
    name: p.name,
    version: p.version,
    platform: p.platform.join(', '),
    href: p.downloadUrl,
    kind: p.platform.some((plat) => plat.toLowerCase().includes('windows')) ? 'installer' : 'archive'
  }));
