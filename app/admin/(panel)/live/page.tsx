import Link from 'next/link';
import { PageTitle, PeriodTabs, dur, dh } from '@/components/admin/bits';
import Icon from '@/components/Icon';
import { visitHistory } from '@/lib/analytics';
import { fmtDate } from '@/lib/form';
import LiveView from './LiveView';

export const metadata = { title: 'Visiteurs en direct' };
const PER = 40;

type SP = { tab?: string; days?: string; page?: string; f?: string };

export default async function LivePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const history = sp.tab === 'history';
  return (
    <>
      <PageTitle
        title="Visiteurs en direct"
        sub={history
          ? 'Toutes les visites enregistrées : pages et produits consultés, et le temps passé sur chacun.'
          : 'Mis à jour toutes les 5 secondes. Un visiteur est « en ligne » s’il a été actif dans la dernière minute.'}
      />
      <div className="tabs" style={{ marginBottom: 16 }}>
        <a href="/admin/live" className={history ? '' : 'on'}><span className="live-dot" /> En direct</a>
        <a href="/admin/live?tab=history&days=30" className={history ? 'on' : ''}>Historique</a>
      </div>
      {history ? <History sp={sp} /> : <LiveView />}
    </>
  );
}

async function History({ sp }: { sp: SP }) {
  const days = Math.min(365, Math.max(1, Number(sp.days) || 30));
  const page = Math.max(1, Number(sp.page) || 1);
  const f = sp.f === 'products' || sp.f === 'ordered' ? sp.f : '';
  const { rows, total } = await visitHistory(days, page, PER, { productsOnly: f === 'products', ordered: f === 'ordered' });
  const link = (p: Record<string, string | number>) => `/admin/live?${new URLSearchParams({ tab: 'history', days: String(days), ...(f ? { f } : {}), ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v)])) })}`;

  return (
    <div className="card">
      <div className="toolbar">
        <PeriodTabs base="/admin/live" days={days} extra={`&tab=history${f ? `&f=${f}` : ''}`} />
        <div className="tabs" style={{ marginLeft: 'auto' }}>
          <a href={link({ f: '' })} className={!f ? 'on' : ''}>Toutes</a>
          <a href={link({ f: 'products' })} className={f === 'products' ? 'on' : ''}>Ont vu des produits</a>
          <a href={link({ f: 'ordered' })} className={f === 'ordered' ? 'on' : ''}>Ont commandé</a>
        </div>
      </div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Date</th><th>Entrée</th><th>Source</th><th>Appareil</th><th className="num">Pages</th><th className="num">Produits vus</th><th className="num">Temps sur le site</th><th className="num">Résultat</th><th /></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={9} className="empty">Aucune visite sur cette période.</td></tr>}
            {rows.map((v) => (
              <tr key={v.id}>
                <td className="muted">
                  {fmtDate(v.startedAt)}
                  {v.customer && <div><Link className="row-link" href={`/admin/customers/${v.customer.id}`}>{v.customer.name}</Link></div>}
                  {v.visits > 1 && <div><Link href={`/admin/live/visitor/${encodeURIComponent(v.visitorId)}`}><span className="pill plain">Revenu · {v.visits} visites</span></Link></div>}
                </td>
                <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{decodeURIComponent(v.landing.split('?')[0])}</td>
                <td>{v.source || 'direct'}{v.campaign && <div className="muted" style={{ fontSize: 12 }}>{v.campaign}</div>}</td>
                <td><Icon name={v.device === 'mobile' ? 'smartphone' : 'monitor'} size={15} /> {v.browser} · {v.os}</td>
                <td className="num">{v.pageviews}</td>
                <td className="num">{v.productViews ? <>{v.productViews}{v.productSeconds > 0 && <div className="muted" style={{ fontSize: 12 }}>{dur(v.productSeconds)}</div>}</> : '—'}</td>
                <td className="num">{v.seconds ? dur(v.seconds) : '—'}</td>
                <td className="num">{v.ordered ? <span className="pill green">Commandé</span> : v.cartItems ? `Panier ${dh(v.cartValue)}` : '—'}</td>
                <td><Link className="link" href={`/admin/live/${v.id}`}>Parcours →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pager">
        <span>{total} visite(s)</span>
        <span style={{ display: 'flex', gap: 8 }}>
          {page > 1 && <a className="btn btn-secondary btn-sm" href={link({ page: page - 1 })}>← Précédent</a>}
          {page * PER < total && <a className="btn btn-secondary btn-sm" href={link({ page: page + 1 })}>Suivant →</a>}
        </span>
      </div>
    </div>
  );
}
