import { NextResponse } from 'next/server';
import { OrderError, checkPromo } from '@/lib/orders';

/** GET /api/promo?code=XXX&subtotal=123 — checks a promo code at checkout. */
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams;
  try {
    const { promo, discount, label } = await checkPromo(u.get('code') || '', Number(u.get('subtotal')) || 0);
    return NextResponse.json({ code: promo.code, type: promo.type, value: promo.value, minSubtotal: promo.minSubtotal, discount, label });
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ error: e.message }, { status: 422 });
    throw e;
  }
}
