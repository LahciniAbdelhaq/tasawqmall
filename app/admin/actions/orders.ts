'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db, parseJson } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ORDER_STATUSES, type OrderLine } from '@/lib/orders';
import { bumpCatalog } from '@/lib/catalog';
import { fail, ok, str, type Result } from '@/lib/form';

const RESERVED = ['confirmed', 'shipped', 'delivered']; // statuses that hold stock

/** Status change with history; stock is taken on confirmation and given back on cancel/return. */
export async function setOrderStatus(_: Result, f: FormData): Promise<Result> {
  const admin = await requireAdmin();
  const id = Number(f.get('id'));
  // buttons post "status"; the dropdown posts "statusPick" (React appends the clicked button last)
  const status = str(f, 'status') || str(f, 'statusPick');
  if (!ORDER_STATUSES[status]) return fail('Statut inconnu.');
  const order = await db.order.findUnique({ where: { id } });
  if (!order) return fail('Commande introuvable.');
  if (order.status === status) return ok('Statut inchangé.');

  const wasReserved = RESERVED.includes(order.status), willReserve = RESERVED.includes(status);
  if (wasReserved !== willReserve) {
    const lines = parseJson<OrderLine[]>(order.lines, []);
    for (const l of lines) {
      const p = await db.product.findUnique({ where: { id: l.id }, select: { stockQty: true } });
      if (p?.stockQty == null) continue;
      const qty = Math.max(0, p.stockQty + (willReserve ? -l.qty : l.qty));
      await db.product.update({ where: { id: l.id }, data: { stockQty: qty, inStock: qty > 0 } });
    }
    await bumpCatalog();
  }
  const history = parseJson<object[]>(order.history, []);
  history.push({ at: new Date().toISOString(), status, by: admin.name, note: str(f, 'note') || undefined });
  await db.order.update({ where: { id }, data: { status, history: JSON.stringify(history) } });
  revalidatePath(`/admin/orders/${id}`);
  return ok(`Commande passée en « ${ORDER_STATUSES[status].label} ».`);
}

export async function saveOrderDetails(_: Result, f: FormData): Promise<Result> {
  await requireAdmin();
  const id = Number(f.get('id'));
  await db.order.update({
    where: { id },
    data: {
      adminNote: str(f, 'adminNote') || null,
      firstName: str(f, 'firstName'), lastName: str(f, 'lastName'), phone: str(f, 'phone'),
      city: str(f, 'city'), address: str(f, 'address'), email: str(f, 'email') || null,
    },
  });
  revalidatePath(`/admin/orders/${id}`);
  return ok();
}

export async function deleteOrder(f: FormData) {
  await requireAdmin();
  await db.order.delete({ where: { id: Number(f.get('id')) } });
  revalidatePath('/admin/orders');
  redirect('/admin/orders');
}

export async function saveCustomer(_: Result, f: FormData): Promise<Result> {
  await requireAdmin();
  const id = Number(f.get('id'));
  await db.customer.update({
    where: { id },
    data: {
      firstName: str(f, 'firstName'), lastName: str(f, 'lastName'), email: str(f, 'email') || null,
      city: str(f, 'city') || null, address: str(f, 'address') || null, note: str(f, 'note') || null,
      blocked: f.get('blocked') === 'on',
    },
  });
  revalidatePath(`/admin/customers/${id}`);
  return ok();
}
