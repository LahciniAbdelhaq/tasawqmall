import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { parseUa, sourceOf } from '@/lib/ua';
import { verifyAdminToken, ADMIN_COOKIE } from '@/lib/auth';

type Body = {
  type: 'view' | 'ping' | 'leave';
  sid: string; vid: string;
  path?: string; title?: string; ref?: string; lang?: string;
  utm?: { source?: string | null; medium?: string | null; campaign?: string | null };
  cart?: { items?: number; value?: number };
};
const ID = /^[a-z0-9]{8,40}$/;
const clip = (s: unknown, n: number) => (typeof s === 'string' ? s.slice(0, n) : null);

/** First-party analytics beacon: page views + heartbeats (live visitors). */
export async function POST(req: Request) {
  let b: Body;
  try {
    b = JSON.parse(await req.text());
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  if (!ID.test(b.sid || '') || !ID.test(b.vid || '')) return new NextResponse(null, { status: 204 });
  const ua = parseUa(req.headers.get('user-agent') || '');
  const jar = await cookies();
  if (ua.bot || (await verifyAdminToken(jar.get(ADMIN_COOKIE)?.value))) return new NextResponse(null, { status: 204 });

  const now = new Date();
  const path = clip(b.path, 300) || '/';
  const cart = { cartItems: Math.max(0, Math.floor(b.cart?.items || 0)), cartValue: Math.max(0, Number(b.cart?.value) || 0) };
  const res = new NextResponse(null, { status: 204 });

  if (b.type === 'leave') {
    await db.visit.updateMany({ where: { id: b.sid }, data: { lastSeen: new Date(now.getTime() - 60_000) } });
    return res;
  }
  const existing = await db.visit.findUnique({ where: { id: b.sid } });
  if (b.type === 'ping') {
    if (existing) await db.visit.update({ where: { id: b.sid }, data: { lastSeen: now, currentPath: path, ...cart } });
    return res;
  }
  if (!existing) {
    const campaignId = Number(jar.get('bm_cmp')?.value) || null;
    const campaign = campaignId ? await db.campaign.findUnique({ where: { id: campaignId } }) : null;
    const host = req.headers.get('host') || '';
    await db.visit.create({
      data: {
        id: b.sid, visitorId: b.vid, landing: path, currentPath: path, referrer: clip(b.ref, 300),
        source: campaign ? (campaign.utmSource || campaign.platform) : sourceOf(b.utm?.source, b.ref, host),
        medium: clip(b.utm?.medium, 40) || (campaign ? campaign.utmMedium || 'ads' : null),
        campaign: clip(b.utm?.campaign, 80) || campaign?.name || null,
        campaignId: campaign?.id ?? null,
        device: ua.device, browser: ua.browser, os: ua.os, lang: clip(b.lang, 5), ...cart,
        views: { create: { path, title: clip(b.title, 200) } },
      },
    });
  } else {
    await db.visit.update({
      where: { id: b.sid },
      data: { lastSeen: now, currentPath: path, pageviews: { increment: 1 }, ...cart, views: { create: { path, title: clip(b.title, 200) } } },
    });
  }
  return res;
}
