import Link from 'next/link';
import { db } from '@/lib/db';
import { COUNTED } from '@/lib/analytics';
import { PageTitle } from '@/components/admin/bits';
import { fmtDay, money } from '@/lib/form';

export const metadata = { title: 'Clients' };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q || '').trim();
  const customers = await db.customer.findMany({
    where: q ? { OR: [{ phone: { contains: q } }, { firstName: { contains: q } }, { lastName: { contains: q } }, { city: { contains: q } }, { email: { contains: q } }] } : undefined,
    include: { orders: { select: { total: true, status: true, createdAt: true } } },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  const rows = customers.map((c) => {
    const valid = c.orders.filter((o) => COUNTED.includes(o.status));
    return { ...c, count: c.orders.length, spent: valid.reduce((s, o) => s + o.total, 0), last: c.orders.reduce<Date | null>((m, o) => (!m || o.createdAt > m ? o.createdAt : m), null) };
  });
  if (sp.sort === 'spent') rows.sort((a, b) => b.spent - a.spent);
  if (sp.sort === 'orders') rows.sort((a, b) => b.count - a.count);
  return (
    <>
      <PageTitle title="Clients" sub={`${rows.length} client(s) — créés automatiquement à chaque commande (identifiés par leur téléphone).`}>
        <a className="btn btn-secondary btn-sm" href="/api/admin/export/customers">Exporter CSV</a>
      </PageTitle>
      <div className="card">
        <div className="toolbar">
          <div className="tabs">
            <a href="/admin/customers" className={!sp.sort ? 'on' : ''}>Récents</a>
            <a href="/admin/customers?sort=spent" className={sp.sort === 'spent' ? 'on' : ''}>Meilleurs clients</a>
            <a href="/admin/customers?sort=orders" className={sp.sort === 'orders' ? 'on' : ''}>Plus de commandes</a>
          </div>
          <form style={{ marginLeft: 'auto' }}><input className="input" name="q" defaultValue={q} placeholder="Nom, téléphone, ville…" /></form>
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Client</th><th>Téléphone</th><th>Ville</th><th className="num">Commandes</th><th className="num">Total dépensé</th><th>Dernière commande</th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6} className="empty">Aucun client.</td></tr>}
              {rows.map((c) => (
                <tr key={c.id}>
                  <td><Link className="row-link" href={`/admin/customers/${c.id}`}>{c.firstName} {c.lastName}</Link>{c.blocked && <span className="pill red" style={{ marginLeft: 8 }}>Bloqué</span>}</td>
                  <td>{c.phone}</td><td>{c.city}</td><td className="num">{c.count}</td><td className="num">{money(c.spent)}</td>
                  <td className="muted">{c.last ? fmtDay(c.last) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
