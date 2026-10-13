'use client';
import SettingsForm from '@/components/admin/SettingsForm';

type L = { default: string; enabled: string[]; showSwitcher: boolean };

export default function LanguagesForm({ initial, all }: { initial: L; all: { code: string; name: string; rtl: boolean }[] }) {
  return (
    <SettingsForm group="languages" initial={initial as unknown as Record<string, unknown>}>
      {(raw, set) => {
        const v = raw as unknown as L;
        const toggle = (c: string) => set({ enabled: v.enabled.includes(c) ? v.enabled.filter((x) => x !== c) : [...v.enabled, c] } as never);
        return (
          <div className="grid-2">
            <div className="card">
              <div className="card-head"><h2>Langues activées</h2></div>
              <div className="card-body" style={{ display: 'grid', gap: 10 }}>
                {all.map((l) => (
                  <label key={l.code} className="check">
                    <input type="checkbox" checked={v.enabled.includes(l.code)} disabled={l.code === 'fr'} onChange={() => toggle(l.code)} />
                    {l.name}{l.rtl && <span className="pill plain gray">droite → gauche</span>}{l.code === 'fr' && <span className="pill plain blue">source</span>}
                  </label>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-head"><h2>Options</h2></div>
              <div className="card-body">
                <div className="field">
                  <label>Langue par défaut des visiteurs</label>
                  <select value={v.default} onChange={(e) => set({ default: e.target.value } as never)}>
                    {all.filter((l) => v.enabled.includes(l.code)).map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
                  </select>
                </div>
                <div className="field"><label className="switch"><input type="checkbox" checked={v.showSwitcher} onChange={(e) => set({ showSwitcher: e.target.checked } as never)} /> Afficher le sélecteur de langue dans le menu</label></div>
                <p className="muted" style={{ marginTop: 14 }}>
                  L’anglais et l’arabe sont livrés avec la traduction de toute l’interface (menus, catégories, boutons, panier, commande, pied de page).
                  Complétez ou corrigez dans « Dictionnaire » et « Textes des pages » ; les produits et catégories se traduisent dans leur fiche.
                </p>
              </div>
            </div>
          </div>
        );
      }}
    </SettingsForm>
  );
}
