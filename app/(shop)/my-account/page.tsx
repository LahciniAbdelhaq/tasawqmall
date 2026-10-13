import type { Metadata } from 'next';
import WpPage from '@/components/WpPage';
import AccountView from '@/components/AccountView';
import { getI18n } from '@/lib/i18n';

export const metadata: Metadata = { title: 'Mon compte', robots: { index: false } };

export default async function AccountPage() {
  const { t } = await getI18n();
  return (
    <WpPage title={t('Mon compte')} bodyClass="woocommerce-account">
      <AccountView />
    </WpPage>
  );
}
