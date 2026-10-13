import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { campaignStats, COUNTED } from '@/lib/analytics';
import { PageTitle, StatusPill, dh, pct } from '@/components/admin/bits';
import { BarsChart } from '@/components/admin/Charts';
import { ConfirmButton } from '@/components/admin/ui';
import { fmtDate, money } from '@/lib/form';
import { deleteCampaign } from '../../../actions/marketing';
import { CopyLink } from '../CopyLink';
import CampaignForm from './CampaignForm';

export const metadata = { title: 'Annonce' };

export default async function CampaignPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  const s = await getSettings();
  if (id === 'new') {
    return (
      <>
        <Link className="back-link" href="/admin/ads">← Mes annonces</Link>
        <PageTitle title="Nouvelle annonce" sub="Le lien de suivi est créé à l’enregistrement." />
        <CampaignForm c={null} />
      </>
    );
  }
  const c = await db.campaign.findUnique({ where: { id: Number(id) } });
  if (!c) notFound();
  const [stats] = (await campaignStats()).filter((x) => x.id === c.id);
  const since = new Date(Date.now() - 29 * 86400_000);
  const [clicks, orders] = await Promise.all([
    db.click.findMany({ where: { campaignId: c.id, at: { gte: new Date(since.toDateString()) } }, select: { at: true } }),
    db.order.findMany({ where: { campaignId: c.id }, orderBy: { createdAt: 'desc' }, take: 30 }),
  ]);
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(new Date(since.toDateString()).getTime() + i * 86400_000);
    return { label: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }), clicks: clicks.filter((k) => k.at.toDateString() === d.toDateString()).length };
  });
  const base = s.seo.siteUrl.replace(/\/$/, '');
  const dest = new URL(c.destination, base);
  if (dest.origin === new URL(base).origin) {
    dest.searchParams.set('utm_source', c.utmSource || c.platform);
    dest.searchParams.set('utm_medium', c.utmMedium || 'ads');
    dest.searchParams.set('utm_campaign', c.utmCampaign || c.code);
  }
  return (
    <>
      <Link className="back-link" href="/admin/ads">← Mes annonces</Link>
      <PageTitle title={c.name} sub={`Créée le ${fmtDate(c.createdAt)}`} />
      {(await searchParams).created && <div className="alert ok">Annonce créée : collez le lien de suivi dans votre publicité.</div>}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="field"><label>Lien court à mettre dans l’annonce</label><CopyLink url={`${base}/l/${c.code}`} /></div>
        <div className="field"><label>Destination avec paramètres UTM (Google Analytics)</label><CopyLink url={dest.toString()} /></div>
      </div>
      <div className="stat-row">
        <div className="card"><div className="label">Clics</div><div className="value">{stats.clicks}</div></div>
        <div className="card"><div className="label">Visites</div><div className="value">{stats.visits}</div></div>
        <div className="card"><div className="label">Commandes</div><div className="value">{stats.orders}</div></div>
        <div className="card"><div className="label">Chiffre d’affaires</div><div className="value">{dh(stats.revenue)}</div></div>
        <div className="card"><div className="label">Conversion</div><div className="value">{pct(stats.conversion)}</div></div>
        <div className="card"><div className="label">ROAS</div><div className="value">{stats.roas == null ? '—' : `×${stats.roas.toFixed(2)}`}</div></div>
      </div>
      <div className="grid-2">
        <div>
          <div className="card">
            <div className="card-head"><h2>Clics par jour (30 jours)</h2></div>
            <div className="card-body"><BarsChart data={days} dataKey="clicks" label="Clics" /></div>
          </div>
          <div className="card">
            <div className="card-head"><h2>Commandes attribuées</h2></div>
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>N°</th><th>Client</th><th>Date</th><th>Statut</th><th className="num">Total</th></tr></thead>
                <tbody>
                  {orders.length === 0 && <tr><td colSpan={5} className="empty">Pas encore de commande via ce lien.</td></tr>}
                  {orders.map((o) => (
                    <tr key={o.id} style={{ opacity: COUNTED.includes(o.status) ? 1 : 0.55 }}>
                      <td><Link className="row-link" href={`/admin/orders/${o.id}`}>#{o.number}</Link></td><td>{o.firstName} {o.lastName}</td><td className="muted">{fmtDate(o.createdAt)}</td><td><StatusPill status={o.status} /></td><td className="num">{money(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div>
          <CampaignForm c={{ id: c.id, name: c.name, code: c.code, platform: c.platform, destination: c.destination, utmSource: c.utmSource ?? '', utmMedium: c.utmMedium ?? '', utmCampaign: c.utmCampaign ?? '', budget: c.budget, startsAt: c.startsAt?.toISOString().slice(0, 10) ?? '', endsAt: c.endsAt?.toISOString().slice(0, 10) ?? '', active: c.active, notes: c.notes ?? '' }} />
          <form action={deleteCampaign} style={{ marginTop: 16 }}>
            <input type="hidden" name="id" value={c.id} />
            <ConfirmButton message="Supprimer cette annonce et ses statistiques de clics ?">Supprimer l’annonce</ConfirmButton>
          </form>
        </div>
      </div>
    </>
  );
}
