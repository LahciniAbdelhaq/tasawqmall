import fs from 'node:fs';
import path from 'node:path';
import { db, parseJson } from './db';

export type Product = {
  id: number;
  slug: string;
  name: string;
  cats: string[];
  primaryCat?: string | null;
  tags: string[];
  images: string[];
  regularPrice: number;
  price: number;
  label: string | null;
  inStock: boolean;
  stockQty?: number | null;
  ean?: string | null;
  sku?: string | null;
  brand: string | null;
  shortDescription?: string | null;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  i18n: Record<string, { name?: string; shortDescription?: string; description?: string }>;
};
export type Category = {
  name: string; slug: string; parent: string | null; count: number;
  description?: string | null; image?: string | null; seoTitle?: string | null; seoDescription?: string | null;
  i18n: Record<string, { name?: string; description?: string }>;
};
export type Brand = { slug: string; name: string; logo?: string | null };
export type PageInfo = {
  file: string;
  kind: 'home' | 'category' | 'tag' | 'product' | 'boutique' | 'wishlist' | 'page';
  title: string;
  description: string;
  bodyClass: string;
  styles: string[];
  heading?: string;
  termDescription?: string;
};

const DATA = path.join(process.cwd(), 'data');
const json = <T,>(f: string): T => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));

type Snapshot = {
  products: Product[];
  bySlug: Map<string, Product>;
  byId: Map<number, Product>;
  categories: Record<string, Category>;
  tags: Record<string, string>;
  brands: Brand[];
  brandBySlug: Map<string, Brand>;
  pages: Record<string, PageInfo>;
};
let snap: Snapshot | null = null;
let version = '';

/**
 * Loads the published catalogue from the database into memory. Cheap to call on every
 * request: it re-reads only when an admin change bumped "catalog_version".
 */
export async function loadCatalog() {
  // version checked on every call: actions and pages may not share this module instance
  const v = (await db.setting.findUnique({ where: { key: 'catalog_version' } }))?.value ?? '0';
  if (snap && v === version) return;
  const [rows, cats, brandRows] = await Promise.all([
    db.product.findMany({ where: { published: true }, orderBy: [{ position: 'asc' }, { id: 'asc' }] }),
    db.category.findMany({ orderBy: [{ position: 'asc' }, { name: 'asc' }] }),
    db.brand.findMany({ orderBy: { name: 'asc' } }),
  ]);
  const products: Product[] = rows.map((r) => ({
    ...r,
    images: parseJson<string[]>(r.images, []),
    cats: parseJson<string[]>(r.cats, []),
    tags: parseJson<string[]>(r.tags, []),
    i18n: parseJson(r.i18n, {}),
  }));
  const categories: Record<string, Category> = {};
  for (const c of cats) categories[c.path] = { ...c, count: 0, i18n: parseJson(c.i18n, {}) };
  for (const p of products) for (const c of p.cats) if (categories[c]) categories[c].count++;
  snap = {
    products,
    bySlug: new Map(products.map((p) => [p.slug, p])),
    byId: new Map(products.map((p) => [p.id, p])),
    categories,
    tags: json('tags.json'),
    brands: brandRows,
    brandBySlug: new Map(brandRows.map((b) => [b.slug, b])),
    pages: json('pages.json'),
  };
  version = v;
}

/** Call after any catalogue change in the admin. */
export async function bumpCatalog() {
  const v = String(Date.now());
  await db.setting.upsert({ where: { key: 'catalog_version' }, create: { key: 'catalog_version', value: v }, update: { value: v } });
  snap = null;
}

function load(): Snapshot {
  if (!snap) throw new Error('Catalogue not loaded: call await loadCatalog() first');
  return snap;
}

export const allProducts = () => load().products;
export const getProduct = (slug: string) => load().bySlug.get(slug);
export const getProductById = (id: number) => load().byId.get(id);
export const categories = () => load().categories;
export const getCategory = (p: string) => load().categories[p];
export const tags = () => load().tags;
export const brands = () => load().brands;
export const getBrand = (slug: string) => load().brandBySlug.get(slug);
export const pageInfo = (route: string) => load().pages[route];
export const allPages = () => load().pages;

/** Product / category in the visitor's language (falls back to French). */
export function localize(p: Product, locale: string): Product {
  const tr = p.i18n?.[locale];
  return tr ? { ...p, name: tr.name || p.name, shortDescription: tr.shortDescription || p.shortDescription, description: tr.description || p.description } : p;
}
export function categoryName(path: string, locale: string, dict: Record<string, string> = {}) {
  const c = getCategory(path);
  if (!c) return path;
  return c.i18n?.[locale]?.name || dict[c.name] || c.name;
}

export function childCategories(parent: string | null) {
  return Object.entries(categories())
    .filter(([, c]) => c.parent === parent)
    .map(([p, c]) => ({ path: p, ...c }));
}

export function categoryTrail(p: string) {
  const trail: { path: string; name: string }[] = [];
  let cur: string | null = p;
  while (cur) {
    const c = getCategory(cur);
    if (!c) break;
    trail.unshift({ path: cur, name: c.name });
    cur = c.parent;
  }
  return trail;
}

/* ------------------------------------------------------------ searching */

export const fold = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function searchProducts(q: string) {
  const terms = fold(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const scored = allProducts().map((p) => {
    const hay = fold(`${p.name} ${Object.values(p.i18n || {}).map((t) => t.name || '').join(' ')} ${p.brand ? getBrand(p.brand)?.name ?? '' : ''} ${p.sku ?? ''} ${p.ean ?? ''}`);
    if (!terms.every((t) => hay.includes(t))) return null;
    const name = fold(p.name);
    const score = terms.reduce((s, t) => s + (name.startsWith(t) ? 3 : name.includes(` ${t}`) ? 2 : 1), 0);
    return { p, score };
  });
  return scored
    .filter((x): x is { p: Product; score: number } => !!x)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);
}

/* -------------------------------------------------------- list queries */

export type ListQuery = {
  orderby?: string;
  page?: number;
  perPage?: number;
  minPrice?: number;
  maxPrice?: number;
  brands?: string[];
};
export const PER_PAGE_OPTIONS = [9, 12, 18, 24];
export const ORDER_OPTIONS: [string, string][] = [
  ['popularity', 'Tri par popularité'],
  ['rating', 'Tri par notes moyennes'],
  ['date', 'Tri du plus récent au plus ancien'],
  ['price', 'Tri par tarif croissant'],
  ['price-desc', 'Tri par tarif décroissant'],
];

export function parseListQuery(sp: Record<string, string | string[] | undefined>): ListQuery {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : (sp[k] as string | undefined));
  const num = (k: string) => {
    const v = one(k);
    return v != null && v !== '' && !Number.isNaN(+v) ? +v : undefined;
  };
  const perPage = num('per_page');
  return {
    orderby: ORDER_OPTIONS.some(([k]) => k === one('orderby')) ? one('orderby') : 'popularity',
    page: Math.max(1, Math.floor(num('page') ?? 1)),
    perPage: perPage && PER_PAGE_OPTIONS.includes(perPage) ? perPage : 12,
    minPrice: num('min_price'),
    maxPrice: num('max_price'),
    brands: (one('marque') || '').split(',').filter(Boolean),
  };
}

export function runListQuery(base: Product[], q: ListQuery, keepOrder = false) {
  const prices = base.map((p) => p.price);
  const priceRange = {
    min: prices.length ? Math.floor(Math.min(...prices) / 10) * 10 : 0,
    max: prices.length ? Math.ceil(Math.max(...prices) / 10) * 10 : 0,
  };
  // brand facet counts are computed before the brand filter itself
  const priced = base.filter(
    (p) => (q.minPrice == null || p.price >= q.minPrice) && (q.maxPrice == null || p.price <= q.maxPrice),
  );
  const facet = new Map<string, number>();
  for (const p of priced) if (p.brand) facet.set(p.brand, (facet.get(p.brand) ?? 0) + 1);
  let list = q.brands?.length ? priced.filter((p) => p.brand && q.brands!.includes(p.brand)) : priced;

  if (!keepOrder || q.orderby !== 'popularity') {
    list = [...list];
    const stock = (p: Product) => (p.inStock ? 0 : 1);
    switch (q.orderby) {
      case 'price': list.sort((a, b) => stock(a) - stock(b) || a.price - b.price); break;
      case 'price-desc': list.sort((a, b) => stock(a) - stock(b) || b.price - a.price); break;
      case 'date': list.sort((a, b) => stock(a) - stock(b) || b.id - a.id); break;
      case 'rating': list.sort((a, b) => stock(a) - stock(b) || discount(b) - discount(a)); break;
      default: list.sort((a, b) => stock(a) - stock(b)); // keeps import order (site popularity)
    }
  }
  const total = list.length;
  const perPage = q.perPage ?? 12;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(q.page ?? 1, pages);
  return {
    items: list.slice((page - 1) * perPage, page * perPage),
    total,
    page,
    pages,
    perPage,
    priceRange,
    brandFacet: [...facet.entries()]
      .map(([slug, count]) => ({ slug, name: getBrand(slug)?.name ?? slug, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })),
  };
}

export const discount = (p: Product) =>
  p.regularPrice > p.price ? Math.round((1 - p.price / p.regularPrice) * 100) : 0;

/* --------------------------------------------------------------- money */

export const CURRENCY = 'د.م.';
export function money(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
