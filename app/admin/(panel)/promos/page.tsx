import Link from 'next/link';
import { db } from '@/lib/db';
import { PageTitle } from '@/components/admin/bits';
import { ConfirmButton } from '@/components/admin/ui';
import { fmtDay } from '@/lib/form';
import { deletePromo } from '../../actions/marketing';
import PromoForm from './PromoForm';

export const metadata = { title: 'Codes promo' };

const label = (p: { type: string; value: number }) => (p.type === 'percent' ? `−${p.value} %` : p.type === 'fixed' ? `−${p.value} DH` : 'Livraison offerte');

export default async function PromosPage({ searchParams }: { searchParams: Promise<{ edit?: string; created?: string }> }) {
  const sp = await searchParams;
  const [promos, revenue] = await Promise.all([
    db.promoCode.findMany({ orderBy: { createdAt: 'desc' } }),
    db.order.groupBy({ by: ['promoCode'], where: { promoCode: { not: null } }, _sum: { total: true, discount: true } }),
  ]);
  const editing = sp.edit ? promos.find((p) => p.id === Number(sp.edit)) : null;
  const now = new Date();
  return (
    <>
      <PageTitle title="Codes promo" sub="Réductions en pourcentage, montant fixe ou livraison offerte, avec conditions et limites." />
      {sp.created && <div className="alert ok">Code promo créé.</div>}
      <div className="grid-2">
        <div className="card">
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Code</th><th>Avantage</th><th>Conditions</th><th className="num">Utilisations</th><th className="num">CA généré</th><th>Statut</th><th className="actions-col" /></tr></thead>
              <tbody>
                {promos.length === 0 && <tr><td colSpan={7} className="empty">Aucun code promo.</td></tr>}
                {promos.map((p) => {
                  const r = revenue.find((x) => x.promoCode === p.code);
                  const expired = (p.endsAt && p.endsAt < now) || (p.maxUses != null && p.uses >= p.maxUses);
                  return (
                    <tr key={p.id}>
                      <td><Link className="row-link" href={`/admin/promos?edit=${p.id}`}><code>{p.code}</code></Link>{p.description && <div className="muted" style={{ fontSize: 12 }}>{p.description}</div>}</td>
                      <td>{label(p)}</td>
                      <td className="muted" style={{ fontSize: 12.5 }}>{p.minSubtotal ? `dès ${p.minSubtotal} DH` : 'sans minimum'}{p.endsAt && <div>jusqu’au {fmtDay(p.endsAt)}</div>}</td>
                      <td className="num">{p.uses}{p.maxUses != null && ` / ${p.maxUses}`}</td>
                      <td className="num">{r?._sum.total ? `${Math.round(r._sum.total)} DH` : '—'}</td>
                      <td>{!p.active ? <span className="pill gray">Désactivé</span> : expired ? <span className="pill red">Expiré</span> : <span className="pill green">Actif</span>}</td>
                      <td>
                        <div className="row-actions">
                          <Link className="icon-btn icon-btn--edit" href={`/admin/promos?edit=${p.id}`}>✎</Link>
                          <form action={deletePromo}><input type="hidden" name="id" value={p.id} /><ConfirmButton className="icon-btn icon-btn--delete" message={`Supprimer le code ${p.code} ?`}>✕</ConfirmButton></form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <PromoForm key={editing?.id ?? 'new'} p={editing ? { ...editing, startsAt: editing.startsAt?.toISOString().slice(0, 10) ?? '', endsAt: editing.endsAt?.toISOString().slice(0, 10) ?? '', description: editing.description ?? '' } : null} />
      </div>
    </>
  );
}
