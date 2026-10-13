import Link from 'next/link';
import { dur } from '@/components/admin/bits';
import Icon from '@/components/Icon';
import { productCounts, productVisits } from '@/lib/analytics';
import { fmtDate } from '@/lib/form';

/** "Who clicked this product": visitor / click counters and the latest views of the product page. */
export default async function ProductVisitors({ slug }: { slug: string }) {
  const [d30, d90, all, recent] = await Promise.all([
    productCounts([slug], 30), productCounts([slug], 90), productCounts([slug], 0), productVisits(slug, 50),
  ]);
  const periods = [['30 derniers jours', d30.get(slug)], ['90 derniers jours', d90.get(slug)], ['Depuis le début', all.get(slug)]] as const;
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-head"><h2>Visiteurs de ce produit</h2><span className="muted">clics sur la fiche produit</span></div>
      <div className="card-body">
        <div className="kpis" style={{ marginBottom: 0 }}>
          {periods.map(([label, c]) => (
            <div key={label} className="card kpi">
              <div className="label"><Icon name="users" /> {label}</div>
              <div className="value">{c?.visitors ?? 0} <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>visiteur(s)</span></div>
              <div className="delta flat">{c?.views ?? 0} clic(s){c?.avg ? ` · ${dur(c.avg)} en moyenne` : ''}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Date</th><th>Visiteur</th><th>Source</th><th className="num">Temps sur la fiche</th><th /></tr></thead>
          <tbody>
            {recent.length === 0 && <tr><td colSpan={5} className="empty">Personne n’a encore ouvert ce produit.</td></tr>}
            {recent.map((r) => (
              <tr key={r.id}>
                <td className="muted">{fmtDate(r.at)}</td>
                <td>
                  {r.customer ? <Link className="row-link" href={`/admin/customers/${r.customer.id}`}>{r.customer.name}</Link> : <span className="muted">Visiteur anonyme</span>}
                  <div className="muted" style={{ fontSize: 12 }}><Icon name={r.visit.device === 'mobile' ? 'smartphone' : 'monitor'} size={13} /> {r.visit.browser}{r.visit.ordered && <> · <span className="pill green">Commandé</span></>}</div>
                </td>
                <td>{r.visit.source || 'direct'}</td>
                <td className="num">{r.duration ? dur(r.duration) : '—'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <Link className="link" href={`/admin/live/${r.visit.id}`}>Parcours</Link>{' · '}
                  <Link className="link" href={`/admin/live/visitor/${encodeURIComponent(r.visit.visitorId)}`}>Historique</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
