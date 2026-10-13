import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, parseJson } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { LOCALES } from '@/lib/locales';
import { PageTitle } from '@/components/admin/bits';
import { deleteProduct } from '../../../actions/catalog';
import ProductForm from './ProductForm';
import { ConfirmButton } from '@/components/admin/ui';
import ProductVisitors from '@/components/admin/ProductVisitors';

export const metadata = { title: 'Produit' };

export default async function ProductEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  const isNew = id === 'new';
  const [p, cats, brands, s] = await Promise.all([
    isNew ? null : db.product.findUnique({ where: { id: Number(id) } }),
    db.category.findMany({ orderBy: [{ path: 'asc' }], select: { path: true, name: true } }),
    db.brand.findMany({ orderBy: { name: 'asc' } }),
    getSettings(),
  ]);
  if (!isNew && !p) notFound();
  const sold = p ? (await db.order.findMany({ where: { lines: { contains: `"id":${p.id},` } }, select: { id: true } })).length : 0;
  return (
    <>
      <Link className="back-link" href="/admin/products">← Produits</Link>
      <PageTitle title={p ? p.name : 'Nouveau produit'} sub={p ? <>#{p.id} · présent dans {sold} commande(s)</> : undefined}>
        {p && <a className="btn btn-secondary btn-sm" href={`/product/${p.slug}`} target="_blank" rel="noreferrer">Voir sur le site ↗</a>}
      </PageTitle>
      {(await searchParams).created && <div className="alert ok">Produit créé.</div>}
      <ProductForm
        p={p ? {
          id: p.id, name: p.name, slug: p.slug, brand: p.brand ?? '', price: p.price, regularPrice: p.regularPrice, label: p.label ?? '',
          images: parseJson<string[]>(p.images, []), cats: parseJson<string[]>(p.cats, []), primaryCat: p.primaryCat ?? '',
          tags: parseJson<string[]>(p.tags, []).join(', '), inStock: p.inStock, stockQty: p.stockQty, sku: p.sku ?? '', ean: p.ean ?? '',
          shortDescription: p.shortDescription ?? '', description: p.description ?? '', published: p.published,
          seoTitle: p.seoTitle ?? '', seoDescription: p.seoDescription ?? '', i18n: parseJson(p.i18n, {}),
        } : null}
        cats={cats}
        brands={brands.map((b) => ({ slug: b.slug, name: b.name }))}
        locales={s.languages.enabled.filter((l) => l !== 'fr' && LOCALES[l]).map((l) => ({ code: l, name: LOCALES[l].name }))}
        siteUrl={s.seo.siteUrl}
      />
      {p && <ProductVisitors slug={p.slug} />}
      {p && (
        <form action={deleteProduct} style={{ marginTop: 16 }}>
          <input type="hidden" name="id" value={p.id} />
          <ConfirmButton message="Supprimer définitivement ce produit ?">Supprimer ce produit</ConfirmButton>
        </form>
      )}
    </>
  );
}
