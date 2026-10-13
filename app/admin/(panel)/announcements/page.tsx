import Link from 'next/link';
import { db, parseJson } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { LOCALES } from '@/lib/locales';
import { PageTitle } from '@/components/admin/bits';
import { ConfirmButton } from '@/components/admin/ui';
import { fmtDay } from '@/lib/form';
import { deleteAnnouncement } from '../../actions/marketing';
import AnnouncementForm from './AnnouncementForm';

export const metadata = { title: 'Bandeaux & popups' };

export default async function AnnouncementsPage({ searchParams }: { searchParams: Promise<{ edit?: string; created?: string }> }) {
  const sp = await searchParams;
  const [items, s] = await Promise.all([db.announcement.findMany({ orderBy: [{ position: 'asc' }, { createdAt: 'desc' }] }), getSettings()]);
  const editing = sp.edit ? items.find((a) => a.id === Number(sp.edit)) : null;
  return (
    <>
      <PageTitle title="Bandeaux & popups" sub="Messages promotionnels en haut du site ou en fenêtre surgissante, programmables et ciblés par page." />
      {sp.created && <div className="alert ok">Annonce créée.</div>}
      <div className="grid-2">
        <div className="card">
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Aperçu</th><th>Type</th><th>Animation</th><th>Pages</th><th>Période</th><th>Statut</th><th className="actions-col" /></tr></thead>
              <tbody>
                {items.length === 0 && <tr><td colSpan={7} className="empty">Aucun bandeau ni popup.</td></tr>}
                {items.map((a) => (
                  <tr key={a.id}>
                    <td><Link href={`/admin/announcements?edit=${a.id}`} title="Modifier" style={{ display: 'block', textDecoration: 'none', background: a.bgColor, color: a.textColor, padding: '6px 10px', borderRadius: 6, fontSize: 12.5, fontWeight: 600, maxWidth: 280, outline: editing?.id === a.id ? '2px solid var(--a-primary)' : undefined }}>{a.image && '🖼 '}{a.text || '(image)'}</Link></td>
                    <td>{a.type === 'popup' ? 'Popup' : 'Bandeau'}</td>
                    <td className="muted">{a.type === 'popup' ? '—' : ({ none: 'Aucune', 'scroll-rtl': '← Défilement', 'scroll-ltr': 'Défilement →', 'slide-left': 'Entrée gauche', 'slide-right': 'Entrée droite', pulse: 'Pulsation' } as Record<string, string>)[a.animation] ?? a.animation}</td>
                    <td className="muted">{a.pages === '*' ? 'Toutes' : a.pages}</td>
                    <td className="muted" style={{ fontSize: 12.5 }}>{a.startsAt ? fmtDay(a.startsAt) : '—'} → {a.endsAt ? fmtDay(a.endsAt) : '∞'}</td>
                    <td>{a.active ? <span className="pill green">Actif</span> : <span className="pill gray">Inactif</span>}</td>
                    <td><div className="row-actions"><Link className="icon-btn icon-btn--edit" href={`/admin/announcements?edit=${a.id}`}>✎</Link><form action={deleteAnnouncement}><input type="hidden" name="id" value={a.id} /><ConfirmButton className="icon-btn icon-btn--delete" message="Supprimer ?">✕</ConfirmButton></form></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <AnnouncementForm key={editing?.id ?? 'new'}
          a={editing ? { ...editing, animation: editing.animation, speed: editing.speed, link: editing.link ?? '', image: editing.image ?? '', startsAt: editing.startsAt?.toISOString().slice(0, 16) ?? '', endsAt: editing.endsAt?.toISOString().slice(0, 16) ?? '', i18n: parseJson(editing.i18n, {}) } : null}
          locales={s.languages.enabled.filter((l) => l !== 'fr' && LOCALES[l]).map((l) => ({ code: l, name: LOCALES[l].name }))} />
      </div>
    </>
  );
}
