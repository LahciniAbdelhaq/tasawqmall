'use client';
import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';

type Visitor = {
  id: string; path: string; landing: string; source: string | null; campaign: string | null; device: string | null; browser: string | null;
  os: string | null; lang: string | null; pageviews: number; cartItems: number; cartValue: number; ordered: boolean; startedAt: string; lastSeen: string;
};
type Data = { now: number; live: Visitor[]; todayVisits: number; todayOrders: number; feed: { id: number; path: string; at: string; device: string | null; source: string | null }[] };

const since = (iso: string, now: number) => {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  return s < 60 ? `${s} s` : s < 3600 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`;
};

export default function LiveView() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const r = await fetch('/api/admin/live', { cache: 'no-store' });
        if (!r.ok) throw new Error('Session expirée');
        if (!stop) { setData(await r.json()); setErr(''); }
      } catch (e) { if (!stop) setErr((e as Error).message); }
    };
    load();
    const t = window.setInterval(load, 5000);
    return () => { stop = true; window.clearInterval(t); };
  }, []);

  if (!data) return <div className="card card-pad">{err || 'Chargement…'}</div>;
  const carts = data.live.filter((v) => v.cartItems > 0);
  return (
    <>
      <div className="kpis">
        <div className="card kpi"><div className="label"><Icon name="activity" /> En ligne maintenant</div><div className="value" style={{ color: 'var(--a-primary)' }}><span className="live-dot" /> {data.live.length}</div></div>
        <div className="card kpi"><div className="label"><Icon name="bag" /> Paniers actifs</div><div className="value">{carts.length}</div><div className="delta flat">{carts.reduce((s, v) => s + v.cartValue, 0).toFixed(0)} DH au total</div></div>
        <div className="card kpi"><div className="label"><Icon name="users" /> Visites aujourd’hui</div><div className="value">{data.todayVisits}</div></div>
        <div className="card kpi"><div className="label"><Icon name="receipt" /> Commandes aujourd’hui</div><div className="value">{data.todayOrders}</div></div>
      </div>
      {err && <div className="alert err">{err}</div>}
      <div className="grid-2">
        <div className="card">
          <div className="card-head"><h2>Visiteurs actifs</h2></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Page actuelle</th><th>Source</th><th>Appareil</th><th className="num">Pages</th><th className="num">Panier</th><th className="num">Durée</th></tr></thead>
              <tbody>
                {data.live.length === 0 && <tr><td colSpan={6} className="empty">Personne sur le site en ce moment.</td></tr>}
                {data.live.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <a className="row-link" href={v.path} target="_blank" rel="noreferrer">{decodeURIComponent(v.path).slice(0, 60)}</a>
                      <div className="muted" style={{ fontSize: 12 }}>Entrée : {decodeURIComponent(v.landing).slice(0, 50)} · <a className="link" href={`/admin/live/${v.id}`}>Parcours →</a></div>
                    </td>
                    <td>{v.source || 'direct'}{v.campaign && <div className="muted" style={{ fontSize: 12 }}>{v.campaign}</div>}</td>
                    <td><Icon name={v.device === 'mobile' ? 'smartphone' : 'monitor'} size={15} /> {v.browser} · {v.os}{v.lang && <span className="muted"> · {v.lang}</span>}</td>
                    <td className="num">{v.pageviews}</td>
                    <td className="num">{v.ordered ? <span className="pill green">Commandé</span> : v.cartItems ? `${v.cartItems} art. · ${v.cartValue.toFixed(0)} DH` : '—'}</td>
                    <td className="num">{since(v.startedAt, data.now)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h2>Activité récente</h2><span className="muted">30 min</span></div>
          <div className="card-body" style={{ display: 'grid', gap: 10 }}>
            {data.feed.length === 0 && <div className="muted">Aucune page vue récemment.</div>}
            {data.feed.map((f) => (
              <div key={f.id} style={{ display: 'flex', gap: 10, fontSize: 13 }}>
                <span className="muted" style={{ minWidth: 64 }}>il y a {since(f.at, data.now)}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{decodeURIComponent(f.path)}</span>
                <span className="muted" style={{ marginLeft: 'auto' }}>{f.source}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
