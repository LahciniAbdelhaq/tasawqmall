import { NextResponse } from 'next/server';
import { getProductById, loadCatalog } from '@/lib/catalog';
import { getI18n } from '@/lib/i18n';
import { cardHtml } from '@/lib/render';

/** Theme product cards for a list of ids (wishlist page): GET /api/cards?ids=1,2 */
export async function GET(req: Request) {
  await loadCatalog();
  const tr = await getI18n();
  const ids = (new URL(req.url).searchParams.get('ids') || '')
    .split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 200);
  const cards = ids.map(getProductById).filter((p) => !!p).map((p, i) => ({ id: p.id, html: cardHtml(p, i + 1, tr) }));
  return NextResponse.json(cards);
}
