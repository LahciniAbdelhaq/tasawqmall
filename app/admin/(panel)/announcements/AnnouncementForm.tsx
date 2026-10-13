'use client';
import Link from 'next/link';
import { useActionState, useState } from 'react';
import { saveAnnouncement } from '../../actions/marketing';
import { MediaInput, SaveBar } from '@/components/admin/ui';
import { I18nTabs, type I18nValue } from '@/components/admin/fields';
import { AnnounceBar } from '@/components/Announcements';

const ANIMATIONS: [string, string][] = [
  ['none', 'Aucune (texte fixe)'],
  ['scroll-rtl', 'Défilement de droite à gauche ←'],
  ['scroll-ltr', 'Défilement de gauche à droite →'],
  ['slide-left', 'Entrée depuis la gauche (une fois)'],
  ['slide-right', 'Entrée depuis la droite (une fois)'],
  ['pulse', 'Pulsation douce'],
];

type A = { id: number; type: string; text: string; link: string; image: string; bgColor: string; textColor: string; animation: string; speed: number; pages: string; startsAt: string; endsAt: string; active: boolean; position: number; i18n: I18nValue };

export default function AnnouncementForm({ a, locales }: { a: A | null; locales: { code: string; name: string }[] }) {
  const [state, action] = useActionState(saveAnnouncement, null);
  const [type, setType] = useState(a?.type ?? 'bar');
  const [text, setText] = useState(a?.text ?? '');
  const [bg, setBg] = useState(a?.bgColor ?? '#65cbcb');
  const [fg, setFg] = useState(a?.textColor ?? '#ffffff');
  const [image, setImage] = useState(a?.image ?? '');
  const [animation, setAnimation] = useState(a?.animation ?? 'none');
  const [speed, setSpeed] = useState(a?.speed ?? 15);
  const scrolling = animation.startsWith('scroll');
  const sliding = animation.startsWith('slide');
  // remount the preview so one-shot animations replay when settings change
  const previewKey = `${animation}-${speed}-${text}`;
  const [i18n, setI18n] = useState<I18nValue>(a?.i18n ?? {});
  return (
    <form action={action} className="card">
      <div className="card-head"><h2>{a ? 'Modifier' : 'Nouveau bandeau / popup'}</h2>{a && <Link className="link" href="/admin/announcements">+ Nouveau</Link>}</div>
      <div className="card-body">
        <input type="hidden" name="id" value={a?.id ?? 0} />
        <input type="hidden" name="image" value={image} />
        <input type="hidden" name="i18n" value={JSON.stringify(i18n)} />
        <div className="field"><label>Type</label><select name="type" value={type} onChange={(e) => setType(e.target.value)}><option value="bar">Bandeau en haut du site</option><option value="popup">Popup (une fois par visiteur)</option></select></div>
        <div className="field"><label>Texte</label><input name="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="🚚 Livraison gratuite dès 150 DH à Casablanca et Rabat" /></div>
        {type === 'popup' && <div className="field"><label>Image (popup)</label><MediaInput value={image} onChange={setImage} /></div>}
        <div className="field"><label>Lien (facultatif)</label><input name="link" defaultValue={a?.link} placeholder="/product-category/promotions" /></div>
        <div className="cols-2">
          <div className="field"><label>Fond</label><div className="color-field"><input type="color" name="bgColor" value={bg} onChange={(e) => setBg(e.target.value)} /><input className="input" value={bg} onChange={(e) => setBg(e.target.value)} style={{ maxWidth: 110 }} /></div></div>
          <div className="field"><label>Texte</label><div className="color-field"><input type="color" name="textColor" value={fg} onChange={(e) => setFg(e.target.value)} /><input className="input" value={fg} onChange={(e) => setFg(e.target.value)} style={{ maxWidth: 110 }} /></div></div>
        </div>
        {type === 'bar' && (
          <>
            <div className="cols-2">
              <div className="field">
                <label>Animation</label>
                <select name="animation" value={animation} onChange={(e) => setAnimation(e.target.value)}>
                  {ANIMATIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
              {animation !== 'none' && (
                <div className="field">
                  <label>{scrolling ? `Vitesse : un passage en ${speed} s` : sliding ? `Durée de l’entrée : ${Math.min(speed, 3)} s` : `Rythme : ${speed} s`}</label>
                  <input type="range" name="speed" min={1} max={scrolling ? 60 : sliding ? 3 : 10} value={scrolling ? speed : Math.min(speed, sliding ? 3 : 10)} onChange={(e) => setSpeed(+e.target.value)} />
                  <span className="help">{scrolling ? 'Plus petit = plus rapide. Le défilement se met en pause au survol.' : 'Plus petit = plus rapide.'}</span>
                </div>
              )}
            </div>
            {animation === 'none' && <input type="hidden" name="speed" value={speed} />}
            <link rel="stylesheet" href="/announce.css" precedence="default" />
            <div style={{ marginTop: 12, borderRadius: 8, overflow: 'hidden' }} key={previewKey}>
              <AnnounceBar a={{ id: a?.id ?? 0, text: text || 'Aperçu du bandeau', link: null, bgColor: bg, textColor: fg, animation, speed }} onClose={() => {}} />
            </div>
          </>
        )}
        {type === 'popup' && <div style={{ background: bg, color: fg, padding: '9px 14px', borderRadius: 8, textAlign: 'center', fontWeight: 600, marginTop: 12 }}>{text || 'Aperçu'}</div>}
        <div className="field"><label>Pages</label><input name="pages" defaultValue={a?.pages ?? '*'} /><span className="help">* = partout, ou liste d’adresses : /, /product-category/soins-du-visage, /product/</span></div>
        <div className="cols-2">
          <div className="field"><label>Début</label><input name="startsAt" type="datetime-local" defaultValue={a?.startsAt} /></div>
          <div className="field"><label>Fin</label><input name="endsAt" type="datetime-local" defaultValue={a?.endsAt} /></div>
        </div>
        <div className="cols-2">
          <div className="field"><label>Ordre</label><input name="position" type="number" defaultValue={a?.position ?? 0} /></div>
          <div className="field"><label>&nbsp;</label><label className="switch"><input type="checkbox" name="active" defaultChecked={a?.active ?? true} /> Actif</label></div>
        </div>
        {locales.length > 0 && <div className="field"><label>Traductions</label><I18nTabs locales={locales} value={i18n} onChange={setI18n} source={{ text }} fields={[{ key: 'text', label: 'Texte' }]} /></div>}
        <SaveBar state={state} label={a ? 'Enregistrer' : 'Créer'} />
      </div>
    </form>
  );
}
