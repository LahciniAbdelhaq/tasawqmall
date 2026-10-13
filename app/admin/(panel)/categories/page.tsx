import Link from 'next/link';
import { db, parseJson } from '@/lib/db';
import { PageTitle } from '@/components/admin/bits';
import Icon from '@/components/Icon';

export const metadata = { title: 'Catégories' };

export default async function CategoriesPage() {
  const [cats, products] = await Promise.all([
    db.category.findMany({ orderBy: [{ path: 'asc' }] }),
    db.product.findMany({ select: { cats: true } }),
  ]);
  const count = new Map<string, number>();
  for (const p of products) for (const c of parseJson<string[]>(p.cats, [])) count.set(c, (count.get(c) ?? 0) + 1);
  return (
    <>
      <PageTitle title="Catégories" sub={`${cats.length} catégories — arborescence des menus et des pages de la boutique.`}>
        <Link className="btn" href="/admin/categories/edit"><Icon name="plus" /> Nouvelle catégorie</Link>
      </PageTitle>
      <div className="card">
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Catégorie</th><th>URL</th><th className="num">Produits</th><th>SEO</th><th className="actions-col" /></tr></thead>
            <tbody>
              {cats.map((c) => (
                <tr key={c.path}>
                  <td style={{ paddingLeft: 16 + (c.path.split('/').length - 1) * 24 }}>
                    <Link className="row-link" href={`/admin/categories/edit?path=${encodeURIComponent(c.path)}`}>{c.path.includes('/') ? '↳ ' : ''}{c.name}</Link>
                  </td>
                  <td className="muted">/product-category/{c.path}</td>
                  <td className="num">{count.get(c.path) ?? 0}</td>
                  <td>{c.seoTitle || c.seoDescription ? <span className="pill green">Personnalisé</span> : <span className="pill gray">Auto</span>}</td>
                  <td><div className="row-actions"><a className="icon-btn" href={`/product-category/${c.path}`} target="_blank" rel="noreferrer" title="Voir">↗</a><Link className="icon-btn icon-btn--edit" href={`/admin/categories/edit?path=${encodeURIComponent(c.path)}`} title="Modifier">✎</Link></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
