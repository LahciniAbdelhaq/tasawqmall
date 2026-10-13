import type { Metadata } from 'next';
import WpPage from '@/components/WpPage';
import CheckoutView from '@/components/CheckoutView';
import { getI18n } from '@/lib/i18n';
import { getSettings } from '@/lib/settings';

export const metadata: Metadata = { title: 'Commande', robots: { index: false } };

export default async function CheckoutPage() {
  const [{ t }, s] = await Promise.all([getI18n(), getSettings()]);
  return (
    <WpPage title={t('Commande')} bodyClass="woocommerce-checkout">
      <CheckoutView shipping={s.shipping} />
    </WpPage>
  );
}
