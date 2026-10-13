import 'server-only';
import { db, parseJson } from './db';
import type { OrderLine } from './orders';

const DAY = 86400_000;
export const COUNTED = ['pending', 'confirmed', 'shipped', 'delivered']; // revenue excludes cancelled/returned

export function range(days: number) {
  const to = new Date();
  const from = new Date(new Date(to.getTime() - (days - 1) * DAY).toDateString());
  return { from, to, days };
}
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export async function overview(days: number) {
  const { from, to } = range(days);
  const prevFrom = new Date(from.getTime() - days * DAY);
  const [orders, prevOrders, visits, prevVisits, live, pending] = await Promise.all([
    db.order.findMany({ where: { createdAt: { gte: from } }, orderBy: { createdAt: 'asc' } }),
    db.order.findMany({ where: { createdAt: { gte: prevFrom, lt: from } }, select: { total: true, status: true } }),
    db.visit.findMany({ where: { startedAt: { gte: from } }, select: { startedAt: true, visitorId: true, ordered: true, source: true, device: true, browser: true, os: true, campaignId: true, pageviews: true, landing: true } }),
    db.visit.count({ where: { startedAt: { gte: prevFrom, lt: from } } }),
    db.visit.count({ where: { lastSeen: { gte: new Date(Date.now() - 60_000) } } }),
    db.order.count({ where: { status: 'pending' } }),
  ]);
  const counted = orders.filter((o) => COUNTED.includes(o.status));
  const revenue = counted.reduce((s, o) => s + o.total, 0);
  const prevRevenue = prevOrders.filter((o) => COUNTED.includes(o.status)).reduce((s, o) => s + o.total, 0);
  const prevCount = prevOrders.filter((o) => COUNTED.includes(o.status)).length;

  // daily series
  const series = new Map<string, { day: string; label: string; revenue: number; orders: number; visits: number; visitors: Set<string> }>();
  for (let t = from.getTime(); t <= to.getTime(); t += DAY) {
    const d = new Date(t);
    series.set(dayKey(d), { day: dayKey(d), label: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }), revenue: 0, orders: 0, visits: 0, visitors: new Set() });
  }
  for (const o of counted) { const s = series.get(dayKey(o.createdAt)); if (s) { s.revenue += o.total; s.orders++; } }
  for (const v of visits) { const s = series.get(dayKey(v.startedAt)); if (s) { s.visits++; s.visitors.add(v.visitorId); } }

  // products & categories sold
  const prod = new Map<number, { id: number; name: string; slug: string; image: string; qty: number; revenue: number }>();
  for (const o of counted) {
    for (const l of parseJson<OrderLine[]>(o.lines, [])) {
      const p = prod.get(l.id) ?? { id: l.id, name: l.name, slug: l.slug, image: l.image, qty: 0, revenue: 0 };
      p.qty += l.qty; p.revenue += l.total;
      prod.set(l.id, p);
    }
  }
  const tally = <T extends string | null | undefined>(rows: T[]) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r || 'inconnu', (m.get(r || 'inconnu') ?? 0) + 1);
    return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  };
  const citySales = new Map<string, { name: string; orders: number; revenue: number }>();
  for (const o of counted) {
    const k = o.city.trim().toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
    const c = citySales.get(k) ?? { name: k, orders: 0, revenue: 0 };
    c.orders++; c.revenue += o.total;
    citySales.set(k, c);
  }
  const sourceRows = tally(visits.map((v) => v.source));
  const sourceOrders = new Map<string, number>();
  for (const v of visits) if (v.ordered) sourceOrders.set(v.source || 'inconnu', (sourceOrders.get(v.source || 'inconnu') ?? 0) + 1);

  return {
    days,
    kpi: {
      revenue, prevRevenue,
      orders: counted.length, prevOrders: prevCount,
      aov: counted.length ? revenue / counted.length : 0,
      visits: visits.length, prevVisits,
      visitors: new Set(visits.map((v) => v.visitorId)).size,
      conversion: visits.length ? (visits.filter((v) => v.ordered).length / visits.length) * 100 : 0,
      pageviews: visits.reduce((s, v) => s + v.pageviews, 0),
      bounce: visits.length ? (visits.filter((v) => v.pageviews <= 1).length / visits.length) * 100 : 0,
      cancelled: orders.filter((o) => o.status === 'cancelled').length,
      live, pending,
    },
    series: [...series.values()].map((s) => ({ ...s, visitors: s.visitors.size, revenue: Math.round(s.revenue * 100) / 100 })),
    topProducts: [...prod.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    cities: [...citySales.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    sources: sourceRows.slice(0, 12).map((s) => ({ ...s, orders: sourceOrders.get(s.name) ?? 0 })),
    devices: tally(visits.map((v) => v.device)),
    browsers: tally(visits.map((v) => v.browser)).slice(0, 6),
    os: tally(visits.map((v) => v.os)).slice(0, 6),
    landings: tally(visits.map((v) => v.landing.split('?')[0])).slice(0, 10),
    statuses: tally(orders.map((o) => o.status)),
  };
}

export async function topPages(days: number) {
  const { from } = range(days);
  const rows = await db.pageView.groupBy({ by: ['path'], where: { at: { gte: from } }, _count: { path: true }, orderBy: { _count: { path: 'desc' } }, take: 15 });
  return rows.map((r) => ({ name: r.path.split('?')[0], count: r._count.path }));
}

/** Per-campaign funnel: clicks → visits → orders → revenue, cost per order, ROAS. */
export async function campaignStats(days?: number) {
  const since = days ? range(days).from : new Date(0);
  const campaigns = await db.campaign.findMany({ orderBy: { createdAt: 'desc' } });
  const [clicks, visits, orders] = await Promise.all([
    db.click.groupBy({ by: ['campaignId'], where: { at: { gte: since } }, _count: { _all: true } }),
    db.visit.groupBy({ by: ['campaignId'], where: { startedAt: { gte: since }, campaignId: { not: null } }, _count: { _all: true } }),
    db.order.findMany({ where: { createdAt: { gte: since }, campaignId: { not: null }, status: { in: COUNTED } }, select: { campaignId: true, total: true } }),
  ]);
  return campaigns.map((c) => {
    const o = orders.filter((x) => x.campaignId === c.id);
    const revenue = o.reduce((s, x) => s + x.total, 0);
    const v = visits.find((x) => x.campaignId === c.id)?._count._all ?? 0;
    return {
      ...c,
      clicks: clicks.find((x) => x.campaignId === c.id)?._count._all ?? 0,
      visits: v,
      orders: o.length,
      revenue,
      conversion: v ? (o.length / v) * 100 : 0,
      cpo: c.budget && o.length ? c.budget / o.length : null,
      roas: c.budget ? revenue / c.budget : null,
    };
  });
}

export const delta = (cur: number, prev: number) => (prev ? ((cur - prev) / prev) * 100 : cur ? 100 : 0);
