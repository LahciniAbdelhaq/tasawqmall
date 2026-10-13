import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageTitle, dur, dh } from '@/components/admin/bits';
import Icon from '@/components/Icon';
import { visitJourney } from '@/lib/analytics';
import { fmtDate } from '@/lib/form';

export const metadata = { title: 'Parcours du visiteur' };

const time = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Africa/Casablanca' });

export default async function VisitPage({ params }: { params: Promise<{ id: string }> }) {
  const j = await visitJourney((await params).id);
  if (!j) notFound();
  const { visit: v, steps, others, order, customer } = j;
  const live = Date.now() - v.lastSeen.getTime() < 60_000;
  const onScreen = steps.reduce((s, x) => s + x.duration, 0);
  const products = steps.filter((s) => s.product);

  return (
    <>
      <PageTitle title="Parcours du visiteur" sub={<>Visite du {fmtDate(v.startedAt)}{live && <> · <span className="live-dot" /> en ligne</>}</>}>
        <Link className="btn btn-secondary btn-sm" href={`/admin/live/visitor/${encodeURIComponent(v.visitorId)}`}>Toutes ses visites</Link>
        <Link className="btn btn-secondary btn-sm" href="/admin/live?tab=history&days=30">← Historique</Link>
      </PageTitle>

      <div className="kpis">
        <div className="card kpi"><div className="label"><Icon name="clock" /> Temps sur le site</div><div className="value">{dur(onScreen || (v.lastSeen.getTime() - v.startedAt.getTime()) / 1000)}</div></div>
        <div className="card kpi"><div className="label"><Icon name="eye" /> Pages vues</div><div className="value">{v.pageviews}</div></div>
        <div className="card kpi"><div className="label"><Icon name="box" /> Produits consultés</div><div className="value">{products.length}</div><div className="delta flat">{dur(products.reduce((s, x) => s + x.duration, 0))} sur les produits</div></div>
        <div className="card kpi"><div className="label"><Icon name="receipt" /> Résultat</div><div className="value" style={{ fontSize: 18 }}>
          {order ? <Link className="row-link" href={`/admin/orders/${order.id}`}>Commande #{order.number}</Link> : v.ordered ? 'Commandé' : v.cartItems ? `Panier ${dh(v.cartValue)}` : 'Aucun achat'}
        </div></div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head"><h2>Pages consultées</h2><span className="muted">dans l’ordre</span></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Heure</th><th>Page</th><th className="num">Temps passé</th></tr></thead>
              <tbody>
                {steps.map((s, i) => {
                  const last = i === steps.length - 1;
                  return (
                    <tr key={s.id}>
                      <td className="muted">{time(s.at)}</td>
                      <td>
                        {s.product ? (
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            {s.product.image && <img className="thumb" src={s.product.image} alt="" />}
                            <div>
                              <Link className="row-link" href={`/admin/products/${s.product.id}`}>{s.product.name}</Link>
                              <div className="muted" style={{ fontSize: 12 }}>{dh(s.product.price)} · <a href={s.path} target="_blank" rel="noreferrer">{decodeURIComponent(s.path)}</a></div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <a className="row-link" href={s.path} target="_blank" rel="noreferrer">{decodeURIComponent(s.path)}</a>
                            {s.title && <div className="muted" style={{ fontSize: 12 }}>{s.title}</div>}
                          </>
                        )}
                      </td>
                      <td className="num">{s.duration ? dur(s.duration) : last && live ? 'en cours' : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <div className="card">
            <div className="card-head"><h2>Visiteur</h2></div>
            <div className="card-body" style={{ display: 'grid', gap: 6, fontSize: 14 }}>
              {customer
                ? <div>Client : <Link className="row-link" href={`/admin/customers/${customer.id}`}>{customer.name}</Link> <span className="muted">· {customer.phone}</span></div>
                : <div className="muted">Visiteur anonyme (pas encore de commande)</div>}
              <div><Icon name={v.device === 'mobile' ? 'smartphone' : 'monitor'} size={15} /> {v.device} · {v.browser} · {v.os}{v.lang && ` · ${v.lang}`}</div>
              <div>Source : <strong>{v.source || 'direct'}</strong>{v.medium && ` / ${v.medium}`}{v.campaign && ` · ${v.campaign}`}</div>
              {v.referrer && <div className="muted" style={{ wordBreak: 'break-all' }}>Vient de : {v.referrer}</div>}
              <div className="muted">Entrée : {decodeURIComponent(v.landing)}</div>
              <div className="muted">Dernière activité : {fmtDate(v.lastSeen)}</div>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h2>Autres visites</h2><Link className="link" href={`/admin/live/visitor/${encodeURIComponent(v.visitorId)}`}>Tout l’historique →</Link></div>
            <div className="card-body" style={{ display: 'grid', gap: 8, fontSize: 14 }}>
              {others.length === 0 && <div className="muted">Première visite.</div>}
              {others.map((o) => (
                <Link key={o.id} className="row-link" href={`/admin/live/${o.id}`} style={{ display: 'flex', gap: 8 }}>
                  <span>{fmtDate(o.startedAt)}</span>
                  <span className="muted">{o.pageviews} page(s) · {o.source || 'direct'}</span>
                  {o.ordered && <span className="pill green" style={{ marginLeft: 'auto' }}>Commandé</span>}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
