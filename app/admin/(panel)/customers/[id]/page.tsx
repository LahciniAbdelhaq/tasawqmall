import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { COUNTED } from '@/lib/analytics';
import { PageTitle, StatusPill } from '@/components/admin/bits';
import { fmtDate, money } from '@/lib/form';
import CustomerForm from './CustomerForm';

export const metadata = { title: 'Client' };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const c = await db.customer.findUnique({ where: { id: Number((await params).id) }, include: { orders: { orderBy: { createdAt: 'desc' } } } });
  if (!c) notFound();
  const valid = c.orders.filter((o) => COUNTED.includes(o.status));
  const spent = valid.reduce((s, o) => s + o.total, 0);
  return (
    <>
      <Link className="back-link" href="/admin/customers">← Clients</Link>
      <PageTitle title={`${c.firstName} ${c.lastName}`} sub={`Client depuis le ${fmtDate(c.createdAt)}`}>
        <a className="btn btn-secondary btn-sm" href={`tel:${c.phone}`}>Appeler</a>
        <a className="btn btn-sm" style={{ background: '#25D366' }} href={`https://wa.me/${c.phone.replace(/^0/, '212')}`} target="_blank" rel="noreferrer">WhatsApp</a>
      </PageTitle>
      <div className="stat-row">
        <div className="card"><div className="label">Commandes</div><div className="value">{c.orders.length}</div></div>
        <div className="card"><div className="label">Total dépensé</div><div className="value">{money(spent)}</div></div>
        <div className="card"><div className="label">Panier moyen</div><div className="value">{money(valid.length ? spent / valid.length : 0)}</div></div>
        <div className="card"><div className="label">Annulées / retournées</div><div className="value">{c.orders.filter((o) => !COUNTED.includes(o.status)).length}</div></div>
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-head"><h2>Commandes</h2></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>N°</th><th>Date</th><th>Statut</th><th className="num">Total</th></tr></thead>
              <tbody>
                {c.orders.map((o) => (
                  <tr key={o.id}><td><Link className="row-link" href={`/admin/orders/${o.id}`}>#{o.number}</Link></td><td className="muted">{fmtDate(o.createdAt)}</td><td><StatusPill status={o.status} /></td><td className="num">{money(o.total)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <CustomerForm c={{ id: c.id, firstName: c.firstName, lastName: c.lastName, phone: c.phone, email: c.email ?? '', city: c.city ?? '', address: c.address ?? '', note: c.note ?? '', blocked: c.blocked }} />
      </div>
    </>
  );
}
