import { notFound } from 'next/navigation';
import { db, parseJson } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import type { OrderLine } from '@/lib/orders';
import { fmtDate, money } from '@/lib/form';

export const metadata = { title: 'Bon de livraison' };

/** Printable delivery slip / invoice (outside the panel layout). */
export default async function PrintOrder({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const order = await db.order.findUnique({ where: { id: Number((await params).id) } });
  if (!order) notFound();
  const s = await getSettings();
  const lines = parseJson<OrderLine[]>(order.lines, []);
  return (
    <div style={{ maxWidth: 760, margin: '30px auto', padding: 30, background: '#fff', fontSize: 14, color: '#13262B' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 }}>
        <div>
          <img src={s.brand.logo || '/assets/images/92f1cf10_logo-bm-1.png'} alt="" style={{ height: 40 }} />
          <div style={{ marginTop: 8, color: '#555' }}>{s.brand.phone}<br />{s.brand.email}<br />{s.brand.address}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h1 style={{ fontSize: 22 }}>Bon de livraison</h1>
          <div>Commande <strong>#{order.number}</strong><br />{fmtDate(order.createdAt)}</div>
        </div>
      </div>
      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <strong>{order.firstName} {order.lastName}</strong><br />{order.address}<br />{order.city}<br />Tél : {order.phone}
        {order.notes && <><br /><em>Note : {order.notes}</em></>}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ borderBottom: '2px solid #13262B', textAlign: 'left' }}><th style={{ padding: 8 }}>Produit</th><th style={{ padding: 8 }}>Prix</th><th style={{ padding: 8 }}>Qté</th><th style={{ padding: 8, textAlign: 'right' }}>Total</th></tr></thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id} style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: 8 }}>{l.name}</td><td style={{ padding: 8 }}>{money(l.price)}</td><td style={{ padding: 8 }}>{l.qty}</td><td style={{ padding: 8, textAlign: 'right' }}>{money(l.total)}</td></tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 16, marginLeft: 'auto', width: 280, display: 'grid', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Sous-total</span><span>{money(order.subtotal)}</span></div>
        {order.discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Réduction</span><span>−{money(order.discount)}</span></div>}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Livraison</span><span>{order.shipping ? money(order.shipping) : 'Gratuite'}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 17, borderTop: '2px solid #13262B', paddingTop: 8 }}><span>À encaisser</span><span>{money(order.total)}</span></div>
      </div>
      <p style={{ marginTop: 40, color: '#777', textAlign: 'center' }}>Paiement à la livraison · Merci pour votre confiance !</p>
      <script dangerouslySetInnerHTML={{ __html: 'setTimeout(function(){window.print()},400)' }} />
    </div>
  );
}
