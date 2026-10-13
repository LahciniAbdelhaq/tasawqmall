import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ArchivePage, { type SP } from '@/components/ArchivePage';
import { allProducts, categoryName, categoryTrail, getCategory, loadCatalog } from '@/lib/catalog';
import { pageContext } from '@/lib/page';
import { getSettings } from '@/lib/settings';
import { breadcrumbJsonLd, clip, stripTags } from '@/lib/seo';
import { getI18n } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ path: string[] }>; searchParams: Promise<SP> };
const decode = (path: string[]) => path.map(decodeURIComponent).join('/');

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await loadCatalog();
  const { locale, dict } = await getI18n();
  const path = decode((await params).path);
  const c = getCategory(path);
  if (!c) return {};
  const name = categoryName(path, locale, dict);
  return {
    title: c.seoTitle || name,
    description: c.seoDescription || clip(stripTags(c.description) || `${name} : découvrez ${c.count} produits au meilleur prix sur BeautyMall, parapharmacie en ligne au Maroc. Livraison partout au Maroc, paiement à la livraison.`),
    alternates: { canonical: `/product-category/${path}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [tr, s] = await Promise.all([pageContext(), getSettings()]);
  const path = decode((await params).path);
  const cat = getCategory(path);
  if (!cat) notFound();
  const trail = categoryTrail(path);
  const crumbs = [{ label: tr.t('Accueil'), href: '/' }, ...trail.map((t) => ({ label: categoryName(t.path, tr.locale, tr.dict), href: `/product-category/${t.path}` }))];
  return (
    <ArchivePage
      tr={tr}
      route={`/product-category/${path}`}
      basePath={`/product-category/${path}`}
      heading={categoryName(path, tr.locale, tr.dict)}
      crumbs={crumbs}
      products={allProducts().filter((p) => p.cats.includes(path))}
      searchParams={await searchParams}
      currentCategory={path}
      description={cat.i18n?.[tr.locale]?.description || cat.description}
      jsonLd={s.seo.jsonLd ? breadcrumbJsonLd(crumbs.map((c) => ({ name: c.label, url: c.href! })), s) : undefined}
    />
  );
}
