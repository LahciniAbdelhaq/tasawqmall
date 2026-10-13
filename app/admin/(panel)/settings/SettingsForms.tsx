'use client';
import { useActionState } from 'react';
import SettingsForm from '@/components/admin/SettingsForm';
import { SaveBar } from '@/components/admin/ui';
import { changePassword, saveAdminUser } from '../../actions/auth';

type Zone = { name: string; cities: string; fee: number; freeFrom: number };
type Shipping = { zones: Zone[]; otherFee: number; otherFreeFrom: number };

export function ShippingForm({ initial }: { initial: Shipping }) {
  return (
    <SettingsForm group="shipping" initial={initial as unknown as Record<string, unknown>} label="Enregistrer la livraison">
      {(raw, set) => {
        const v = raw as unknown as Shipping;
        const setZone = (i: number, patch: Partial<Zone>) => set({ zones: v.zones.map((z, k) => (k === i ? { ...z, ...patch } : z)) } as never);
        return (
          <div className="card">
            <div className="card-head"><h2>Tarifs de livraison</h2><button type="button" className="btn btn-secondary btn-sm" onClick={() => set({ zones: [...v.zones, { name: 'Nouvelle zone', cities: '', fee: 20, freeFrom: 300 }] } as never)}>+ Zone</button></div>
            <div className="card-body">
              <div className="block-list">
                {v.zones.map((z, i) => (
                  <div className="block-card" key={i}>
                    <div className="head"><input className="input" value={z.name} onChange={(e) => setZone(i, { name: e.target.value })} style={{ maxWidth: 260 }} /><span style={{ flex: 1 }} /><button type="button" className="btn btn-ghost btn-sm" onClick={() => set({ zones: v.zones.filter((_, k) => k !== i) } as never)}>✕</button></div>
                    <div className="body">
                      <div className="field"><label>Villes (séparées par des virgules)</label><input value={z.cities} onChange={(e) => setZone(i, { cities: e.target.value })} /></div>
                      <div className="cols-2">
                        <div className="field"><label>Frais (DH)</label><input type="number" value={z.fee} onChange={(e) => setZone(i, { fee: +e.target.value })} /></div>
                        <div className="field"><label>Gratuite dès (DH)</label><input type="number" value={z.freeFrom} onChange={(e) => setZone(i, { freeFrom: +e.target.value })} /></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="cols-2" style={{ marginTop: 14 }}>
                <div className="field"><label>Autres villes : frais (DH)</label><input type="number" value={v.otherFee} onChange={(e) => set({ otherFee: +e.target.value } as never)} /></div>
                <div className="field"><label>Autres villes : gratuite dès (DH)</label><input type="number" value={v.otherFreeFrom} onChange={(e) => set({ otherFreeFrom: +e.target.value } as never)} /></div>
              </div>
            </div>
          </div>
        );
      }}
    </SettingsForm>
  );
}

type Messages = { confirmMessage: string; shippedMessage: string };
export function OrderMessagesForm({ initial }: { initial: Messages }) {
  return (
    <SettingsForm group="orders" initial={initial as unknown as Record<string, unknown>} label="Enregistrer les messages">
      {(raw, set) => {
        const v = raw as unknown as Messages;
        return (
          <div className="card">
            <div className="card-head"><h2>Messages WhatsApp aux clients</h2></div>
            <div className="card-body">
              <div className="field"><label>Confirmation de commande</label><textarea value={v.confirmMessage} onChange={(e) => set({ confirmMessage: e.target.value } as never)} /></div>
              <div className="field"><label>Commande expédiée</label><textarea value={v.shippedMessage} onChange={(e) => set({ shippedMessage: e.target.value } as never)} /></div>
              <span className="help">Variables : {'{name} {number} {total} {address} {city}'}</span>
            </div>
          </div>
        );
      }}
    </SettingsForm>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, null);
  return (
    <form action={action} className="card">
      <div className="card-head"><h2>Mon mot de passe</h2></div>
      <div className="card-body">
        <div className="field"><label>Mot de passe actuel</label><input name="current" type="password" required autoComplete="current-password" /></div>
        <div className="cols-2">
          <div className="field"><label>Nouveau</label><input name="next" type="password" required minLength={8} autoComplete="new-password" /></div>
          <div className="field"><label>Confirmer</label><input name="confirm" type="password" required minLength={8} autoComplete="new-password" /></div>
        </div>
        <SaveBar state={state} label="Changer le mot de passe" />
      </div>
    </form>
  );
}

export function NewAdminForm() {
  const [state, action] = useActionState(saveAdminUser, null);
  return (
    <form action={action} className="card">
      <div className="card-head"><h2>Ajouter un compte</h2></div>
      <div className="card-body">
        <div className="cols-2">
          <div className="field"><label>Nom</label><input name="name" required /></div>
          <div className="field"><label>E-mail</label><input name="email" type="email" required /></div>
        </div>
        <div className="cols-2">
          <div className="field"><label>Mot de passe</label><input name="password" type="password" required minLength={8} autoComplete="new-password" /></div>
          <div className="field"><label>Rôle</label><select name="role" defaultValue="editor"><option value="editor">Éditeur (sans pixels ni injection de code)</option><option value="admin">Administrateur</option></select></div>
        </div>
        <SaveBar state={state} label="Créer le compte" />
      </div>
    </form>
  );
}
