import Link from 'next/link';
import { getSettings } from '@/lib/settings';
import { campaignStats } from '@/lib/analytics';
import { PageTitle, dh, pct } from '@/components/admin/bits';
import Icon from '@/components/Icon';
import PixelsForm from './PixelsForm';
import { CopyLink } from './CopyLink';

export const metadata = { title: 'Mes annonces & liens' };

const PLATFORM: Record<string, string> = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', google: 'Google Ads', snapchat: 'Snapchat', whatsapp: 'WhatsApp', influencer: 'Influenceur', sms: 'SMS', email: 'E-mail', other: 'Autre' };

export default async function AdsPage() {
  const [s, camps] = await Promise.all([getSettings(), campaignStats()]);
  const base = s.seo.siteUrl.replace(/\/$/, '');
  return (
    <>
      <PageTitle title="Mes annonces & liens de suivi" sub="Créez un lien unique par annonce (Facebook, Instagram, TikTok, influenceur…) : chaque visite et chaque commande lui est attribuée.">
        <Link className="btn" href="/admin/ads/new"><Icon name="plus" /> Nouvelle annonce</Link>
      </PageTitle>
      <div className="card">
        <div className="card-head"><h2>Annonces</h2><span className="muted">{camps.length} campagne(s)</span></div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Annonce</th><th>Lien de suivi</th><th className="num">Clics</th><th className="num">Visites</th><th className="num">Commandes</th><th className="num">CA</th><th className="num">Conv.</th><th className="num">Coût / cmd</th><th className="num">ROAS</th></tr></thead>
            <tbody>
              {camps.length === 0 && <tr><td colSpan={9} className="empty">Aucune annonce. Créez votre premier lien de suivi.</td></tr>}
              {camps.map((c) => (
                <tr key={c.id}>
                  <td><Link className="row-link" href={`/admin/ads/${c.id}`}>{c.name}</Link><div className="muted" style={{ fontSize: 12 }}>{PLATFORM[c.platform] ?? c.platform} {c.active ? '' : '· en pause'}</div></td>
                  <td style={{ minWidth: 260 }}><CopyLink url={`${base}/l/${c.code}`} /></td>
                  <td className="num">{c.clicks}</td><td className="num">{c.visits}</td><td className="num">{c.orders}</td><td className="num">{dh(c.revenue)}</td>
                  <td className="num">{pct(c.conversion)}</td><td className="num">{c.cpo == null ? '—' : dh(c.cpo)}</td>
                  <td className="num">{c.roas == null ? '—' : <strong style={{ color: c.roas >= 1 ? 'var(--a-success)' : 'var(--a-danger)' }}>×{c.roas.toFixed(2)}</strong>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <PixelsForm initial={s.ads} />
    </>
  );
}
