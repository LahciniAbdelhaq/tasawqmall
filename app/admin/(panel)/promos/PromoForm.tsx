'use client';
import Link from 'next/link';
import { useActionState, useState } from 'react';
import { savePromo } from '../../actions/marketing';
import { SaveBar } from '@/components/admin/ui';

type P = { id: number; code: string; type: string; value: number; minSubtotal: number; maxUses: number | null; startsAt: string; endsAt: string; active: boolean; description: string };

export default function PromoForm({ p }: { p: P | null }) {
  const [state, action] = useActionState(savePromo, null);
  const [type, setType] = useState(p?.type ?? 'percent');
  return (
    <form action={action} className="card">
      <div className="card-head"><h2>{p ? `Modifier ${p.code}` : 'Nouveau code promo'}</h2>{p && <Link className="link" href="/admin/promos">+ Nouveau</Link>}</div>
      <div className="card-body">
        <input type="hidden" name="id" value={p?.id ?? 0} />
        <div className="field"><label>Code</label><input name="code" defaultValue={p?.code} required placeholder="BIENVENUE10" style={{ textTransform: 'uppercase' }} /></div>
        <div className="cols-2">
          <div className="field"><label>Type</label><select name="type" value={type} onChange={(e) => setType(e.target.value)}><option value="percent">Pourcentage</option><option value="fixed">Montant fixe (DH)</option><option value="freeship">Livraison offerte</option></select></div>
          {type !== 'freeship' && <div className="field"><label>{type === 'percent' ? 'Réduction (%)' : 'Réduction (DH)'}</label><input name="value" type="number" step="0.01" defaultValue={p?.value ?? ''} required /></div>}
        </div>
        <div className="cols-2">
          <div className="field"><label>Panier minimum (DH)</label><input name="minSubtotal" type="number" step="0.01" defaultValue={p?.minSubtotal ?? 0} /></div>
          <div className="field"><label>Nombre max d’utilisations</label><input name="maxUses" type="number" defaultValue={p?.maxUses ?? ''} placeholder="illimité" /></div>
        </div>
        <div className="cols-2">
          <div className="field"><label>Début</label><input name="startsAt" type="date" defaultValue={p?.startsAt} /></div>
          <div className="field"><label>Fin</label><input name="endsAt" type="date" defaultValue={p?.endsAt} /></div>
        </div>
        <div className="field"><label>Note interne</label><input name="description" defaultValue={p?.description} placeholder="ex. influenceuse @…" /></div>
        <div className="field"><label className="switch"><input type="checkbox" name="active" defaultChecked={p?.active ?? true} /> Actif</label></div>
        <SaveBar state={state} label={p ? 'Enregistrer' : 'Créer le code'} />
      </div>
    </form>
  );
}
