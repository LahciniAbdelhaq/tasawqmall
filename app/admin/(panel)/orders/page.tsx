import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { ORDER_STATUSES } from '@/lib/orders';
import { PageTitle, StatusPill } from '@/components/admin/bits';
import { fmtDate, money } from '@/lib/form';

export const metadata = { title: 'Commandes' };
const PER = 30;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  const status = sp.status && ORDER_STATUSES[sp.status] ? sp.status : '';
  const q = (sp.q || '').trim();
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ number: { contains: q } }, { phone: { contains: q } }, { firstName: { contains: q } }, { lastName: { contains: q } }, { city: { contains: q } }] } : {}),
  };
  const [orders, total, counts] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PER, take: PER }),
    db.order.count({ where }),
    db.order.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const link = (p: Record<string, string | number>) => `/admin/orders?${new URLSearchParams({ ...(status ? { status } : {}), ...(q ? { q } : {}), ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v)])) })}`;

  return (
    <>
      <PageTitle title="Commandes" sub="Confirmez les commandes par téléphone ou WhatsApp, puis suivez leur livraison." />
      <div className="card">
        <div className="toolbar">
          <div className="tabs">
            <a href="/admin/orders" className={!status ? 'on' : ''}>Toutes ({counts.reduce((s, c) => s + c._count._all, 0)})</a>
            {Object.entries(ORDER_STATUSES).map(([k, v]) => <a key={k} href={`/admin/orders?status=${k}`} className={status === k ? 'on' : ''}>{v.label} ({count(k)})</a>)}
          </div>
          <form style={{ marginLeft: 'auto' }}>
            {status && <input type="hidden" name="status" value={status} />}
            <input className="input" name="q" defaultValue={q} placeholder="N°, téléphone, nom, ville…" />
          </form>
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>N°</th><th>Client</th><th>Ville</th><th>Articles</th><th>Source</th><th>Date</th><th>Statut</th><th className="num">Total</th></tr></thead>
            <tbody>
              {orders.length === 0 && <tr><td colSpan={8} className="empty">Aucune commande.</td></tr>}
              {orders.map((o) => (
                <tr key={o.id}>
                  <td><Link className="row-link" href={`/admin/orders/${o.id}`}>#{o.number}</Link></td>
                  <td>{o.firstName} {o.lastName}<div className="muted">{o.phone}</div></td>
                  <td>{o.city}</td>
                  <td className="muted">{(JSON.parse(o.lines) as unknown[]).length} produit(s){o.promoCode && <div><span className="pill plain amber">{o.promoCode}</span></div>}</td>
                  <td className="muted">{o.source || '—'}</td>
                  <td className="muted">{fmtDate(o.createdAt)}</td>
                  <td><StatusPill status={o.status} /></td>
                  <td className="num"><strong>{money(o.total)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pager">
          <span>{total} commande(s)</span>
          <span style={{ display: 'flex', gap: 8 }}>
            {page > 1 && <a className="btn btn-secondary btn-sm" href={link({ page: page - 1 })}>← Précédent</a>}
            {page * PER < total && <a className="btn btn-secondary btn-sm" href={link({ page: page + 1 })}>Suivant →</a>}
          </span>
        </div>
      </div>
    </>
  );
}
