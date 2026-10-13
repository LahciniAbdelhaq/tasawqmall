import Link from 'next/link';
import { PageTitle, dur, dh } from '@/components/admin/bits';
import Icon from '@/components/Icon';
import type { visitorProfile } from '@/lib/analytics';
import { fmtDate } from '@/lib/form';

type Profile = NonNullable<Awaited<ReturnType<typeof visitorProfile>>>;

/** All visits and products of one visitor; also used on the customer page. */
export default function VisitorHistory({ p, back, embedded = false }: { p: Profile; back?: { href: string; label: string }; embedded?: boolean }) {
  const t = p.totals;
  return (
    <>
      {!embedded && (
        <PageTitle
          title={p.customer ? `Historique de ${p.customer.name}` : 'Historique du visiteur'}
          sub={<>Première visite le {fmtDate(t.first)} · dernière activité le {fmtDate(t.last)}{!p.customer && ' · visiteur anonyme (pas encore de commande)'}</>}
        >
          {p.customer && <Link className="btn btn-secondary btn-sm" href={`/admin/customers/${p.customer.id}`}>Fiche client</Link>}
          {back && <Link className="btn btn-secondary btn-sm" href={back.href}>{back.label}</Link>}
        </PageTitle>
      )}
      <div className="kpis">
        <div className="card kpi"><div className="label"><Icon name="users" /> Visites</div><div className="value">{t.visits}</div></div>
        <div className="card kpi"><div className="label"><Icon name="eye" /> Pages vues</div><div className="value">{t.pageviews}</div></div>
        <div className="card kpi"><div className="label"><Icon name="box" /> Produits consultés</div><div className="value">{p.products.length}</div></div>
        <div className="card kpi"><div className="label"><Icon name="clock" /> Temps total</div><div className="value">{t.seconds ? dur(t.seconds) : '—'}</div></div>
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-head"><h2>Produits consultés</h2><span className="muted">toutes visites</span></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Produit</th><th className="num">Clics</th><th className="num">Temps passé</th><th>Dernière fois</th></tr></thead>
              <tbody>
                {p.products.length === 0 && <tr><td colSpan={4} className="empty">Aucun produit consulté.</td></tr>}
                {p.products.map((x) => (
                  <tr key={x.product.id}>
                    <td style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      {x.product.image && <img className="thumb" src={x.product.image} alt="" />}
                      <div><Link className="row-link" href={`/admin/products/${x.product.id}`}>{x.product.name}</Link><div className="muted" style={{ fontSize: 12 }}>{dh(x.product.price)}</div></div>
                    </td>
                    <td className="num">{x.views}</td>
                    <td className="num">{x.seconds ? dur(x.seconds) : '—'}</td>
                    <td className="muted">{fmtDate(x.last)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h2>Visites</h2><span className="muted">les plus récentes d’abord</span></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Date</th><th>Source</th><th className="num">Pages</th><th className="num">Temps</th><th /></tr></thead>
              <tbody>
                {p.visits.map((v) => (
                  <tr key={v.id}>
                    <td className="muted">{fmtDate(v.startedAt)}<div style={{ fontSize: 12 }}><Icon name={v.device === 'mobile' ? 'smartphone' : 'monitor'} size={13} /> {v.browser}</div></td>
                    <td>{v.source || 'direct'}{v.ordered && <div><span className="pill green">Commandé</span></div>}</td>
                    <td className="num">{v.pageviews}{v.products > 0 && <div className="muted" style={{ fontSize: 12 }}>{v.products} produit(s)</div>}</td>
                    <td className="num">{v.seconds ? dur(v.seconds) : '—'}</td>
                    <td><Link className="link" href={`/admin/live/${v.id}`}>Parcours →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
