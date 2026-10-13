import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseUa } from '@/lib/ua';

/**
 * Campaign tracking link: /l/<code>. Counts the click, remembers the campaign for 30 days
 * (orders are attributed to it) and redirects to the destination with UTM parameters.
 */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const url = new URL(req.url);
  const c = await db.campaign.findUnique({ where: { code } });
  if (!c) return NextResponse.redirect(new URL('/', url));

  const now = new Date();
  const live = c.active && (!c.startsAt || c.startsAt <= now) && (!c.endsAt || c.endsAt >= now);
  const dest = new URL(c.destination || '/', url);
  if (dest.origin === url.origin) {
    dest.searchParams.set('utm_source', c.utmSource || c.platform);
    dest.searchParams.set('utm_medium', c.utmMedium || 'ads');
    dest.searchParams.set('utm_campaign', c.utmCampaign || c.code);
  }
  const res = NextResponse.redirect(dest);
  if (!live) return res;

  const ua = parseUa(req.headers.get('user-agent') || '');
  if (!ua.bot) {
    const vid = req.headers.get('cookie')?.match(/(?:^|; )bm_vid=([^;]+)/)?.[1] ?? null;
    await db.click.create({ data: { campaignId: c.id, visitorId: vid, referrer: req.headers.get('referer')?.slice(0, 300) ?? null, device: ua.device } });
    res.cookies.set('bm_cmp', String(c.id), { path: '/', maxAge: 30 * 86400, sameSite: 'lax' });
  }
  return res;
}
