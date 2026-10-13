'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { bumpContent, type OverrideKind } from '@/lib/cms';
import { saveSetting } from '@/lib/settings';
import { bool, fail, json, ok, optStr, slugify, str, type Result } from '@/lib/form';

const KINDS: OverrideKind[] = ['text', 'html', 'src', 'alt', 'href', 'icon', 'hide', 'style', 'bg'];
const FRAGMENT = /^[\w\-/]{1,120}$/;

export type OverrideRow = { kind: string; locale: string; value: string; updatedAt: Date };

/** Current edits of one element (visual editor side panel). */
export async function getElementOverrides(fragment: string, key: string): Promise<OverrideRow[]> {
  await requireAdmin();
  return db.contentOverride.findMany({ where: { fragment, key }, select: { kind: true, locale: true, value: true, updatedAt: true } });
}

/** Saves several edits of one element at once; an empty value removes the edit (back to original). */
export async function saveElement(input: { fragment: string; key: string; locale: string; changes: { kind: OverrideKind; value: string }[] }): Promise<Result> {
  await requireAdmin();
  const { fragment, key, locale } = input;
  if (!FRAGMENT.test(fragment) || !/^[a-z]+\d+$/.test(key) || !/^[a-z]{2}$/.test(locale)) return fail('Élément invalide.');
  for (const c of input.changes) {
    if (!KINDS.includes(c.kind)) continue;
    const where = { fragment_key_locale_kind: { fragment, key, locale, kind: c.kind } };
    if (c.value === '' || (c.kind === 'hide' && c.value !== '1')) await db.contentOverride.deleteMany({ where: { fragment, key, locale, kind: c.kind } });
    else await db.contentOverride.upsert({ where, create: { fragment, key, locale, kind: c.kind, value: c.value.slice(0, 20000) }, update: { value: c.value.slice(0, 20000) } });
  }
  await bumpContent();
  return ok('Modification publiée sur le site.');
}

export async function resetElement(input: { fragment: string; key: string; locale?: string }): Promise<Result> {
  await requireAdmin();
  await db.contentOverride.deleteMany({ where: { fragment: input.fragment, key: input.key, ...(input.locale ? { locale: input.locale } : {}) } });
  await bumpContent();
  return ok('Élément remis à l’original.');
}

/** Text edits in bulk (translation tables): rows of { fragment, key, locale, value }. */
export async function saveTexts(_: Result, f: FormData): Promise<Result> {
  await requireAdmin();
  const rows = json<{ fragment: string; key: string; locale: string; value: string }[]>(f, 'rows', []);
  for (const r of rows) {
    if (!FRAGMENT.test(r.fragment) || !/^[a-z]+\d+$/.test(r.key) || !/^[a-z]{2}$/.test(r.locale)) continue;
    const where = { fragment: r.fragment, key: r.key, locale: r.locale, kind: 'text' };
    if (!r.value.trim()) await db.contentOverride.deleteMany({ where });
    else await db.contentOverride.upsert({ where: { fragment_key_locale_kind: where }, create: { ...where, value: r.value }, update: { value: r.value } });
  }
  await bumpContent();
  return ok(`${rows.length} texte(s) enregistré(s).`);
}

/* ------------------------------------------------------------------ pages */

export async function createPage(_: Result, f: FormData): Promise<Result> {
  await requireAdmin();
  const title = str(f, 'title');
  if (!title) return fail('Donnez un titre à la page.');
  const slug = slugify(str(f, 'slug') || title);
  if (!slug) return fail('URL invalide.');
  const reserved = ['admin', 'api', 'product', 'product-category', 'product-tag', 'marques', 'boutique', 'search', 'cart', 'checkout', 'commande', 'wishlist', 'my-account', 'l', 'uploads', 'assets'];
  if (reserved.includes(slug.split('/')[0])) return fail(`« ${slug} » est une adresse réservée par la boutique.`);
  if (await db.page.findUnique({ where: { slug } })) return fail(`Une page existe déjà à l’adresse /${slug}.`);
  const template = str(f, 'template');
  const blocks = template === 'landing'
    ? [
        { id: 'b1', type: 'banner', image: '/assets/images/e5a6a95d_imgi_27_BAN-KV-1920x800-1.png', title, subtitle: 'Découvrez notre sélection', buttonText: 'Voir les produits', buttonLink: '/boutique', height: 420, overlay: 25 },
        { id: 'b2', type: 'products', title: 'Nos meilleures offres', source: 'sale', limit: 8, columns: 4 },
        { id: 'b3', type: 'faq', title: 'Questions fréquentes', items: [{ q: 'Quels sont les délais de livraison ?', a: '<p>24 à 72 h partout au Maroc.</p>' }] },
      ]
    : [{ id: 'b1', type: 'text', html: `<p>Contenu de la page « ${title} ».</p>` }];
  const page = await db.page.create({ data: { slug, title, kind: 'custom', blocks: JSON.stringify(blocks), published: false } });
  redirect(`/admin/pages/${page.id}`);
}

export async function savePage(_: Result, f: FormData): Promise<Result> {
  await requireAdmin();
  const id = Number(f.get('id'));
  const page = await db.page.findUnique({ where: { id } });
  if (!page) return fail('Page introuvable.');
  const title = str(f, 'title') || page.title;
  let slug = page.slug;
  if (page.kind === 'custom') {
    slug = slugify(str(f, 'slug') || title);
    const clash = await db.page.findFirst({ where: { slug, NOT: { id } } });
    if (clash) return fail(`L’adresse /${slug} est déjà utilisée.`);
  }
  await db.page.update({
    where: { id },
    data: {
      title, slug,
      published: page.slug === '' ? true : bool(f, 'published'),
      seoTitle: optStr(f, 'seoTitle'), seoDescription: optStr(f, 'seoDescription'), ogImage: optStr(f, 'ogImage'),
      i18n: JSON.stringify(json<Record<string, unknown>>(f, 'i18n', {})),
      ...(page.kind === 'custom' ? { blocks: JSON.stringify(json<unknown[]>(f, 'blocks', [])) } : {}),
    },
  });
  revalidatePath('/admin/pages');
  return ok('Page enregistrée.');
}

export async function duplicatePage(f: FormData) {
  await requireAdmin();
  const p = await db.page.findUnique({ where: { id: Number(f.get('id')) } });
  if (!p || p.kind !== 'custom') return;
  let slug = `${p.slug}-copie`, n = 2;
  while (await db.page.findUnique({ where: { slug } })) slug = `${p.slug}-copie-${n++}`;
  const copy = await db.page.create({ data: { slug, title: `${p.title} (copie)`, kind: 'custom', blocks: p.blocks, i18n: p.i18n, published: false } });
  redirect(`/admin/pages/${copy.id}`);
}

export async function deletePage(f: FormData) {
  await requireAdmin();
  const p = await db.page.findUnique({ where: { id: Number(f.get('id')) } });
  if (!p || p.kind !== 'custom') return;
  await db.page.delete({ where: { id: p.id } });
  revalidatePath('/admin/pages');
  redirect('/admin/pages');
}

/* ------------------------------------------------------------------ menus */
export async function saveMenus(_: Result, f: FormData): Promise<Result> {
  await requireAdmin();
  type Item = { label: string; href: string; icon?: string; newTab?: boolean };
  const clean = (items: Item[]) => items.filter((i) => i.label && i.href).map((i) => ({ label: i.label.slice(0, 60), href: i.href.slice(0, 300), icon: i.icon || '', newTab: !!i.newTab }));
  await saveSetting('menus', { headerExtra: clean(json<Item[]>(f, 'headerExtra', [])), mobileExtra: clean(json<Item[]>(f, 'mobileExtra', [])) });
  return ok('Menus enregistrés.');
}
