import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, parseJson } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { LOCALES } from '@/lib/locales';
import { PageTitle } from '@/components/admin/bits';
import { ConfirmButton } from '@/components/admin/ui';
import { deletePage, duplicatePage } from '../../../actions/content';
import PageForm from './PageForm';

export const metadata = { title: 'Page' };

export default async function PageEdit({ params }: { params: Promise<{ id: string }> }) {
  const p = await db.page.findUnique({ where: { id: Number((await params).id) } });
  if (!p) notFound();
  const [s, cats, brands] = await Promise.all([
    getSettings(),
    db.category.findMany({ orderBy: { path: 'asc' }, select: { path: true, name: true } }),
    db.brand.findMany({ orderBy: { name: 'asc' }, select: { slug: true, name: true } }),
  ]);
  return (
    <>
      <Link className="back-link" href="/admin/pages">← Pages</Link>
      <PageTitle title={p.slug === '' ? 'Accueil' : p.title} sub={`/${p.slug}`}>
        <a className="btn btn-secondary btn-sm" href={`/${p.slug}`} target="_blank" rel="noreferrer">Voir ↗</a>
        {p.kind === 'builtin' && <Link className="btn btn-sm" href={`/admin/editor?path=/${p.slug}`}>Modifier le contenu (éditeur visuel)</Link>}
        {p.kind === 'custom' && (
          <form action={duplicatePage}><input type="hidden" name="id" value={p.id} /><button className="btn btn-secondary btn-sm">Dupliquer</button></form>
        )}
      </PageTitle>
      <PageForm
        p={{ id: p.id, slug: p.slug, title: p.title, kind: p.kind, published: p.published, seoTitle: p.seoTitle ?? '', seoDescription: p.seoDescription ?? '', ogImage: p.ogImage ?? '', i18n: parseJson(p.i18n, {}), blocks: parseJson(p.blocks, []) }}
        locales={s.languages.enabled.filter((l) => l !== 'fr' && LOCALES[l]).map((l) => ({ code: l, name: LOCALES[l].name }))}
        siteUrl={s.seo.siteUrl}
        cats={cats}
        brands={brands}
      />
      {p.kind === 'custom' && (
        <form action={deletePage} style={{ marginTop: 16 }}>
          <input type="hidden" name="id" value={p.id} />
          <ConfirmButton message="Supprimer définitivement cette page ?">Supprimer la page</ConfirmButton>
        </form>
      )}
    </>
  );
}
