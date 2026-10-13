/**
 * Content blocks for pages created in the back-office. Each block renders to markup that
 * uses the original theme's classes, so new pages look like the rest of the site.
 */
import { allProducts, categories, getCategory, discount, type Product } from './catalog';
import { cardHtml, esc, type Tr } from './render';

export type Block =
  | { id: string; type: 'heading'; text: string; level?: 'h1' | 'h2' | 'h3'; align?: 'left' | 'center' | 'right'; i18n?: I18nFields }
  | { id: string; type: 'text'; html: string; i18n?: I18nFields }
  | { id: string; type: 'image'; src: string; alt?: string; link?: string; i18n?: I18nFields }
  | { id: string; type: 'banner'; image: string; title?: string; subtitle?: string; buttonText?: string; buttonLink?: string; align?: 'left' | 'center' | 'right'; height?: number; overlay?: number; textColor?: string; i18n?: I18nFields }
  | { id: string; type: 'products'; title?: string; source: 'category' | 'tag' | 'brand' | 'ids' | 'sale' | 'latest'; value?: string; limit?: number; columns?: number; i18n?: I18nFields }
  | { id: string; type: 'categories'; title?: string; paths: string[]; i18n?: I18nFields }
  | { id: string; type: 'button'; text: string; link: string; align?: 'left' | 'center' | 'right'; i18n?: I18nFields }
  | { id: string; type: 'faq'; title?: string; items: { q: string; a: string }[]; i18n?: I18nFields }
  | { id: string; type: 'video'; url: string }
  | { id: string; type: 'spacer'; height?: number }
  | { id: string; type: 'html'; code: string; i18n?: I18nFields };
type I18nFields = Record<string, Record<string, unknown>>;

export const BLOCK_TYPES: { type: Block['type']; label: string }[] = [
  { type: 'banner', label: 'Bannière (image + titre + bouton)' },
  { type: 'heading', label: 'Titre' },
  { type: 'text', label: 'Texte riche' },
  { type: 'image', label: 'Image' },
  { type: 'products', label: 'Grille de produits' },
  { type: 'categories', label: 'Catégories' },
  { type: 'button', label: 'Bouton' },
  { type: 'faq', label: 'FAQ (questions / réponses)' },
  { type: 'video', label: 'Vidéo (YouTube / MP4)' },
  { type: 'spacer', label: 'Espace' },
  { type: 'html', label: 'Code HTML' },
];

const wrap = (inner: string, extra = '') =>
  `<div class="wd-negative-gap elementor-element e-flex e-con-boxed e-con e-parent bm-block"${extra}><div class="e-con-inner">${inner}</div></div>`;
const title = (t: string, tag = 'h4', align = 'center') =>
  `<div class="title-wrapper wd-set-mb reset-last-child wd-title-color-default wd-title-style-default wd-title-size-default text-${align}"><div class="liner-continer"><${tag} class="woodmart-title-container title wd-fontsize-l">${esc(t)}</${tag}></div></div>`;

function pickProducts(b: Extract<Block, { type: 'products' }>): Product[] {
  const all = allProducts().filter((p) => p.inStock);
  const v = (b.value || '').trim();
  let list: Product[];
  switch (b.source) {
    case 'category': list = all.filter((p) => p.cats.includes(v)); break;
    case 'tag': list = all.filter((p) => p.tags.includes(v)); break;
    case 'brand': list = all.filter((p) => p.brand === v); break;
    case 'ids': {
      const ids = v.split(/[\s,]+/).map(Number);
      list = ids.map((id) => allProducts().find((p) => p.id === id)).filter((p): p is Product => !!p);
      break;
    }
    case 'sale': list = [...all].sort((a, b2) => discount(b2) - discount(a)); break;
    default: list = [...all].sort((a, b2) => b2.id - a.id);
  }
  return list.slice(0, Math.min(48, b.limit || 8));
}

function youtubeId(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : null;
}

/** Block fields in the visitor's language (falls back to the French values). */
function tr<B extends Block>(b: B, locale: string): B {
  const o = 'i18n' in b ? b.i18n?.[locale] : undefined;
  return o ? ({ ...b, ...Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null)) } as B) : b;
}

export function renderBlocks(blocks: Block[], t: Tr): string {
  return blocks.map((raw) => {
    const b = tr(raw, t.locale);
    switch (b.type) {
      case 'heading': {
        const tag = b.level || 'h2';
        return wrap(`<${tag} class="title bm-heading" style="text-align:${b.align || 'center'};width:100%">${esc(b.text)}</${tag}>`);
      }
      case 'text': return wrap(`<div class="wd-text-block reset-last-child bm-text">${b.html}</div>`);
      case 'image': {
        const img = `<img src="${esc(b.src)}" alt="${esc(b.alt || '')}" loading="lazy" style="width:100%;height:auto;border-radius:var(--wd-brd-radius)">`;
        return wrap(b.link ? `<a href="${esc(b.link)}">${img}</a>` : img);
      }
      case 'banner': {
        const align = b.align || 'center';
        return wrap(`<div class="bm-banner" style="--bm-h:${b.height || 420}px;--bm-ov:${(b.overlay ?? 25) / 100};color:${esc(b.textColor || '#fff')};text-align:${align};justify-content:${align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center'}">
          <img src="${esc(b.image)}" alt="" class="bm-banner-bg">
          <div class="bm-banner-body">${b.title ? `<h2 class="bm-banner-title">${esc(b.title)}</h2>` : ''}${b.subtitle ? `<p class="bm-banner-sub">${esc(b.subtitle)}</p>` : ''}${b.buttonText ? `<a class="btn btn-color-primary btn-style-default btn-shape-semi-round btn-size-large bm-btn" href="${esc(b.buttonLink || '#')}">${esc(b.buttonText)}</a>` : ''}</div>
        </div>`);
      }
      case 'products': {
        const items = pickProducts(b);
        const cols = b.columns || 4;
        return wrap(`${b.title ? title(b.title) : ''}<div class="products wd-products wd-grid-g grid-columns-${cols} elements-grid title-line-two wd-products-with-bg" style="--wd-col-lg:${cols};--wd-col-md:3;--wd-col-sm:2;--wd-gap-lg:20px;width:100%">${items.map((p, i) => cardHtml(p, i + 1, t)).join('')}</div>`);
      }
      case 'categories': {
        const tiles = (b.paths || []).map((p) => {
          const c = getCategory(p);
          if (!c) return '';
          const img = c.image || allProducts().find((x) => x.cats.includes(p))?.images[0] || '';
          const name = c.i18n?.[t.locale]?.name || t.dict[c.name] || c.name;
          return `<a class="bm-cat-tile" href="/product-category/${p}"><span class="bm-cat-img">${img ? `<img src="${esc(img)}" alt="${esc(name)}" loading="lazy">` : ''}</span><span class="bm-cat-name">${esc(name)}</span><span class="bm-cat-count">${c.count}</span></a>`;
        }).join('');
        return wrap(`${b.title ? title(b.title) : ''}<div class="bm-cat-grid">${tiles}</div>`);
      }
      case 'button':
        return wrap(`<div style="width:100%;text-align:${b.align || 'center'}"><a class="btn btn-color-primary btn-style-default btn-shape-semi-round btn-size-large bm-btn" href="${esc(b.link)}">${esc(b.text)}</a></div>`);
      case 'faq':
        return wrap(`${b.title ? title(b.title) : ''}<div class="bm-faq">${(b.items || []).map((it, i) => `<details class="bm-faq-item"${i === 0 ? ' open' : ''}><summary>${esc(it.q)}</summary><div class="bm-faq-a">${it.a}</div></details>`).join('')}</div>`);
      case 'video': {
        const yt = youtubeId(b.url);
        return wrap(yt
          ? `<div class="bm-video"><iframe src="https://www.youtube-nocookie.com/embed/${yt}" title="Vidéo" loading="lazy" allowfullscreen allow="accelerometer; encrypted-media; picture-in-picture"></iframe></div>`
          : `<div class="bm-video"><video src="${esc(b.url)}" controls playsinline></video></div>`);
      }
      case 'spacer': return `<div style="height:${b.height || 40}px"></div>`;
      case 'html': return wrap(`<div class="bm-html" style="width:100%">${b.code}</div>`);
    }
  }).join('\n');
}

export const allCategoryPaths = () => Object.keys(categories());
