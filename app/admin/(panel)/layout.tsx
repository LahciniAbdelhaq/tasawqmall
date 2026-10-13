import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import Shell from '@/components/admin/Shell';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const [pending, live] = await Promise.all([
    db.order.count({ where: { status: 'pending' } }),
    db.visit.count({ where: { lastSeen: { gte: new Date(Date.now() - 60_000) } } }),
  ]);
  return (
    <Shell admin={{ name: admin.name, email: admin.email }} badges={{ orders: pending, live }}>
      {children}
    </Shell>
  );
}
