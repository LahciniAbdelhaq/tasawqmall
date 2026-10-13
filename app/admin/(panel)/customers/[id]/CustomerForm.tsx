'use client';
import { useActionState } from 'react';
import { saveCustomer } from '../../../actions/orders';
import { SaveBar } from '@/components/admin/ui';

type C = { id: number; firstName: string; lastName: string; phone: string; email: string; city: string; address: string; note: string; blocked: boolean };

export default function CustomerForm({ c }: { c: C }) {
  const [state, action] = useActionState(saveCustomer, null);
  return (
    <form action={action} className="card">
      <div className="card-head"><h2>Fiche</h2></div>
      <div className="card-body">
        <input type="hidden" name="id" value={c.id} />
        <div className="cols-2">
          <div className="field"><label>Prénom</label><input name="firstName" defaultValue={c.firstName} /></div>
          <div className="field"><label>Nom</label><input name="lastName" defaultValue={c.lastName} /></div>
        </div>
        <div className="field"><label>Téléphone</label><input value={c.phone} disabled /></div>
        <div className="field"><label>E-mail</label><input name="email" defaultValue={c.email} /></div>
        <div className="cols-2">
          <div className="field"><label>Ville</label><input name="city" defaultValue={c.city} /></div>
          <div className="field"><label>Adresse</label><input name="address" defaultValue={c.address} /></div>
        </div>
        <div className="field"><label>Note interne</label><textarea name="note" defaultValue={c.note} /></div>
        <div className="field"><label className="switch"><input type="checkbox" name="blocked" defaultChecked={c.blocked} /> Bloquer ce client (ses nouvelles commandes seront refusées)</label></div>
        <SaveBar state={state} />
      </div>
    </form>
  );
}
