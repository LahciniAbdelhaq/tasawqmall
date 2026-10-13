import type { MetadataRoute } from 'next';
import { allProducts, brands, categories, loadCatalog } from '@/lib/catalog';
import { db } from '@/lib/db';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

/** /sitemap.xml — home, pages, categories, brands with products, products (with images). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await loadCatalog();
  const s = await getSettings();
  const base = (process.env.SITE_URL || s.seo.siteUrl).replace(/\/$/, '');
  const pages = await db.page.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } });
  const langs = s.languages.enabled;
  const alt = (u: string) => ({ languages: Object.fromEntries(langs.map((l) => [l, `${u}?lang=${l}`])) });
  const usedBrands = new Set(allProducts().map((p) => p.brand));
  return [
    ...pages.map((p) => ({ url: `${base}/${p.slug}`, lastModified: p.updatedAt, changeFrequency: 'weekly' as const, priority: p.slug ? 0.6 : 1, alternates: alt(`${base}/${p.slug}`) })),
    { url: `${base}/boutique`, changeFrequency: 'daily', priority: 0.8 },
    ...Object.entries(categories()).filter(([, c]) => c.count > 0).map(([p]) => ({ url: `${base}/product-category/${p}`, changeFrequency: 'daily' as const, priority: 0.8, alternates: alt(`${base}/product-category/${p}`) })),
    ...brands().filter((b) => usedBrands.has(b.slug)).map((b) => ({ url: `${base}/marques/${b.slug}`, changeFrequency: 'weekly' as const, priority: 0.5 })),
    ...allProducts().map((p) => ({
      url: `${base}/product/${p.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
      images: p.images.slice(0, 3).map((i) => (i.startsWith('http') ? i : base + i)),
      alternates: alt(`${base}/product/${p.slug}`),
    })),
  ];
}
