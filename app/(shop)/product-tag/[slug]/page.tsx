import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ArchivePage, { type SP } from '@/components/ArchivePage';
import { allProducts, loadCatalog, pageInfo, tags } from '@/lib/catalog';
import { pageContext } from '@/lib/page';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SP> };
const tagName = (slug: string) => pageInfo(`/product-tag/${slug}`)?.heading || tags()[slug];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await loadCatalog();
  const slug = decodeURIComponent((await params).slug);
  const name = tagName(slug);
  return name ? { title: name, alternates: { canonical: `/product-tag/${slug}` } } : {};
}

export default async function TagPage({ params, searchParams }: Props) {
  const tr = await pageContext();
  const slug = decodeURIComponent((await params).slug);
  const products = allProducts().filter((p) => p.tags.includes(slug.toLowerCase()));
  const name = tagName(slug);
  if (!name && !products.length) notFound();
  const label = tr.t(name || slug);
  return (
    <ArchivePage
      tr={tr}
      route={`/product-tag/${slug}`}
      basePath={`/product-tag/${slug}`}
      heading={label}
      crumbs={[{ label: tr.t('Accueil'), href: '/' }, { label }]}
      products={products}
      searchParams={await searchParams}
    />
  );
}
