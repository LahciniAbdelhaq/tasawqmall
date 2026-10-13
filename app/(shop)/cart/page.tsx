import type { Metadata } from 'next';
import { Suspense } from 'react';
import WpPage from '@/components/WpPage';
import CartView from '@/components/CartView';
import { getI18n } from '@/lib/i18n';
import { getSettings } from '@/lib/settings';
import { lowestFreeFrom } from '@/lib/shipping';

export const metadata: Metadata = { title: 'Panier', robots: { index: false } };

export default async function CartPage() {
  const [{ t }, s] = await Promise.all([getI18n(), getSettings()]);
  return (
    <WpPage title={t('Panier')} bodyClass="woocommerce-cart">
      <Suspense>
        <CartView freeFrom={lowestFreeFrom(s.shipping)} />
      </Suspense>
    </WpPage>
  );
}
