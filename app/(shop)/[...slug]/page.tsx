import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BodyClass from '@/components/BodyClass';
import WpPage from '@/components/WpPage';
import { PageContent } from '@/components/Html';
import { pageInfo } from '@/lib/catalog';
import { contentPage, pageContext } from '@/lib/page';
import { renderBlocks, type Block } from '@/lib/blocks';
import { db, parseJson } from '@/lib/db';
import { getLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string[] }> };
type PageI18n = Record<string, { title?: string; seoTitle?: string; seoDescription?: string }>;

const slugOf = async (params: Props['params']) => (await params).slug.map(decodeURIComponent).join('/');

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = await slugOf(params);
  const [page, locale] = await Promise.all([db.page.findUnique({ where: { slug } }), getLocale()]);
  if (!page) return {};
  const tr = parseJson<PageI18n>(page.i18n, {})[locale];
  return {
    title: { absolute: tr?.seoTitle || page.seoTitle || `${tr?.title || page.title} – beautymall` },
    description: tr?.seoDescription || page.seoDescription || undefined,
    alternates: { canonical: `/${slug}` },
    openGraph: page.ogImage ? { images: [page.ogImage] } : undefined,
  };
}

/** Imported Elementor pages (boutiques, marques, privacy policy) and pages built in the admin. */
export default async function GenericPage({ params }: Props) {
  const slug = await slugOf(params);
  const [tr, page] = await Promise.all([pageContext(), db.page.findUnique({ where: { slug } })]);
  if (!page || !page.published) notFound();

  if (page.kind === 'builtin') {
    const info = pageInfo('/' + slug);
    if (!info) notFound();
    const html = await contentPage(`pages/${slug}.html`, slug, tr, page.seoTitle || page.title);
    return (
      <>
        <BodyClass value={info.bodyClass} />
        <PageContent html={html} styles={info.styles} fragment={slug} />
      </>
    );
  }

  const title = parseJson<PageI18n>(page.i18n, {})[tr.locale]?.title || page.title;
  const blocks = parseJson<Block[]>(page.blocks, []);
  return (
    <WpPage title={title} bodyClass={`page-custom page-${slug.replace(/\W+/g, '-')}`} raw>
      <div className="bm-blocks" dangerouslySetInnerHTML={{ __html: renderBlocks(blocks, tr) }} />
    </WpPage>
  );
}
