import { notFound } from 'next/navigation';
import VisitorHistory from '@/components/admin/VisitorHistory';
import { visitorProfile } from '@/lib/analytics';

export const metadata = { title: 'Historique du visiteur' };

export default async function VisitorPage({ params }: { params: Promise<{ vid: string }> }) {
  const p = await visitorProfile([decodeURIComponent((await params).vid)]);
  if (!p) notFound();
  return <VisitorHistory p={p} back={{ href: '/admin/live?tab=history&days=30', label: '← Historique' }} />;
}
