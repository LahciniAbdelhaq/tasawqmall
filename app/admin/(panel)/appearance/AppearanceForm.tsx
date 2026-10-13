'use client';
import { useRef, useState } from 'react';
import SettingsForm from '@/components/admin/SettingsForm';
import { MediaInput } from '@/components/admin/ui';

type Brand = Record<string, string>;
type Theme = Record<string, string | boolean>;

const FONTS = ['', 'Manrope', 'Lato', 'Rubik', 'Poppins', 'Montserrat', 'Inter', 'Roboto', 'Open Sans', 'Nunito', 'Raleway', 'Playfair Display', 'Cairo', 'Tajawal', 'Almarai'];

function Color({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="color-field">
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff'} onChange={(e) => onChange(e.target.value)} />
        <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder="origine" style={{ maxWidth: 130 }} />
        {value && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange('')}>Réinitialiser</button>}
      </div>
      {hint && <span className="help">{hint}</span>}
    </div>
  );
}

export default function AppearanceForm({ brand, theme }: { brand: Brand; theme: Theme }) {
  const preview = useRef<HTMLIFrameElement>(null);
  const [n, setN] = useState(0);
  const reload = () => setN((x) => x + 1);
  return (
    <div className="grid-2" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.1fr)' }}>
      <div>
        <SettingsForm group="brand" initial={brand} onSaved={reload} label="Enregistrer l’identité">
          {(v, set) => (
            <div className="card">
              <div className="card-head"><h2>Identité & logo</h2></div>
              <div className="card-body">
                <div className="field"><label>Logo (en-tête ordinateur)</label><MediaInput value={v.logo} onChange={(x) => set({ logo: x })} /><span className="help">Vide = logo d’origine. PNG/SVG transparent, environ 200×45 px.</span></div>
                <div className="field"><label>Logo mobile</label><MediaInput value={v.logoMobile} onChange={(x) => set({ logoMobile: x })} /></div>
                <div className="field"><label>Favicon (icône d’onglet)</label><MediaInput value={v.favicon} onChange={(x) => set({ favicon: x })} /></div>
                <div className="cols-2">
                  <div className="field"><label>Nom de la boutique</label><input value={v.name} onChange={(e) => set({ name: e.target.value })} /></div>
                  <div className="field"><label>WhatsApp (international)</label><input value={v.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} placeholder="212605123456" /></div>
                </div>
                <div className="cols-2">
                  <div className="field"><label>Téléphone</label><input value={v.phone} onChange={(e) => set({ phone: e.target.value })} /><span className="help">Affiché dans le pied de page et sur les factures.</span></div>
                  <div className="field"><label>E-mail</label><input value={v.email} onChange={(e) => set({ email: e.target.value })} /><span className="help">Affiché dans le pied de page et sur les factures.</span></div>
                </div>
                <div className="field"><label>Adresse</label><input value={v.address} onChange={(e) => set({ address: e.target.value })} /></div>
              </div>
            </div>
          )}
        </SettingsForm>

        <SettingsForm group="theme" initial={theme} onSaved={reload} label="Enregistrer le style">
          {(v, set) => {
            const s = (k: string) => String(v[k] ?? '');
            return (
              <>
                <div className="card">
                  <div className="card-head"><h2>Couleurs</h2></div>
                  <div className="card-body">
                    <div className="cols-2">
                      <Color label="Couleur principale" value={s('primary')} onChange={(x) => set({ primary: x })} hint="Origine : turquoise #65CBCB" />
                      <Color label="Boutons (fond)" value={s('buttonBg')} onChange={(x) => set({ buttonBg: x })} />
                      <Color label="Boutons (texte)" value={s('buttonText')} onChange={(x) => set({ buttonText: x })} />
                      <Color label="Fond du site" value={s('bodyBg')} onChange={(x) => set({ bodyBg: x })} />
                      <Color label="Texte" value={s('textColor')} onChange={(x) => set({ textColor: x })} />
                      <Color label="Titres" value={s('titleColor')} onChange={(x) => set({ titleColor: x })} />
                      <Color label="Liens" value={s('linkColor')} onChange={(x) => set({ linkColor: x })} />
                      <Color label="Liens (survol)" value={s('linkHover')} onChange={(x) => set({ linkHover: x })} />
                      <Color label="Prix" value={s('priceColor')} onChange={(x) => set({ priceColor: x })} />
                      <Color label="Badge promo" value={s('saleBadgeBg')} onChange={(x) => set({ saleBadgeBg: x })} />
                    </div>
                  </div>
                </div>
                <div className="card">
                  <div className="card-head"><h2>Typographie & formes</h2></div>
                  <div className="card-body">
                    <div className="cols-2">
                      <div className="field"><label>Police du texte</label><select value={s('fontText')} onChange={(e) => set({ fontText: e.target.value })}>{FONTS.map((f) => <option key={f} value={f}>{f || 'Origine (Manrope)'}</option>)}</select></div>
                      <div className="field"><label>Police des titres</label><select value={s('fontTitle')} onChange={(e) => set({ fontTitle: e.target.value })}>{FONTS.map((f) => <option key={f} value={f}>{f || 'Origine (Manrope)'}</option>)}</select></div>
                    </div>
                    <div className="cols-3">
                      <div className="field"><label>Taille du texte</label><input value={s('fontSize')} onChange={(e) => set({ fontSize: e.target.value })} placeholder="15px" /></div>
                      <div className="field"><label>Arrondi des blocs</label><input value={s('radius')} onChange={(e) => set({ radius: e.target.value })} placeholder="10px" /></div>
                      <div className="field"><label>Arrondi des boutons</label><input value={s('buttonRadius')} onChange={(e) => set({ buttonRadius: e.target.value })} placeholder="5px" /></div>
                    </div>
                  </div>
                </div>
                <div className="card" id="header">
                  <div className="card-head"><h2>En-tête & barre de navigation</h2></div>
                  <div className="card-body">
                    <div className="cols-2">
                      <Color label="Fond de l’en-tête" value={s('headerBg')} onChange={(x) => set({ headerBg: x })} />
                      <Color label="Bordure" value={s('headerBorder')} onChange={(x) => set({ headerBorder: x })} />
                      <Color label="Liens du menu" value={s('navColor')} onChange={(x) => set({ navColor: x })} />
                      <Color label="Liens du menu (survol)" value={s('navHover')} onChange={(x) => set({ navHover: x })} />
                      <Color label="Bouton « Catégories » (fond)" value={s('catButtonBg')} onChange={(x) => set({ catButtonBg: x })} />
                      <Color label="Bouton « Catégories » (texte)" value={s('catButtonText')} onChange={(x) => set({ catButtonText: x })} />
                      <Color label="Icônes (fond)" value={s('iconBg')} onChange={(x) => set({ iconBg: x })} />
                      <Color label="Icônes (couleur)" value={s('iconColor')} onChange={(x) => set({ iconColor: x })} />
                    </div>
                    <div className="cols-3">
                      <div className="field"><label>Taille des liens</label><input value={s('navSize')} onChange={(e) => set({ navSize: e.target.value })} placeholder="14px" /></div>
                      <div className="field"><label>Graisse</label><select value={s('navWeight')} onChange={(e) => set({ navWeight: e.target.value })}><option value="">Origine</option><option value="400">Normal</option><option value="500">Moyen</option><option value="600">Semi-gras</option><option value="700">Gras</option></select></div>
                      <div className="field"><label>&nbsp;</label><label className="check"><input type="checkbox" checked={!!v.navUppercase} onChange={(e) => set({ navUppercase: e.target.checked })} /> Majuscules</label></div>
                    </div>
                    <div className="field"><label className="switch"><input type="checkbox" checked={v.headerSticky !== false} onChange={(e) => set({ headerSticky: e.target.checked })} /> En-tête fixe au défilement</label></div>
                  </div>
                </div>
                <div className="card">
                  <div className="card-head"><h2>Pied de page</h2></div>
                  <div className="card-body">
                    <div className="cols-2">
                      <Color label="Fond" value={s('footerBg')} onChange={(x) => set({ footerBg: x })} hint="Origine : turquoise" />
                      <Color label="Texte" value={s('footerText')} onChange={(x) => set({ footerText: x })} />
                      <Color label="Liens" value={s('footerLink')} onChange={(x) => set({ footerLink: x })} />
                      <Color label="Titres" value={s('footerTitle')} onChange={(x) => set({ footerTitle: x })} />
                    </div>
                    <p className="muted" style={{ marginTop: 10 }}>Textes, liens et réseaux sociaux du pied de page : <a className="link" href="/admin/editor?path=/">éditeur visuel</a>.</p>
                  </div>
                </div>
                <div className="card">
                  <div className="card-head"><h2>CSS personnalisé</h2></div>
                  <div className="card-body">
                    <div className="field"><textarea value={s('customCss')} onChange={(e) => set({ customCss: e.target.value })} style={{ minHeight: 160, fontFamily: 'ui-monospace, monospace', fontSize: 12.5 }} placeholder=".wd-entities-title { font-size: 15px; }" /><span className="help">Ajouté après le thème : pour les réglages fins.</span></div>
                  </div>
                </div>
              </>
            );
          }}
        </SettingsForm>
      </div>
      <div>
        <div className="card" style={{ position: 'sticky', top: 70 }}>
          <div className="card-head"><h2>Aperçu</h2><button type="button" className="btn btn-secondary btn-sm" onClick={reload}>Rafraîchir</button></div>
          <iframe ref={preview} key={n} src={`/?preview=${n}`} title="Aperçu" style={{ width: '100%', height: '75vh', border: 0, borderRadius: '0 0 12px 12px' }} />
        </div>
      </div>
    </div>
  );
}
