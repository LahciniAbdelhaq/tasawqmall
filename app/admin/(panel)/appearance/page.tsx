import { getSettings } from '@/lib/settings';
import { PageTitle } from '@/components/admin/bits';
import AppearanceForm from './AppearanceForm';

export const metadata = { title: 'Apparence & logo' };

export default async function AppearancePage() {
  const s = await getSettings();
  return (
    <>
      <PageTitle title="Apparence & logo" sub="Logo, couleurs, polices, barre de navigation, pied de page et CSS. Les champs vides gardent le style d’origine." />
      <AppearanceForm brand={s.brand} theme={s.theme} />
    </>
  );
}
