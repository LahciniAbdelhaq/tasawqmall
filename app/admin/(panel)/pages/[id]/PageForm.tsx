'use client';
import { useActionState, useState } from 'react';
import type { Block } from '@/lib/blocks';
import { savePage } from '../../../actions/content';
import { MediaInput, RichText, SaveBar } from '@/components/admin/ui';
import { I18nTabs, SeoFields, type I18nValue } from '@/components/admin/fields';

type P = { id: number; slug: string; title: string; kind: string; published: boolean; seoTitle: string; seoDescription: string; ogImage: string; i18n: I18nValue; blocks: Block[] };
type Opt = { path?: string; slug?: string; name: string };

const TYPES: [Block['type'], string][] = [
  ['banner', 'Bannière'], ['heading', 'Titre'], ['text', 'Texte'], ['image', 'Image'], ['products', 'Produits'], ['categories', 'Catégories'],
  ['button', 'Bouton'], ['faq', 'FAQ'], ['video', 'Vidéo'], ['spacer', 'Espace'], ['html', 'Code HTML'],
];
const TRANSLATABLE: Partial<Record<Block['type'], string[]>> = {
  heading: ['text'], text: ['html'], image: ['alt'], banner: ['title', 'subtitle', 'buttonText'], products: ['title'], categories: ['title'], button: ['text'], faq: ['title'], html: ['code'],
};
const newBlock = (type: Block['type']): Block => {
  const id = Math.random().toString(36).slice(2, 9);
  switch (type) {
    case 'banner': return { id, type, image: '', title: 'Titre de la bannière', subtitle: '', buttonText: 'Découvrir', buttonLink: '/boutique', height: 420, overlay: 25 };
    case 'heading': return { id, type, text: 'Nouveau titre', level: 'h2', align: 'center' };
    case 'text': return { id, type, html: '<p>Votre texte…</p>' };
    case 'image': return { id, type, src: '', alt: '' };
    case 'products': return { id, type, title: 'Sélection', source: 'sale', limit: 8, columns: 4 };
    case 'categories': return { id, type, title: 'Nos catégories', paths: [] };
    case 'button': return { id, type, text: 'Voir la boutique', link: '/boutique', align: 'center' };
    case 'faq': return { id, type, title: 'Questions fréquentes', items: [{ q: 'Question ?', a: '<p>Réponse.</p>' }] };
    case 'video': return { id, type, url: '' };
    case 'spacer': return { id, type, height: 40 };
    case 'html': return { id, type, code: '' };
  }
};

export default function PageForm({ p, locales, siteUrl, cats, brands }: { p: P; locales: { code: string; name: string }[]; siteUrl: string; cats: { path: string; name: string }[]; brands: { slug: string; name: string }[] }) {
  const [state, action] = useActionState(savePage, null);
  const [title, setTitle] = useState(p.title);
  const [blocks, setBlocks] = useState<Block[]>(p.blocks);
  const [seoT, setSeoT] = useState(p.seoTitle);
  const [seoD, setSeoD] = useState(p.seoDescription);
  const [og, setOg] = useState(p.ogImage);
  const [i18n, setI18n] = useState<I18nValue>(p.i18n);
  const [lang, setLang] = useState('fr');
  const custom = p.kind === 'custom';

  const update = (i: number, patch: Record<string, unknown>) => setBlocks(blocks.map((b, k) => {
    if (k !== i) return b;
    if (lang === 'fr') return { ...b, ...patch } as Block;
    const cur = ('i18n' in b && b.i18n) || {};
    return { ...b, i18n: { ...cur, [lang]: { ...(cur[lang] || {}), ...patch } } } as Block;
  }));
  // value shown for a field in the editing language (falls back to French)
  const val = (b: Block, k: string): string => {
    if (lang !== 'fr' && TRANSLATABLE[b.type]?.includes(k)) {
      const t = ('i18n' in b && b.i18n?.[lang]?.[k]) as string | undefined;
      return t ?? '';
    }
    return ((b as Record<string, unknown>)[k] as string) ?? '';
  };
  const ph = (b: Block, k: string) => (lang !== 'fr' ? String((b as Record<string, unknown>)[k] ?? '') : '');
  const canEdit = (b: Block, k: string) => lang === 'fr' || TRANSLATABLE[b.type]?.includes(k);
  const move = (i: number, d: number) => { const n = [...blocks]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; setBlocks(n); };

  const input = (b: Block, i: number, k: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="field"><label>{label}</label><input value={val(b, k)} placeholder={ph(b, k)} disabled={!canEdit(b, k)} onChange={(e) => update(i, { [k]: props.type === 'number' ? +e.target.value : e.target.value })} {...props} /></div>
  );

  return (
    <form action={action}>
      <input type="hidden" name="id" value={p.id} />
      <input type="hidden" name="blocks" value={JSON.stringify(blocks)} />
      <input type="hidden" name="seoTitle" value={seoT} />
      <input type="hidden" name="seoDescription" value={seoD} />
      <input type="hidden" name="ogImage" value={og} />
      <input type="hidden" name="i18n" value={JSON.stringify(i18n)} />
      <div className="grid-2">
        <div>
          <div className="card card-pad">
            <div className="field"><label>Titre de la page</label><input name="title" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            {custom && <div className="field"><label>Adresse</label><div className="input-group"><input name="slug" defaultValue={p.slug} /><span className="addon">{siteUrl}/…</span></div></div>}
            {!custom && <p className="muted" style={{ marginTop: 12 }}>Le contenu de cette page vient du site d’origine : modifiez textes, images, liens et icônes avec l’<a className="link" href={`/admin/editor?path=/${p.slug}`}>éditeur visuel</a>.</p>}
          </div>

          {custom && (
            <div className="card">
              <div className="card-head">
                <h2>Contenu ({blocks.length} bloc{blocks.length > 1 ? 's' : ''})</h2>
                <select className="input" style={{ maxWidth: 170 }} value={lang} onChange={(e) => setLang(e.target.value)} title="Langue en cours d’édition">
                  <option value="fr">Français (source)</option>
                  {locales.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
              </div>
              <div className="card-body">
                {lang !== 'fr' && <div className="alert info">Vous traduisez les blocs en {locales.find((l) => l.code === lang)?.name}. Les champs vides reprennent le français.</div>}
                <div className="block-list">
                  {blocks.map((b, i) => (
                    <div className="block-card" key={b.id}>
                      <div className="head">
                        <strong>{TYPES.find((t) => t[0] === b.type)?.[1]}</strong>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(i, -1)} title="Monter">↑</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(i, 1)} title="Descendre">↓</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBlocks(blocks.filter((_, k) => k !== i))} title="Supprimer">✕</button>
                      </div>
                      <div className="body">
                        {b.type === 'heading' && (<>{input(b, i, 'text', 'Texte')}<div className="cols-2"><div className="field"><label>Niveau</label><select value={b.level || 'h2'} onChange={(e) => update(i, { level: e.target.value })} disabled={lang !== 'fr'}><option value="h1">H1</option><option value="h2">H2</option><option value="h3">H3</option></select></div><div className="field"><label>Alignement</label><select value={b.align || 'center'} onChange={(e) => update(i, { align: e.target.value })} disabled={lang !== 'fr'}><option value="left">Gauche</option><option value="center">Centre</option><option value="right">Droite</option></select></div></div></>)}
                        {b.type === 'text' && <RichText key={`${b.id}-${lang}`} value={val(b, 'html')} onChange={(v) => update(i, { html: v })} />}
                        {b.type === 'image' && (<>{lang === 'fr' && <div className="field"><label>Image</label><MediaInput value={b.src} onChange={(v) => update(i, { src: v })} /></div>}{input(b, i, 'alt', 'Texte alternatif (SEO)')}{input(b, i, 'link', 'Lien (facultatif)')}</>)}
                        {b.type === 'banner' && (<>{lang === 'fr' && <div className="field"><label>Image de fond</label><MediaInput value={b.image} onChange={(v) => update(i, { image: v })} /></div>}{input(b, i, 'title', 'Titre')}{input(b, i, 'subtitle', 'Sous-titre')}<div className="cols-2">{input(b, i, 'buttonText', 'Texte du bouton')}{input(b, i, 'buttonLink', 'Lien du bouton')}</div><div className="cols-3">{input(b, i, 'height', 'Hauteur (px)', { type: 'number' })}{input(b, i, 'overlay', 'Assombrir (%)', { type: 'number' })}{input(b, i, 'textColor', 'Couleur texte')}</div></>)}
                        {b.type === 'products' && (<>{input(b, i, 'title', 'Titre')}<div className="cols-2"><div className="field"><label>Produits</label><select value={b.source} onChange={(e) => update(i, { source: e.target.value, value: '' })} disabled={lang !== 'fr'}><option value="sale">Meilleures promotions</option><option value="latest">Nouveautés</option><option value="category">D’une catégorie</option><option value="brand">D’une marque</option><option value="tag">D’une étiquette</option><option value="ids">Choisis (n° de produits)</option></select></div>
                          <div className="field"><label>Valeur</label>{b.source === 'category' ? <select value={b.value || ''} onChange={(e) => update(i, { value: e.target.value })} disabled={lang !== 'fr'}><option value="">—</option>{cats.map((c: Opt) => <option key={c.path} value={c.path}>{c.name}</option>)}</select> : b.source === 'brand' ? <select value={b.value || ''} onChange={(e) => update(i, { value: e.target.value })} disabled={lang !== 'fr'}><option value="">—</option>{brands.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select> : <input value={b.value || ''} onChange={(e) => update(i, { value: e.target.value })} disabled={lang !== 'fr' || ['sale', 'latest'].includes(b.source)} placeholder={b.source === 'ids' ? '1330, 40546' : b.source === 'tag' ? 'destockage' : ''} />}</div></div>
                          <div className="cols-2">{input(b, i, 'limit', 'Nombre', { type: 'number', min: 1, max: 48 })}{input(b, i, 'columns', 'Colonnes', { type: 'number', min: 2, max: 6 })}</div></>)}
                        {b.type === 'categories' && (<>{input(b, i, 'title', 'Titre')}{lang === 'fr' && <div className="field"><label>Catégories</label><select multiple value={b.paths} onChange={(e) => update(i, { paths: Array.from(e.target.selectedOptions).map((o) => o.value) })} style={{ minHeight: 160 }}>{cats.map((c) => <option key={c.path} value={c.path}>{'— '.repeat(c.path.split('/').length - 1)}{c.name}</option>)}</select><span className="help">Ctrl/Cmd + clic pour en choisir plusieurs.</span></div>}</>)}
                        {b.type === 'button' && (<div className="cols-2">{input(b, i, 'text', 'Texte')}{input(b, i, 'link', 'Lien')}</div>)}
                        {b.type === 'faq' && (<>{input(b, i, 'title', 'Titre')}{lang === 'fr' ? (<>{b.items.map((it, k) => (
                          <div key={k} className="cols-2" style={{ marginTop: 8 }}>
                            <div className="field"><input value={it.q} onChange={(e) => update(i, { items: b.items.map((x, j) => (j === k ? { ...x, q: e.target.value } : x)) })} placeholder="Question" /></div>
                            <div className="field" style={{ display: 'flex', gap: 6 }}><textarea value={it.a} onChange={(e) => update(i, { items: b.items.map((x, j) => (j === k ? { ...x, a: e.target.value } : x)) })} placeholder="Réponse (HTML autorisé)" style={{ minHeight: 40 }} /><button type="button" className="btn btn-ghost btn-sm" onClick={() => update(i, { items: b.items.filter((_, j) => j !== k) })}>✕</button></div>
                          </div>))}<button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => update(i, { items: [...b.items, { q: '', a: '' }] })}>+ Question</button></>) : <p className="muted">Les questions se traduisent avec un bloc FAQ par langue ou via le dictionnaire.</p>}</>)}
                        {b.type === 'video' && input(b, i, 'url', 'Lien YouTube ou fichier MP4')}
                        {b.type === 'spacer' && input(b, i, 'height', 'Hauteur (px)', { type: 'number' })}
                        {b.type === 'html' && <div className="field"><label>Code HTML</label><textarea value={val(b, 'code')} placeholder={ph(b, 'code')} onChange={(e) => update(i, { code: e.target.value })} style={{ minHeight: 140, fontFamily: 'ui-monospace, monospace', fontSize: 12 }} /></div>}
                      </div>
                    </div>
                  ))}
                </div>
                {lang === 'fr' && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
                    {TYPES.map(([t, l]) => <button key={t} type="button" className="btn btn-secondary btn-sm" onClick={() => setBlocks([...blocks, newBlock(t)])}>+ {l}</button>)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div>
          <div className="card card-pad">
            {p.slug !== '' && <div className="field"><label className="switch"><input type="checkbox" name="published" defaultChecked={p.published} /> Page en ligne</label></div>}
          </div>
          <div className="card">
            <div className="card-head"><h2>Référencement (SEO)</h2></div>
            <div className="card-body">
              <SeoFields title={seoT} description={seoD} onTitle={setSeoT} onDescription={setSeoD} fallbackTitle={`${title} – beautymall`} url={`${siteUrl}/${p.slug}`} />
              <div className="field"><label>Image de partage (réseaux sociaux)</label><MediaInput value={og} onChange={setOg} /></div>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h2>Traductions (titre & SEO)</h2></div>
            <div className="card-body">
              <I18nTabs locales={locales} value={i18n} onChange={setI18n} source={{ title, seoTitle: seoT, seoDescription: seoD }}
                fields={[{ key: 'title', label: 'Titre' }, { key: 'seoTitle', label: 'Titre SEO' }, { key: 'seoDescription', label: 'Méta description', area: true }]} />
            </div>
          </div>
        </div>
      </div>
      <SaveBar state={state} />
    </form>
  );
}
