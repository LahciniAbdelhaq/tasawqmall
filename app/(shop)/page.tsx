import type { Metadata } from 'next';
import BodyClass from '@/components/BodyClass';
import { PageContent } from '@/components/Html';
import { pageInfo } from '@/lib/catalog';
import { contentPage, pageContext } from '@/lib/page';
import { db, parseJson } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { getLocale } from '@/lib/i18n';
import { organizationJsonLd, JsonLdScript } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const [s, page, locale] = await Promise.all([getSettings(), db.page.findUnique({ where: { slug: '' } }), getLocale()]);
  const tr = parseJson<Record<string, { seoTitle?: string; seoDescription?: string }>>(page?.i18n, {})[locale];
  return {
    title: { absolute: tr?.seoTitle || page?.seoTitle || s.seo.homeTitle },
    description: tr?.seoDescription || page?.seoDescription || s.seo.description,
    alternates: { canonical: '/' },
    openGraph: page?.ogImage ? { images: [page.ogImage] } : undefined,
  };
}

export default async function Home() {
  const [tr, s] = await Promise.all([pageContext(), getSettings()]);
  const info = pageInfo('/');
  const html = await contentPage('pages/home.html', 'home', tr, s.seo.homeTitle);
  return (
    <>
      <BodyClass value={info.bodyClass} />
      {s.seo.jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={JsonLdScript(organizationJsonLd(s))} />}
      <PageContent html={html} styles={info.styles} fragment="home" />
    </>
  );
}
