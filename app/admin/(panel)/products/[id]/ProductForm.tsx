'use client';
import { useActionState, useState } from 'react';
import { saveProduct } from '../../../actions/catalog';
import { RichText, SaveBar } from '@/components/admin/ui';
import { CategoryPicker, Gallery, I18nTabs, SeoFields, type I18nValue } from '@/components/admin/fields';

type P = {
  id: number; name: string; slug: string; brand: string; price: number; regularPrice: number; label: string; images: string[]; cats: string[];
  primaryCat: string; tags: string; inStock: boolean; stockQty: number | null; sku: string; ean: string; shortDescription: string; description: string;
  published: boolean; seoTitle: string; seoDescription: string; i18n: I18nValue;
};

export default function ProductForm({ p, cats, brands, locales, siteUrl }: {
  p: P | null; cats: { path: string; name: string }[]; brands: { slug: string; name: string }[]; locales: { code: string; name: string }[]; siteUrl: string;
}) {
  const [state, action] = useActionState(saveProduct, null);
  const [name, setName] = useState(p?.name ?? '');
  const [images, setImages] = useState<string[]>(p?.images ?? []);
  const [sel, setSel] = useState<string[]>(p?.cats ?? []);
  const [short, setShort] = useState(p?.shortDescription ?? '');
  const [desc, setDesc] = useState(p?.description ?? '');
  const [seoT, setSeoT] = useState(p?.seoTitle ?? '');
  const [seoD, setSeoD] = useState(p?.seoDescription ?? '');
  const [i18n, setI18n] = useState<I18nValue>(p?.i18n ?? {});
  const [price, setPrice] = useState(p?.price ?? 0);
  const [regular, setRegular] = useState(p?.regularPrice ?? 0);
  const [brand, setBrand] = useState(p?.brand ?? '');
  const off = regular > price && price > 0 ? Math.round((1 - price / regular) * 100) : 0;

  return (
    <form action={action}>
      <input type="hidden" name="id" value={p?.id ?? 0} />
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <input type="hidden" name="cats" value={JSON.stringify(sel)} />
      <input type="hidden" name="shortDescription" value={short} />
      <input type="hidden" name="description" value={desc} />
      <input type="hidden" name="seoTitle" value={seoT} />
      <input type="hidden" name="seoDescription" value={seoD} />
      <input type="hidden" name="i18n" value={JSON.stringify(i18n)} />
      <input type="hidden" name="brandName" value={brands.find((b) => b.slug === brand)?.name ?? brand} />
      <div className="grid-2">
        <div>
          <div className="card card-pad">
            <div className="field"><label>Nom du produit</label><input name="name" value={name} onChange={(e) => setName(e.target.value)} required /></div>
            <div className="field"><label>Description courte</label><RichText value={short} onChange={setShort} minHeight={110} /></div>
            <div className="field"><label>Description complète</label><RichText value={desc} onChange={setDesc} /></div>
          </div>
          <div className="card">
            <div className="card-head"><h2>Images</h2><span className="muted">La première est l’image principale</span></div>
            <div className="card-body"><Gallery value={images} onChange={setImages} /></div>
          </div>
          <div className="card">
            <div className="card-head"><h2>Référencement (SEO)</h2></div>
            <div className="card-body">
              <SeoFields title={seoT} description={seoD} onTitle={setSeoT} onDescription={setSeoD}
                fallbackTitle={`${name} – beautymall`} fallbackDescription={short.replace(/<[^>]+>/g, ' ').trim()} url={`${siteUrl}/product/${p?.slug || '…'}`} />
              <div className="field"><label>URL (slug)</label><input name="slug" defaultValue={p?.slug} placeholder="généré depuis le nom" /></div>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h2>Traductions</h2></div>
            <div className="card-body">
              <I18nTabs locales={locales} value={i18n} onChange={setI18n}
                source={{ name, shortDescription: short, description: desc }}
                fields={[{ key: 'name', label: 'Nom' }, { key: 'shortDescription', label: 'Description courte', rich: true }, { key: 'description', label: 'Description complète', rich: true }]} />
            </div>
          </div>
        </div>
        <div>
          <div className="card card-pad">
            <div className="field"><label className="switch"><input type="checkbox" name="published" defaultChecked={p?.published ?? true} /> Publié sur la boutique</label></div>
          </div>
          <div className="card">
            <div className="card-head"><h2>Prix</h2>{off > 0 && <span className="pill amber plain">−{off}%</span>}</div>
            <div className="card-body">
              <div className="cols-2">
                <div className="field"><label>Prix normal (DH)</label><input name="regularPrice" type="number" step="0.01" min={0} value={regular || ''} onChange={(e) => setRegular(+e.target.value)} /></div>
                <div className="field"><label>Prix de vente (DH)</label><input name="price" type="number" step="0.01" min={0} value={price || ''} onChange={(e) => setPrice(+e.target.value)} required /></div>
              </div>
              <div className="field"><label>Badge</label><input name="label" defaultValue={p?.label} placeholder={off ? `-${off}% (automatique)` : 'ex. NOUVEAU'} /></div>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h2>Stock</h2></div>
            <div className="card-body">
              <div className="field"><label className="switch"><input type="checkbox" name="inStock" defaultChecked={p?.inStock ?? true} /> En stock</label></div>
              <div className="field"><label>Quantité (vide = non suivie)</label><input name="stockQty" type="number" min={0} defaultValue={p?.stockQty ?? ''} /></div>
              <div className="cols-2">
                <div className="field"><label>UGS</label><input name="sku" defaultValue={p?.sku} /></div>
                <div className="field"><label>EAN</label><input name="ean" defaultValue={p?.ean} /></div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h2>Organisation</h2></div>
            <div className="card-body">
              <div className="field">
                <label>Marque</label>
                <input name="brand" list="brands" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="ex. cerave" />
                <datalist id="brands">{brands.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}</datalist>
              </div>
              <div className="field"><label>Catégories</label><CategoryPicker all={cats} value={sel} onChange={setSel} /></div>
              <div className="field">
                <label>Catégorie principale (fil d’Ariane)</label>
                <select name="primaryCat" defaultValue={p?.primaryCat ?? ''}>
                  <option value="">Automatique (la plus précise)</option>
                  {sel.map((c) => <option key={c} value={c}>{cats.find((x) => x.path === c)?.name ?? c}</option>)}
                </select>
              </div>
              <div className="field"><label>Étiquettes</label><input name="tags" defaultValue={p?.tags} placeholder="destockage, beauty-promotion" /></div>
            </div>
          </div>
        </div>
      </div>
      <SaveBar state={state} label={p ? 'Enregistrer' : 'Créer le produit'} />
    </form>
  );
}
