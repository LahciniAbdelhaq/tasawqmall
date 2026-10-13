import Link from 'next/link';
import BodyClass from './BodyClass';
import { getI18n } from '@/lib/i18n';

const PAGE_BODY =
  'wp-singular page-template-default page wp-theme-woodmart wp-child-theme-woodmart-child theme-woodmart woocommerce-page woocommerce-js wrapper-custom categories-accordion-on woodmart-ajax-shop-on sticky-toolbar-on elementor-default elementor-kit-12';

/**
 * A plain WordPress page (title bar + breadcrumbs + content), as the theme renders it.
 * `raw` content is theme markup driven by the site runtime (e.g. product cards);
 * otherwise it is a React island that handles its own events.
 */
export default async function WpPage({ title, bodyClass = '', raw = false, children }: { title: string; bodyClass?: string; raw?: boolean; children: React.ReactNode }) {
  const { t } = await getI18n();
  return (
    <>
      <BodyClass value={`${PAGE_BODY} ${bodyClass}`.trim()} />
      <div className="wd-page-content main-page-wrapper">
        <div className="wd-page-title page-title page-title-default title-size-small title-design-default color-scheme-dark">
          <div className="wd-page-title-bg wd-fill"></div>
          <div className="container">
            <h1 className="entry-title title">{title}</h1>
            <nav className="wd-breadcrumbs">
              <Link href="/">{t('Accueil')}</Link>
              <span className="wd-delimiter"></span>
              <span className="wd-last">{title}</span>
            </nav>
          </div>
        </div>
        <main id="main-content" className="wd-content-layout content-layout-wrapper container wd-builder-off" role="main">
          <div className="wd-content-area site-content">
            <article className="entry-content page type-page status-publish hentry">
              {raw ? children : <div className="woocommerce bm-react">{children}</div>}
            </article>
          </div>
        </main>
      </div>
    </>
  );
}
