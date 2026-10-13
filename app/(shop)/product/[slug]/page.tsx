import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BodyClass from '@/components/BodyClass';
import { PageContent } from '@/components/Html';
import { getProduct, loadCatalog, localize, pageInfo } from '@/lib/catalog';
import { renderProduct } from '@/lib/render';
import { pageContext } from '@/lib/page';
import { getSettings } from '@/lib/settings';
import { getLocale } from '@/lib/i18n';
import { productDescription, productJsonLd, JsonLdScript } from '@/lib/seo';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await loadCatalog();
  const [s, locale] = await Promise.all([getSettings(), getLocale()]);
  const src = getProduct(decodeURIComponent((await params).slug));
  if (!src) return {};
  const p = localize(src, locale);
  return {
    title: p.seoTitle || p.name,
    description: productDescription(p, s),
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { images: p.images.slice(0, 1), type: 'website' },
  };
}

// the single-product page whose template every product is rendered with
const TEMPLATE_ROUTE = '/product/la-roche-posay-pure-vitamine-c12-serum-30ml';

export default async function ProductPage({ params }: Props) {
  const [tr, s] = await Promise.all([pageContext(), getSettings()]);
  const p = getProduct(decodeURIComponent((await params).slug));
  if (!p) notFound();
  const tpl = pageInfo(TEMPLATE_ROUTE);
  return (
    <>
      <BodyClass value={tpl.bodyClass.replace(/postid-\d+/, `postid-${p.id}`)} />
      {s.seo.jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={JsonLdScript(productJsonLd(localize(p, tr.locale), s))} />}
      <PageContent html={await renderProduct(p, tr)} styles={tpl.styles} fragment="tpl-product" />
    </>
  );
}
