/**
 * Server-side HTML renderers. They emit the exact Woodmart/WooCommerce markup of the
 * original theme so the original stylesheet styles them unchanged.
 */
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import {
  CURRENCY, ORDER_OPTIONS, PER_PAGE_OPTIONS, type ListQuery, type Product,
  categories, categoryName, categoryTrail, getBrand, getCategory, localize, money,
} from './catalog';
import { renderFragment } from './cms';
import { translate } from './dictionary';

/** language context passed to every renderer */
export type Tr = { locale: string; dict: Record<string, string>; t: (s: string, v?: Record<string, string | number>) => string };
export const FR: Tr = { locale: 'fr', dict: {}, t: (s, v) => translate({}, s, v) };

const HTML_DIR = path.join(process.cwd(), 'data', 'html');
const fileCache = new Map<string, string>();
export function htmlFile(rel: string): string {
  if (!fileCache.has(rel) || process.env.NODE_ENV === 'development') {
    const f = path.join(HTML_DIR, rel);
    fileCache.set(rel, fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '');
  }
  return fileCache.get(rel)!;
}

export const esc = (s: string | number | null | undefined) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const productUrl = (p: Product) => `/product/${p.slug}`;
export const categoryUrl = (p: string) => `/product-category/${p}`;

export function amount(n: number) {
  return `<span class="woocommerce-Price-amount amount"><bdi><span class="woocommerce-Price-currencySymbol">${CURRENCY}</span>${money(n)}</bdi></span>`;
}

export function priceHtml(p: Product, tag: 'span' | 'p' = 'span') {
  if (p.regularPrice > p.price) {
    return `<${tag} class="price"><del aria-hidden="true">${amount(p.regularPrice)}</del> <span class="screen-reader-text">Le prix initial était&nbsp;: ${CURRENCY}${money(p.regularPrice)}.</span><ins aria-hidden="true">${amount(p.price)}</ins><span class="screen-reader-text">Le prix actuel est&nbsp;: ${CURRENCY}${money(p.price)}.</span></${tag}>`;
  }
  return `<${tag} class="price">${amount(p.price)}</${tag}>`;
}

function labelHtml(p: Product, tr: Tr = FR) {
  const labels: string[] = [];
  if (p.label && p.regularPrice > p.price) labels.push(`<span class="onsale product-label">${esc(p.label)}</span>`);
  if (!p.inStock) labels.push(`<span class="out-of-stock product-label">${tr.t('Rupture de stock')}</span>`);
  return labels.length ? `<div class="product-labels labels-rounded-sm">${labels.join('')}</div>` : '';
}

function productClasses(p: Product) {
  return [
    'product', 'type-product', `post-${p.id}`, 'status-publish', p.inStock ? 'instock' : 'outofstock',
    ...p.cats.map((c) => `product_cat-${c.split('/').pop()}`),
    ...p.tags.map((t) => `product_tag-${t}`),
    'has-post-thumbnail', p.regularPrice > p.price ? 'sale' : '', 'shipping-taxable',
    p.inStock ? 'purchasable' : '', 'product-type-simple',
  ].filter(Boolean).join(' ');
}

/** Product card, identical to the theme's "buttons on hover" grid item. */
export function cardHtml(source: Product, loop = 1, tr: Tr = FR) {
  const p = localize(source, tr.locale);
  const url = productUrl(p);
  const name = esc(p.name);
  const img = p.images[0] ?? '';
  const cats = p.cats.filter((c) => getCategory(c)).slice(0, 7)
    .map((c) => `<a href="${categoryUrl(c)}" rel="tag">${esc(categoryName(c, tr.locale, tr.dict))}</a>`).join(', ');
  const button = p.inStock
    ? `<a href="${url}" data-quantity="1" class="button product_type_simple add_to_cart_button ajax_add_to_cart add-to-cart-loop" data-product_id="${p.id}" data-product_sku="${esc(p.sku)}" aria-label="${esc(tr.t('Ajouter au panier'))}&nbsp;: “${name}”" rel="nofollow" role="button"><span>${tr.t('Ajouter au panier')}</span></a>`
    : `<a href="${url}" class="button product_type_simple add-to-cart-loop" aria-label="En savoir plus sur “${name}”" rel="nofollow"><span>${tr.t('Lire la suite')}</span></a>`;
  return `<div class="wd-product wd-with-labels wd-hover-buttons-on-hover wd-col product-grid-item ${productClasses(p)}" data-loop="${loop}" data-id="${p.id}"><div class="product-wrapper"><div class="product-element-top wd-quick-shop"> <a href="${url}" class="product-image-link" tabindex="-1" aria-label="${name}">${labelHtml(p, tr)}<img src="${esc(img)}" width="400" height="457" class="attachment-400x457 size-400x457" alt="${name}" decoding="async" loading="${loop <= 4 ? 'eager' : 'lazy'}"> </a><div class="wd-buttons wd-pos-r-t"><div class="wd-wishlist-btn wd-action-btn wd-style-icon wd-wishlist-icon"> <a class="" href="/wishlist" data-product-id="${p.id}" rel="nofollow" data-added-text="${esc(tr.t('Browse wishlist'))}"> <span class="wd-added-icon"></span> <span class="wd-action-text">${tr.t('Add to wishlist')}</span> </a></div></div></div><div class="product-element-bottom"><div class="wd-product-header"><h3 class="wd-entities-title"><a href="${url}">${name}</a></h3></div><div class="wd-product-cats"> ${cats}</div><div class="wrap-price"> ${priceHtml(p)}${p.ean ? ` <span class="sku_wrapper ean_wrapper">EAN: <span class="ean">${esc(p.ean)}</span></span>` : ''}</div>${p.sku ? `<div class="wd-product-detail wd-product-sku"> <span class="wd-label"> UGS </span> <span> ${esc(p.sku)} </span></div>` : ''}<div class="wd-product-footer"><div class="wd-add-btn wd-add-btn-replace"> ${button}</div></div></div></div></div>`;
}

export function breadcrumbHtml(items: { label: string; href?: string }[]) {
  const parts = items.map((it, i) => {
    const last = i === items.length - 1;
    if (last) return `<span class="wd-last"> ${esc(it.label)} </span>`;
    const lastLink = i === items.length - 2;
    return `<a href="${it.href}"${lastLink ? ' class="wd-last-link"' : ''}> ${esc(it.label)} </a>`;
  });
  return `<nav class="wd-breadcrumbs woocommerce-breadcrumb" aria-label="Breadcrumb"> ${parts.join(' <span class="wd-delimiter"></span> ')}</nav>`;
}

export function withQuery(base: string, params: Record<string, string | number | undefined | null>, current: URLSearchParams) {
  const q = new URLSearchParams(current);
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === '') q.delete(k);
    else q.set(k, String(v));
  }
  if (q.get('page') === '1') q.delete('page');
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}

export function paginationHtml(page: number, pages: number, href: (n: number) => string) {
  if (pages <= 1) return '';
  const nums = new Set<number>([1, 2, pages - 1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const sorted = [...nums].sort((a, b) => a - b);
  const out: string[] = [];
  if (page > 1) out.push(`<li><a class="prev page-numbers" href="${href(page - 1)}">←</a></li>`);
  sorted.forEach((n, i) => {
    if (i && n - sorted[i - 1] > 1) out.push('<li><span class="page-numbers dots">…</span></li>');
    out.push(n === page
      ? `<li><span aria-label="Page ${n}" aria-current="page" class="page-numbers current">${n}</span></li>`
      : `<li><a aria-label="Page ${n}" class="page-numbers" href="${href(n)}">${n}</a></li>`);
  });
  if (page < pages) out.push(`<li><a class="next page-numbers" href="${href(page + 1)}">→</a></li>`);
  return `<nav class="woocommerce-pagination wd-pagination" aria-label="Pagination des produits"><ul class="page-numbers">${out.join('')}</ul></nav>`;
}

/* ------------------------------------------------------------ archive */

export type ArchiveInput = {
  basePath: string;
  heading: string;
  crumbs: { label: string; href?: string }[];
  result: {
    items: Product[]; total: number; page: number; pages: number; perPage: number;
    priceRange: { min: number; max: number };
    brandFacet: { slug: string; name: string; count: number }[];
  };
  query: ListQuery;
  search: URLSearchParams;
  currentCategory?: string;
  description?: string;
  emptyMessage?: string;
};

export async function renderArchive(a: ArchiveInput, tr: Tr = FR) {
  const $ = cheerio.load(htmlFile('templates/archive.html'), null, false);
  const { result: r, query: q, search, basePath } = a;
  const link = (p: Record<string, string | number | undefined | null>) => withQuery(basePath, p, search);

  $('.wd-woo-page-title .title').text(` ${a.heading} `);
  $('.wd-el-breadcrumbs .elementor-widget-container').html(breadcrumbHtml(a.crumbs));

  // toolbar
  const first = r.total ? (r.page - 1) * r.perPage + 1 : 0;
  const last = Math.min(r.total, r.page * r.perPage);
  $('.woocommerce-result-count').text(
    r.total === 0 ? tr.t('Aucun produit trouvé') : r.total === 1 ? tr.t('Affichage du seul résultat') : tr.t('Affichage de {from}–{to} sur {total} résultats', { from: first, to: last, total: r.total }),
  );
  $('.wd-products-per-page a, .per-page-variation').each((_, el) => {
    const n = +$(el).text().trim();
    if (!PER_PAGE_OPTIONS.includes(n)) return;
    $(el).attr('href', link({ per_page: n === 12 ? null : n, page: null }));
    $(el).toggleClass('current-variation', n === r.perPage);
  });
  $('.wd-products-shop-view a').each((_, el) => {
    const m = ($(el).attr('href') || '').match(/per_row=(\d)/);
    const view = ($(el).attr('href') || '').includes('shop_view=list') ? 'list' : 'grid';
    $(el).attr('href', link({ shop_view: view, per_row: m ? m[1] : null }));
  });
  const form = $('form.woocommerce-ordering');
  form.attr('action', basePath).attr('method', 'get');
  form.find('input[type="hidden"]').remove();
  for (const [k, v] of search) if (!['orderby', 'page'].includes(k)) form.append(`<input type="hidden" name="${esc(k)}" value="${esc(v)}">`);
  form.find('select.orderby').html(
    ORDER_OPTIONS.map(([k, label]) => `<option value="${k}"${k === q.orderby ? ' selected="selected"' : ''}>${tr.t(label)}</option>`).join(''),
  );

  // products + pagination
  const grid = $('.wd-products').first();
  grid.removeAttr('data-source data-min_price data-max_price');
  const perRow = +(search.get('per_row') || 0);
  if (perRow >= 2 && perRow <= 6) {
    grid.attr('style', (grid.attr('style') || '').replace(/--wd-col-lg:\d/, `--wd-col-lg:${perRow}`));
    grid.attr('class', (grid.attr('class') || '').replace(/grid-columns-\d/, `grid-columns-${perRow}`));
  }
  const cards = r.items.map((p, i) => cardHtml(p, i + 1, tr)).join('');
  const empty = `<p class="woocommerce-info wc-empty-message" role="status">${esc(tr.t(a.emptyMessage || 'Aucun produit ne correspond à votre sélection.'))}</p>`;
  let html = $.html().replace('<!--PRODUCTS-->', cards);
  html = html.replace('<!--PAGINATION-->', paginationHtml(r.page, r.pages, (n) => link({ page: n })));
  const $$ = cheerio.load(html, null, false);
  if (!r.items.length) $$('.wd-products').first().replaceWith(empty);

  // price filter
  const pf = $$('.widget_price_filter form');
  pf.attr('action', basePath);
  pf.find('input[type="hidden"]').remove();
  for (const [k, v] of search) if (!['min_price', 'max_price', 'page'].includes(k)) pf.append(`<input type="hidden" name="${esc(k)}" value="${esc(v)}">`);
  const lo = q.minPrice ?? r.priceRange.min, hi = q.maxPrice ?? r.priceRange.max;
  pf.find('#min_price').attr('value', String(lo)).attr('data-min', String(r.priceRange.min));
  pf.find('#max_price').attr('value', String(hi)).attr('data-max', String(r.priceRange.max));
  // <bdi> keeps each amount's RTL currency symbol from flipping the "min — max" order
  pf.find('.price_label').html(` ${tr.t('Prix')}&nbsp;: <bdi class="from">${CURRENCY}${lo.toLocaleString('en-US')}</bdi> — <bdi class="to">${CURRENCY}${hi.toLocaleString('en-US')}</bdi>`);
  const span = Math.max(1, r.priceRange.max - r.priceRange.min);
  const l = ((lo - r.priceRange.min) / span) * 100, h = ((hi - r.priceRange.min) / span) * 100;
  pf.find('.ui-slider-range').attr('style', `left: ${l}%; width: ${h - l}%;`);
  pf.find('.ui-slider-handle').eq(0).attr('style', `left: ${l}%;`);
  pf.find('.ui-slider-handle').eq(1).attr('style', `left: ${h}%;`);

  // brand filter (layered nav)
  const chosen = new Set(q.brands);
  const brandList = $$('.wd-swatches-brands');
  brandList.html(r.brandFacet.map((b) => {
    const on = chosen.has(b.slug);
    const next = on ? [...chosen].filter((s) => s !== b.slug) : [...chosen, b.slug];
    return `<li class="wc-layered-nav-term${on ? ' wd-active chosen' : ''}"><a rel="nofollow" href="${link({ marque: next.join(',') || null, page: null })}" class="layered-nav-link" aria-label="Filter by ${esc(b.name)}"><span class="wd-filter-lable layer-term-lable">${esc(b.name)}</span></a> <span class="count">${b.count}</span></li>`;
  }).join(''));
  if (!r.brandFacet.length) brandList.closest('.wd-widget').remove();

  // category dropdown (native select, the runtime navigates on change)
  const sel = $$('select.dropdown_product_cat');
  sel.removeClass('select2-hidden-accessible').removeAttr('tabindex').removeAttr('aria-hidden');
  sel.next('.select2').remove();
  const opts = [`<option value="">${tr.t('Sélectionner une catégorie')}</option>`];
  const walk = (parent: string | null, depth: number) => {
    Object.entries(categories())
      .filter(([, c]) => c.parent === parent && c.count > 0)
      .sort((x, y) => x[1].name.localeCompare(y[1].name, 'fr', { sensitivity: 'base' }))
      .forEach(([p, c]) => {
        opts.push(`<option class="level-${depth}" value="${p}"${p === a.currentCategory ? ' selected="selected"' : ''}>${'&nbsp;'.repeat(depth * 3)}${esc(categoryName(p, tr.locale, tr.dict))}</option>`);
        walk(p, depth + 1);
      });
  };
  walk(null, 0);
  sel.html(opts.join(''));
  $$('.select2-container').remove();

  if (a.description) {
    $$('.wd-woo-page-title').closest('.e-con-inner').append(`<div class="term-description wd-shop-desc">${a.description}</div>`);
  }
  return renderFragment($$.html(), 'tpl-archive', tr.locale, tr.dict);
}

/* ----------------------------------------------------- single product */

export async function renderProduct(source: Product, tr: Tr = FR) {
  const p = localize(source, tr.locale);
  const $ = cheerio.load(htmlFile('templates/product.html'), null, false);
  const name = esc(p.name);
  const root = $('.single-product-page').first();
  root.attr('id', `product-${p.id}`).attr('class', `single-product-page entry-content ${productClasses(p)}`);

  // gallery
  const imgs = p.images.length ? p.images : [''];
  const item = (src: string, i: number) =>
    `<div class="wd-carousel-item"><figure data-thumb="${esc(src)}" class="woocommerce-product-gallery__image"><a data-elementor-open-lightbox="no" href="${esc(src)}"><img width="1080" height="1080" src="${esc(src)}" class="wp-post-image" alt="${name} – Image ${i + 1}" decoding="async"${i === 0 ? ' fetchpriority="high"' : ' loading="lazy"'}></a></figure></div>`;
  const main = $('.wd-gallery-images');
  main.find('.wd-carousel-wrap').html(imgs.map(item).join(''));
  main.find('.product-labels').replaceWith(labelHtml(p, tr) || '');
  if (imgs.length < 2) main.find('.wd-nav-arrows').remove();
  const thumbs = $('.wd-gallery-thumb');
  if (imgs.length > 1) {
    $('.woocommerce-product-gallery').addClass('wd-has-thumb');
    thumbs.find('.wd-carousel-wrap').html(imgs.map((src, i) =>
      `<div class="wd-carousel-item${i === 0 ? ' wd-thumb-active' : ''}"><img width="150" height="150" src="${esc(src)}" alt="${name} – Image ${i + 1}" loading="lazy"></div>`).join(''));
  } else thumbs.remove();

  // breadcrumbs
  const trail = p.primaryCat ? categoryTrail(p.primaryCat) : [];
  $('.wd-single-gallery').closest('.e-con-inner').find('.wd-el-breadcrumbs .elementor-widget-container').html(
    breadcrumbHtml([{ label: tr.t('Accueil'), href: '/' }, ...trail.map((c) => ({ label: categoryName(c.path, tr.locale, tr.dict), href: categoryUrl(c.path) })), { label: p.name }]),
  );

  $('h1.product_title').text(` ${p.name}`);
  const sd = $('.wd-single-short-desc');
  if (p.shortDescription) sd.find('.woocommerce-product-details__short-description').html(p.shortDescription);
  else sd.remove();
  $('.wd-single-price .elementor-widget-container').html(priceHtml(p, 'p'));

  const stockText = !p.inStock ? tr.t('Rupture de stock') : p.stockQty ? `${p.stockQty} ${tr.t('en stock')}` : tr.t('En stock');
  const stockHtml = `<p class="stock ${p.inStock ? 'in-stock' : 'out-of-stock'} wd-style-default">${stockText}</p>`;
  $('.wd-single-stock-status .elementor-widget-container').html(stockHtml);
  const cart = $('.wd-single-add-cart .elementor-widget-container');
  if (p.inStock) {
    cart.find('p.stock').replaceWith(stockHtml);
    const form = cart.find('form.cart');
    // without JavaScript (or before it loads) the form still works: GET /cart?add-to-cart=ID&quantity=N
    form.attr('action', '/cart').attr('method', 'get').removeAttr('enctype').attr('data-product_id', String(p.id));
    form.find('label.screen-reader-text').attr('for', `quantity_${p.id}`).text(`quantité de ${p.name}`);
    form.find('input.qty').attr('id', `quantity_${p.id}`).attr('max', p.stockQty ? String(p.stockQty) : '');
    form.find('button.single_add_to_cart_button').attr('value', String(p.id)).attr('name', 'add-to-cart');
  } else {
    cart.html(stockHtml);
  }

  const hook = $('[data-widget_type="wd_wc_hook.default"] .elementor-widget-container');
  const brand = p.brand ? getBrand(p.brand) : undefined;
  hook.html(
    (p.sku ? `<div class="wd-product-detail wd-product-sku"> <span class="wd-label"> ${tr.t('UGS')} </span> <span> ${esc(p.sku)} </span></div>` : '') +
    (brand ? `<div class="pwb-single-product-brands pwb-clearfix"><a href="/marques/${brand.slug}" title="View brand">${esc(brand.name)}</a></div>` : ''),
  );
  $('.wd-single-wishlist-btn a').attr('data-product-id', String(p.id)).attr('href', '/wishlist').removeAttr('data-key');
  $('.wd-visits-count').attr('data-product-id', String(p.id)).find('.wd-info-number').text(String(2 + (p.id % 9)));

  const desc = $('.custom-product-description');
  const body = p.description || p.shortDescription;
  if (body) desc.html(body);
  else desc.closest('.e-con-boxed').remove();
  return renderFragment($.html(), 'tpl-product', tr.locale, tr.dict);
}
