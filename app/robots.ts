import type { MetadataRoute } from 'next';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const s = await getSettings();
  const base = (process.env.SITE_URL || s.seo.siteUrl).replace(/\/$/, '');
  if (!s.seo.indexable) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/cart', '/checkout', '/commande/', '/my-account', '/wishlist', '/search', '/l/'] },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
