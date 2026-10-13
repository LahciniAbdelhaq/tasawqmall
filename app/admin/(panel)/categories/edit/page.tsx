import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, parseJson } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { LOCALES } from '@/lib/locales';
import { PageTitle } from '@/components/admin/bits';
import { deleteCategory } from '../../../actions/catalog';
import { ConfirmButton } from '@/components/admin/ui';
import CategoryForm from './CategoryForm';

export const metadata = { title: 'Catégorie' };

export default async function CategoryEdit({ searchParams }: { searchParams: Promise<{ path?: string; created?: string }> }) {
  const sp = await searchParams;
  const [c, all, s] = await Promise.all([
    sp.path ? db.category.findUnique({ where: { path: sp.path } }) : null,
    db.category.findMany({ orderBy: { path: 'asc' }, select: { path: true, name: true } }),
    getSettings(),
  ]);
  if (sp.path && !c) notFound();
  const children = c ? await db.category.count({ where: { parent: c.path } }) : 0;
  return (
    <>
      <Link className="back-link" href="/admin/categories">← Catégories</Link>
      <PageTitle title={c ? c.name : 'Nouvelle catégorie'} sub={c ? `/product-category/${c.path}` : undefined}>
        {c && <a className="btn btn-secondary btn-sm" href={`/product-category/${c.path}`} target="_blank" rel="noreferrer">Voir ↗</a>}
      </PageTitle>
      {sp.created && <div className="alert ok">Catégorie créée.</div>}
      <CategoryForm
        c={c ? { path: c.path, name: c.name, slug: c.slug, parent: c.parent ?? '', image: c.image ?? '', description: c.description ?? '', seoTitle: c.seoTitle ?? '', seoDescription: c.seoDescription ?? '', position: c.position, i18n: parseJson(c.i18n, {}) } : null}
        parents={all.filter((x) => !c || (x.path !== c.path && !x.path.startsWith(c.path + '/')))}
        locales={s.languages.enabled.filter((l) => l !== 'fr' && LOCALES[l]).map((l) => ({ code: l, name: LOCALES[l].name }))}
        siteUrl={s.seo.siteUrl}
      />
      {c && (children === 0 ? (
        <form action={deleteCategory} style={{ marginTop: 16 }}>
          <input type="hidden" name="path" value={c.path} />
          <ConfirmButton message="Supprimer cette catégorie ? Les produits ne sont pas supprimés.">Supprimer la catégorie</ConfirmButton>
        </form>
      ) : <p className="muted" style={{ marginTop: 16 }}>Cette catégorie a {children} sous-catégorie(s) : supprimez-les d’abord.</p>)}
    </>
  );
}
