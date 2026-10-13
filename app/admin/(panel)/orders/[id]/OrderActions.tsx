'use client';
import { useActionState, useRef } from 'react';
import { saveOrderDetails, setOrderStatus } from '../../../actions/orders';
import { SaveBar } from '@/components/admin/ui';

type O = { id: number; status: string; adminNote: string; firstName: string; lastName: string; phone: string; email: string; city: string; address: string };

const FLOW: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'returned'],
  delivered: ['returned'],
  cancelled: ['pending'],
  returned: ['pending'],
};
const BTN: Record<string, string> = { confirmed: 'Confirmer la commande', shipped: 'Marquer expédiée', delivered: 'Marquer livrée', cancelled: 'Annuler', returned: 'Retour', pending: 'Remettre en attente' };

export default function OrderActions({ order, statuses, shippedLink }: { order: O; statuses: { key: string; label: string }[]; shippedLink: string }) {
  const [st, statusAction, pending] = useActionState(setOrderStatus, null);
  const [saved, saveAction] = useActionState(saveOrderDetails, null);
  // the clicked button's status travels in a hidden field (submitter values aren't forwarded)
  const chosen = useRef<HTMLInputElement>(null);
  return (
    <>
      <div className="card">
        <div className="card-head"><h2>Traitement</h2></div>
        <div className="card-body">
          {st && <div className={`alert ${st.ok ? 'ok' : 'err'}`}>{st.message}</div>}
          <form action={statusAction} style={{ display: 'grid', gap: 12 }}>
            <input type="hidden" name="id" value={order.id} />
            <input type="hidden" name="status" ref={chosen} defaultValue="" />
            <div className="field"><label>Note (facultatif, visible dans l’historique)</label><input name="note" placeholder="ex. confirmé par téléphone, livraison demain" /></div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(FLOW[order.status] ?? []).map((s) => (
                <button key={s} type="submit" onClick={() => { if (chosen.current) chosen.current.value = s; }} className={`btn ${s === 'cancelled' || s === 'returned' ? 'btn-danger' : ''}`} disabled={pending}>{BTN[s]}</button>
              ))}
              <select name="statusPick" defaultValue="" className="input" style={{ maxWidth: 200 }} onChange={(e) => { if (!e.target.value) return; if (chosen.current) chosen.current.value = ''; e.target.form?.requestSubmit(); }}>
                <option value="">Autre statut…</option>
                {statuses.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            {order.status === 'shipped' && <a className="link" href={shippedLink} target="_blank" rel="noreferrer">Prévenir le client de l’expédition sur WhatsApp →</a>}
          </form>
        </div>
      </div>
      <form action={saveAction} className="card">
        <div className="card-head"><h2>Livraison & notes internes</h2></div>
        <div className="card-body">
          <input type="hidden" name="id" value={order.id} />
          <div className="cols-2">
            <div className="field"><label>Prénom</label><input name="firstName" defaultValue={order.firstName} /></div>
            <div className="field"><label>Nom</label><input name="lastName" defaultValue={order.lastName} /></div>
          </div>
          <div className="cols-2">
            <div className="field"><label>Téléphone</label><input name="phone" defaultValue={order.phone} /></div>
            <div className="field"><label>E-mail</label><input name="email" defaultValue={order.email} /></div>
          </div>
          <div className="cols-2">
            <div className="field"><label>Ville</label><input name="city" defaultValue={order.city} /></div>
            <div className="field"><label>Adresse</label><input name="address" defaultValue={order.address} /></div>
          </div>
          <div className="field"><label>Note interne</label><textarea name="adminNote" defaultValue={order.adminNote} placeholder="Visible uniquement dans le back-office" /></div>
        </div>
        <div style={{ padding: '0 20px 20px' }}><SaveBar state={saved} /></div>
      </form>
    </>
  );
}
