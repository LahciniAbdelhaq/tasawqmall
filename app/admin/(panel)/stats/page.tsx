import Link from 'next/link';
import { overview, topPages, campaignStats, pageTimes, productViews, type PageTime } from '@/lib/analytics';
import { TimeChart, BarsChart, Donut } from '@/components/admin/Charts';
import { BarList, Kpi, PageTitle, PeriodTabs, dh, pct, dur } from '@/components/admin/bits';
import { ORDER_STATUSES } from '@/lib/orders';

export const metadata = { title: 'Statistiques' };

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const days = Math.min(365, Math.max(1, Number((await searchParams).days) || 30));
  const [o, pages, camps, prods, cats, times] = await Promise.all([overview(days), topPages(days), campaignStats(days), productViews(days), pageTimes(days, '/product-category/', 15), pageTimes(days, '/', 25)]);
  const k = o.kpi;
  return (
    <>
      <PageTitle title="Statistiques" sub="Ventes, trafic, conversion et sources.">
        <PeriodTabs base="/admin/stats" days={days} />
      </PageTitle>
      <div className="kpis">
        <Kpi icon="receipt" label="Chiffre d’affaires" value={dh(k.revenue)} hint={`Panier moyen ${dh(k.aov)}`} />
        <Kpi icon="box" label="Commandes" value={k.orders} hint={`${k.cancelled} annulée(s)`} />
        <Kpi icon="users" label="Visites / visiteurs" value={`${k.visits} / ${k.visitors}`} hint={`${k.pageviews} pages vues`} />
        <Kpi icon="target" label="Conversion" value={pct(k.conversion)} hint={`Rebond ${pct(k.bounce)}`} />
      </div>

      <div className="card">
        <div className="card-head"><h2>Chiffre d’affaires par jour</h2></div>
        <div className="card-body"><TimeChart data={o.series} keys={[['revenue', 'Chiffre d’affaires']]} unit=" DH" /></div>
      </div>
      <div className="cols-2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-head"><h2>Commandes par jour</h2></div>
          <div className="card-body"><BarsChart data={o.series} dataKey="orders" label="Commandes" /></div>
        </div>
        <div className="card">
          <div className="card-head"><h2>Visites et visiteurs</h2></div>
          <div className="card-body"><TimeChart data={o.series} keys={[['visits', 'Visites', '#F2994A'], ['visitors', 'Visiteurs uniques', '#6C63FF']]} height={260} /></div>
        </div>
      </div>

      <div className="cols-3" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-head"><h2>Sources de trafic</h2></div>
          <div className="card-body">
            <BarList rows={o.sources} format={(n, r) => `${n} visites · ${r.orders as number} cmd`} />
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h2>Appareils</h2></div>
          <div className="card-body"><Donut data={o.devices} /></div>
        </div>
        <div className="card">
          <div className="card-head"><h2>Statut des commandes</h2></div>
          <div className="card-body"><Donut data={o.statuses.map((s) => ({ name: ORDER_STATUSES[s.name]?.label ?? s.name, count: s.count }))} /></div>
        </div>
      </div>

      <div className="cols-2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-head"><h2>Produits les plus vendus</h2></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Produit</th><th className="num">Qté</th><th className="num">CA</th></tr></thead>
              <tbody>
                {o.topProducts.length === 0 && <tr><td colSpan={3} className="empty">Pas encore de ventes.</td></tr>}
                {o.topProducts.map((p) => (
                  <tr key={p.id}>
                    <td style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{p.image && <img className="thumb" src={p.image} alt="" />}<Link className="row-link" href={`/admin/products/${p.id}`}>{p.name}</Link></td>
                    <td className="num">{p.qty}</td><td className="num">{dh(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h2>Ventes par ville</h2></div>
          <div className="card-body"><BarList rows={o.cities.map((c) => ({ ...c, count: c.revenue }))} format={(n, r) => `${dh(n)} · ${r.orders as number} cmd`} /></div>
        </div>
      </div>

      <div className="cols-3" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-head"><h2>Pages les plus vues</h2></div>
          <div className="card-body"><BarList rows={pages} /></div>
        </div>
        <div className="card">
          <div className="card-head"><h2>Pages d’entrée</h2></div>
          <div className="card-body"><BarList rows={o.landings} /></div>
        </div>
        <div className="card">
          <div className="card-head"><h2>Navigateurs / systèmes</h2></div>
          <div className="card-body"><BarList rows={[...o.browsers, ...o.os.map((x) => ({ ...x, name: `OS · ${x.name}` }))]} /></div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head"><h2>Produits les plus consultés</h2><span className="muted">temps passé sur la fiche produit</span></div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Produit</th><th className="num">Vues</th><th className="num">Visiteurs</th><th className="num">Temps moyen</th><th className="num">Temps total</th></tr></thead>
            <tbody>
              {prods.length === 0 && <tr><td colSpan={5} className="empty">Aucune fiche produit consultée sur cette période.</td></tr>}
              {prods.map((r) => (
                <tr key={r.path}>
                  <td>
                    {r.product ? (
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        {r.product.image && <img className="thumb" src={r.product.image} alt="" />}
                        <div><Link className="row-link" href={`/admin/products/${r.product.id}`}>{r.product.name}</Link><div className="muted" style={{ fontSize: 12 }}>{decodeURIComponent(r.path)}</div></div>
                      </div>
                    ) : <span className="muted">{decodeURIComponent(r.path)}</span>}
                  </td>
                  <td className="num">{r.views}</td><td className="num">{r.visitors}</td>
                  <td className="num">{r.avg ? dur(r.avg) : '—'}</td><td className="num">{r.total ? dur(r.total) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="cols-2" style={{ marginTop: 16 }}>
        <TimeTable title="Catégories les plus consultées" rows={cats} empty="Aucune catégorie consultée sur cette période." />
        <TimeTable title="Temps passé par page" rows={times} empty="Aucune page vue sur cette période." />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head"><h2>Performance des annonces</h2><Link className="link" href="/admin/ads">Gérer</Link></div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Campagne</th><th>Plateforme</th><th className="num">Clics</th><th className="num">Visites</th><th className="num">Commandes</th><th className="num">CA</th><th className="num">Conv.</th><th className="num">ROAS</th></tr></thead>
            <tbody>
              {camps.length === 0 && <tr><td colSpan={8} className="empty">Aucune campagne. Créez des liens de suivi dans « Mes annonces ».</td></tr>}
              {camps.map((c) => (
                <tr key={c.id}>
                  <td><Link className="row-link" href={`/admin/ads/${c.id}`}>{c.name}</Link></td>
                  <td>{c.platform}</td><td className="num">{c.clicks}</td><td className="num">{c.visits}</td><td className="num">{c.orders}</td>
                  <td className="num">{dh(c.revenue)}</td><td className="num">{pct(c.conversion)}</td><td className="num">{c.roas == null ? '—' : `×${c.roas.toFixed(2)}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function TimeTable({ title, rows, empty }: { title: string; rows: PageTime[]; empty: string }) {
  return (
    <div className="card">
      <div className="card-head"><h2>{title}</h2></div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Page</th><th className="num">Vues</th><th className="num">Visiteurs</th><th className="num">Temps moyen</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={4} className="empty">{empty}</td></tr>}
            {rows.map((r) => (
              <tr key={r.path}>
                <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><a className="row-link" href={r.path} target="_blank" rel="noreferrer">{decodeURIComponent(r.path)}</a></td>
                <td className="num">{r.views}</td><td className="num">{r.visitors}</td>
                <td className="num">{r.avg ? dur(r.avg) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
