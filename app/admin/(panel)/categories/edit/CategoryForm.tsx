'use client';
import { useActionState, useState } from 'react';
import { saveCategory } from '../../../actions/catalog';
import { MediaInput, RichText, SaveBar } from '@/components/admin/ui';
import { I18nTabs, SeoFields, type I18nValue } from '@/components/admin/fields';

type C = { path: string; name: string; slug: string; parent: string; image: string; description: string; seoTitle: string; seoDescription: string; position: number; i18n: I18nValue };

export default function CategoryForm({ c, parents, locales, siteUrl }: { c: C | null; parents: { path: string; name: string }[]; locales: { code: string; name: string }[]; siteUrl: string }) {
  const [state, action] = useActionState(saveCategory, null);
  const [name, setName] = useState(c?.name ?? '');
  const [image, setImage] = useState(c?.image ?? '');
  const [desc, setDesc] = useState(c?.description ?? '');
  const [seoT, setSeoT] = useState(c?.seoTitle ?? '');
  const [seoD, setSeoD] = useState(c?.seoDescription ?? '');
  const [i18n, setI18n] = useState<I18nValue>(c?.i18n ?? {});
  return (
    <form action={action}>
      <input type="hidden" name="original" value={c?.path ?? ''} />
      <input type="hidden" name="image" value={image} />
      <input type="hidden" name="description" value={desc} />
      <input type="hidden" name="seoTitle" value={seoT} />
      <input type="hidden" name="seoDescription" value={seoD} />
      <input type="hidden" name="i18n" value={JSON.stringify(i18n)} />
      <div className="grid-2">
        <div>
          <div className="card card-pad">
            <div className="field"><label>Nom</label><input name="name" value={name} onChange={(e) => setName(e.target.value)} required /></div>
            <div className="field"><label>Description (affichée en haut de la page catégorie)</label><RichText value={desc} onChange={setDesc} minHeight={140} /></div>
          </div>
          <div className="card">
            <div className="card-head"><h2>Référencement (SEO)</h2></div>
            <div className="card-body">
              <SeoFields title={seoT} description={seoD} onTitle={setSeoT} onDescription={setSeoD} fallbackTitle={`${name} – beautymall`} url={`${siteUrl}/product-category/${c?.path ?? '…'}`} />
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h2>Traductions</h2></div>
            <div className="card-body">
              <I18nTabs locales={locales} value={i18n} onChange={setI18n} source={{ name, description: desc }}
                fields={[{ key: 'name', label: 'Nom' }, { key: 'description', label: 'Description', rich: true }]} />
            </div>
          </div>
        </div>
        <div>
          <div className="card card-pad">
            <div className="field">
              <label>Catégorie parente</label>
              <select name="parent" defaultValue={c?.parent ?? ''} disabled={!!c}>
                <option value="">— Aucune (catégorie principale) —</option>
                {parents.map((p) => <option key={p.path} value={p.path}>{'— '.repeat(p.path.split('/').length - 1)}{p.name}</option>)}
              </select>
              {c && <input type="hidden" name="parent" value={c.parent} />}
            </div>
            <div className="field"><label>Slug (URL)</label><input name="slug" defaultValue={c?.slug} disabled={!!c} placeholder="généré depuis le nom" />{c && <input type="hidden" name="slug" value={c.slug} />}</div>
            <div className="field"><label>Ordre</label><input name="position" type="number" defaultValue={c?.position ?? 0} /></div>
            <div className="field"><label>Image (tuiles de catégories)</label><MediaInput value={image} onChange={setImage} /></div>
          </div>
        </div>
      </div>
      <SaveBar state={state} label={c ? 'Enregistrer' : 'Créer la catégorie'} />
    </form>
  );
}
