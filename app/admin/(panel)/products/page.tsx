import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { db, parseJson } from '@/lib/db';
import { PageTitle } from '@/components/admin/bits';
import Icon from '@/components/Icon';
import { money } from '@/lib/form';
import ProductTable from './ProductTable';
import { productCounts } from '@/lib/analytics';

export const metadata = { title: 'Produits' };
const PER = 50;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string; brand?: string; stock?: string; status?: string; sort?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q || '').trim();
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.ProductWhereInput = {
    ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { sku: { contains: q, mode: 'insensitive' } }, { ean: { contains: q, mode: 'insensitive' } }, { slug: { contains: q, mode: 'insensitive' } }] } : {}),
    ...(sp.cat ? { cats: { contains: `"${sp.cat}"` } } : {}),
    ...(sp.brand ? { brand: sp.brand } : {}),
    ...(sp.stock === 'out' ? { inStock: false } : sp.stock === 'in' ? { inStock: true } : {}),
    ...(sp.status === 'draft' ? { published: false } : sp.status === 'published' ? { published: true } : {}),
  };
  const byViews = sp.sort === 'views';
  // "most viewed": rank every matching product by its 30-day visitors, then page through them
  const ranked = byViews ? await db.product.findMany({ where, select: { id: true, slug: true } }) : [];
  const rankCounts = byViews ? await productCounts(ranked.map((p) => p.slug), 30) : null;
  const pageIds = byViews
    ? ranked.sort((a, b) => (rankCounts!.get(b.slug)?.visitors ?? 0) - (rankCounts!.get(a.slug)?.visitors ?? 0) || (rankCounts!.get(b.slug)?.views ?? 0) - (rankCounts!.get(a.slug)?.views ?? 0) || a.id - b.id)
      .slice((page - 1) * PER, page * PER).map((p) => p.id)
    : null;
  const [found, total, cats, brands] = await Promise.all([
    pageIds
      ? db.product.findMany({ where: { id: { in: pageIds } } })
      : db.product.findMany({ where, orderBy: [{ position: 'asc' }, { id: 'asc' }], skip: (page - 1) * PER, take: PER }),
    db.product.count({ where }),
    db.category.findMany({ orderBy: { path: 'asc' }, select: { path: true, name: true } }),
    db.brand.findMany({ orderBy: { name: 'asc' }, select: { slug: true, name: true } }),
  ]);
  const products = pageIds ? pageIds.map((id) => found.find((p) => p.id === id)!).filter(Boolean) : found;
  const counts = rankCounts ?? await productCounts(products.map((p) => p.slug), 30);
  const usedBrands = new Set((await db.product.findMany({ select: { brand: true }, distinct: ['brand'] })).map((b) => b.brand));
  const link = (p: Record<string, string | number>) => `/admin/products?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([, v]) => v)), ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v)])) } as Record<string, string>)}`;

  return (
    <>
      <PageTitle title="Produits" sub={`${total} produit(s)`}>
        <Link className="btn" href="/admin/products/new"><Icon name="plus" /> Nouveau produit</Link>
      </PageTitle>
      <div className="card">
        <form className="toolbar">
          <input className="input" name="q" defaultValue={q} placeholder="Nom, UGS, EAN…" />
          <select className="input" name="cat" defaultValue={sp.cat || ''} style={{ maxWidth: 220 }}>
            <option value="">Toutes les catégories</option>
            {cats.map((c) => <option key={c.path} value={c.path}>{'— '.repeat(c.path.split('/').length - 1)}{c.name}</option>)}
          </select>
          <select className="input" name="brand" defaultValue={sp.brand || ''} style={{ maxWidth: 180 }}>
            <option value="">Toutes les marques</option>
            {brands.filter((b) => usedBrands.has(b.slug)).map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
          </select>
          <select className="input" name="stock" defaultValue={sp.stock || ''} style={{ maxWidth: 150 }}>
            <option value="">Tout stock</option><option value="in">En stock</option><option value="out">Rupture</option>
          </select>
          <select className="input" name="status" defaultValue={sp.status || ''} style={{ maxWidth: 150 }}>
            <option value="">Tous statuts</option><option value="published">Publiés</option><option value="draft">Brouillons</option>
          </select>
          <select className="input" name="sort" defaultValue={sp.sort || ''} style={{ maxWidth: 190 }}>
            <option value="">Ordre de la boutique</option><option value="views">Les plus consultés (30 j)</option>
          </select>
          <button className="btn btn-secondary btn-sm">Filtrer</button>
        </form>
        <ProductTable rows={products.map((p) => ({
          id: p.id, name: p.name, slug: p.slug, image: parseJson<string[]>(p.images, [])[0] ?? '', price: money(p.price),
          regular: p.regularPrice > p.price ? money(p.regularPrice) : '', label: p.label, inStock: p.inStock, stockQty: p.stockQty,
          published: p.published, brand: brands.find((b) => b.slug === p.brand)?.name ?? '', sku: p.sku ?? '',
          views: counts.get(p.slug)?.views ?? 0, visitors: counts.get(p.slug)?.visitors ?? 0,
        }))} />
        <div className="pager">
          <span>Page {page} / {Math.max(1, Math.ceil(total / PER))}</span>
          <span style={{ display: 'flex', gap: 8 }}>
            {page > 1 && <a className="btn btn-secondary btn-sm" href={link({ page: page - 1 })}>← Précédent</a>}
            {page * PER < total && <a className="btn btn-secondary btn-sm" href={link({ page: page + 1 })}>Suivant →</a>}
          </span>
        </div>
      </div>
    </>
  );
}
