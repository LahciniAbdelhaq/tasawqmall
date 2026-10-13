import { db } from '@/lib/db';
import { getAdmin } from '@/lib/auth';

const csv = (rows: (string | number | null | undefined)[][]) =>
  '﻿' + rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');

/** CSV exports for spreadsheets: /api/admin/export/customers | orders */
export async function GET(_req: Request, { params }: { params: Promise<{ kind: string }> }) {
  if (!(await getAdmin())) return new Response('Non autorisé', { status: 401 });
  const { kind } = await params;
  let body = '';
  if (kind === 'customers') {
    const list = await db.customer.findMany({ include: { orders: { select: { total: true } } }, orderBy: { createdAt: 'desc' } });
    body = csv([['Prénom', 'Nom', 'Téléphone', 'E-mail', 'Ville', 'Adresse', 'Commandes', 'Total', 'Créé le'],
      ...list.map((c) => [c.firstName, c.lastName, c.phone, c.email, c.city, c.address, c.orders.length, c.orders.reduce((s, o) => s + o.total, 0).toFixed(2), c.createdAt.toISOString()])]);
  } else if (kind === 'orders') {
    const list = await db.order.findMany({ orderBy: { createdAt: 'desc' } });
    body = csv([['N°', 'Date', 'Statut', 'Prénom', 'Nom', 'Téléphone', 'Ville', 'Adresse', 'Sous-total', 'Réduction', 'Code promo', 'Livraison', 'Total', 'Source'],
      ...list.map((o) => [o.number, o.createdAt.toISOString(), o.status, o.firstName, o.lastName, o.phone, o.city, o.address, o.subtotal, o.discount, o.promoCode, o.shipping, o.total, o.source])]);
  } else return new Response('Inconnu', { status: 404 });
  return new Response(body, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${kind}-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
