'use client';
import { useActionState } from 'react';
import { createPage } from '../../actions/content';

export default function NewPageForm() {
  const [state, action, pending] = useActionState(createPage, null);
  return (
    <form action={action}>
      {state && !state.ok && <div className="alert err">{state.message}</div>}
      <div className="field"><label>Titre</label><input name="title" required placeholder="ex. Soldes d’été" /></div>
      <div className="field"><label>Adresse (facultatif)</label><input name="slug" placeholder="soldes-ete" /></div>
      <div className="field">
        <label>Modèle</label>
        <select name="template" defaultValue="landing">
          <option value="landing">Page promotionnelle (bannière + produits + FAQ)</option>
          <option value="blank">Page vide (texte)</option>
        </select>
      </div>
      <button className="btn" style={{ marginTop: 14 }} disabled={pending}>{pending ? 'Création…' : 'Créer la page'}</button>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>La page est créée en brouillon : publiez-la quand elle est prête, puis ajoutez-la au menu.</p>
    </form>
  );
}
