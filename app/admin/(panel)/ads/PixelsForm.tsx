'use client';
import SettingsForm from '@/components/admin/SettingsForm';

type Ads = { facebookPixel: string; tiktokPixel: string; ga4: string; googleAds: string; snapchatPixel: string; requireConsent: boolean };

export default function PixelsForm({ initial }: { initial: Ads }) {
  return (
    <SettingsForm group="ads" initial={initial as unknown as Record<string, unknown>} label="Enregistrer les pixels">
      {(raw, set) => {
        const v = raw as unknown as Ads;
        const field = (k: keyof Ads, label: string, ph: string, help: string) => (
          <div className="field"><label>{label}</label><input value={String(v[k] ?? '')} onChange={(e) => set({ [k]: e.target.value.trim() } as never)} placeholder={ph} /><span className="help">{help}</span></div>
        );
        return (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-head"><h2>Pixels publicitaires & mesure d’audience</h2></div>
            <div className="card-body">
              <p className="muted" style={{ marginTop: 0 }}>Événements envoyés automatiquement : PageView, AddToCart, InitiateCheckout et Purchase (avec montant en MAD) pour optimiser vos campagnes.</p>
              <div className="cols-2">
                {field('facebookPixel', 'Meta (Facebook / Instagram) Pixel ID', '1233932775265155', 'Gestionnaire d’événements Meta → Pixel')}
                {field('tiktokPixel', 'TikTok Pixel ID', 'C123ABC…', 'TikTok Ads Manager → Événements')}
                {field('ga4', 'Google Analytics 4 (ID de mesure)', 'G-XXXXXXXXXX', 'Admin GA4 → Flux de données')}
                {field('googleAds', 'Google Ads (ID de conversion)', 'AW-11041168650', 'Google Ads → Conversions')}
                {field('snapchatPixel', 'Snapchat Pixel ID', '', 'Snap Ads Manager → Pixel')}
              </div>
              <div className="field"><label className="switch"><input type="checkbox" checked={v.requireConsent} onChange={(e) => set({ requireConsent: e.target.checked } as never)} /> Charger les pixels uniquement après acceptation des cookies (recommandé, loi 09-08 / RGPD)</label></div>
            </div>
          </div>
        );
      }}
    </SettingsForm>
  );
}
