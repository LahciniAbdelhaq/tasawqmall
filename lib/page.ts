import 'server-only';
import * as cheerio from 'cheerio';
import { loadCatalog, getProductById, localize } from './catalog';
import { getI18n } from './i18n';
import { renderFragment } from './cms';
import { htmlFile, priceHtml, esc, type Tr } from './render';
import { getSettings } from './settings';

/** Everything a shop page needs: catalogue loaded + language context. */
export async function pageContext(): Promise<Tr> {
  const [, i18n] = await Promise.all([loadCatalog(), getI18n()]);
  return i18n;
}

/**
 * Product cards baked into imported Elementor pages (home, boutiques) are refreshed from
 * the catalogue: current name (in the visitor's language), price, sale badge, stock —
 * and cards of deleted/unpublished products disappear.
 */
export function refreshCards(html: string, tr: Tr) {
  const $ = cheerio.load(html, null, false);
  $('.wd-product[data-id]').each((_, el) => {
    const card = $(el);
    const src = getProductById(Number(card.attr('data-id')));
    if (!src) {
      (card.closest('.wd-carousel-item').length ? card.closest('.wd-carousel-item') : card).remove();
      return;
    }
    const p = localize(src, tr.locale);
    card.find('.wd-entities-title a').text(p.name);
    card.find('.product-image-link').attr('aria-label', p.name);
    card.find('.price').first().replaceWith(priceHtml(p));
    const sale = card.find('.onsale');
    if (p.regularPrice > p.price && p.label) sale.text(p.label);
    else sale.remove();
    card.toggleClass('outofstock', !p.inStock).toggleClass('instock', p.inStock);
    if (!p.inStock) card.find('.add_to_cart_button').replaceWith(`<a href="/product/${esc(p.slug)}" class="button add-to-cart-loop"><span>${esc(tr.t('Lire la suite'))}</span></a>`);
  });
  return $.html();
}

const humanize = (src: string) =>
  decodeURIComponent(src.split('/').pop() || '').replace(/\.[a-z0-9]+$/i, '').replace(/^[a-f0-9]{8}_/, '').replace(/[-_]+/g, ' ').replace(/\b\d{2,4}x\d{2,4}\b/g, '').replace(/\s+/g, ' ').trim();

/**
 * SEO safety nets applied at render time: images still without alternative text get one
 * (link label or file name), and a page without any H1 gets a visually-hidden one.
 */
export function seoFixups(html: string, opts: { autoAlt: boolean; h1?: string }) {
  const $ = cheerio.load(html, null, false);
  if (opts.autoAlt) {
    $('img').each((_, el) => {
      const img = $(el);
      if ((img.attr('alt') || '').trim()) return;
      const alt = img.closest('a').attr('aria-label') || img.attr('title') || humanize(img.attr('src') || '');
      if (alt) img.attr('alt', alt.slice(0, 120));
    });
  }
  if (opts.h1 && !$('h1').length) $.root().prepend(`<h1 class="screen-reader-text">${esc(opts.h1)}</h1>`);
  return $.html();
}

/** An imported page body with CMS edits, translations, live product cards and SEO fixups. */
export async function contentPage(file: string, fragment: string, tr: Tr, h1?: string) {
  const s = await getSettings();
  const html = await renderFragment(refreshCards(htmlFile(file), tr), fragment, tr.locale, tr.dict);
  return seoFixups(html, { autoAlt: s.seo.autoAlt, h1 });
}
