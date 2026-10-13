import Link from 'next/link';
import { db } from '@/lib/db';
import { PageTitle } from '@/components/admin/bits';
import { fmtDay } from '@/lib/form';
import NewPageForm from './NewPageForm';

export const metadata = { title: 'Pages' };

export default async function PagesPage() {
  const [pages, edits] = await Promise.all([
    db.page.findMany({ orderBy: [{ kind: 'asc' }, { title: 'asc' }] }),
    db.contentOverride.groupBy({ by: ['fragment'], _count: { _all: true } }),
  ]);
  const editCount = (slug: string) => edits.find((e) => e.fragment === (slug || 'home'))?._count._all ?? 0;
  return (
    <>
      <PageTitle title="Pages" sub="Pages d’origine du site (modifiables dans l’éditeur visuel) et pages créées ici avec des blocs." />
      <div className="grid-2">
        <div className="card">
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Page</th><th>Type</th><th>Statut</th><th>SEO</th><th>Mis à jour</th><th className="actions-col" /></tr></thead>
              <tbody>
                {pages.map((p) => (
                  <tr key={p.id}>
                    <td><Link className="row-link" href={`/admin/pages/${p.id}`}>{p.slug === '' ? 'Accueil' : p.title}</Link><div className="muted" style={{ fontSize: 12 }}>/{p.slug}</div></td>
                    <td>{p.kind === 'builtin' ? <span className="pill plain gray">Origine{editCount(p.slug) ? ` · ${editCount(p.slug)} modif.` : ''}</span> : <span className="pill plain blue">Blocs</span>}</td>
                    <td>{p.published ? <span className="pill green">En ligne</span> : <span className="pill gray">Brouillon</span>}</td>
                    <td>{p.seoTitle || p.seoDescription ? <span className="pill green">OK</span> : <span className="pill amber">À compléter</span>}</td>
                    <td className="muted">{fmtDay(p.updatedAt)}</td>
                    <td>
                      <div className="row-actions">
                        <a className="icon-btn" href={`/${p.slug}`} target="_blank" rel="noreferrer" title="Voir">↗</a>
                        {p.kind === 'builtin' && <Link className="icon-btn" href={`/admin/editor?path=/${p.slug}`} title="Éditeur visuel">✐</Link>}
                        <Link className="icon-btn icon-btn--edit" href={`/admin/pages/${p.id}`} title="Modifier">✎</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h2>Créer une page</h2></div>
          <div className="card-body"><NewPageForm /></div>
        </div>
      </div>
    </>
  );
}
