import { NextResponse } from 'next/server';
import { getProductById, loadCatalog, localize } from '@/lib/catalog';
import { getLocale } from '@/lib/i18n';

/** Minimal product snapshots for the cart: GET /api/products?ids=1,2,3 */
export async function GET(req: Request) {
  await loadCatalog();
  const locale = await getLocale();
  const ids = (new URL(req.url).searchParams.get('ids') || '')
    .split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 100);
  const out = ids.map(getProductById).filter((p) => !!p).map((x) => localize(x, locale)).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    regularPrice: p.regularPrice,
    image: p.images[0] ?? '',
    stockQty: p.stockQty,
    inStock: p.inStock,
  }));
  return NextResponse.json(out);
}
