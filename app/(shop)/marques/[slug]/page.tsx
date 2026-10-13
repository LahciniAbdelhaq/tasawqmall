import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ArchivePage, { type SP } from '@/components/ArchivePage';
import { allProducts, getBrand, loadCatalog } from '@/lib/catalog';
import { pageContext } from '@/lib/page';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SP> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await loadCatalog();
  const slug = decodeURIComponent((await params).slug);
  const b = getBrand(slug);
  return b ? {
    title: b.name,
    description: `${b.name} au Maroc : tous les produits ${b.name} au meilleur prix sur BeautyMall. Produits authentiques, livraison partout au Maroc.`,
    alternates: { canonical: `/marques/${slug}` },
  } : {};
}

export default async function BrandPage({ params, searchParams }: Props) {
  const tr = await pageContext();
  const slug = decodeURIComponent((await params).slug);
  const brand = getBrand(slug);
  if (!brand) notFound();
  return (
    <ArchivePage
      tr={tr}
      route={`/marques/${slug}`}
      basePath={`/marques/${slug}`}
      heading={brand.name}
      crumbs={[{ label: tr.t('Accueil'), href: '/' }, { label: tr.t('Marques'), href: '/marques' }, { label: brand.name }]}
      products={allProducts().filter((p) => p.brand === slug)}
      searchParams={await searchParams}
      emptyMessage="Les produits de cette marque arrivent bientôt."
    />
  );
}
