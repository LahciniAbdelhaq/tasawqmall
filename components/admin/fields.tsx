'use client';
import { useRef, useState } from 'react';
import Icon from '@/components/Icon';
import { uploadFiles, RichText } from './ui';

/* ---------------------------------------------------------- image gallery */
export function Gallery({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true); setErr('');
    try { onChange([...value, ...(await uploadFiles(files))]); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const move = (i: number, d: number) => {
    const n = [...value]; const j = i + d;
    if (j < 0 || j >= n.length) return;
    [n[i], n[j]] = [n[j], n[i]]; onChange(n);
  };
  return (
    <>
      <div className="gallery" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); add(e.dataTransfer.files); }}>
        {value.map((src, i) => (
          <div className="item" key={src + i}>
            <img src={src} alt="" />
            {i === 0 && <span className="main-tag">Principale</span>}
            <div className="tools">
              <button type="button" onClick={() => move(i, -1)} title="Avant">←</button>
              <button type="button" onClick={() => onChange(value.filter((_, k) => k !== i))} title="Retirer"><Icon name="trash" size={14} /></button>
              <button type="button" onClick={() => move(i, 1)} title="Après">→</button>
            </div>
          </div>
        ))}
        <button type="button" className="add" onClick={() => ref.current?.click()} disabled={busy}><Icon name="upload" />{busy ? 'Envoi…' : 'Ajouter des images'}</button>
      </div>
      <div className="field" style={{ marginTop: 10 }}>
        <input className="input" placeholder="…ou coller l’URL d’une image puis Entrée" onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          const v = (e.target as HTMLInputElement).value.trim();
          if (v) { onChange([...value, v]); (e.target as HTMLInputElement).value = ''; }
        }} />
      </div>
      {err && <div className="alert err">{err}</div>}
      <input ref={ref} type="file" hidden multiple accept="image/*" onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
    </>
  );
}

/* ------------------------------------------------------- category picker */
export function CategoryPicker({ all, value, onChange }: { all: { path: string; name: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState('');
  const shown = all.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.path.includes(q.toLowerCase()));
  const toggle = (p: string) => {
    if (value.includes(p)) onChange(value.filter((x) => x !== p));
    else {
      // selecting a sub-category also selects its parents (like WooCommerce archives expect)
      const parts = p.split('/');
      const withParents = parts.map((_, i) => parts.slice(0, i + 1).join('/'));
      onChange([...new Set([...value, ...withParents])]);
    }
  };
  return (
    <div className="picker">
      <input className="input" placeholder="Filtrer les catégories…" value={q} onChange={(e) => setQ(e.target.value)} style={{ border: 0, borderBottom: '1px solid var(--a-border)', borderRadius: '10px 10px 0 0' }} />
      <div style={{ maxHeight: 280, overflowY: 'auto', padding: 8, display: 'grid', gap: 2 }}>
        {shown.map((c) => (
          <label key={c.path} className="check" style={{ paddingLeft: (c.path.split('/').length - 1) * 18, fontWeight: c.path.includes('/') ? 400 : 600 }}>
            <input type="checkbox" checked={value.includes(c.path)} onChange={() => toggle(c.path)} /> {c.name}
          </label>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- SEO fields */
export function SeoFields({ title, description, onTitle, onDescription, fallbackTitle, fallbackDescription, url }: {
  title: string; description: string; onTitle: (v: string) => void; onDescription: (v: string) => void;
  fallbackTitle: string; fallbackDescription?: string; url: string;
}) {
  const t = title || fallbackTitle;
  const d = description || fallbackDescription || '';
  const tone = (n: number, lo: number, hi: number) => (n === 0 ? 'var(--a-muted)' : n < lo || n > hi ? 'var(--a-danger)' : 'var(--a-success)');
  return (
    <>
      <div className="seo-preview">
        <div className="u">{url}</div>
        <div className="t">{t.slice(0, 65)}{t.length > 65 ? '…' : ''}</div>
        <div className="d">{d.slice(0, 160) || <em>Aucune description : Google en choisira une dans la page.</em>}{d.length > 160 ? '…' : ''}</div>
      </div>
      <div className="field">
        <label>Titre SEO <span style={{ color: tone(title.length, 30, 65), fontWeight: 500 }}>({title.length}/65)</span></label>
        <input value={title} onChange={(e) => onTitle(e.target.value)} placeholder={fallbackTitle} />
        <span className="help">Idéal : 30 à 65 caractères, mot-clé principal au début.</span>
      </div>
      <div className="field">
        <label>Méta description <span style={{ color: tone(description.length, 70, 160), fontWeight: 500 }}>({description.length}/160)</span></label>
        <textarea value={description} onChange={(e) => onDescription(e.target.value)} placeholder={fallbackDescription || 'Résumé incitatif affiché dans Google'} style={{ minHeight: 70 }} />
        <span className="help">Idéal : 70 à 160 caractères. Vide = générée automatiquement.</span>
      </div>
    </>
  );
}

/* --------------------------------------------------- translations (i18n) */
export type I18nValue = Record<string, Record<string, string>>;
export function I18nTabs({ locales, fields, value, onChange, source }: {
  locales: { code: string; name: string }[];
  fields: { key: string; label: string; rich?: boolean; area?: boolean }[];
  value: I18nValue; onChange: (v: I18nValue) => void; source: Record<string, string>;
}) {
  const [cur, setCur] = useState(locales[0]?.code);
  if (!locales.length) return <div className="muted">Activez d’autres langues dans « Langues & traductions ».</div>;
  const set = (k: string, v: string) => onChange({ ...value, [cur]: { ...(value[cur] || {}), [k]: v } });
  return (
    <>
      <div className="tabs" style={{ marginBottom: 14 }}>
        {locales.map((l) => <a key={l.code} href="#" className={cur === l.code ? 'on' : ''} onClick={(e) => { e.preventDefault(); setCur(l.code); }}>{l.name}{Object.values(value[l.code] || {}).some(Boolean) ? ' ✓' : ''}</a>)}
      </div>
      {fields.map((f) => (
        <div className="field" key={`${cur}-${f.key}`}>
          <label>{f.label}</label>
          {f.rich ? <RichText value={value[cur]?.[f.key] || ''} onChange={(v) => set(f.key, v)} minHeight={140} />
            : f.area ? <textarea value={value[cur]?.[f.key] || ''} onChange={(e) => set(f.key, e.target.value)} placeholder={source[f.key]} />
            : <input value={value[cur]?.[f.key] || ''} onChange={(e) => set(f.key, e.target.value)} placeholder={source[f.key]} />}
          {source[f.key] && !f.rich && <span className="help">Français : {source[f.key].replace(/<[^>]+>/g, ' ').slice(0, 140)}</span>}
        </div>
      ))}
    </>
  );
}
