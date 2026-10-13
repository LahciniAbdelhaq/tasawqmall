'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '@/components/Icon';
import { MediaInput } from '@/components/admin/ui';
import { getElementOverrides, resetElement, saveElement, type OverrideRow } from '../../actions/content';
import type { OverrideKind } from '@/lib/cms';

type Sel = {
  fragment: string; key: string; tag: string; text: string; html: string; src: string; alt: string; href: string; linkKey: string;
  isIcon: boolean; bg: boolean; color: string; background: string; fontSize: string; path: string;
};
type Style = { color: string; background: string; fontSize: string; fontWeight: string; textAlign: string; padding: string; borderRadius: string };
const EMPTY_STYLE: Style = { color: '', background: '', fontSize: '', fontWeight: '', textAlign: '', padding: '', borderRadius: '' };
const CSS: Record<keyof Style, string> = { color: 'color', background: 'background-color', fontSize: 'font-size', fontWeight: 'font-weight', textAlign: 'text-align', padding: 'padding', borderRadius: 'border-radius' };

const FRAGMENT_LABEL: Record<string, string> = {
  header: 'En-tête (toutes les pages)', footer: 'Pied de page (toutes les pages)', 'mobile-nav': 'Menu mobile', toolbar: 'Barre mobile du bas',
  'tpl-product': 'Modèle des fiches produits (toutes les fiches)', 'tpl-archive': 'Modèle des pages catégories (toutes les catégories)',
  cookie: 'Bandeau cookies', chaty: 'Bouton de contact', 'login-side': 'Panneau connexion', home: 'Page d’accueil',
};
const rgbToHex = (c: string) => {
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
  if (!m || m[4] === '0') return '';
  return '#' + [m[1], m[2], m[3]].map((x) => (+x).toString(16).padStart(2, '0')).join('');
};
const parseStyle = (s: string): Style => {
  const out = { ...EMPTY_STYLE };
  for (const decl of s.split(';')) {
    const [k, v] = decl.split(':').map((x) => x?.trim());
    const key = (Object.keys(CSS) as (keyof Style)[]).find((x) => CSS[x] === k);
    if (key && v) out[key] = v.replace(/\s*!important/, '');
  }
  return out;
};
const styleString = (st: Style) => (Object.keys(st) as (keyof Style)[]).filter((k) => st[k]).map((k) => `${CSS[k]}:${st[k]}!important`).join(';');

export default function VisualEditor({ initialPath, targets, locales }: { initialPath: string; targets: { path: string; label: string }[]; locales: { code: string; name: string }[] }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [boxSize, setBoxSize] = useState({ w: 900, h: 600 });
  useEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(([e]) => setBoxSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);
  // desktop preview: render at a real 1440 px width and scale it down to fit
  const DESKTOP = 1440;
  const [path, setPath] = useState(initialPath);
  const [current, setCurrent] = useState(initialPath);
  const [locale, setLocale] = useState(locales[0]?.code || 'fr');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [editing, setEditing] = useState(true);
  const scale = device === 'desktop' ? Math.min(1, boxSize.w / DESKTOP) : 1;
  const [sel, setSel] = useState<Sel | null>(null);
  const [rows, setRows] = useState<OverrideRow[]>([]);
  const [text, setText] = useState('');
  const [html, setHtml] = useState('');
  const [href, setHref] = useState('');
  const [src, setSrc] = useState('');
  const [alt, setAlt] = useState('');
  const [icon, setIcon] = useState('');
  const [bg, setBg] = useState('');
  const [hide, setHide] = useState(false);
  const [style, setStyle] = useState<Style>(EMPTY_STYLE);
  const [advanced, setAdvanced] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [annId, setAnnId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [nonce, setNonce] = useState(0);

  const post = useCallback((m: unknown) => frame.current?.contentWindow?.postMessage(m, window.location.origin), []);
  const src0 = `${path}${path.includes('?') ? '&' : '?'}lang=${locale}&bm_edit=${nonce}`;

  const fill = useCallback((s: Sel, r: OverrideRow[], loc: string) => {
    const get = (kind: string, l = loc) => r.find((x) => x.kind === kind && x.locale === l)?.value;
    setText(get('text') ?? s.text);
    setHtml(get('html') ?? '');
    setHref(get('href') ?? s.href ?? '');
    setSrc(get('src') ?? '');
    setAlt(get('alt') ?? s.alt ?? '');
    setIcon(get('icon') ?? '');
    setBg(get('bg') ?? '');
    setHide(get('hide') === '1');
    setStyle(parseStyle(get('style') ?? ''));
  }, []);

  useEffect(() => {
    const onMsg = async (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      const m = e.data as { type: string } & Partial<Sel> & { path?: string };
      if (m.type === 'bm-ready') { setCurrent((m.path || '').replace(/[?&](lang|bm_edit)=[^&]*/g, '').replace(/^([^?]*)&/, '$1?') || '/'); post({ type: 'bm-mode', edit: editing }); }
      if (m.type === 'bm-announce') { setSel(null); setMsg(null); setAnnId((m as unknown as { id: number }).id); return; }
      if (m.type === 'bm-select') {
        setAnnId(null);
        const s = m as Sel;
        if (!s.fragment) { setMsg({ ok: false, text: 'Cet élément est généré automatiquement (produits, prix, panier…) : modifiez-le depuis le catalogue.' }); return; }
        setSel(s); setMsg(null); setAdvanced(false);
        const r = await getElementOverrides(s.fragment, s.key);
        setRows(r);
        fill(s, r, locale);
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [editing, fill, locale, post]);

  useEffect(() => { post({ type: 'bm-mode', edit: editing }); }, [editing, post]);
  useEffect(() => { if (sel) fill(sel, rows, locale); }, [locale]); // eslint-disable-line react-hooks/exhaustive-deps

  const preview = (kind: string, value: string) => sel && post({ type: 'bm-preview', key: sel.key, kind, value });

  async function save() {
    if (!sel) return;
    setBusy(true);
    const changes: { kind: OverrideKind; value: string }[] = [];
    const isImg = sel.tag === 'img';
    const hasText = !!sel.text || !!rows.find((r) => r.kind === 'text');
    if (hasText && !advanced) changes.push({ kind: 'text', value: text === sel.text && !rows.find((r) => r.kind === 'text' && r.locale === locale) ? '' : text });
    if (advanced) changes.push({ kind: 'html', value: html });
    if (isImg) changes.push({ kind: 'src', value: src }, { kind: 'alt', value: alt === sel.alt ? '' : alt });
    if (sel.isIcon || sel.tag === 'svg') changes.push({ kind: 'icon', value: icon });
    if (sel.bg) changes.push({ kind: 'bg', value: bg });
    changes.push({ kind: 'hide', value: hide ? '1' : '' }, { kind: 'style', value: styleString(style) });
    let r = await saveElement({ fragment: sel.fragment, key: sel.key, locale, changes });
    if (r?.ok && sel.linkKey && href !== sel.href) {
      r = await saveElement({ fragment: sel.fragment, key: sel.linkKey, locale, changes: [{ kind: 'href', value: href }] });
    }
    setBusy(false);
    setMsg(r ? { ok: r.ok, text: r.message } : null);
    if (r?.ok) { setRows(await getElementOverrides(sel.fragment, sel.key)); post({ type: 'bm-reload' }); }
  }

  async function reset(all: boolean) {
    if (!sel || !confirm(all ? 'Annuler toutes les modifications de cet élément (toutes langues) ?' : `Annuler les modifications en ${locale.toUpperCase()} ?`)) return;
    const r = await resetElement({ fragment: sel.fragment, key: sel.key, locale: all ? undefined : locale });
    setMsg(r ? { ok: r.ok, text: r.message } : null);
    const fresh = await getElementOverrides(sel.fragment, sel.key);
    setRows(fresh); fill(sel, fresh, locale);
    post({ type: 'bm-reload' });
  }

  const shared = sel && FRAGMENT_LABEL[sel.fragment];
  return (
    <>
      <div className="page-title" style={{ marginBottom: 12 }}>
        <div><h1>Éditeur visuel</h1><p>Cliquez sur n’importe quel texte, image, lien, icône ou logo du site pour le modifier.</p></div>
      </div>
      <div className="editor-wrap">
        <div className={`editor-frame ${device}`}>
          <div className="bar">
            <select className="input" style={{ maxWidth: 260 }} value={targets.some((t) => t.path === path) ? path : ''} onChange={(e) => { if (e.target.value) { setPath(e.target.value); setSel(null); } }}>
              <option value="">Page…</option>
              {targets.map((t) => <option key={t.path} value={t.path}>{t.label}</option>)}
            </select>
            <input className="input" style={{ maxWidth: 220 }} value={current} onChange={(e) => setCurrent(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setPath(current); setSel(null); } }} title="Adresse (Entrée pour ouvrir)" />
            <select className="input" style={{ maxWidth: 140 }} value={locale} onChange={(e) => setLocale(e.target.value)} title="Langue modifiée">
              {locales.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
            <button type="button" className={`btn btn-sm ${editing ? '' : 'btn-secondary'}`} onClick={() => setEditing(!editing)} title="Basculer édition / navigation">
              <Icon name={editing ? 'cursor' : 'arrow'} /> {editing ? 'Mode édition' : 'Mode navigation'}
            </button>
            <button type="button" className="btn btn-secondary btn-sm btn-icon" onClick={() => setDevice(device === 'desktop' ? 'mobile' : 'desktop')} title="Ordinateur / mobile"><Icon name={device === 'desktop' ? 'monitor' : 'smartphone'} /></button>
            <button type="button" className="btn btn-secondary btn-sm btn-icon" onClick={() => setNonce(nonce + 1)} title="Recharger"><Icon name="refresh" /></button>
            <a className="btn btn-ghost btn-sm" href={current} target="_blank" rel="noreferrer"><Icon name="external" /></a>
          </div>
          <div ref={box} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <iframe ref={frame} key={src0} src={src0} title="Aperçu du site"
              style={device === 'desktop'
                ? { position: 'absolute', top: 0, left: 0, width: DESKTOP, height: boxSize.h / scale, transform: `scale(${scale})`, transformOrigin: '0 0', border: 0 }
                : { position: 'absolute', top: 0, left: '50%', marginLeft: -195, width: 390, height: '100%', border: 0, borderLeft: '1px solid var(--a-border)', borderRight: '1px solid var(--a-border)' }} />
          </div>
        </div>

        <div className="editor-panel">
          {msg && <div className={`alert ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</div>}
          {annId != null && !sel && (
            <div className="card card-pad">
              <h3 style={{ marginBottom: 8 }}>Bandeau d’annonce</h3>
              <p className="muted" style={{ marginTop: 0 }}>Texte, lien, couleurs, animation (défilement gauche ↔ droite…), vitesse, pages et dates se règlent dans « Bandeaux & popups ».</p>
              <a className="btn" href={`/admin/announcements?edit=${annId}`}>Modifier ce bandeau</a>
            </div>
          )}
          {annId != null && !sel ? null : !sel ? (
            <div className="card card-pad">
              <h3 style={{ marginBottom: 8 }}>Comment ça marche</h3>
              <ol style={{ paddingLeft: 18, margin: 0, lineHeight: 1.8 }}>
                <li>Choisissez une page et la langue à modifier.</li>
                <li>En <strong>mode édition</strong>, survolez puis cliquez un élément (texte, logo, image, icône, lien, bouton…).</li>
                <li>Modifiez-le ici : l’aperçu se met à jour, puis <strong>Publier</strong>.</li>
                <li>Passez en <strong>mode navigation</strong> pour ouvrir menus et liens.</li>
              </ol>
              <p className="muted" style={{ marginTop: 12 }}>Les modifications en Français s’appliquent à toutes les langues, sauf si une traduction est saisie pour une langue.</p>
            </div>
          ) : (
            <>
              <div className="card card-pad">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong>&lt;{sel.tag}&gt; · {sel.key}</strong>
                  <span className="pill plain gray">{locale.toUpperCase()}</span>
                </div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{shared || `Page : ${sel.fragment}`}</div>
                {rows.length > 0 && <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{rows.length} modification(s) enregistrée(s) : {[...new Set(rows.map((r) => `${r.kind}/${r.locale}`))].join(', ')}</div>}
              </div>

              {(sel.text || rows.some((r) => r.kind === 'text' || r.kind === 'html')) && (
                <div className="card card-pad">
                  {!advanced ? (
                    <div className="field"><label>Texte</label>
                      <textarea value={text} onChange={(e) => { setText(e.target.value); preview('text', e.target.value); }} style={{ minHeight: 90 }} />
                    </div>
                  ) : (
                    <div className="field"><label>Contenu HTML</label>
                      <textarea value={html || sel.html} onChange={(e) => { setHtml(e.target.value); preview('html', e.target.value); }} style={{ minHeight: 160, fontFamily: 'ui-monospace, monospace', fontSize: 12 }} />
                    </div>
                  )}
                  <label className="check" style={{ marginTop: 8 }}><input type="checkbox" checked={advanced} onChange={(e) => setAdvanced(e.target.checked)} /> Mode HTML avancé</label>
                </div>
              )}

              {sel.tag === 'img' && (
                <div className="card card-pad">
                  <div className="field"><label>Image</label><MediaInput value={src} onChange={(v) => { setSrc(v); preview('src', v); }} /></div>
                  <div className="field"><label>Texte alternatif (SEO)</label><input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Décrivez l’image" /></div>
                </div>
              )}

              {(sel.isIcon || sel.tag === 'svg') && sel.tag !== 'img' && (
                <div className="card card-pad">
                  <div className="field"><label>Remplacer l’icône par une image (SVG / PNG)</label><MediaInput value={icon} onChange={setIcon} /></div>
                </div>
              )}

              {sel.bg && (
                <div className="card card-pad">
                  <div className="field"><label>Image de fond</label><MediaInput value={bg} onChange={setBg} /></div>
                </div>
              )}

              {(sel.linkKey || sel.tag === 'a') && (
                <div className="card card-pad">
                  <div className="field"><label>Lien</label><input value={href} onChange={(e) => setHref(e.target.value)} placeholder="/product-category/… ou https://…" /></div>
                </div>
              )}

              <div className="card card-pad">
                <h3 style={{ fontSize: 14, marginBottom: 10 }}>Style</h3>
                <div className="cols-2">
                  <div className="field"><label>Couleur du texte</label><div className="color-field"><input type="color" value={style.color || rgbToHex(sel.color) || '#000000'} onChange={(e) => { const s = { ...style, color: e.target.value }; setStyle(s); preview('style', styleString(s)); }} /><input className="input" value={style.color} onChange={(e) => setStyle({ ...style, color: e.target.value })} placeholder="auto" /></div></div>
                  <div className="field"><label>Fond</label><div className="color-field"><input type="color" value={style.background || rgbToHex(sel.background) || '#ffffff'} onChange={(e) => { const s = { ...style, background: e.target.value }; setStyle(s); preview('style', styleString(s)); }} /><input className="input" value={style.background} onChange={(e) => setStyle({ ...style, background: e.target.value })} placeholder="auto" /></div></div>
                </div>
                <div className="cols-2">
                  <div className="field"><label>Taille</label><input value={style.fontSize} onChange={(e) => setStyle({ ...style, fontSize: e.target.value })} placeholder={sel.fontSize} /></div>
                  <div className="field"><label>Graisse</label>
                    <select value={style.fontWeight} onChange={(e) => setStyle({ ...style, fontWeight: e.target.value })}><option value="">Auto</option><option value="400">Normal</option><option value="600">Semi-gras</option><option value="700">Gras</option><option value="800">Très gras</option></select>
                  </div>
                </div>
                <div className="cols-2">
                  <div className="field"><label>Alignement</label>
                    <select value={style.textAlign} onChange={(e) => setStyle({ ...style, textAlign: e.target.value })}><option value="">Auto</option><option value="left">Gauche</option><option value="center">Centre</option><option value="right">Droite</option></select>
                  </div>
                  <div className="field"><label>Arrondi</label><input value={style.borderRadius} onChange={(e) => setStyle({ ...style, borderRadius: e.target.value })} placeholder="ex. 10px" /></div>
                </div>
                <div className="field"><label className="switch"><input type="checkbox" checked={hide} onChange={(e) => { setHide(e.target.checked); preview('hide', e.target.checked ? '1' : ''); }} /> Masquer cet élément</label></div>
              </div>

              <div className="save-bar" style={{ position: 'sticky' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => reset(false)}>Annuler ({locale.toUpperCase()})</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => reset(true)}>Tout réinitialiser</button>
                <button type="button" className="btn" onClick={save} disabled={busy}>{busy ? 'Publication…' : 'Publier'}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
