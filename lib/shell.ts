import 'server-only';
import * as cheerio from 'cheerio';
import { renderFragment } from './cms';
import { htmlFile, esc } from './render';
import { LOCALES } from './locales';
import type { Settings } from './settings';

/**
 * The shared page chrome (header, footer, mobile menu, …) with CMS edits, brand logo,
 * extra menu items and the language switcher applied.
 */
export async function buildShell(locale: string, dict: Record<string, string>, s: Settings) {
  const frag = (file: string, name: string) => renderFragment(htmlFile(file), name, locale, dict);
  const [header, footer, mobileNav, toolbar, loginSide, chaty, cookie] = await Promise.all([
    frag('header.html', 'header'),
    frag('footer.html', 'footer'),
    frag('mobile-nav.html', 'mobile-nav'),
    frag('toolbar.html', 'toolbar'),
    frag('login-side.html', 'login-side'),
    frag('chaty.html', 'chaty'),
    frag('cookie.html', 'cookie'),
  ]);

  const languages = s.languages.enabled.filter((l) => LOCALES[l]);
  // relative link: stays on the current page (full reload so everything re-renders)
  const langHref = (l: string) => `?lang=${l}`;

  // header: logo, extra menu items, language switcher
  const $h = cheerio.load(header, null, false);
  if (s.brand.logo) $h('.wd-logo.wd-main-logo img').attr('src', s.brand.logo).removeAttr('srcset').removeAttr('sizes');
  if (s.brand.logoMobile || s.brand.logo) $h('.whb-header-bottom .wd-logo img').attr('src', s.brand.logoMobile || s.brand.logo).removeAttr('srcset').removeAttr('sizes');
  $h('.wd-logo img').attr('alt', s.brand.name);
  const nav = $h('ul.wd-nav-secondary').first();
  const tpl = nav.children('li').first();
  for (const item of s.menus.headerExtra) {
    const li = tpl.clone();
    // a copy of the first item: drop its id and CMS keys so edits never target the original
    li.removeAttr('id').removeAttr('data-bm').find('img').remove();
    li.find('[data-bm]').removeAttr('data-bm');
    li.find('a').attr('href', item.href);
    if (item.newTab) li.find('a').attr('target', '_blank').attr('rel', 'noopener');
    li.find('.nav-link-text').text(item.label);
    if (item.icon) li.find('a').prepend(`<img src="${esc(item.icon)}" alt="" class="wd-nav-img" width="18" height="18">`);
    nav.append(li);
  }
  if (s.languages.showSwitcher && languages.length > 1) {
    const cur = LOCALES[locale];
    nav.append(`<li class="menu-item menu-item-has-children item-level-0 menu-simple-dropdown wd-event-hover bm-lang"><a href="${langHref(locale)}" class="woodmart-nav-link" aria-label="Langue"><span class="nav-link-text">${cur.flag} ${locale.toUpperCase()}</span></a><div class="color-scheme-dark wd-design-default wd-dropdown-menu wd-dropdown"><div class="container wd-entry-content"><ul class="wd-sub-menu color-scheme-dark">${languages.map((l) => `<li class="menu-item item-level-1${l === locale ? ' current-menu-item' : ''}"><a href="${langHref(l)}" class="woodmart-nav-link" hreflang="${l}">${LOCALES[l].flag} ${LOCALES[l].native}</a></li>`).join('')}</ul></div></div></li>`);
  }

  // mobile menu: extra items + languages
  const $m = cheerio.load(mobileNav, null, false);
  const mnav = $m('ul.wd-nav-mobile').first();
  for (const item of s.menus.mobileExtra) {
    mnav.append(`<li class="menu-item item-level-0"><a href="${esc(item.href)}" class="woodmart-nav-link">${item.icon ? `<img src="${esc(item.icon)}" alt="" width="18" height="18" class="wd-nav-img"> ` : ''}<span class="nav-link-text">${esc(item.label)}</span></a></li>`);
  }
  if (s.languages.showSwitcher && languages.length > 1) {
    mnav.append(`<li class="menu-item item-level-0 bm-lang-mobile">${languages.map((l) => `<a href="${langHref(l)}" class="woodmart-nav-link${l === locale ? ' bm-on' : ''}" hreflang="${l}">${LOCALES[l].flag} ${LOCALES[l].native}</a>`).join('')}</li>`);
  }

  // footer contact lines follow Apparence & logo (phone, e-mail)
  const $f = cheerio.load(footer, null, false);
  if (s.brand.phone) $f('[data-bm="f8"]').text(s.brand.phone);
  if (s.brand.email) $f('[data-bm="f11"]').text(s.brand.email);

  // WhatsApp links baked into the cloned markup follow the number set in Apparence & logo
  const wa = (s.brand.whatsapp || '').replace(/\D/g, '');
  const withWa = (html: string) => (wa ? html.replace(/wa\.me\/\d+/g, `wa.me/${wa}`) : html);

  return { header: withWa($h.html()), footer: withWa($f.html()), mobileNav: withWa($m.html()), toolbar: withWa(toolbar), loginSide, chaty: withWa(chaty), cookie };
}
