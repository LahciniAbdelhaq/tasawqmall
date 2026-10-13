'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Icon from '@/components/Icon';

export type { Result } from '@/lib/form';
import type { Result } from '@/lib/form';

/* ---------- barre d'enregistrement ---------- */
function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="btn" disabled={pending}>{pending ? 'Enregistrement…' : label}</button>;
}
export function SaveBar({ state, label = 'Enregistrer', children }: { state?: Result; label?: string; children?: React.ReactNode }) {
  return (
    <div className="save-bar">
      {state && <span className={`msg ${state.ok ? 'ok' : 'err'}`}>{state.ok ? '✓ ' : ''}{state.message}</span>}
      {children}
      <SubmitBtn label={label} />
    </div>
  );
}

/** Bouton d'action destructive avec confirmation. */
export function ConfirmButton({ message, children, className = 'btn btn-danger btn-sm', title }: { message: string; children: React.ReactNode; className?: string; title?: string }) {
  return (
    <button className={className} title={title} aria-label={title} onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}

/* ---------- envoi de fichiers ---------- */
/** Uploads to storage/uploads (served at /uploads/…); returns the public URLs. */
export async function uploadFiles(files: FileList | File[]): Promise<string[]> {
  const fd = new FormData();
  for (const f of Array.from(files)) fd.append('file', f);
  const r = await fetch('/api/admin/upload', { method: 'POST', body: fd });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'Échec de l’envoi');
  return j.urls;
}

export function MediaInput({ value, onChange, kind = 'image', name }: { value: string; onChange: (v: string) => void; kind?: 'image' | 'video'; name?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true); setErr('');
    try { onChange((await uploadFiles(files))[0]); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="img-input">
      {name && <input type="hidden" name={name} value={value} />}
      <div
        className="preview"
        style={kind === 'image' && value ? { backgroundImage: `url('${value}')` } : undefined}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files); }}
      >
        {kind === 'video' && value ? <video src={value} muted /> : !value && <Icon name={kind === 'video' ? 'layers' : 'image'} size={26} />}
      </div>
      <div className="ctrl">
        <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={kind === 'video' ? '/uploads/video.mp4' : '/uploads/image.png ou https://…'} />
        <div className="row">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => ref.current?.click()} disabled={busy}>
            <Icon name="upload" /> {busy ? 'Envoi…' : 'Téléverser'}
          </button>
          {value && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange('')}>Retirer</button>}
          {value && <a className="btn btn-ghost btn-sm" href={value} target="_blank" rel="noreferrer"><Icon name="external" /></a>}
        </div>
        {err && <span className="help" style={{ color: 'var(--a-danger)' }}>{err}</span>}
        <input ref={ref} type="file" hidden accept={kind === 'video' ? 'video/mp4,video/webm' : 'image/*'} onChange={(e) => pick(e.target.files)} />
      </div>
    </div>
  );
}

/* ---------- éditeur de texte riche ---------- */
export function RichText({ value, onChange, name, minHeight = 220 }: { value: string; onChange?: (v: string) => void; name?: string; minHeight?: number }) {
  const area = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState(value);
  const [source, setSource] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (area.current && !source) area.current.innerHTML = html; }, [source]); // eslint-disable-line react-hooks/exhaustive-deps
  const sync = () => { const v = area.current?.innerHTML || ''; setHtml(v); onChange?.(v); };
  const cmd = (c: string, arg?: string) => { area.current?.focus(); document.execCommand(c, false, arg); sync(); };

  return (
    <div className="rte-box">
      {name && <input type="hidden" name={name} value={html} />}
      <div className="rte-bar">
        <button type="button" onClick={() => cmd('formatBlock', 'P')} title="Paragraphe">¶</button>
        <button type="button" onClick={() => cmd('formatBlock', 'H2')} title="Titre">H2</button>
        <button type="button" onClick={() => cmd('formatBlock', 'H3')} title="Sous-titre">H3</button>
        <span className="sep" />
        <button type="button" onClick={() => cmd('bold')} title="Gras"><b>G</b></button>
        <button type="button" onClick={() => cmd('italic')} title="Italique"><i>I</i></button>
        <button type="button" onClick={() => cmd('underline')} title="Souligné"><u>S</u></button>
        <span className="sep" />
        <button type="button" onClick={() => cmd('insertUnorderedList')} title="Liste">• Liste</button>
        <button type="button" onClick={() => cmd('insertOrderedList')} title="Liste numérotée">1. Liste</button>
        <button type="button" onClick={() => cmd('justifyCenter')} title="Centrer">≡</button>
        <span className="sep" />
        <button type="button" onClick={() => { const u = window.prompt('Adresse du lien'); if (u) cmd('createLink', u); }} title="Lien">Lien</button>
        <button type="button" onClick={() => fileRef.current?.click()} title="Image">Image</button>
        <button type="button" onClick={() => cmd('removeFormat')} title="Effacer la mise en forme">✕</button>
        <span className="sep" />
        <button type="button" className={source ? 'on' : ''} onClick={() => { if (!source) sync(); setSource(!source); }} title="Code HTML">&lt;/&gt;</button>
      </div>
      {source ? (
        <textarea className="rte-src" value={html} onChange={(e) => { setHtml(e.target.value); onChange?.(e.target.value); }} style={{ minHeight }} />
      ) : (
        <div ref={area} className="rte-area" contentEditable suppressContentEditableWarning onInput={sync} onBlur={sync} style={{ minHeight }} />
      )}
      <input
        ref={fileRef} type="file" hidden accept="image/*"
        onChange={async (e) => {
          if (!e.target.files?.length) return;
          const [url] = await uploadFiles(e.target.files);
          cmd('insertImage', url);
          e.target.value = '';
        }}
      />
    </div>
  );
}

/* ---------- sélecteur de produits ---------- */
export type PickProduct = { id: number; slug: string; title: string; image: string };

export function ProductPicker({ products, value, onChange, by = 'slug', single = false }: {
  products: PickProduct[]; value: (string | number)[]; onChange: (v: (string | number)[]) => void; by?: 'slug' | 'id'; single?: boolean;
}) {
  const key = (p: PickProduct) => (by === 'slug' ? p.slug : p.id);
  const chosen = value.map((v) => products.find((p) => key(p) === v)).filter(Boolean) as PickProduct[];
  const move = (i: number, d: number) => {
    const next = [...value];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="picker">
      {chosen.length > 0 && (
        <div className="chosen">
          {chosen.map((p, i) => (
            <div className="it" key={key(p)}>
              {p.image && <img src={p.image} alt="" />}
              <span>{p.title}</span>
              {!single && <button type="button" onClick={() => move(i, -1)} aria-label="Monter">↑</button>}
              {!single && <button type="button" onClick={() => move(i, 1)} aria-label="Descendre">↓</button>}
              <button type="button" onClick={() => onChange(value.filter((v) => v !== key(p)))} aria-label="Retirer">✕</button>
            </div>
          ))}
        </div>
      )}
      {(!single || !chosen.length) && (
        <select value="" onChange={(e) => { const v = by === 'slug' ? e.target.value : Number(e.target.value); if (v) onChange(single ? [v] : [...value, v]); }}>
          <option value="">+ Ajouter un produit…</option>
          {products.filter((p) => !value.includes(key(p))).map((p) => <option key={p.id} value={key(p)}>{p.title}</option>)}
        </select>
      )}
    </div>
  );
}

/* ---------- lien interne ---------- */
export type LinkOption = { href: string; label: string };
export function LinkInput({ value, onChange, links, name }: { value: string; onChange: (v: string) => void; links: LinkOption[]; name?: string }) {
  const id = useRef(`l${Math.random().toString(36).slice(2, 8)}`).current;
  return (
    <>
      <input className="input" name={name} list={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder="/product-category/soins-du-visage ou https://…" />
      <datalist id={id}>{links.map((l) => <option key={l.href} value={l.href}>{l.label}</option>)}</datalist>
    </>
  );
}

export function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="color-field">
      <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'} onChange={(e) => onChange(e.target.value.toUpperCase())} />
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} style={{ maxWidth: 120 }} />
    </div>
  );
}

export function Switch({ name, defaultChecked, checked, onChange, label }: { name?: string; defaultChecked?: boolean; checked?: boolean; onChange?: (v: boolean) => void; label: string }) {
  return (
    <label className="switch">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} checked={checked} onChange={onChange ? (e) => onChange(e.target.checked) : undefined} />
      {label}
    </label>
  );
}
