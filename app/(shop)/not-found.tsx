import Link from 'next/link';
import WpPage from '@/components/WpPage';
import { getI18n } from '@/lib/i18n';

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <WpPage title={t('Page introuvable')} bodyClass="error404">
      <div className="wd-404-content">
        <p className="wd-empty-page">Cette page n&apos;existe pas ou plus.</p>
        <form role="search" method="get" className="searchform wd-style-default" action="/search">
          <input type="text" className="s" placeholder={t('Rechercher des produits')} name="s" aria-label="Search" required />
          <button type="submit" className="searchsubmit"><span>Search</span></button>
        </form>
        <p className="return-to-shop"><Link className="button" href="/">{t('Accueil')}</Link></p>
      </div>
    </WpPage>
  );
}
