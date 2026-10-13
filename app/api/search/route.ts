import { NextResponse } from 'next/server';
import { loadCatalog, localize, searchProducts } from '@/lib/catalog';
import { getLocale } from '@/lib/i18n';
import { priceHtml } from '@/lib/render';

/** Live search suggestions for the header search box: GET /api/search?q=… */
export async function GET(req: Request) {
  await loadCatalog();
  const locale = await getLocale();
  const q = (new URL(req.url).searchParams.get('q') || '').slice(0, 80);
  const items = q.trim().length < 2 ? [] : searchProducts(q).slice(0, 20);
  return NextResponse.json(items.map((x) => localize(x, locale)).map((p) => ({
    slug: p.slug,
    name: p.name,
    image: p.images[0] ?? '',
    priceHtml: priceHtml(p),
    sku: p.sku,
  })));
}
