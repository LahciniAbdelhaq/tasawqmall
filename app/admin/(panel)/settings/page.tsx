import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { PageTitle } from '@/components/admin/bits';
import { ConfirmButton } from '@/components/admin/ui';
import { fmtDate } from '@/lib/form';
import { deleteAdminUser } from '../../actions/auth';
import { ShippingForm, OrderMessagesForm, PasswordForm, NewAdminForm } from './SettingsForms';

export const metadata = { title: 'Paramètres' };

export default async function SettingsPage() {
  const me = await requireAdmin();
  const [s, admins] = await Promise.all([getSettings(), db.adminUser.findMany({ orderBy: { createdAt: 'asc' } })]);
  return (
    <>
      <PageTitle title="Paramètres" sub="Livraison, messages de confirmation, comptes du back-office." />
      <div className="grid-2">
        <div>
          <ShippingForm initial={s.shipping} />
          <OrderMessagesForm initial={s.orders} />
        </div>
        <div>
          <div className="card">
            <div className="card-head"><h2>Comptes du back-office</h2></div>
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Nom</th><th>Rôle</th><th>Dernière connexion</th><th className="actions-col" /></tr></thead>
                <tbody>
                  {admins.map((a) => (
                    <tr key={a.id}>
                      <td>{a.name}<div className="muted" style={{ fontSize: 12 }}>{a.email}</div></td>
                      <td>{a.role === 'admin' ? 'Administrateur' : 'Éditeur'}</td>
                      <td className="muted">{a.lastLoginAt ? fmtDate(a.lastLoginAt) : '—'}</td>
                      <td>{a.id !== me.id && me.role === 'admin' && <form action={deleteAdminUser}><input type="hidden" name="id" value={a.id} /><ConfirmButton className="icon-btn icon-btn--delete" message={`Supprimer le compte de ${a.name} ?`}>✕</ConfirmButton></form>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {me.role === 'admin' && <NewAdminForm />}
          <PasswordForm />
          <div className="card card-pad">
            <h3 style={{ fontSize: 15, marginBottom: 8 }}>Exports</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a className="btn btn-secondary btn-sm" href="/api/admin/export/orders">Commandes (CSV)</a>
              <a className="btn btn-secondary btn-sm" href="/api/admin/export/customers">Clients (CSV)</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
