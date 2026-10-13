import type { Settings } from './settings';

/** CSS overrides generated from the "Apparence" settings, layered on top of the theme. */
export function themeCss(th: Settings['theme'], rtl = false): string {
  const vars: string[] = [];
  const rules: string[] = [];
  const v = (name: string, val: string | undefined) => { if (val) vars.push(`${name}:${val}`); };
  const font = (f: string) => (f ? `"${f}", Arial, Helvetica, sans-serif` : '');

  v('--wd-primary-color', th.primary);
  v('--btn-accented-bgcolor', th.buttonBg || th.primary);
  v('--btn-accented-bgcolor-hover', th.buttonBg || th.primary);
  v('--btn-accented-color', th.buttonText);
  v('--btn-accented-brd-radius', th.buttonRadius);
  v('--wd-text-color', th.textColor);
  v('--wd-title-color', th.titleColor);
  v('--wd-entities-title-color', th.titleColor);
  v('--wd-link-color', th.linkColor);
  v('--wd-link-color-hover', th.linkHover);
  v('--wd-text-font', font(th.fontText));
  v('--wd-title-font', font(th.fontTitle));
  v('--wd-entities-title-font', font(th.fontTitle));
  v('--wd-header-el-font', font(th.fontText));
  v('--wd-text-font-size', th.fontSize);
  v('--wd-brd-radius', th.radius);
  if (vars.length) rules.push(`:root{${vars.join(';')}}`);

  if (th.bodyBg) rules.push(`body,.wd-page-wrapper,.website-wrapper{background-color:${th.bodyBg}}`);
  if (th.headerBg) rules.push(`.whb-general-header,.whb-header-bottom,.whb-sticked .whb-main-header{background-color:${th.headerBg}!important}`);
  if (th.headerBorder) rules.push(`.whb-general-header,.whb-header-bottom{border-color:${th.headerBorder}!important}`);
  if (th.navColor) rules.push(`.whb-header .wd-nav-header>li>a,.whb-header .wd-tools-element>a,.whb-header .wd-tools-text{color:${th.navColor}!important}`);
  if (th.navHover) rules.push(`.whb-header .wd-nav-header>li:hover>a,.whb-header .wd-nav-header>li>a:hover{color:${th.navHover}!important}`);
  if (th.navSize) rules.push(`.whb-header .wd-nav-header>li>a{font-size:${th.navSize}!important}`);
  if (th.navWeight) rules.push(`.whb-header .wd-nav-header>li>a{font-weight:${th.navWeight}!important}`);
  if (th.navUppercase) rules.push(`.whb-header .wd-nav-header>li>a{text-transform:uppercase}`);
  if (th.catButtonBg) rules.push(`.wd-header-cats .menu-opener{background-color:${th.catButtonBg}!important}`);
  if (th.catButtonText) rules.push(`.wd-header-cats .menu-opener{color:${th.catButtonText}!important}`);
  if (th.iconBg) rules.push(`.whb-header .wd-tools-element .wd-tools-icon,.whb-header .searchsubmit{background-color:${th.iconBg}!important}`);
  if (th.iconColor) rules.push(`.whb-header .wd-tools-element .wd-tools-icon,.whb-header .wd-tools-icon:before,.whb-header .searchsubmit:before{color:${th.iconColor}!important}`);
  if (th.headerSticky === false) rules.push(`.whb-header.whb-sticked .whb-main-header{position:absolute!important;animation:none!important}`);
  if (th.footerBg) rules.push(`.wd-footer,.wd-footer .e-con.e-parent,.wd-footer .elementor-section{background-color:${th.footerBg}!important}`);
  if (th.footerText) rules.push(`.wd-footer,.wd-footer p,.wd-footer .elementor-icon-list-text,.wd-footer .wd-text-block{color:${th.footerText}!important}`);
  if (th.footerLink) rules.push(`.wd-footer a,.wd-footer a .elementor-icon-list-text{color:${th.footerLink}!important}`);
  if (th.footerTitle) rules.push(`.wd-footer .title,.wd-footer h1,.wd-footer h2,.wd-footer h3,.wd-footer h4,.wd-footer h5{color:${th.footerTitle}!important}`);
  if (th.priceColor) rules.push(`.price,.price .amount,ins .amount{color:${th.priceColor}!important}`);
  if (th.saleBadgeBg) rules.push(`.product-label.onsale{background-color:${th.saleBadgeBg}!important}`);
  if (rtl) rules.push(RTL_CSS);
  if (th.customCss) rules.push(th.customCss);
  return rules.join('\n');
}

// The original theme ships LTR only: a few mirrors so Arabic reads naturally.
const RTL_CSS = `
html[dir=rtl] body{text-align:right}
html[dir=rtl] .wd-breadcrumbs,html[dir=rtl] .woocommerce-breadcrumb{direction:rtl}
html[dir=rtl] .wd-side-hidden.wd-right{right:auto;left:0;transform:translate3d(-100%,0,0)}
html[dir=rtl] .wd-side-hidden.wd-left{left:auto;right:0;transform:translate3d(100%,0,0)}
html[dir=rtl] .wd-side-hidden.wd-opened{transform:none}
html[dir=rtl] .wd-carousel-wrap{direction:ltr}
html[dir=rtl] .wd-carousel-item{direction:rtl}
html[dir=rtl] .wd-marquee{direction:ltr}
html[dir=rtl] .price,html[dir=rtl] .amount{direction:ltr;unicode-bidi:isolate}
html[dir=rtl] .bm-cart-grid,html[dir=rtl] .bm-checkout-grid{direction:rtl}
html[dir=rtl] [class*="wd-section-stretch"]{left:auto;right:calc(50% - 50vw + var(--wd-scroll-w) / 2 + var(--wd-sticky-nav-w) / 2)}
html[dir=rtl] .text-left{text-align:right}
html[dir=rtl] .text-right{text-align:left}
html[dir=rtl] .wd-single-price .price,html[dir=rtl] .wd-single-add-cart .cart{justify-content:flex-start}
`;

const LOCAL_FONTS = ['Manrope', 'Lato', 'Rubik'];
/** Google Fonts stylesheet for fonts chosen in the admin that the theme doesn't bundle. */
export function fontHref(th: Settings['theme']) {
  const fams = [...new Set([th.fontText, th.fontTitle].filter((f) => f && !LOCAL_FONTS.includes(f)))];
  if (!fams.length) return null;
  return `https://fonts.googleapis.com/css2?${fams.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;500;600;700`).join('&')}&display=swap`;
}
