import { db } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { LOCALES } from '@/lib/locales';
import VisualEditor from './VisualEditor';

export const metadata = { title: 'Éditeur visuel' };

export default async function EditorPage({ searchParams }: { searchParams: Promise<{ path?: string }> }) {
  const [pages, s, product, cat] = await Promise.all([
    db.page.findMany({ orderBy: [{ kind: 'asc' }, { title: 'asc' }], select: { slug: true, title: true, kind: true } }),
    getSettings(),
    db.product.findFirst({ where: { published: true }, orderBy: { position: 'asc' }, select: { slug: true } }),
    db.category.findFirst({ orderBy: { position: 'asc' }, select: { path: true } }),
  ]);
  const targets = [
    ...pages.map((p) => ({ path: `/${p.slug}`, label: p.slug === '' ? 'Accueil' : p.title })),
    ...(product ? [{ path: `/product/${product.slug}`, label: 'Fiche produit (modèle commun)' }] : []),
    ...(cat ? [{ path: `/product-category/${cat.path}`, label: 'Page catégorie (modèle commun)' }] : []),
    { path: '/cart', label: 'Panier' },
    { path: '/checkout', label: 'Commande' },
  ];
  return (
    <VisualEditor
      initialPath={(await searchParams).path || '/'}
      targets={targets}
      locales={s.languages.enabled.filter((l) => LOCALES[l]).map((l) => ({ code: l, name: LOCALES[l].name }))}
    />
  );
}
