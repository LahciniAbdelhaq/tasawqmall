'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { bumpCatalog } from '@/lib/catalog';
import { bool, fail, json, num, ok, optNum, optStr, slugify, str, type Result } from '@/lib/form';

export async function saveProduct(_: Result, f: FormData): Promise<Result> {
  await requireAdmin();
  const id = num(f, 'id');
  const name = str(f, 'name');
  if (!name) return fail('Le nom est obligatoire.');
  const slug = slugify(str(f, 'slug') || name);
  const clash = await db.product.findFirst({ where: { slug, NOT: id ? { id } : undefined } });
  if (clash) return fail(`L’URL « ${slug} » est déjà utilisée par « ${clash.name} ».`);
  const price = num(f, 'price', NaN);
  if (!(price >= 0)) return fail('Le prix de vente est obligatoire.');
  const regularPrice = Math.max(price, num(f, 'regularPrice', price));
  const cats = json<string[]>(f, 'cats', []);
  const images = json<string[]>(f, 'images', []).filter(Boolean);
  const stockQty = optNum(f, 'stockQty');
  const autoLabel = regularPrice > price ? `-${Math.round((1 - price / regularPrice) * 100)}%` : null;
  const data = {
    name, slug, price, regularPrice,
    brand: optStr(f, 'brand'),
    label: str(f, 'label') || autoLabel,
    images: JSON.stringify(images),
    cats: JSON.stringify(cats),
    primaryCat: optStr(f, 'primaryCat') || cats.sort((a, b) => b.split('/').length - a.split('/').length)[0] || null,
    tags: JSON.stringify(str(f, 'tags').split(',').map((t) => slugify(t)).filter(Boolean)),
    inStock: bool(f, 'inStock') && (stockQty == null || stockQty > 0),
    stockQty,
    sku: optStr(f, 'sku'), ean: optStr(f, 'ean'),
    shortDescription: optStr(f, 'shortDescription'), description: optStr(f, 'description'),
    published: bool(f, 'published'),
    seoTitle: optStr(f, 'seoTitle'), seoDescription: optStr(f, 'seoDescription'),
    i18n: JSON.stringify(json<Record<string, unknown>>(f, 'i18n', {})),
  };
  let savedId = id;
  if (id) await db.product.update({ where: { id }, data });
  else {
    const max = await db.product.aggregate({ _max: { id: true, position: true } });
    savedId = (max._max.id ?? 0) + 1;
    await db.product.create({ data: { ...data, id: savedId, position: (max._max.position ?? 0) + 1 } });
  }
  if (data.brand && !(await db.brand.findUnique({ where: { slug: data.brand } }))) {
    await db.brand.create({ data: { slug: data.brand, name: str(f, 'brandName') || data.brand } });
  }
  await bumpCatalog();
  revalidatePath('/admin/products');
  if (!id) redirect(`/admin/products/${savedId}?created=1`);
  return ok('Produit enregistré.', savedId);
}

export async function deleteProduct(f: FormData) {
  await requireAdmin();
  await db.product.delete({ where: { id: Number(f.get('id')) } });
  await bumpCatalog();
  revalidatePath('/admin/products');
  redirect('/admin/products');
}

/** Bulk actions from the product list: publish / unpublish / in stock / out of stock / price change. */
export async function bulkProducts(_: Result, f: FormData): Promise<Result> {
  await requireAdmin();
  const ids = json<number[]>(f, 'ids', []);
  const action = str(f, 'action');
  if (!ids.length) return fail('Sélectionnez au moins un produit.');
  const where = { id: { in: ids } };
  switch (action) {
    case 'publish': await db.product.updateMany({ where, data: { published: true } }); break;
    case 'unpublish': await db.product.updateMany({ where, data: { published: false } }); break;
    case 'instock': await db.product.updateMany({ where, data: { inStock: true } }); break;
    case 'outofstock': await db.product.updateMany({ where, data: { inStock: false } }); break;
    case 'discount': {
      const pct = num(f, 'value');
      if (!(pct > 0 && pct < 100)) return fail('Remise entre 1 et 99 %.');
      for (const p of await db.product.findMany({ where })) {
        const price = Math.round(p.regularPrice * (1 - pct / 100) * 100) / 100;
        await db.product.update({ where: { id: p.id }, data: { price, label: `-${pct}%` } });
      }
      break;
    }
    case 'clearDiscount': {
      for (const p of await db.product.findMany({ where })) await db.product.update({ where: { id: p.id }, data: { price: p.regularPrice, label: null } });
      break;
    }
    case 'delete': await db.product.deleteMany({ where }); break;
    default: return fail('Action inconnue.');
  }
  await bumpCatalog();
  revalidatePath('/admin/products');
  return ok(`${ids.length} produit(s) mis à jour.`);
}

export async function saveCategory(_: Result, f: FormData): Promise<Result> {
  await requireAdmin();
  const original = str(f, 'original');
  const name = str(f, 'name');
  if (!name) return fail('Le nom est obligatoire.');
  const parent = optStr(f, 'parent');
  const slug = slugify(str(f, 'slug') || name);
  const path = parent ? `${parent}/${slug}` : slug;
  if (original && path !== original) return fail('Le chemin d’une catégorie existante ne peut pas changer (les liens et produits en dépendent).');
  if (!original && (await db.category.findUnique({ where: { path } }))) return fail(`La catégorie « ${path} » existe déjà.`);
  const data = {
    name, slug, parent,
    image: optStr(f, 'image'), description: optStr(f, 'description'),
    seoTitle: optStr(f, 'seoTitle'), seoDescription: optStr(f, 'seoDescription'),
    i18n: JSON.stringify(json<Record<string, unknown>>(f, 'i18n', {})),
    position: num(f, 'position'),
  };
  if (original) await db.category.update({ where: { path: original }, data });
  else await db.category.create({ data: { ...data, path } });
  await bumpCatalog();
  revalidatePath('/admin/categories');
  if (!original) redirect(`/admin/categories/edit?path=${encodeURIComponent(path)}&created=1`);
  return ok('Catégorie enregistrée.');
}

export async function deleteCategory(f: FormData) {
  await requireAdmin();
  const path = String(f.get('path'));
  const children = await db.category.count({ where: { parent: path } });
  if (children) return;
  await db.category.delete({ where: { path } });
  await bumpCatalog();
  revalidatePath('/admin/categories');
}
