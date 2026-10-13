import Link from 'next/link';
import { db } from '@/lib/db';
import { overview, delta } from '@/lib/analytics';
import { TimeChart, Donut } from '@/components/admin/Charts';
import { BarList, Kpi, PageTitle, PeriodTabs, StatusPill, dh, pct } from '@/components/admin/bits';
import { fmtDate, money } from '@/lib/form';

export const metadata = { title: 'Tableau de bord' };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const days = Math.min(365, Math.max(1, Number((await searchParams).days) || 30));
  const [o, recent, lowStock] = await Promise.all([
    overview(days),
    db.order.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
    db.product.count({ where: { inStock: false, published: true } }),
  ]);
  const k = o.kpi;
  return (
    <>
      <PageTitle title="Tableau de bord" sub="Vue d’ensemble de la boutique.">
        <PeriodTabs base="/admin" days={days} />
      </PageTitle>
      <div className="kpis">
        <Kpi icon="receipt" label="Chiffre d’affaires" value={dh(k.revenue)} delta={delta(k.revenue, k.prevRevenue)} />
        <Kpi icon="box" label="Commandes" value={k.orders} delta={delta(k.orders, k.prevOrders)} hint={`${k.pending} en attente de confirmation`} />
        <Kpi icon="users" label="Visites" value={k.visits.toLocaleString('fr-FR')} delta={delta(k.visits, k.prevVisits)} hint={`${k.visitors.toLocaleString('fr-FR')} visiteurs uniques`} />
        <Kpi icon="target" label="Taux de conversion" value={pct(k.conversion)} hint={`Panier moyen ${dh(k.aov)}`} />
      </div>
      <div className="grid-2">
        <div>
          <div className="card">
            <div className="card-head"><h2>Ventes et visites</h2><span className="muted">{days} derniers jours</span></div>
            <div className="card-body"><TimeChart data={o.series} keys={[['revenue', 'Chiffre d’affaires (DH)'], ['visits', 'Visites', '#F2994A']]} /></div>
          </div>
          <div className="card">
            <div className="card-head"><h2>Dernières commandes</h2><Link className="link" href="/admin/orders">Tout voir</Link></div>
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>N°</th><th>Client</th><th>Ville</th><th>Date</th><th>Statut</th><th className="num">Total</th></tr></thead>
                <tbody>
                  {recent.length === 0 && <tr><td colSpan={6} className="empty">Aucune commande pour le moment.</td></tr>}
                  {recent.map((r) => (
                    <tr key={r.id}>
                      <td><Link className="row-link" href={`/admin/orders/${r.id}`}>#{r.number}</Link></td>
                      <td>{r.firstName} {r.lastName}<div className="muted">{r.phone}</div></td>
                      <td>{r.city}</td>
                      <td className="muted">{fmtDate(r.createdAt)}</td>
                      <td><StatusPill status={r.status} /></td>
                      <td className="num">{money(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div>
          <div className="card">
            <div className="card-head"><h2>En ce moment</h2><Link className="link" href="/admin/live">Direct</Link></div>
            <div className="card-body">
              <div className="stat-row" style={{ marginBottom: 0 }}>
                <div className="card"><div className="label">Visiteurs en ligne</div><div className="value" style={{ color: 'var(--a-primary)' }}>● {k.live}</div></div>
                <div className="card"><div className="label">À confirmer</div><div className="value">{k.pending}</div></div>
                <div className="card"><div className="label">Ruptures</div><div className="value">{lowStock}</div></div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h2>Meilleures ventes</h2></div>
            <div className="card-body"><BarList rows={o.topProducts.map((p) => ({ ...p, count: p.revenue }))} format={(n) => dh(n)} empty="Pas encore de ventes sur la période." /></div>
          </div>
          <div className="card">
            <div className="card-head"><h2>Sources de trafic</h2><Link className="link" href="/admin/stats">Détails</Link></div>
            <div className="card-body"><Donut data={o.sources.slice(0, 6)} /></div>
          </div>
        </div>
      </div>
    </>
  );
}
