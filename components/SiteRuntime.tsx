'use client';
/**
 * Replaces the original WordPress/jQuery front-end (Woodmart, WooCommerce, Swiper, Smart
 * Slider, CookieYes, Chaty) with one small controller working on the same markup:
 * side panels, carousels, hero slider, add-to-cart, wishlist, live search, archive filters,
 * sticky header, cookie banner — plus client-side navigation for links inside raw HTML.
 */
import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  CURRENCY, cartCount, cartStore, cartTotal, fetchSnapshots, money, subscribeStore, wishlistStore,
} from '@/lib/store';

const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T & Element>(sel)) as T[];
let WHATSAPP = 'https://wa.me/212650123456'; // default, can be overridden by settings
const COOKIE_KEY = 'bm_cookie_consent';

/* ------------------------------------------------------------ side panels */

function openSide(sel: string) {
  closeSides();
  document.querySelector(sel)?.classList.add('wd-opened');
  document.querySelector('.wd-close-side')?.classList.add('wd-close-side-opened');
}
function closeSides() {
  $$('.wd-side-hidden.wd-opened').forEach((el) => el.classList.remove('wd-opened'));
  document.querySelector('.wd-close-side')?.classList.remove('wd-close-side-opened');
}

/* -------------------------------------------------------------- carousels */

type CarouselApi = { go: (i: number) => void; refresh: () => void };
const carousels = new WeakMap<Element, CarouselApi>();

function initCarousel(container: HTMLElement) {
  if (carousels.has(container)) return;
  const own = (sel: string) => $$<HTMLElement>(sel, container).filter((el) => el.closest('.wd-carousel-container') === container);
  const carousel = own('.wd-carousel')[0];
  const wrap = carousel?.querySelector<HTMLElement>(':scope > .wd-carousel-wrap');
  if (!carousel || !wrap) return;
  const prev = own('.wd-btn-arrow.wd-prev')[0];
  const next = own('.wd-btn-arrow.wd-next')[0];
  const drag = own('.wd-nav-scroll-drag')[0];
  const bullets = own('.wd-nav-pagin')[0];
  let index = 0;

  const items = () => Array.from(wrap.children) as HTMLElement[];
  const step = () => items()[0]?.getBoundingClientRect().width || carousel.clientWidth;
  const perView = () => Math.max(1, Math.round(carousel.getBoundingClientRect().width / step()));
  const maxIndex = () => Math.max(0, items().length - perView());

  function render() {
    index = Math.min(Math.max(0, index), maxIndex());
    wrap!.style.transitionDuration = '400ms';
    wrap!.style.transform = `translate3d(${-index * step()}px, 0, 0)`;
    prev?.classList.toggle('wd-disabled', index === 0);
    next?.classList.toggle('wd-disabled', index >= maxIndex());
    const hideNav = maxIndex() === 0;
    prev?.closest('.wd-nav-arrows')?.classList.toggle('wd-hide', hideNav);
    if (drag) {
      const track = drag.parentElement!.getBoundingClientRect().width;
      const n = items().length || 1;
      drag.style.width = `${(perView() / n) * track}px`;
      drag.style.transform = `translate3d(${(index / n) * track}px, 0, 0)`;
      drag.parentElement!.classList.toggle('wd-hide', hideNav);
    }
    if (bullets) {
      const pages = maxIndex() + 1;
      if (bullets.childElementCount !== pages) {
        bullets.innerHTML = Array.from({ length: pages }, (_, i) => `<li class="wd-nav-pagin-item"><span></span></li>`).join('');
      }
      Array.from(bullets.children).forEach((b, i) => b.classList.toggle('wd-active', i === index));
    }
    if (container.classList.contains('wd-gallery-images')) {
      const thumbs = container.parentElement?.querySelectorAll('.wd-gallery-thumb .wd-carousel-item');
      thumbs?.forEach((t, i) => t.classList.toggle('wd-thumb-active', i === index));
    }
  }
  const go = (i: number) => { index = i; render(); };
  prev?.addEventListener('click', () => go(index - perView()));
  next?.addEventListener('click', () => go(index + perView()));
  bullets?.addEventListener('click', (e) => {
    const li = (e.target as Element).closest('li');
    if (li) go(Array.from(bullets.children).indexOf(li));
  });

  // swipe / drag
  let startX = 0, dx = 0, down = false;
  carousel.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    down = true; startX = e.clientX; dx = 0;
  });
  window.addEventListener('pointermove', (e) => {
    if (!down) return;
    dx = e.clientX - startX;
    if (Math.abs(dx) > 5) {
      wrap.style.transitionDuration = '0ms';
      wrap.style.transform = `translate3d(${-index * step() + dx}px, 0, 0)`;
    }
  });
  window.addEventListener('pointerup', () => {
    if (!down) return;
    down = false;
    if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1) * Math.max(1, Math.round(Math.abs(dx) / step())));
    else render();
  });
  carousel.addEventListener('click', (e) => {
    if (Math.abs(dx) > 5) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  carousel.addEventListener('dragstart', (e) => e.preventDefault());

  // autoplay when the widget asked for it
  const auto = carousel.dataset.autoplay === 'yes' || container.dataset.autoplay === 'yes';
  if (auto) {
    const speed = +(carousel.dataset.autoplay_speed || carousel.dataset.speed || 5000) || 5000;
    let paused = false;
    container.addEventListener('mouseenter', () => (paused = true));
    container.addEventListener('mouseleave', () => (paused = false));
    const t = window.setInterval(() => {
      if (!document.body.contains(container)) return window.clearInterval(t);
      if (!paused && !down) go(index >= maxIndex() ? 0 : index + 1);
    }, speed);
  }
  carousel.classList.add('wd-initialized');
  const api = { go, refresh: render };
  carousels.set(container, api);
  render();
}

/* ------------------------------------------------- product gallery thumbnails */

function initGalleryThumbs(gallery: HTMLElement) {
  if (gallery.dataset.bmInit) return;
  gallery.dataset.bmInit = '1';
  const main = gallery.querySelector<HTMLElement>('.wd-gallery-images');
  const thumbs = $$<HTMLElement>('.wd-gallery-thumb .wd-carousel-item', gallery);
  if (!main || !thumbs.length) return;
  // left-hand thumbnails take the main image's height (the theme's JS used to set this)
  const size = () => gallery.style.setProperty('--wd-thumbs-height', `${main.getBoundingClientRect().height}px`);
  size();
  main.querySelectorAll('img').forEach((img) => img.addEventListener('load', size, { once: true }));
  window.addEventListener('resize', size);
  thumbs.forEach((t, i) => t.addEventListener('click', () => carousels.get(main)?.go(i)));
  const nav = gallery.querySelector('.wd-thumb-nav');
  const visible = +(getComputedStyle(gallery.querySelector('.wd-gallery-thumb .wd-carousel')!).getPropertyValue('--wd-col') || 3);
  if (nav && thumbs.length <= visible) nav.classList.add('wd-hide');
  nav?.querySelector('.wd-prev')?.addEventListener('click', () => main.querySelector<HTMLElement>('.wd-nav-arrows .wd-prev')?.click());
  nav?.querySelector('.wd-next')?.addEventListener('click', () => main.querySelector<HTMLElement>('.wd-nav-arrows .wd-next')?.click());
}

/* ------------------------------------------------------ smart slider (hero) */

function initSmartSlider(slider: HTMLElement, navigate: (href: string) => void) {
  if (slider.dataset.bmInit) return;
  slider.dataset.bmInit = '1';
  const slides = $$<HTMLElement>('.n2-ss-slide', slider);
  const bgs = $$<HTMLElement>('.n2-ss-slide-background', slider);
  if (!slides.length) return;
  let index = Math.max(0, slides.findIndex((s) => s.classList.contains('n2-ss-slide-active')));
  const show = (i: number) => {
    index = (i + slides.length) % slides.length;
    slides.forEach((s, k) => {
      const on = k === index;
      s.style.transform = on ? 'translate3d(0px, 0px, 0px)' : 'translate3d(-100000px, 0px, 0px)';
      s.classList.toggle('n2-ss-slide-active', on);
      s.setAttribute('aria-hidden', on ? 'false' : 'true');
    });
    bgs.forEach((b, k) => {
      b.style.transform = k === index ? 'translate3d(0px, 0px, 0px)' : 'translate3d(-100000px, 0px, 0px)';
      b.classList.toggle('bm-active', k === index);
    });
  };
  slider.querySelector('.nextend-arrow-previous')?.addEventListener('click', () => show(index - 1));
  slider.querySelector('.nextend-arrow-next')?.addEventListener('click', () => show(index + 1));
  let startX = 0, moved = false;
  slider.addEventListener('pointerdown', (e) => { startX = e.clientX; moved = false; });
  slider.addEventListener('pointerup', (e) => {
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 50) { moved = true; show(index + (dx < 0 ? 1 : -1)); }
  });
  slides.forEach((s) => {
    const href = s.dataset.href;
    if (!href) return;
    s.style.cursor = 'pointer';
    s.addEventListener('click', () => { if (!moved) navigate(href); });
  });
  let paused = false;
  slider.addEventListener('mouseenter', () => (paused = true));
  slider.addEventListener('mouseleave', () => (paused = false));
  const t = window.setInterval(() => {
    if (!document.body.contains(slider)) return window.clearInterval(t);
    if (!paused && !document.hidden) show(index + 1);
  }, 5000);
  show(index);
}

/* ------------------------------------------------------------ price slider */

function initPriceSlider(form: HTMLFormElement) {
  if (form.dataset.bmInit) return;
  form.dataset.bmInit = '1';
  const track = form.querySelector<HTMLElement>('.price_slider');
  const range = form.querySelector<HTMLElement>('.ui-slider-range');
  const handles = $$<HTMLElement>('.ui-slider-handle', form);
  const minI = form.querySelector<HTMLInputElement>('#min_price');
  const maxI = form.querySelector<HTMLInputElement>('#max_price');
  if (!track || !range || handles.length < 2 || !minI || !maxI) return;
  const lo = +(minI.dataset.min || 0), hi = +(maxI.dataset.max || 0);
  const stepV = 10;
  let vals = [+minI.value || lo, +maxI.value || hi];
  const pct = (v: number) => (hi > lo ? ((v - lo) / (hi - lo)) * 100 : 0);
  const paint = () => {
    handles[0].style.left = `${pct(vals[0])}%`;
    handles[1].style.left = `${pct(vals[1])}%`;
    range.style.left = `${pct(vals[0])}%`;
    range.style.width = `${pct(vals[1]) - pct(vals[0])}%`;
    minI.value = String(vals[0]);
    maxI.value = String(vals[1]);
    const from = form.querySelector('.price_label .from'), to = form.querySelector('.price_label .to');
    if (from) from.textContent = `${CURRENCY}${vals[0].toLocaleString('en-US')}`;
    if (to) to.textContent = `${CURRENCY}${vals[1].toLocaleString('en-US')}`;
  };
  handles.forEach((h, k) => {
    h.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      h.setPointerCapture(e.pointerId);
      const move = (ev: PointerEvent) => {
        const r = track.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
        let v = Math.round((lo + ratio * (hi - lo)) / stepV) * stepV;
        v = k === 0 ? Math.min(v, vals[1]) : Math.max(v, vals[0]);
        vals[k] = v;
        paint();
      };
      const up = () => { h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); };
      h.addEventListener('pointermove', move);
      h.addEventListener('pointerup', up);
    });
    h.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? stepV : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -stepV : 0;
      if (!d) return;
      e.preventDefault();
      vals[k] = Math.min(hi, Math.max(lo, vals[k] + d));
      if (vals[0] > vals[1]) vals = k === 0 ? [vals[1], vals[1]] : [vals[0], vals[0]];
      paint();
    });
  });
  paint();
}

/* ------------------------------------------------------------- live search */

function searchResultsHtml(q: string, items: { slug: string; name: string; image: string; priceHtml: string; sku?: string }[]) {
  if (!items.length) return `<div class="wd-search-results-wrapper"><div class="wd-not-found">Aucun produit trouvé</div></div>`;
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const re = new RegExp(`(${q.trim().split(/\s+/).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return `<div class="wd-suggestions-group wd-type-product">${items.map((p) => `<div class="wd-suggestion"><a class="wd-fill" href="/product/${p.slug}" aria-label="${esc(p.name)}"></a><div class="wd-suggestion-thumb"><img src="${p.image}" alt="" width="60" height="60"></div><div class="wd-suggestion-content wd-set-mb reset-last-child"><h4 class="wd-entities-title">${esc(p.name).replace(re, '<strong>$1</strong>')}</h4><div class="price">${p.priceHtml}</div></div></div>`).join('')}</div><div class="wd-search-footer"><a href="/search?s=${encodeURIComponent(q)}" class="wd-all-results">Voir tous les résultats</a></div>`;
}

function initSearch(form: HTMLFormElement) {
  if (form.dataset.bmInit) return;
  form.dataset.bmInit = '1';
  const input = form.querySelector<HTMLInputElement>('input[name="s"]');
  const box = form.parentElement?.querySelector<HTMLElement>('.wd-search-results');
  const content = box?.querySelector<HTMLElement>('.wd-scroll-content') ?? box;
  const clear = form.querySelector<HTMLElement>('.wd-clear-search');
  if (!input || !box || !content) return;
  let timer = 0, seq = 0;
  input.addEventListener('input', () => {
    const q = input.value.trim();
    clear?.classList.toggle('wd-hide', !q);
    window.clearTimeout(timer);
    if (q.length < 3) { box.classList.remove('wd-opened'); return; }
    timer = window.setTimeout(async () => {
      const my = ++seq;
      form.classList.add('search-loading');
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const items = await r.json();
        if (my !== seq) return;
        content.innerHTML = searchResultsHtml(q, items);
        box.classList.add('wd-opened');
      } finally {
        form.classList.remove('search-loading');
      }
    }, 250);
  });
  clear?.addEventListener('click', () => { input.value = ''; box.classList.remove('wd-opened'); clear.classList.add('wd-hide'); input.focus(); });
  document.addEventListener('click', (e) => { if (!form.parentElement?.contains(e.target as Node)) box.classList.remove('wd-opened'); });
}

/* ----------------------------------------------------- header + wishlist sync */

function syncHeader() {
  const lines = cartStore.get();
  $$('.wd-header-cart .wd-cart-number').forEach((el) => (el.innerHTML = `${cartCount(lines)} <span>items</span>`));
  $$('.wd-header-cart .wd-cart-subtotal').forEach((el) => {
    el.innerHTML = `<span class="woocommerce-Price-amount amount"><bdi><span class="woocommerce-Price-currencySymbol">${CURRENCY}</span>${money(cartTotal(lines))}</bdi></span>`;
  });
  const wish = wishlistStore.get();
  $$('.wd-header-wishlist .wd-tools-count').forEach((el) => (el.textContent = String(wish.length)));
  $$<HTMLAnchorElement>('.wd-wishlist-btn a[data-product-id]').forEach((a) => {
    const on = wish.includes(+a.dataset.productId!);
    a.classList.toggle('added', on);
    const t = a.querySelector('.wd-action-text');
    if (t) {
      // labels come translated from the server: remember the original, use data-added-text when added
      a.dataset.bmLabel ??= t.textContent || '';
      t.textContent = on ? a.dataset.addedText || a.dataset.bmLabel : a.dataset.bmLabel;
    }
  });
}

/* ---------------------------------------------------------- add to cart */

async function addToCart(id: number, qty: number, button?: HTMLElement | null) {
  button?.classList.add('loading');
  try {
    const [snap] = await fetchSnapshots([id]);
    if (!snap || !snap.inStock) throw new Error('unavailable');
    cartStore.add(snap, qty);
    window.dispatchEvent(new CustomEvent('bm:event', { detail: { name: 'AddToCart', value: snap.price * qty, ids: [snap.id] } }));
    button?.classList.add('added');
    openSide('.cart-widget-side');
  } catch {
    window.alert("Ce produit n'est plus disponible.");
  } finally {
    button?.classList.remove('loading');
  }
}

/* ------------------------------------------------------------------ init */

function initPage(navigate: (href: string) => void) {
  $$<HTMLElement>('.wd-carousel-container:not(.wd-gallery-thumb)').forEach(initCarousel);
  $$<HTMLElement>('.woocommerce-product-gallery.wd-has-thumb').forEach(initGalleryThumbs);
  $$<HTMLElement>('.n2-ss-slider').forEach((s) => initSmartSlider(s, navigate));
  $$<HTMLFormElement>('.widget_price_filter form').forEach(initPriceSlider);
  $$<HTMLFormElement>('form.searchform').forEach(initSearch);
  // lazy images that the theme would have revealed with JS
  $$<HTMLImageElement>('img[loading="lazy"]').forEach((img) => img.classList.add('wd-loaded'));
  syncHeader();
}

export default function SiteRuntime({ whatsapp }: { whatsapp?: string }) {
  if (whatsapp) WHATSAPP = `https://wa.me/${whatsapp.replace(/\D/g, '')}`;
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  // document-level behaviour, installed once
  useEffect(() => {
    const navigate = (href: string) => {
      if (/^https?:/.test(href)) window.location.href = href;
      else router.push(href);
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      // side panels (also inside the React mini cart)
      if (t.closest('.wd-close-side, .close-side-widget a')) { e.preventDefault(); closeSides(); return; }
      if (t.closest('.bm-react')) {
        // React islands handle their own clicks; links still close the panels
        if (t.closest('a[href^="/"]')) closeSides();
        return;
      }
      const cartOpener = t.closest('.cart-widget-opener a');
      if (cartOpener && !t.closest('.wd-toolbar')) { e.preventDefault(); openSide('.cart-widget-side'); return; }
      if (t.closest('.wd-header-mobile-nav a, .wd-toolbar-mobile-nav a, .mobile-nav-icon')) { e.preventDefault(); openSide('.mobile-nav'); return; }

      // mobile menu: sub-menu openers
      const opener = t.closest('.wd-nav-mobile .wd-nav-opener');
      if (opener) {
        e.preventDefault();
        const li = opener.parentElement!;
        const sub = li.querySelector<HTMLElement>(':scope > .wd-sub-menu, :scope > .wd-dropdown');
        const on = !opener.classList.contains('wd-active');
        opener.classList.toggle('wd-active', on);
        li.classList.toggle('opener-page', on);
        if (sub) sub.style.display = on ? 'block' : '';
        return;
      }
      const tab = t.closest<HTMLElement>('.wd-nav-mob-tab > li');
      if (tab) {
        e.preventDefault();
        $$('.wd-nav-mob-tab > li').forEach((li) => li.classList.toggle('wd-active', li === tab));
        const menu = tab.dataset.menu;
        $$('.mobile-nav .wd-nav-mobile').forEach((m) => m.classList.toggle('wd-active', m.dataset.menu === menu || m.id.includes(menu || '#')));
        return;
      }

      // click-triggered dropdowns
      const clickDrop = t.closest('.wd-event-click > a, .wd-event-click > .menu-opener');
      if (clickDrop) {
        e.preventDefault();
        clickDrop.parentElement!.classList.toggle('wd-opened');
        return;
      }

      // footer / widget toggles
      const toggle = t.closest('.wd-el-toggle-head');
      if (toggle) { toggle.closest('.wd-el-toggle')?.classList.toggle('wd-active'); return; }

      // quantity +/- (not in React islands)
      const qtyBtn = t.closest<HTMLInputElement>('.quantity .plus, .quantity .minus');
      if (qtyBtn) {
        const input = qtyBtn.parentElement!.querySelector<HTMLInputElement>('input.qty');
        if (input) {
          const max = +input.max || Infinity, min = +input.min || 1;
          const v = (+input.value || 1) + (qtyBtn.classList.contains('plus') ? 1 : -1);
          input.value = String(Math.min(max, Math.max(min, v)));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return;
      }

      // add to cart from product cards / carousels
      const add = t.closest<HTMLElement>('.add_to_cart_button[data-product_id], a[href^="/cart?add-to-cart="]');
      if (add) {
        e.preventDefault();
        const id = +(add.dataset.product_id || new URL(add.getAttribute('href')!, location.href).searchParams.get('add-to-cart') || 0);
        const card = add.closest('.wd-product');
        const qty = +(card?.querySelector<HTMLInputElement>('input.qty')?.value || add.dataset.quantity || 1);
        if (id) void addToCart(id, qty, add);
        return;
      }

      // wishlist
      const wish = t.closest<HTMLAnchorElement>('.wd-wishlist-btn a[data-product-id]');
      if (wish) {
        e.preventDefault();
        const id = +wish.dataset.productId!;
        if (wishlistStore.has(id)) navigate('/wishlist');
        else wishlistStore.toggle(id);
        return;
      }
      const wishRemove = t.closest<HTMLElement>('[data-wishlist-remove]');
      if (wishRemove) { e.preventDefault(); wishlistStore.remove(+wishRemove.dataset.wishlistRemove!); return; }

      // cookie banner
      if (t.closest('.cky-btn-accept, .cky-btn-reject, .cky-btn-preferences[data-cky-tag="detail-save-button"], .cky-btn-close')) {
        const accepted = !!t.closest('.cky-btn-accept');
        if (!t.closest('.cky-btn-close')) {
          try { localStorage.setItem(COOKIE_KEY, accepted ? 'all' : 'necessary'); } catch { /* ignore */ }
          window.dispatchEvent(new Event('bm:consent'));
        }
        if (t.closest('.cky-btn-close') && !localStorage.getItem(COOKIE_KEY)) {
          document.querySelector('.cky-modal')?.classList.remove('cky-modal-open');
          document.querySelector('.cky-overlay')?.classList.add('cky-hide');
          return;
        }
        document.querySelector('.cky-consent-container')?.classList.add('cky-hide');
        document.querySelector('.cky-modal')?.classList.remove('cky-modal-open');
        document.querySelector('.cky-overlay')?.classList.add('cky-hide');
        return;
      }
      if (t.closest('.cky-btn-preferences, .cky-btn-customize, .cky-banner-btn-revisit')) {
        document.querySelector('.cky-modal')?.classList.add('cky-modal-open');
        document.querySelector('.cky-overlay')?.classList.remove('cky-hide');
        return;
      }

      // chaty contact widget
      if (t.closest('.chaty-cta-main, .open-chaty')) {
        document.querySelector('.chaty-widget')?.classList.toggle('chaty-open');
        return;
      }
      if (t.closest('.chaty-cta-close')) { document.querySelector('.chaty-widget')?.classList.remove('chaty-open'); return; }
      if (t.closest('.chaty-whatsapp-channel')) { e.preventDefault(); window.open(WHATSAPP, '_blank', 'noopener'); return; }

      // scroll to top
      if (t.closest('.scrollToTop')) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }

      // client-side navigation for internal links in raw HTML
      const a = t.closest<HTMLAnchorElement>('a[href]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const href = a.getAttribute('href')!;
      if (a.target === '_blank' || a.hasAttribute('download') || !href.startsWith('/') || href.startsWith('//')) return;
      if (/^\/(assets|wp-content|api)\//.test(href)) return;
      e.preventDefault();
      closeSides();
      router.push(href);
    };

    const onSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement;
      if (form.closest('.bm-react')) return;
      // single product: add to cart
      if (form.matches('form.cart')) {
        e.preventDefault();
        const btn = form.querySelector<HTMLButtonElement>('button[name="add-to-cart"], .single_add_to_cart_button');
        const id = +(btn?.value || form.dataset.product_id || 0);
        const qty = +(form.querySelector<HTMLInputElement>('input.qty')?.value || 1);
        if (id) void addToCart(id, qty, btn);
        return;
      }
      // GET forms (search, ordering, price filter) -> client navigation
      if ((form.method || 'get').toLowerCase() === 'get') {
        e.preventDefault();
        const action = new URL(form.getAttribute('action') || location.pathname, location.href);
        const params = new URLSearchParams();
        new FormData(form).forEach((v, k) => { if (String(v) !== '') params.set(k, String(v)); });
        params.delete('page');
        router.push(`${action.pathname}${params.toString() ? '?' + params : ''}`);
        return;
      }
      // account forms: no remote account system
      if (form.matches('form.login, form.register, form.woocommerce-form-login')) {
        e.preventDefault();
        closeSides();
        router.push('/my-account');
      }
    };

    const onChange = (e: Event) => {
      const t = e.target as HTMLElement;
      if (t.closest('.bm-react')) return;
      if (t.matches('select.orderby')) (t.closest('form') as HTMLFormElement)?.requestSubmit();
      if (t.matches('select.dropdown_product_cat')) {
        const v = (t as HTMLSelectElement).value;
        if (v) router.push(`/product-category/${v}`);
      }
    };

    const onInput = (e: Event) => {
      const t = e.target as HTMLInputElement;
      if (!t.matches('.wd-filter-search input')) return;
      const q = t.value.trim().toLowerCase();
      const list = t.closest('.wd-filter-wrapper')?.querySelectorAll<HTMLElement>('.wc-layered-nav-term');
      list?.forEach((li) => (li.style.display = !q || li.textContent!.toLowerCase().includes(q) ? '' : 'none'));
    };

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeSides(); };

    // sticky header + scroll-to-top button
    const header = document.querySelector<HTMLElement>('.whb-header');
    const onScroll = () => {
      const y = window.scrollY;
      header?.classList.toggle('whb-sticked', y > 150);
      header?.classList.toggle('whb-scroll-down', y > 150);
      document.querySelector('.scrollToTop')?.classList.toggle('button-show', y > 400);
    };

    document.addEventListener('click', onClick);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('change', onChange);
    document.addEventListener('input', onInput);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, { passive: true });
    const onResize = () => $$('.wd-carousel-container').forEach((c) => carousels.get(c)?.refresh());
    window.addEventListener('resize', onResize);
    const unsub = subscribeStore(syncHeader);

    // cookie banner only for visitors who never chose
    try {
      if (!localStorage.getItem(COOKIE_KEY)) document.querySelector('.cky-consent-container')?.classList.remove('cky-hide');
    } catch { /* storage blocked: leave hidden */ }
    // refresh cart prices from the catalogue once per visit
    const ids = cartStore.get().map((l) => l.id);
    if (ids.length) fetchSnapshots(ids).then((s) => cartStore.sync(s)).catch(() => {});
    onScroll();

    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('submit', onSubmit);
      document.removeEventListener('change', onChange);
      document.removeEventListener('input', onInput);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      unsub();
    };
  }, [router]);

  // per-page widgets, re-run after every navigation
  useEffect(() => {
    closeSides();
    const nav = (href: string) => (/^https?:/.test(href) ? (window.location.href = href) : router.push(href));
    const id = window.requestAnimationFrame(() => initPage(nav));
    return () => window.cancelAnimationFrame(id);
  }, [pathname, search, router]);

  return null;
}
