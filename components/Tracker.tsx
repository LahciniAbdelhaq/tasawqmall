'use client';
/**
 * First-party analytics (live visitors, traffic sources, conversion) + the ad pixels
 * configured in the back-office. Pixels load only after cookie consent when required.
 */
import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { cartStore, cartCount, cartTotal } from '@/lib/store';

type Pixels = { fb: string; tt: string; ga: string; gads: string; snap: string; consent: boolean };
type W = Window & { fbq?: (...a: unknown[]) => void; ttq?: { page: () => void; track: (e: string, d?: unknown) => void }; gtag?: (...a: unknown[]) => void; snaptr?: (...a: unknown[]) => void; dataLayer?: unknown[] };

const id = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
function visitorId() {
  const m = document.cookie.match(/(?:^|; )bm_vid=([^;]+)/);
  if (m) return m[1];
  const v = id();
  document.cookie = `bm_vid=${v}; path=/; max-age=${365 * 86400}; samesite=lax`;
  return v;
}
function sessionId() {
  const sid = rawSessionId();
  document.cookie = `bm_sid=${sid}; path=/; samesite=lax`;
  return sid;
}
function rawSessionId() {
  // a session ends after 30 minutes without activity
  try {
    const raw = localStorage.getItem('bm_sid');
    const [sid, at] = (raw || '').split('|');
    if (sid && Date.now() - +at < 30 * 60 * 1000) {
      localStorage.setItem('bm_sid', `${sid}|${Date.now()}`);
      return sid;
    }
    const n = id();
    localStorage.setItem('bm_sid', `${n}|${Date.now()}`);
    return n;
  } catch {
    return id();
  }
}

function send(body: Record<string, unknown>, beacon = false) {
  const payload = JSON.stringify(body);
  if (beacon && navigator.sendBeacon) navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }));
  else fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
}

function inject(src: string, inline?: string) {
  if (inline) {
    const s = document.createElement('script');
    s.text = inline;
    document.head.appendChild(s);
  }
  if (src) {
    const s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }
}

function loadPixels(p: Pixels) {
  const w = window as W;
  if ((w as unknown as { __bmPixels?: boolean }).__bmPixels) return;
  (w as unknown as { __bmPixels?: boolean }).__bmPixels = true;
  if (p.fb) inject('', `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${p.fb.replace(/\D/g, '')}');`);
  if (p.tt) inject('', `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;var o=document.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${p.tt.replace(/[^\w]/g, '')}');}(window,document,'ttq');`);
  const gIds = [p.ga, p.gads].filter(Boolean).map((x) => x.replace(/[^\w-]/g, ''));
  if (gIds.length) {
    inject(`https://www.googletagmanager.com/gtag/js?id=${gIds[0]}`, `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());${gIds.map((g) => `gtag('config','${g}',{send_page_view:false});`).join('')}`);
  }
  if (p.snap) inject('', `(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];var s='script';var r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];u.parentNode.insertBefore(r,u);})(window,document,'https://sc-static.net/scevent.min.js');snaptr('init','${p.snap.replace(/[^\w-]/g, '')}');`);
}

function pixelEvent(name: 'PageView' | 'AddToCart' | 'Purchase' | 'InitiateCheckout', data: { value?: number; ids?: number[] } = {}) {
  const w = window as W;
  const params = { value: data.value, currency: 'MAD', content_ids: data.ids?.map(String), content_type: 'product' };
  try {
    if (name === 'PageView') {
      w.fbq?.('track', 'PageView');
      w.ttq?.page();
      w.gtag?.('event', 'page_view', { page_path: location.pathname });
      w.snaptr?.('track', 'PAGE_VIEW');
    } else {
      w.fbq?.('track', name, params);
      w.ttq?.track(name === 'Purchase' ? 'CompletePayment' : name, params);
      w.gtag?.('event', name === 'Purchase' ? 'purchase' : name === 'AddToCart' ? 'add_to_cart' : 'begin_checkout', { value: data.value, currency: 'MAD' });
      w.snaptr?.('track', name === 'Purchase' ? 'PURCHASE' : name === 'AddToCart' ? 'ADD_CART' : 'START_CHECKOUT', { price: data.value, currency: 'MAD' });
    }
  } catch { /* a blocked pixel must never break the shop */ }
}

const consentGiven = () => { try { return localStorage.getItem('bm_cookie_consent') === 'all'; } catch { return false; } };

export default function Tracker({ pixels }: { pixels: Pixels }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const ids = useRef<{ vid: string; sid: string } | null>(null);
  // time the current page has been on screen (paused while the tab is hidden)
  const seen = useRef<{ path: string; acc: number; since: number | null }>({ path: '', acc: 0, since: null });
  const elapsed = () => {
    const c = seen.current;
    return Math.round((c.acc + (c.since != null ? Date.now() - c.since : 0)) / 1000);
  };
  const hasPixels = !!(pixels.fb || pixels.tt || pixels.ga || pixels.gads || pixels.snap);

  // page views
  useEffect(() => {
    if (window.self !== window.top) return; // admin preview frame
    ids.current ??= { vid: visitorId(), sid: sessionId() };
    const lines = cartStore.get();
    const path = pathname + (search.toString() ? `?${search}` : '');
    const prev = seen.current.path ? { path: seen.current.path, dur: elapsed() } : undefined;
    seen.current = { path, acc: 0, since: document.hidden ? null : Date.now() };
    send({
      type: 'view', ...ids.current, path, prev, title: document.title,
      ref: document.referrer, lang: document.documentElement.lang,
      utm: { source: search.get('utm_source'), medium: search.get('utm_medium'), campaign: search.get('utm_campaign') },
      cart: { items: cartCount(lines), value: cartTotal(lines) },
    });
    if (hasPixels && (!pixels.consent || consentGiven())) { loadPixels(pixels); pixelEvent('PageView'); }
  }, [pathname, search, hasPixels, pixels]);

  // heartbeat for "live visitors", consent and shop events
  useEffect(() => {
    if (window.self !== window.top) return;
    const ping = () => {
      if (document.hidden || !ids.current) return;
      const lines = cartStore.get();
      send({ type: 'ping', ...ids.current, path: seen.current.path || location.pathname + location.search, dur: elapsed(), cart: { items: cartCount(lines), value: cartTotal(lines) } });
    };
    const t = window.setInterval(ping, 15000);
    const onConsent = () => { if (hasPixels && consentGiven()) { loadPixels(pixels); pixelEvent('PageView'); } };
    const onEvent = (e: Event) => {
      const d = (e as CustomEvent).detail as { name: 'AddToCart' | 'Purchase' | 'InitiateCheckout'; value?: number; ids?: number[] };
      if (hasPixels && (!pixels.consent || consentGiven())) pixelEvent(d.name, d);
    };
    const onHide = () => {
      const c = seen.current;
      if (!document.hidden) { c.since ??= Date.now(); return; }
      if (c.since != null) { c.acc += Date.now() - c.since; c.since = null; }
      if (ids.current) send({ type: 'leave', ...ids.current, path: c.path, dur: elapsed() }, true);
    };
    window.addEventListener('bm:consent', onConsent);
    window.addEventListener('bm:event', onEvent);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.clearInterval(t);
      window.removeEventListener('bm:consent', onConsent);
      window.removeEventListener('bm:event', onEvent);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [hasPixels, pixels]);

  return null;
}
