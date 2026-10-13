import Link from 'next/link';
import Icon from '@/components/Icon';
import { ConfirmButton } from './ui';

/** Boutons de gestion d'une ligne (icônes seules) : Détails · Modifier · Supprimer. */
export default function RowActions({ id, view, edit, remove, confirm }: {
  id: number;
  view?: string; // page de détails du back-office
  edit?: string;
  remove?: (f: FormData) => Promise<void>;
  confirm?: string;
}) {
  return (
    <div className="row-actions">
      {view && (
        <Link className="icon-btn" href={view} title="Détails" aria-label="Détails"><Icon name="eye" size={17} /></Link>
      )}
      {edit && (
        <Link className="icon-btn icon-btn--edit" href={edit} title="Modifier" aria-label="Modifier"><Icon name="edit" size={17} /></Link>
      )}
      {remove && (
        <form action={remove}>
          <input type="hidden" name="id" value={id} />
          <ConfirmButton className="icon-btn icon-btn--delete" title="Supprimer" message={confirm || 'Supprimer définitivement cet élément ?'}>
            <Icon name="trash" size={17} />
          </ConfirmButton>
        </form>
      )}
    </div>
  );
}
