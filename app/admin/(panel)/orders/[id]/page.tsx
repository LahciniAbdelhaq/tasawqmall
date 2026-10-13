import Link from 'next/link';
import { notFound } from 'next/navigation';
import Icon from '@/components/Icon';
import { db, parseJson } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { ORDER_STATUSES, type OrderLine } from '@/lib/orders';
import { PageTitle, StatusPill } from '@/components/admin/bits';
import { fmtDate, money } from '@/lib/form';
import { deleteOrder } from '../../../actions/orders';
import { ConfirmButton } from '@/components/admin/ui';
import OrderActions from './OrderActions';

export const metadata = { title: 'Commande' };

const fill = (tpl: string, vars: Record<string, string>) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const [order, s] = await Promise.all([db.order.findUnique({ where: { id }, include: { customer: true } }), getSettings()]);
  if (!order) notFound();
  const lines = parseJson<OrderLine[]>(order.lines, []);
  const history = parseJson<{ at: string; status: string; by: string; note?: string }[]>(order.history, []);
  const campaign = order.campaignId ? await db.campaign.findUnique({ where: { id: order.campaignId } }) : null;
  const pastOrders = order.customerId ? await db.order.count({ where: { customerId: order.customerId } }) : 1;
  const vars = { name: order.firstName, number: order.number, total: order.total.toFixed(2), address: order.address, city: order.city };
  const intl = order.phone.replace(/^0/, '212');
  const wa = (msg: string) => `https://wa.me/${intl}?text=${encodeURIComponent(fill(msg, vars))}`;

  return (
    <>
      <Link className="back-link" href="/admin/orders">← Commandes</Link>
      <PageTitle title={`Commande #${order.number}`} sub={<>Passée le {fmtDate(order.createdAt)} · <StatusPill status={order.status} /></>}>
        <a className="btn btn-secondary btn-sm" href={`tel:${order.phone}`}><Icon name="phone" /> Appeler</a>
        <a className="btn btn-sm" style={{ background: '#25D366' }} href={wa(s.orders.confirmMessage)} target="_blank" rel="noreferrer"><Icon name="whatsapp" /> Confirmer sur WhatsApp</a>
        <a className="btn btn-secondary btn-sm no-print" href={`/admin/orders/${id}/print`} target="_blank"><Icon name="print" /> Imprimer</a>
      </PageTitle>
      <div className="grid-2">
        <div>
          <div className="card">
            <div className="card-head"><h2>Articles</h2><span className="muted">{lines.length} produit(s)</span></div>
            <div className="card-body">
              {lines.map((l) => (
                <div className="order-line" key={l.id}>
                  {l.image ? <img src={l.image} alt="" /> : <span />}
                  <div><Link className="row-link" href={`/admin/products/${l.id}`}>{l.name}</Link><div className="muted">{money(l.price)} × {l.qty}</div></div>
                  <span className="muted">×{l.qty}</span>
                  <strong>{money(l.total)}</strong>
                </div>
              ))}
              <div className="totals">
                <div><span>Sous-total</span><span>{money(order.subtotal)}</span></div>
                {order.discount > 0 && <div><span>Réduction ({order.promoCode})</span><span>−{money(order.discount)}</span></div>}
                <div><span>Livraison</span><span>{order.shipping ? money(order.shipping) : 'Gratuite'}</span></div>
                <div className="grand"><span>Total à encaisser</span><span>{money(order.total)}</span></div>
              </div>
            </div>
          </div>
          <OrderActions order={{ id: order.id, status: order.status, adminNote: order.adminNote ?? '', firstName: order.firstName, lastName: order.lastName, phone: order.phone, email: order.email ?? '', city: order.city, address: order.address }}
            statuses={Object.entries(ORDER_STATUSES).map(([k, v]) => ({ key: k, label: v.label }))}
            shippedLink={wa(s.orders.shippedMessage)} />
        </div>
        <div>
          <div className="card">
            <div className="card-head"><h2>Client</h2>{order.customerId && <Link className="link" href={`/admin/customers/${order.customerId}`}>Fiche client</Link>}</div>
            <div className="card-body">
              <dl className="kv">
                <dt>Nom</dt><dd>{order.firstName} {order.lastName}</dd>
                <dt>Téléphone</dt><dd><a href={`tel:${order.phone}`}>{order.phone}</a></dd>
                {order.email && <><dt>E-mail</dt><dd>{order.email}</dd></>}
                <dt>Adresse</dt><dd>{order.address}<br />{order.city}</dd>
                {order.notes && <><dt>Note client</dt><dd>{order.notes}</dd></>}
                <dt>Commandes</dt><dd>{pastOrders} au total{order.customer?.blocked && <span className="pill red" style={{ marginLeft: 8 }}>Bloqué</span>}</dd>
              </dl>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h2>Origine</h2></div>
            <div className="card-body">
              <dl className="kv">
                <dt>Source</dt><dd>{order.source || 'inconnue'}</dd>
                {campaign && <><dt>Annonce</dt><dd><Link className="link" href={`/admin/ads/${campaign.id}`}>{campaign.name}</Link></dd></>}
                <dt>Langue</dt><dd>{order.locale.toUpperCase()}</dd>
              </dl>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h2>Historique</h2></div>
            <div className="card-body" style={{ display: 'grid', gap: 10 }}>
              {history.slice().reverse().map((h, i) => (
                <div key={i} style={{ fontSize: 13 }}>
                  <StatusPill status={h.status} /> <span className="muted">{fmtDate(h.at)} · {h.by}</span>
                  {h.note && <div style={{ marginTop: 4 }}>{h.note}</div>}
                </div>
              ))}
            </div>
          </div>
          <form action={deleteOrder} className="no-print" style={{ marginTop: 16 }}>
            <input type="hidden" name="id" value={order.id} />
            <ConfirmButton message="Supprimer définitivement cette commande ?"><Icon name="trash" /> Supprimer la commande</ConfirmButton>
          </form>
        </div>
      </div>
    </>
  );
}
