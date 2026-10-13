import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { OrderError, createOrder } from '@/lib/orders';

/** Places a cash-on-delivery order. Prices, promo and shipping are always recomputed here. */
export async function POST(req: Request) {
  let body: { customer?: Record<string, unknown>; lines?: { id: number; qty: number }[]; promoCode?: string; locale?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }
  const jar = await cookies();
  const sid = (jar.get('bm_sid')?.value || '').split('|')[0] || undefined;
  try {
    const order = await createOrder({
      customer: body.customer ?? {},
      lines: body.lines ?? [],
      promoCode: body.promoCode,
      locale: body.locale,
      visitorId: jar.get('bm_vid')?.value,
      campaignId: Number(jar.get('bm_cmp')?.value) || undefined,
      sessionId: sid,
    });
    return NextResponse.json({ id: order.number, key: order.key, total: order.total });
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ error: e.message }, { status: 422 });
    console.error(e);
    return NextResponse.json({ error: "La commande n'a pas pu être enregistrée. Veuillez réessayer." }, { status: 500 });
  }
}
