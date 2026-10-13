import { PageTitle } from '@/components/admin/bits';
import LiveView from './LiveView';

export const metadata = { title: 'Visiteurs en direct' };

export default function LivePage() {
  return (
    <>
      <PageTitle title="Visiteurs en direct" sub="Mis à jour toutes les 5 secondes. Un visiteur est « en ligne » s’il a été actif dans la dernière minute." />
      <LiveView />
    </>
  );
}
