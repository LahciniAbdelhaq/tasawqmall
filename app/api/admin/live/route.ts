import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdmin } from '@/lib/auth';

/** Visitors active in the last 60 s + today's counters (polled by the live page). */
export async function GET() {
  if (!(await getAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const since = new Date(Date.now() - 60_000);
  const today = new Date(new Date().toDateString());
  const [live, todayVisits, todayOrders, recentViews] = await Promise.all([
    db.visit.findMany({ where: { lastSeen: { gte: since } }, orderBy: { lastSeen: 'desc' }, take: 200 }),
    db.visit.count({ where: { startedAt: { gte: today } } }),
    db.order.count({ where: { createdAt: { gte: today } } }),
    db.pageView.findMany({ where: { at: { gte: new Date(Date.now() - 30 * 60_000) } }, orderBy: { at: 'desc' }, take: 25, include: { visit: { select: { device: true, source: true } } } }),
  ]);
  return NextResponse.json({
    now: Date.now(),
    live: live.map((v) => ({
      id: v.id, path: v.currentPath, landing: v.landing, source: v.source, campaign: v.campaign, device: v.device, browser: v.browser,
      os: v.os, lang: v.lang, pageviews: v.pageviews, cartItems: v.cartItems, cartValue: v.cartValue, ordered: v.ordered,
      startedAt: v.startedAt, lastSeen: v.lastSeen,
    })),
    todayVisits,
    todayOrders,
    feed: recentViews.map((p) => ({ id: p.id, path: p.path, at: p.at, device: p.visit.device, source: p.visit.source })),
  });
}
