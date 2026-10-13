'use client';
import Link from 'next/link';
import { useActionState, useState } from 'react';
import { bulkProducts } from '../../actions/catalog';

type Row = { id: number; name: string; slug: string; image: string; price: string; regular: string; label: string | null; inStock: boolean; stockQty: number | null; published: boolean; brand: string; sku: string; views: number; visitors: number };

export default function ProductTable({ rows }: { rows: Row[] }) {
  const [sel, setSel] = useState<number[]>([]);
  const [action, setAction] = useState('');
  const [state, run, pending] = useActionState(bulkProducts, null);
  const all = rows.length > 0 && sel.length === rows.length;
  return (
    <>
      {sel.length > 0 && (
        <form action={run} className="toolbar" style={{ background: 'var(--a-primary-soft)' }} onSubmit={(e) => { if (action === 'delete' && !confirm(`Supprimer ${sel.length} produit(s) ?`)) e.preventDefault(); }}>
          <strong>{sel.length} sélectionné(s)</strong>
          <input type="hidden" name="ids" value={JSON.stringify(sel)} />
          <select className="input" name="action" value={action} onChange={(e) => setAction(e.target.value)} style={{ maxWidth: 240 }}>
            <option value="">Action groupée…</option>
            <option value="publish">Publier</option>
            <option value="unpublish">Dépublier (brouillon)</option>
            <option value="instock">Marquer en stock</option>
            <option value="outofstock">Marquer en rupture</option>
            <option value="discount">Appliquer une remise %</option>
            <option value="clearDiscount">Retirer la remise</option>
            <option value="delete">Supprimer</option>
          </select>
          {action === 'discount' && <input className="input" name="value" type="number" min={1} max={99} placeholder="%" style={{ maxWidth: 90 }} />}
          <button className="btn btn-sm" disabled={!action || pending}>Appliquer</button>
          {state && <span className={state.ok ? 'muted' : ''} style={{ color: state.ok ? 'var(--a-success)' : 'var(--a-danger)' }}>{state.message}</span>}
        </form>
      )}
      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 30 }}><input type="checkbox" checked={all} onChange={() => setSel(all ? [] : rows.map((r) => r.id))} /></th>
              <th>Produit</th><th>Marque</th><th className="num">Prix</th><th className="num" title="Visiteurs uniques qui ont ouvert la fiche produit (30 derniers jours)">Visiteurs 30 j</th><th>Stock</th><th>Statut</th><th className="actions-col" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={8} className="empty">Aucun produit.</td></tr>}
            {rows.map((p) => (
              <tr key={p.id}>
                <td><input type="checkbox" checked={sel.includes(p.id)} onChange={() => setSel(sel.includes(p.id) ? sel.filter((x) => x !== p.id) : [...sel, p.id])} /></td>
                <td>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {p.image ? <img className="thumb" src={p.image} alt="" /> : <span className="thumb" />}
                    <div><Link className="row-link" href={`/admin/products/${p.id}`}>{p.name}</Link><div className="muted" style={{ fontSize: 12 }}>#{p.id}{p.sku && ` · UGS ${p.sku}`}</div></div>
                  </div>
                </td>
                <td>{p.brand}</td>
                <td className="num">{p.regular && <del className="muted" style={{ marginRight: 6 }}>{p.regular}</del>}<strong>{p.price}</strong>{p.label && <div><span className="pill plain amber">{p.label}</span></div>}</td>
                <td className="num">{p.visitors ? <><strong>{p.visitors}</strong><div className="muted" style={{ fontSize: 12 }}>{p.views} clic(s)</div></> : <span className="muted">0</span>}</td>
                <td>{p.inStock ? <span className="pill green">{p.stockQty != null ? `${p.stockQty} en stock` : 'En stock'}</span> : <span className="pill red">Rupture</span>}</td>
                <td>{p.published ? <span className="pill green">Publié</span> : <span className="pill gray">Brouillon</span>}</td>
                <td><div className="row-actions"><a className="icon-btn" href={`/product/${p.slug}`} target="_blank" rel="noreferrer" title="Voir">↗</a><Link className="icon-btn icon-btn--edit" href={`/admin/products/${p.id}`} title="Modifier">✎</Link></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
