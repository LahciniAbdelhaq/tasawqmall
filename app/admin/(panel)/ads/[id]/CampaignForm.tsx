'use client';
import { useActionState } from 'react';
import { saveCampaign } from '../../../actions/marketing';
import { SaveBar } from '@/components/admin/ui';

type C = { id: number; name: string; code: string; platform: string; destination: string; utmSource: string; utmMedium: string; utmCampaign: string; budget: number | null; startsAt: string; endsAt: string; active: boolean; notes: string };

export default function CampaignForm({ c }: { c: C | null }) {
  const [state, action] = useActionState(saveCampaign, null);
  return (
    <form action={action} className="card">
      <div className="card-head"><h2>Réglages de l’annonce</h2></div>
      <div className="card-body">
        <input type="hidden" name="id" value={c?.id ?? 0} />
        <div className="field"><label>Nom</label><input name="name" defaultValue={c?.name} required placeholder="ex. Facebook – La Roche-Posay octobre" /></div>
        <div className="cols-2">
          <div className="field">
            <label>Plateforme</label>
            <select name="platform" defaultValue={c?.platform ?? 'facebook'}>
              <option value="facebook">Facebook</option><option value="instagram">Instagram</option><option value="tiktok">TikTok</option>
              <option value="google">Google Ads</option><option value="snapchat">Snapchat</option><option value="whatsapp">WhatsApp</option>
              <option value="influencer">Influenceur</option><option value="sms">SMS</option><option value="email">E-mail</option><option value="other">Autre</option>
            </select>
          </div>
          <div className="field"><label>Code du lien</label><input name="code" defaultValue={c?.code} placeholder="auto (ex. fb-lrp-oct)" /><span className="help">Lien : /l/&lt;code&gt;</span></div>
        </div>
        <div className="field"><label>Page de destination</label><input name="destination" defaultValue={c?.destination ?? '/'} placeholder="/product-tag/la-roche-posay-festival" /></div>
        <div className="cols-3">
          <div className="field"><label>utm_source</label><input name="utmSource" defaultValue={c?.utmSource} placeholder="plateforme" /></div>
          <div className="field"><label>utm_medium</label><input name="utmMedium" defaultValue={c?.utmMedium} placeholder="ads" /></div>
          <div className="field"><label>utm_campaign</label><input name="utmCampaign" defaultValue={c?.utmCampaign} placeholder="code" /></div>
        </div>
        <div className="cols-3">
          <div className="field"><label>Budget dépensé (DH)</label><input name="budget" type="number" step="0.01" defaultValue={c?.budget ?? ''} /><span className="help">Pour le coût / commande et le ROAS</span></div>
          <div className="field"><label>Début</label><input name="startsAt" type="date" defaultValue={c?.startsAt} /></div>
          <div className="field"><label>Fin</label><input name="endsAt" type="date" defaultValue={c?.endsAt} /></div>
        </div>
        <div className="field"><label>Notes</label><textarea name="notes" defaultValue={c?.notes} placeholder="Ciblage, visuel, texte de l’annonce…" /></div>
        <div className="field"><label className="switch"><input type="checkbox" name="active" defaultChecked={c?.active ?? true} /> Active (hors période ou en pause, le lien redirige sans compter)</label></div>
        <SaveBar state={state} label={c ? 'Enregistrer' : 'Créer l’annonce et le lien'} />
      </div>
    </form>
  );
}
