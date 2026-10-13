import 'server-only';
import crypto from 'node:crypto';
import { db, parseJson } from './db';
import { getProductById, loadCatalog } from './catalog';
import { shippingFor } from './shipping';
import { getSettings } from './settings';

export type OrderLine = { id: number; slug: string; name: string; image: string; price: number; qty: number; total: number };
export const ORDER_STATUSES: Record<string, { label: string; tone: 'amber' | 'green' | 'red' | 'gray' | 'blue' }> = {
  pending: { label: 'En attente', tone: 'amber' },
  confirmed: { label: 'Confirmée', tone: 'blue' },
  shipped: { label: 'Expédiée', tone: 'blue' },
  delivered: { label: 'Livrée', tone: 'green' },
  cancelled: { label: 'Annulée', tone: 'red' },
  returned: { label: 'Retournée', tone: 'gray' },
};

export class OrderError extends Error {}

const round = (n: number) => Math.round(n * 100) / 100;
const clean = (v: unknown, max = 200) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
export const normalizePhone = (p: string) => {
  const d = p.replace(/[^\d+]/g, '');
  return d.startsWith('+212') ? '0' + d.slice(4) : d.startsWith('212') ? '0' + d.slice(3) : d;
};

/** Validates a promo code against a subtotal; returns the discount it gives. */
export async function checkPromo(rawCode: string, subtotal: number) {
  const code = clean(rawCode, 40).toUpperCase();
  if (!code) throw new OrderError('Veuillez saisir un code promo.');
  const p = await db.promoCode.findUnique({ where: { code } });
  const now = new Date();
  if (!p || !p.active) throw new OrderError('Ce code promo n’existe pas.');
  if (p.startsAt && p.startsAt > now) throw new OrderError('Ce code promo n’est pas encore actif.');
  if (p.endsAt && p.endsAt < now) throw new OrderError('Ce code promo a expiré.');
  if (p.maxUses != null && p.uses >= p.maxUses) throw new OrderError('Ce code promo a atteint sa limite d’utilisation.');
  if (subtotal < p.minSubtotal) throw new OrderError(`Ce code est valable à partir de ${p.minSubtotal} DH d’achat.`);
  const discount = p.type === 'percent' ? round(subtotal * Math.min(100, p.value) / 100) : p.type === 'fixed' ? Math.min(subtotal, p.value) : 0;
  const label = p.type === 'percent' ? `−${p.value}% appliqué` : p.type === 'fixed' ? `−${p.value} DH appliqué` : 'Livraison offerte';
  return { promo: p, discount, label };
}

export async function createOrder(input: {
  customer: Record<string, unknown>;
  lines: { id: number; qty: number }[];
  promoCode?: string;
  locale?: string;
  visitorId?: string;
  campaignId?: number;
  sessionId?: string;
}) {
  await loadCatalog();
  const s = await getSettings();
  const c = input.customer || {};
  const customer = {
    firstName: clean(c.firstName, 80), lastName: clean(c.lastName, 80), phone: clean(c.phone, 30),
    email: clean(c.email, 120), city: clean(c.city, 80), address: clean(c.address, 300), notes: clean(c.notes, 1000),
  };
  if (!customer.firstName || !customer.lastName) throw new OrderError('Veuillez indiquer votre prénom et votre nom.');
  const phone = normalizePhone(customer.phone);
  if (!/^0[5-7]\d{8}$/.test(phone)) throw new OrderError('Veuillez indiquer un numéro de téléphone marocain valide.');
  if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) throw new OrderError("L'adresse e-mail n'est pas valide.");
  if (!customer.city || !customer.address) throw new OrderError('Veuillez indiquer votre ville et votre adresse de livraison.');

  const known = await db.customer.findUnique({ where: { phone } });
  if (known?.blocked) throw new OrderError('Commande impossible : merci de contacter le service client.');

  const lines: OrderLine[] = [];
  for (const l of (input.lines || []).slice(0, 100)) {
    const p = getProductById(Number(l.id));
    const qty = Math.floor(Number(l.qty));
    if (!p || !(qty > 0)) continue;
    if (!p.inStock) throw new OrderError(`« ${p.name} » n'est plus en stock.`);
    if (p.stockQty && qty > p.stockQty) throw new OrderError(`Il ne reste que ${p.stockQty} « ${p.name} » en stock.`);
    lines.push({ id: p.id, slug: p.slug, name: p.name, image: p.images[0] ?? '', price: p.price, qty, total: round(p.price * qty) });
  }
  if (!lines.length) throw new OrderError('Votre panier est vide.');

  const subtotal = round(lines.reduce((sum, l) => sum + l.total, 0));
  let discount = 0, promoCode: string | null = null, freeShip = false;
  if (input.promoCode) {
    const r = await checkPromo(input.promoCode, subtotal);
    discount = r.discount;
    promoCode = r.promo.code;
    freeShip = r.promo.type === 'freeship';
  }
  const shipping = freeShip ? 0 : shippingFor(s.shipping, customer.city, subtotal - discount).fee;

  // attribution: ad campaign (tracking link) or the visit's traffic source
  const visit = input.sessionId ? await db.visit.findUnique({ where: { id: input.sessionId } }) : null;
  const campaignId = input.campaignId || visit?.campaignId || null;

  const count = await db.order.count();
  const order = await db.$transaction(async (tx) => {
    const cust = await tx.customer.upsert({
      where: { phone },
      create: { phone, firstName: customer.firstName, lastName: customer.lastName, email: customer.email || null, city: customer.city, address: customer.address },
      update: { firstName: customer.firstName, lastName: customer.lastName, email: customer.email || undefined, city: customer.city, address: customer.address },
    });
    if (promoCode) await tx.promoCode.update({ where: { code: promoCode }, data: { uses: { increment: 1 } } });
    return tx.order.create({
      data: {
        number: String(100001 + count),
        key: crypto.randomBytes(16).toString('hex'),
        customerId: cust.id,
        firstName: customer.firstName, lastName: customer.lastName, phone, email: customer.email || null,
        city: customer.city, address: customer.address, notes: customer.notes || null,
        lines: JSON.stringify(lines), subtotal, discount, promoCode, shipping,
        total: round(Math.max(0, subtotal - discount) + shipping),
        locale: input.locale || 'fr', visitorId: input.visitorId || null, campaignId,
        source: visit?.source || null,
        history: JSON.stringify([{ at: new Date().toISOString(), status: 'pending', by: 'client' }]),
      },
    });
  });
  if (visit) await db.visit.update({ where: { id: visit.id }, data: { ordered: true, cartItems: 0, cartValue: 0 } }).catch(() => {});
  return order;
}

export async function getOrderForCustomer(number: string, key: string) {
  const o = await db.order.findUnique({ where: { number } });
  if (!o || !key || o.key.length !== key.length || !crypto.timingSafeEqual(Buffer.from(o.key), Buffer.from(key))) return null;
  return { ...o, lines: parseJson<OrderLine[]>(o.lines, []) };
}
