'use client';
import SettingsForm from '@/components/admin/SettingsForm';
import { MediaInput } from '@/components/admin/ui';
import { SeoFields } from '@/components/admin/fields';

type Seo = {
  titleTemplate: string; homeTitle: string; description: string; keywords: string; ogImage: string; siteUrl: string;
  indexable: boolean; jsonLd: boolean; autoMeta: boolean; autoAlt: boolean; googleVerification: string; bingVerification: string; sameAs: string[];
};

export default function SeoSettingsForm({ initial }: { initial: Seo }) {
  return (
    <SettingsForm group="seo" initial={initial as unknown as Record<string, unknown>}>
      {(raw, set) => {
        const v = raw as unknown as Seo;
        return (
          <div className="grid-2">
            <div>
              <div className="card">
                <div className="card-head"><h2>Accueil & modèle de titre</h2></div>
                <div className="card-body">
                  <SeoFields title={v.homeTitle} description={v.description} onTitle={(x) => set({ homeTitle: x } as never)} onDescription={(x) => set({ description: x } as never)} fallbackTitle="beautymall" url={v.siteUrl} />
                  <div className="field"><label>Modèle de titre des pages</label><input value={v.titleTemplate} onChange={(e) => set({ titleTemplate: e.target.value } as never)} /><span className="help">%s = titre de la page. Ex. « %s – beautymall ».</span></div>
                  <div className="field"><label>Mots-clés principaux du site</label><input value={v.keywords} onChange={(e) => set({ keywords: e.target.value } as never)} /><span className="help">Séparés par des virgules : le rapport vérifie leur présence dans les titres et descriptions.</span></div>
                </div>
              </div>
              <div className="card">
                <div className="card-head"><h2>Partage sur les réseaux sociaux</h2></div>
                <div className="card-body">
                  <div className="field"><label>Image de partage par défaut (1200×630)</label><MediaInput value={v.ogImage} onChange={(x) => set({ ogImage: x } as never)} /></div>
                  <div className="field"><label>Profils sociaux (un par ligne)</label><textarea value={v.sameAs.join('\n')} onChange={(e) => set({ sameAs: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) } as never)} /></div>
                </div>
              </div>
            </div>
            <div>
              <div className="card">
                <div className="card-head"><h2>Indexation</h2></div>
                <div className="card-body">
                  <div className="field"><label>Adresse publique du site</label><input value={v.siteUrl} onChange={(e) => set({ siteUrl: e.target.value } as never)} placeholder="https://www.beautymall.ma" /><span className="help">Utilisée pour le sitemap, les liens canoniques et le partage.</span></div>
                  <div className="field"><label className="switch"><input type="checkbox" checked={v.indexable} onChange={(e) => set({ indexable: e.target.checked } as never)} /> Autoriser Google à indexer le site</label></div>
                  <div className="field"><label className="switch"><input type="checkbox" checked={v.jsonLd} onChange={(e) => set({ jsonLd: e.target.checked } as never)} /> Données structurées (étoiles, prix, stock dans Google)</label></div>
                  <div className="field"><label className="switch"><input type="checkbox" checked={v.autoMeta} onChange={(e) => set({ autoMeta: e.target.checked } as never)} /> Méta descriptions automatiques si vides</label></div>
                  <div className="field"><label className="switch"><input type="checkbox" checked={v.autoAlt} onChange={(e) => set({ autoAlt: e.target.checked } as never)} /> Textes alternatifs automatiques pour les images</label></div>
                </div>
              </div>
              <div className="card">
                <div className="card-head"><h2>Vérification des moteurs</h2></div>
                <div className="card-body">
                  <div className="field"><label>Google Search Console (contenu de la balise)</label><input value={v.googleVerification} onChange={(e) => set({ googleVerification: e.target.value } as never)} placeholder="ex. AbCdEf123…" /></div>
                  <div className="field"><label>Bing Webmaster (msvalidate.01)</label><input value={v.bingVerification} onChange={(e) => set({ bingVerification: e.target.value } as never)} /></div>
                </div>
              </div>
            </div>
          </div>
        );
      }}
    </SettingsForm>
  );
}
