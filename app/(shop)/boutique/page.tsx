import type { Metadata } from 'next';
import ArchivePage, { type SP } from '@/components/ArchivePage';
import { allProducts } from '@/lib/catalog';
import { pageContext } from '@/lib/page';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Boutique', alternates: { canonical: '/boutique' } };

export default async function ShopPage({ searchParams }: { searchParams: Promise<SP> }) {
  const tr = await pageContext();
  return (
    <ArchivePage
      tr={tr}
      route="/boutique"
      basePath="/boutique"
      heading={tr.t('Boutique')}
      crumbs={[{ label: tr.t('Accueil'), href: '/' }, { label: tr.t('Boutique') }]}
      products={allProducts()}
      searchParams={await searchParams}
    />
  );
}
