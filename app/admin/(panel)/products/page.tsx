import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { db, parseJson } from '@/lib/db';
import { PageTitle } from '@/components/admin/bits';
import Icon from '@/components/Icon';
import { money } from '@/lib/form';
import ProductTable from './ProductTable';

export const metadata = { title: 'Produits' };
const PER = 50;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string; brand?: string; stock?: string; status?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q || '').trim();
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.ProductWhereInput = {
    ...(q ? { OR: [{ name: { contains: q } }, { sku: { contains: q } }, { ean: { contains: q } }, { slug: { contains: q } }] } : {}),
    ...(sp.cat ? { cats: { contains: `"${sp.cat}"` } } : {}),
    ...(sp.brand ? { brand: sp.brand } : {}),
    ...(sp.stock === 'out' ? { inStock: false } : sp.stock === 'in' ? { inStock: true } : {}),
    ...(sp.status === 'draft' ? { published: false } : sp.status === 'published' ? { published: true } : {}),
  };
  const [products, total, cats, brands] = await Promise.all([
    db.product.findMany({ where, orderBy: [{ position: 'asc' }, { id: 'asc' }], skip: (page - 1) * PER, take: PER }),
    db.product.count({ where }),
    db.category.findMany({ orderBy: { path: 'asc' }, select: { path: true, name: true } }),
    db.brand.findMany({ orderBy: { name: 'asc' }, select: { slug: true, name: true } }),
  ]);
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
          <button className="btn btn-secondary btn-sm">Filtrer</button>
        </form>
        <ProductTable rows={products.map((p) => ({
          id: p.id, name: p.name, slug: p.slug, image: parseJson<string[]>(p.images, [])[0] ?? '', price: money(p.price),
          regular: p.regularPrice > p.price ? money(p.regularPrice) : '', label: p.label, inStock: p.inStock, stockQty: p.stockQty,
          published: p.published, brand: brands.find((b) => b.slug === p.brand)?.name ?? '', sku: p.sku ?? '',
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
