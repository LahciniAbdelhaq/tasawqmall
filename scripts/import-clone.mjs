#!/usr/bin/env node
/**
 * Imports the static beautymall.ma clone into this Next.js project.
 *
 *   node scripts/import-clone.mjs <path-to-clone>
 *
 * Produces:
 *   data/products.json, categories.json, tags.json, brands.json, pages.json
 *   data/html/*.html          shared fragments (header, footer, mobile nav, …)
 *   data/html/pages/*.html    Elementor page bodies (home, boutiques, marques, …)
 *   data/html/templates/*.html archive + single-product templates
 *   public/assets/**          images, fonts, merged CSS (site.css + inline.css)
 *
 * All links are rewritten to the app's own routes, tracking scripts are dropped,
 * lazy-load placeholders are resolved to the real image, and remote image URLs are
 * mapped onto the files the cloner downloaded.
 */
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';

const CLONE = path.resolve(process.argv[2] || '../../clones/beautymall.ma_2026-09-30T09-31-02');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const DATA = path.join(ROOT, 'data');
const PUB = path.join(ROOT, 'public');
const ORIGIN = 'https://beautymall.ma';

if (!fs.existsSync(path.join(CLONE, 'index.html'))) {
  console.error('Clone not found at', CLONE);
  process.exit(1);
}
for (const d of [DATA, path.join(DATA, 'html/pages'), path.join(DATA, 'html/templates'), path.join(PUB, 'assets/css')]) {
  fs.mkdirSync(d, { recursive: true });
}

const read = (f) => fs.readFileSync(path.join(CLONE, f), 'utf8');
const writeJson = (f, v) => fs.writeFileSync(path.join(DATA, f), JSON.stringify(v, null, 1));
const htmlFiles = fs.readdirSync(CLONE).filter((f) => f.endsWith('.html'));
const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
const fold = (s) => norm(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* ------------------------------------------------------------------ assets */

// remote URL -> local public path, from the cloner's report + the wp-content mirror
const report = JSON.parse(read('clone-report.json'));
const remoteToLocal = new Map();
for (const list of Object.values(report.assets)) {
  for (const a of list) {
    if (!a.localPath || !a.url) continue;
    const local = '/' + a.localPath.replace(/\\/g, '/');
    remoteToLocal.set(a.url, local);
    remoteToLocal.set(a.url.split('?')[0], local);
  }
}
function resolveAsset(u) {
  if (!u) return u;
  u = u.trim();
  if (u.startsWith('data:') || u.startsWith('/assets/') || u.startsWith('/wp-content/')) return u;
  if (u.startsWith('./assets/')) return u.slice(1);
  if (u.startsWith('assets/')) return '/' + u;
  if (u.startsWith('//')) u = 'https:' + u;
  const hit = remoteToLocal.get(u) || remoteToLocal.get(u.split('?')[0]);
  if (hit) return hit;
  const m = u.match(/^https?:\/\/(?:www\.)?beautymall\.ma(\/wp-(?:content|includes)\/[^?#]+)/);
  if (m) {
    const p = decodeURIComponent(m[1]);
    if (fs.existsSync(path.join(CLONE, p))) return encodeURI(p);
  }
  return null; // not available offline
}

function copyDir(src, dst, filter = () => true) {
  if (!fs.existsSync(src)) return 0;
  let n = 0;
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) n += copyDir(s, d, filter);
    else if (filter(s)) {
      if (!fs.existsSync(d) || fs.statSync(d).size !== fs.statSync(s).size) fs.copyFileSync(s, d);
      n++;
    }
  }
  return n;
}

/* --------------------------------------------------------------- CSS merge */

// Split a stylesheet into top-level statements (rules, @media blocks, @imports)
function cssStatements(css) {
  const out = [];
  let depth = 0, start = 0, q = null;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (q) { if (c === q && css[i - 1] !== '\\') q = null; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === '/' && css[i + 1] === '*') { const e = css.indexOf('*/', i + 2); i = e < 0 ? css.length : e + 1; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { out.push(css.slice(start, i + 1).trim()); start = i + 1; } }
    else if (c === ';' && depth === 0) { out.push(css.slice(start, i + 1).trim()); start = i + 1; }
  }
  return out.filter(Boolean);
}

// Merge several orderings into one: statements missing from the running result are
// inserted right after the last statement they followed in their own bundle.
function mergeOrdered(lists) {
  lists.sort((a, b) => b.length - a.length);
  let merged = [...lists[0]];
  for (const list of lists.slice(1)) {
    const seen = new Set(merged);
    const after = new Map();
    let anchor = '__start__';
    for (const s of list) {
      if (seen.has(s)) { anchor = s; continue; }
      if (!after.has(anchor)) after.set(anchor, []);
      after.get(anchor).push(s);
      seen.add(s);
    }
    if (!after.size) continue;
    const out = [...(after.get('__start__') || [])];
    for (const s of merged) { out.push(s); if (after.has(s)) out.push(...after.get(s)); }
    merged = out;
  }
  return merged;
}

function fixCssUrls(css) {
  // bundles live in /assets/css, so their ../images and ../fonts already resolve. Inline
  // <style> blocks used "./assets/…" relative to the page, which breaks on nested routes
  // (/product/x) -> make those absolute; remote urls -> local copies.
  return css
    .replace(/url\((['"]?)(?:\.\/)?(assets\/[^'")]+)\1\)/g, (m, q, u) => `url(${q}/${u}${q})`)
    .replace(/url\((['"]?)(https?:\/\/[^'")]+)\1\)/g, (m, q, u) => {
      const l = resolveAsset(u);
      return l ? `url(${q}${l}${q})` : m;
    });
}

/* ------------------------------------------------------------- URL mapping */

const brandIdToSlug = new Map(); // filled from the sidebar filters

function localHtmlToRoute(file) {
  const base = file.replace(/^\.\//, '').replace(/\.html$/, '').split(/[?#]/)[0];
  if (base === 'index') return '/';
  if (base.startsWith('product-category_')) return '/product-category/' + base.slice(17).split('_').join('/');
  if (base.startsWith('product-tag_')) return '/product-tag/' + base.slice(12);
  if (base.startsWith('product_')) return '/product/' + base.slice(8);
  return '/' + base;
}

function mapHref(href) {
  if (!href) return href;
  href = href.trim();
  if (/^(#|mailto:|tel:|javascript:|whatsapp:)/i.test(href)) return href;
  if (/^\.\/[^/]+\.html/.test(href)) {
    const hash = href.includes('#') ? '#' + href.split('#')[1] : '';
    const query = href.includes('?') ? '?' + href.split('?')[1].split('#')[0] : '';
    return localHtmlToRoute(href) + mapQuery(query) + hash;
  }
  if (href.startsWith('./assets/')) return href.slice(1);
  const m = href.match(/^https?:\/\/(?:www\.)?beautymall\.ma(\/[^?#]*)?(\?[^#]*)?(#.*)?$/);
  if (!m) return href; // external (social networks, whatsapp, …)
  let p = (m[1] || '/').replace(/\/+$/, '') || '/';
  const q = m[2] || '';
  if (p.startsWith('/wp-content/') || p.startsWith('/wp-includes/')) return resolveAsset(href) || href;
  const params = new URLSearchParams(q);
  if (params.has('add-to-cart')) return '/cart?add-to-cart=' + params.get('add-to-cart');
  if (p === '/' && params.has('s')) return '/search?s=' + encodeURIComponent(params.get('s'));
  p = p.replace(/\/page\/(\d+)$/, (_, n) => (params.set('page', n), ''));
  if (p.startsWith('/brand/')) p = '/marques/' + p.slice(7);
  if (p === '/shop') p = '/boutique';
  return (p || '/') + mapQuery(params.toString() ? '?' + params.toString() : '') + (m[3] || '');
}

function mapQuery(q) {
  if (!q) return '';
  const params = new URLSearchParams(q);
  const out = new URLSearchParams();
  for (const [k, v] of params) {
    if (k === 'filter_product_brand') {
      const slugs = v.split(',').map((id) => brandIdToSlug.get(id)).filter(Boolean);
      if (slugs.length) out.set('marque', slugs.join(','));
    } else if (['page', 'min_price', 'max_price', 'orderby', 'per_page', 's', 'add-to-cart'].includes(k)) out.set(k, v);
  }
  const s = out.toString();
  return s ? '?' + s : '';
}

/* ---------------------------------------------------------- DOM cleaning */

const TRACKER_RE = /googletagmanager|google-analytics|gtag\(|fbq\(|connect\.facebook|analytics\.tiktok|ttq\.|doubleclick|clarity\.ms|hotjar/;

function cleanDom($, root) {
  const scope = root ? $(root) : $.root();
  scope.find('script, noscript, link, meta, title, iframe[src*="googletagmanager"]').remove();
  scope.find('*').each((_, el) => {
    const $el = $(el);
    const attrs = el.attribs || {};
    // lazy-load placeholders -> real sources
    for (const [lazy, real] of [['data-src', 'src'], ['data-lazy-src', 'src'], ['data-srcset', 'srcset'], ['data-lazy-srcset', 'srcset']]) {
      if (attrs[lazy]) {
        const cur = attrs[real] || '';
        if (!cur || cur.startsWith('data:image/gif') || cur.startsWith('data:image/svg+xml;base64,PHN2ZyB4bWxucz0i') || real === 'srcset') $el.attr(real, attrs[lazy]);
        $el.removeAttr(lazy);
      }
    }
    if (attrs['data-bg']) {
      const bg = resolveAsset(attrs['data-bg'].replace(/^url\(['"]?|['"]?\)$/g, ''));
      if (bg) $el.attr('style', `${attrs.style ? attrs.style.replace(/;?\s*$/, ';') : ''}background-image:url("${bg}")`);
      $el.removeAttr('data-bg');
    }
    for (const a of ['data-lazyloaded', 'data-ll-status', 'data-was-processed']) $el.removeAttr(a);
    if (el.tagName === 'img') {
      const src = resolveAsset($el.attr('src'));
      if (src) $el.attr('src', src);
      else if ($el.attr('src') && /^https?:/.test($el.attr('src'))) {
        // fall back to the first offline candidate in srcset
        const cand = ($el.attr('srcset') || '').split(',').map((c) => resolveAsset(c.trim().split(/\s+/)[0])).find(Boolean);
        if (cand) $el.attr('src', cand);
      }
      $el.removeClass('lazyload lazyloading litespeed-loaded entered');
    }
    if (attrs.srcset !== undefined || $el.attr('srcset')) {
      const set = ($el.attr('srcset') || '').split(/,\s+(?=\S)/).map((c) => {
        const [u, w] = c.trim().split(/\s+/);
        const l = resolveAsset(u);
        return l ? (w ? `${l} ${w}` : l) : null;
      }).filter(Boolean);
      if (set.length) $el.attr('srcset', set.join(', '));
      else { $el.removeAttr('srcset'); $el.removeAttr('sizes'); }
    }
    for (const a of ['data-large_image', 'data-thumb', 'poster']) {
      if ($el.attr(a)) { const l = resolveAsset($el.attr(a)); if (l) $el.attr(a, l); }
    }
    if (attrs.href !== undefined) $el.attr('href', mapHref(attrs.href));
    if (el.tagName === 'form' && attrs.action !== undefined) {
      const act = mapHref(attrs.action);
      $el.attr('action', act.startsWith('http') ? '/search' : act);
    }
    if ($el.attr('style') && $el.attr('style').includes('url(')) {
      $el.attr('style', $el.attr('style').replace(/url\((['"]?|&quot;)([^'")&]+)\1\)/g, (m, q, u) => {
        const l = resolveAsset(u);
        return l ? `url("${l}")` : m;
      }));
    }
  });
  // Swiper state frozen at clone time (fixed px widths, offsets) -> back to the theme's
  // responsive, un-initialised layout; the runtime re-drives navigation.
  // Elementor entrance animations hide widgets until its script runs
  scope.find('.elementor-invisible').removeClass('elementor-invisible');
  scope.find('.wd-carousel').removeClass('wd-initialized wd-horizontal wd-watch-progress');
  scope.find('.wd-carousel-wrap, .wd-carousel-item, .wd-nav-scroll-drag').removeAttr('style');
  scope.find('.wd-carousel-wrap').removeAttr('id').removeAttr('aria-live');
  scope.find('.wd-carousel-item').removeClass('wd-slide-visible wd-full-visible wd-active wd-slide-next wd-slide-prev').removeAttr('role').removeAttr('aria-label');
  scope.find('.wd-btn-arrow').removeAttr('aria-controls');
  // Smart Slider: fixed 1450px slides -> fluid, links -> local routes
  scope.find('.n2-ss-slide').each((_, s) => {
    const st = ($(s).attr('style') || '').replace(/\s*(width|height):[^;]+;?/g, '');
    $(s).attr('style', st);
    if ($(s).attr('data-href')) $(s).attr('data-href', mapHref($(s).attr('data-href')));
  });
  scope.find('ss3-loader').remove();
  // CookieYes banner: hidden until the runtime knows no choice was stored
  scope.find('.cky-consent-container').addClass('cky-hide');
  scope.find('.cky-btn-revisit-wrapper').addClass('cky-revisit-hide');
  // Chaty is revealed by its own script on the live site
  scope.find('.chaty').removeAttr('style');
  // account forms must never post to the live site
  scope.find('form.login, form.woocommerce-form-login, form.register').attr('action', '/my-account');
  // search forms -> local search page
  scope.find('form.searchform').each((_, f) => {
    $(f).attr('action', '/search');
    $(f).find('input[name="post_type"]').remove();
  });
}

const inner = ($, sel) => { const el = $(sel).first(); return el.length ? $.html(el) : ''; };

/* ------------------------------------------------- pass 1: site structure */

console.log('Clone:', CLONE);
const categories = {}; // path -> { name }
const tags = {};
const brands = new Map(); // slug -> {slug,name}

function noteCategory(href, name) {
  const m = mapHref(href || '').match(/^\/product-category\/([^?#]+)/);
  if (!m || !name) return;
  const p = m[1].replace(/\/$/, '');
  const n = norm(name);
  if (!n || /^\d+$/.test(n)) return;
  if (!categories[p]) categories[p] = { name: n };
}

const pageMeta = {}; // file -> { title, bodyClass, cssBundle, inlineStyles[] }
const styleCount = new Map();

for (const f of htmlFiles) {
  const $ = cheerio.load(read(f));
  $('a[href*="product-category"]').each((_, a) => noteCategory($(a).attr('href'), $(a).text()));
  $('a[href*="product-tag"]').each((_, a) => {
    const m = mapHref($(a).attr('href')).match(/^\/product-tag\/([^/?#]+)/);
    if (m && norm($(a).text())) tags[m[1]] = tags[m[1]] || norm($(a).text());
  });
  $('a[href*="/brand/"], a[href*="/marques/"]').each((_, a) => {
    const m = mapHref($(a).attr('href')).match(/^\/marques\/([^/?#]+)/);
    const n = norm($(a).text()) || $(a).attr('title');
    if (m && n && n !== 'View brand') brands.set(m[1], brands.get(m[1]) || { slug: m[1], name: n });
  });
  // brand id -> name from layered nav filters
  $('a.layered-nav-link[href*="filter_product_brand="]').each((_, a) => {
    const id = ($(a).attr('href').match(/filter_product_brand=(\d+)/) || [])[1];
    const name = norm($(a).find('.layer-term-lable').text() || $(a).text());
    if (id && name) brandIdToSlug.set(id, name); // resolved to slug below
  });
  const styles = [];
  // page-level styles only: <style> inside the content travels with the content (and gets scoped)
  $('style').filter((_, s) => !$(s).closest('.wd-page-content').length).each((_, s) => { const t = $(s).text().trim(); if (t) { styles.push(t); styleCount.set(t, (styleCount.get(t) || 0) + 1); } });
  pageMeta[f] = {
    title: norm($('title').text()),
    description: $('meta[name="description"]').attr('content') || '',
    bodyClass: ($('body').attr('class') || '').replace(/\s+/g, ' ').trim(),
    css: $('link[rel="stylesheet"][href*="assets/css"]').map((_, l) => $(l).attr('href')).get(),
    styles,
  };
}

// brand ids were collected as names: turn into slugs
const brandByFold = new Map([...brands.values()].map((b) => [fold(b.name), b.slug]));
for (const [id, name] of brandIdToSlug) {
  const slug = brandByFold.get(fold(name)) || fold(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!brands.has(slug)) brands.set(slug, { slug, name });
  brandIdToSlug.set(id, slug);
}

// category hierarchy
for (const p of Object.keys(categories)) {
  const parts = p.split('/');
  categories[p].slug = parts.at(-1);
  categories[p].parent = parts.length > 1 ? parts.slice(0, -1).join('/') : null;
}
for (const p of Object.keys(categories)) {
  // make sure every ancestor exists
  let parent = categories[p].parent;
  while (parent && !categories[parent]) {
    categories[parent] = { name: parent.split('/').at(-1).replace(/-/g, ' '), slug: parent.split('/').at(-1), parent: parent.includes('/') ? parent.split('/').slice(0, -1).join('/') : null };
    parent = categories[parent].parent;
  }
}
const catBySlug = new Map();
for (const [p, c] of Object.entries(categories)) if (!catBySlug.has(c.slug) || p.length < catBySlug.get(c.slug).length) catBySlug.set(c.slug, p);
console.log('categories', Object.keys(categories).length, 'tags', Object.keys(tags).length, 'brands', brands.size);

/* ------------------------------------------------------ pass 2: products */

const products = new Map();
const priceOf = (el, $) => {
  // the currency symbol "د.م." contains dots, so drop it before reading the number
  const c = $(el).clone();
  c.find('.woocommerce-Price-currencySymbol').remove();
  const m = c.text().replace(/\s/g, '').match(/\d[\d,]*(?:\.\d+)?/);
  return m ? Math.round(parseFloat(m[0].replace(/,/g, '')) * 100) / 100 : null;
};
const slugFromHref = (h) => (mapHref(h || '').match(/^\/product\/([^/?#]+)/) || [])[1];
const brandList = [...brands.values()].map((b) => ({ ...b, f: fold(b.name) })).sort((a, b) => b.f.length - a.f.length);
function guessBrand(name) {
  const n = fold(name).replace(/[’'`]/g, "'");
  for (const b of brandList) {
    if (b.f.length < 2) continue;
    if (n === b.f || n.startsWith(b.f + ' ') || n.startsWith(b.f + '-') || n.startsWith(b.f + ' -')) return b.slug;
  }
  return null;
}

let order = 0;
for (const f of htmlFiles) {
  const $ = cheerio.load(read(f));
  const boutiqueBrand = f.endsWith('-boutique-officielle.html') ? f.replace('-boutique-officielle.html', '') : null;
  $('.wd-product[data-id]').each((_, el) => {
    const $el = $(el);
    const id = $el.attr('data-id');
    const titleA = $el.find('.wd-entities-title a').first();
    const name = norm(titleA.text());
    const slug = slugFromHref(titleA.attr('href') || $el.find('a.product-image-link').attr('href'));
    if (!slug || !name) return;
    const cls = ($el.attr('class') || '').split(/\s+/);
    const imgs = $el.find('.product-element-top img, .product-image-link img').map((_, i) => {
      const s = $(i).attr('data-src') && !String($(i).attr('data-src')).startsWith('data:') ? $(i).attr('data-src') : $(i).attr('src');
      return resolveAsset(s);
    }).get().filter((s) => s && !s.startsWith('data:'));
    const cats = new Set();
    for (const c of cls) if (c.startsWith('product_cat-') && catBySlug.has(c.slice(12))) cats.add(catBySlug.get(c.slice(12)));
    $el.find('.wd-product-cats a').each((_, a) => {
      const m = mapHref($(a).attr('href')).match(/^\/product-category\/([^?#]+)/);
      if (m) cats.add(m[1]);
    });
    const p = products.get(id) || { id: +id, slug, name, order: order++, cats: [], tags: [], images: [] };
    p.cats = [...new Set([...p.cats, ...cats])];
    p.tags = [...new Set([...p.tags, ...cls.filter((c) => c.startsWith('product_tag-')).map((c) => c.slice(12))])];
    if (imgs.length > p.images.length) p.images = [...new Set(imgs)];
    const del = $el.find('.price del .amount').first(), ins = $el.find('.price ins .amount').first();
    const any = $el.find('.price .amount').first();
    p.regularPrice = del.length ? priceOf(del, $) : any.length ? priceOf(any, $) : p.regularPrice ?? null;
    p.price = ins.length ? priceOf(ins, $) : any.length ? priceOf(any, $) : p.price ?? null;
    p.label = norm($el.find('.product-labels .onsale').first().text()) || p.label || null;
    p.inStock = !cls.includes('outofstock');
    p.ean = norm($el.find('.ean').first().text()) || p.ean || null;
    p.sku = norm($el.find('.wd-product-sku span').last().text()) || p.sku || null;
    if (!p.brand && boutiqueBrand) p.boutique = boutiqueBrand;
    products.set(id, p);
  });
}

// single product pages: full details
const productFiles = htmlFiles.filter((f) => f.startsWith('product_'));
for (const f of productFiles) {
  const $ = cheerio.load(read(f));
  const slug = f.slice(8, -5);
  const root = $('.single-product-page').first();
  const id = ((root.attr('id') || '').match(/product-(\d+)/) || [])[1];
  if (!id) continue;
  const p = products.get(id) || { id: +id, slug, order: order++, cats: [], tags: [], images: [] };
  p.slug = slug;
  p.name = norm($('h1.product_title').text()) || p.name;
  const gallery = $('.woocommerce-product-gallery__image img').map((_, i) => resolveAsset($(i).attr('data-src') || $(i).attr('src'))).get().filter(Boolean);
  if (gallery.length) p.images = [...new Set([...gallery, ...p.images])];
  const cls = (root.attr('class') || '').split(/\s+/);
  for (const c of cls) if (c.startsWith('product_cat-') && catBySlug.has(c.slice(12))) p.cats.push(catBySlug.get(c.slice(12)));
  p.cats = [...new Set(p.cats)];
  p.tags = [...new Set([...p.tags, ...cls.filter((c) => c.startsWith('product_tag-')).map((c) => c.slice(12))])];
  const sd = $('.woocommerce-product-details__short-description').first();
  if (sd.length) { cleanDom($, sd); p.shortDescription = sd.html().trim(); }
  const desc = $('.custom-product-description').first();
  if (desc.length) { cleanDom($, desc); p.description = desc.html().trim(); }
  const stock = norm($('.wd-single-stock-status .stock').first().text());
  const q = stock.match(/(\d+)/);
  if (q) p.stockQty = +q[1];
  p.inStock = !$('.wd-single-stock-status .stock').hasClass('out-of-stock');
  const del = $('.wd-single-price .price del .amount').first(), ins = $('.wd-single-price .price ins .amount').first();
  const any = $('.wd-single-price .price .amount').first();
  if (del.length) p.regularPrice = priceOf(del, $);
  p.price = ins.length ? priceOf(ins, $) : priceOf(any, $);
  if (!del.length) p.regularPrice = p.price;
  p.label = norm($('.wd-single-gallery .onsale').first().text()) || p.label || null;
  p.sku = norm($('.wd-product-sku span').last().text()) || p.sku || null;
  const b = $('.pwb-single-product-brands a').first();
  if (b.length) {
    const m = mapHref(b.attr('href')).match(/^\/marques\/([^/?#]+)/);
    if (m) { p.brand = m[1]; if (!brands.has(m[1])) brands.set(m[1], { slug: m[1], name: norm(b.text()) }); }
  }
  // breadcrumb trail gives the primary category
  const crumbs = $('.wd-breadcrumbs a').map((_, a) => mapHref($(a).attr('href'))).get().filter((h) => h.startsWith('/product-category/'));
  if (crumbs.length) p.primaryCat = crumbs.at(-1).replace('/product-category/', '');
  p.hasPage = true;
  products.set(id, p);
}

// brands for everything else
for (const p of products.values()) {
  if (!p.brand) p.brand = guessBrand(p.name) || (p.boutique && brands.has(p.boutique) ? p.boutique : null);
  delete p.boutique;
  if (!p.primaryCat && p.cats.length) {
    // deepest category, preferring the one that appeared first
    p.primaryCat = [...p.cats].sort((a, b) => b.split('/').length - a.split('/').length)[0];
  }
  if (p.price == null) p.price = p.regularPrice;
  if (p.regularPrice == null) p.regularPrice = p.price;
}
const productList = [...products.values()].sort((a, b) => a.order - b.order);
productList.forEach((p) => delete p.order);
console.log('products', productList.length, 'with brand', productList.filter((p) => p.brand).length, 'with page', productList.filter((p) => p.hasPage).length);

// category product counts (including descendants)
for (const c of Object.values(categories)) c.count = 0;
for (const p of productList) {
  const all = new Set();
  for (const c of p.cats) { let x = c; while (x) { all.add(x); x = categories[x]?.parent; } }
  p.cats = [...all].filter((c) => categories[c]);
  for (const c of p.cats) categories[c].count++;
}

/* ---------------------------------------------------- CMS annotation */

// Gives every editable element of a fragment a stable key (data-bm="<prefix><n>") that
// the CMS stores its overrides against: texts, images, links, icons, backgrounds.
const TEXT_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a', 'button', 'li', 'strong', 'em', 'b', 'i', 'label', 'div', 'td', 'th', 'small', 'figcaption', 'summary', 'bdi', 'option', 'mark']);
const SKIP_INSIDE = 'script, style, svg, noscript, select, .woocommerce-Price-amount, .screen-reader-text';
function annotateHtml(html, prefix) {
  if (!html) return html;
  const $ = cheerio.load(html, null, false);
  let n = 0;
  $('*').each((_, el) => {
    const $el = $(el);
    const tag = el.tagName;
    if ($el.closest(SKIP_INSIDE).length && tag !== 'svg') return;
    if (tag === 'svg' && $el.parents('svg').length) return;
    const cls = $el.attr('class') || '';
    const hasText = (el.children || []).some((c) => c.type === 'text' && c.data.trim());
    const isIcon = tag === 'svg' || /(^|\s)([\w-]*-icon|wd-icon|menu-opener-icon|wd-tools-icon)(\s|$)/.test(cls);
    const isEditable = tag === 'img' || tag === 'a' || isIcon || (hasText && TEXT_TAGS.has(tag)) ||
      /background-image/.test($el.attr('style') || '');
    if (isEditable) $el.attr('data-bm', `${prefix}${++n}`);
  });
  return $.html();
}

/* ---------------------------------------------------- pass 3: fragments */

const HOME = cheerio.load(read('index.html'));
cleanDom(HOME);
const frag = (sel) => inner(HOME, sel);
const fragments = {
  header: frag('header.whb-header'),
  footer: frag('footer.wd-footer'),
  'mobile-nav': frag('.mobile-nav'),
  'login-side': frag('.login-form-side'),
  toolbar: frag('.wd-toolbar'),
  chaty: frag('.chaty, #chaty-widget-0'),
  cookie: frag('.cky-consent-container') + frag('.cky-modal'),
  'close-side': '<div class="wd-close-side wd-fill"></div>',
  'scroll-top': frag('.scrollToTop'),
};
const FRAGMENT_PREFIX = { header: 'h', footer: 'f', 'mobile-nav': 'm', 'login-side': 'l', toolbar: 't', chaty: 'c', cookie: 'k' };
for (const [k, v] of Object.entries(fragments)) {
  fs.writeFileSync(path.join(DATA, 'html', k + '.html'), FRAGMENT_PREFIX[k] ? annotateHtml(v, FRAGMENT_PREFIX[k]) : v);
  if (!v) console.warn('  ! empty fragment', k);
}

// page bodies: everything inside .wd-page-content
const pages = {};
function pageBody(f) {
  const $ = cheerio.load(read(f));
  cleanDom($);
  const content = $('.wd-page-content').first();
  // the product page HTML widget ships a whole document with a global <style> that
  // restyles <body>; scope it to the widget instead
  content.find('.elementor-widget-html').each((_, w) => {
    const id = $(w).attr('data-id');
    $(w).find('style').each((_, s) => {
      const css = $(s).text()
        .replace(/(^|})\s*:root\s*{/g, `$1 .elementor-element-${id}{`)
        .replace(/(^|})\s*body\s*{[^}]*}/g, '$1')
        .replace(/(^|})\s*\*\s*{/g, `$1 .elementor-element-${id} *{`)
        .replace(/(^|[},])\s*\.(grid|item|icon|label)\b/g, `$1 .elementor-element-${id} .$2`);
      $(s).text(css);
    });
  });
  content.find('style').each((_, s) => { $(s).text(fixCssUrls($(s).text())); });
  return { $, content };
}

for (const f of htmlFiles) {
  const meta = pageMeta[f];
  const route = localHtmlToRoute(f);
  const kind = f === 'index.html' ? 'home'
    : f.startsWith('product-category_') ? 'category'
    : f.startsWith('product-tag_') ? 'tag'
    : f.startsWith('product_') ? 'product'
    : f.endsWith('-boutique-officielle.html') ? 'boutique'
    : f === 'wishlist.html' ? 'wishlist' : 'page';
  pages[route] = {
    file: f,
    kind,
    title: meta.title,
    description: meta.description,
    bodyClass: meta.bodyClass,
    styles: meta.styles.filter((s) => styleCount.get(s) < htmlFiles.length * 0.8).map(fixCssUrls),
  };
  if (['home', 'boutique', 'page', 'wishlist'].includes(kind)) {
    const { $, content } = pageBody(f);
    const name = route === '/' ? 'home' : route.slice(1);
    fs.writeFileSync(path.join(DATA, 'html/pages', name + '.html'), annotateHtml(content.html(), 'p'));
  }
  if (kind === 'category' || kind === 'tag') {
    const $ = cheerio.load(read(f));
    pages[route].heading = norm($('.wd-woo-page-title .title, .page-title .entry-title').first().text());
    pages[route].resultCount = norm($('.woocommerce-result-count').first().text());
    const desc = $('.term-description, .wd-shop-desc').first();
    if (desc.length) { cleanDom($, desc); pages[route].termDescription = desc.html(); }
  }
}

// templates: archive (category page) and single product
{
  const { $, content } = pageBody('product-category_soins-du-visage.html');
  content.find('.wd-products').first().empty().append('<!--PRODUCTS-->');
  content.find('.wd-pagination, .woocommerce-pagination').first().replaceWith('<!--PAGINATION-->');
  fs.writeFileSync(path.join(DATA, 'html/templates/archive.html'), annotateHtml(content.html(), 'a'));
}
{
  const f = 'product_la-roche-posay-pure-vitamine-c12-serum-30ml.html';
  const { $, content } = pageBody(f);
  fs.writeFileSync(path.join(DATA, 'html/templates/product.html'), annotateHtml(content.html(), 'r'));
}

/* ----------------------------------------------------------- CSS output */

const bundleFiles = [...new Set(Object.values(pageMeta).flatMap((m) => m.css))]
  .map((h) => h.replace(/^\.\//, ''))
  .filter((h) => fs.existsSync(path.join(CLONE, h)) && fs.statSync(path.join(CLONE, h)).size > 50000);
const merged = mergeOrdered(bundleFiles.map((b) => cssStatements(fs.readFileSync(path.join(CLONE, b), 'utf8'))));
const fontCss = [...new Set(Object.values(pageMeta).flatMap((m) => m.css))]
  .map((h) => h.replace(/^\.\//, ''))
  .filter((h) => fs.existsSync(path.join(CLONE, h)) && fs.statSync(path.join(CLONE, h)).size <= 50000)
  .map((h) => fs.readFileSync(path.join(CLONE, h), 'utf8'))
  .join('\n');
fs.writeFileSync(path.join(PUB, 'assets/css/site.css'), fixCssUrls(fontCss + '\n' + merged.join('\n')));
// inline <style> blocks shared by (nearly) every page
const globalInline = [...styleCount.entries()].filter(([, n]) => n >= htmlFiles.length * 0.8).map(([s]) => s);
fs.writeFileSync(path.join(PUB, 'assets/css/inline.css'), fixCssUrls(globalInline.join('\n')));
console.log('css: merged', bundleFiles.length, 'bundles ->', merged.length, 'statements; inline blocks', globalInline.length);

/* ------------------------------------------------------------ copy assets */

const nImg = copyDir(path.join(CLONE, 'assets/images'), path.join(PUB, 'assets/images'));
const nFont = copyDir(path.join(CLONE, 'assets/fonts'), path.join(PUB, 'assets/fonts'));
const nUp = copyDir(path.join(CLONE, 'wp-content/uploads'), path.join(PUB, 'wp-content/uploads'));
const nTheme = copyDir(path.join(CLONE, 'wp-content/themes'), path.join(PUB, 'wp-content/themes'), (s) => !s.endsWith('.php'));
const nPlug = copyDir(path.join(CLONE, 'wp-content/plugins'), path.join(PUB, 'wp-content/plugins'), (s) => !/\.(php|js)$/.test(s));
for (const css of fs.readdirSync(path.join(CLONE, 'assets/css'))) {
  // font css files reference ../fonts — keep originals around too
  fs.copyFileSync(path.join(CLONE, 'assets/css', css), path.join(PUB, 'assets/css', css));
}
console.log('copied images', nImg, 'fonts', nFont, 'uploads', nUp, 'theme', nTheme, 'plugins', nPlug);

/* --------------------------------------------------------------- data out */

writeJson('products.json', productList);
writeJson('categories.json', categories);
writeJson('tags.json', tags);
writeJson('brands.json', [...brands.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })));
writeJson('pages.json', pages);
console.log('done.');
