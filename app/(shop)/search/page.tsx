import type { Metadata } from 'next';
import ArchivePage, { type SP } from '@/components/ArchivePage';
import { searchProducts } from '@/lib/catalog';
import { pageContext } from '@/lib/page';

export const dynamic = 'force-dynamic';
type Props = { searchParams: Promise<SP> };
const term = (sp: SP) => (Array.isArray(sp.s) ? sp.s[0] : sp.s ?? '').trim();

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  // search results are not indexed (thin, duplicate content)
  return { title: `Résultats de recherche pour « ${term(await searchParams)} »`, robots: { index: false, follow: true } };
}

export default async function SearchPage({ searchParams }: Props) {
  const tr = await pageContext();
  const sp = await searchParams;
  const q = term(sp);
  return (
    <ArchivePage
      tr={tr}
      route="/search"
      basePath="/search"
      heading={q ? tr.t('Résultats de recherche : “{q}”', { q }) : tr.t('Recherche')}
      crumbs={[{ label: tr.t('Accueil'), href: '/' }, { label: q ? tr.t('Résultats de recherche : “{q}”', { q }) : tr.t('Recherche') }]}
      products={searchProducts(q)}
      searchParams={sp}
      keepOrder
      emptyMessage="Aucun produit ne correspond à votre recherche."
    />
  );
}
