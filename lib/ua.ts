/** Tiny user-agent classifier for visitor stats (device, browser, OS, bots). */
export function parseUa(ua: string) {
  const s = ua || '';
  const bot = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|pingdom|monitor/i.test(s);
  const device = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(s) ? 'tablet' : /Mobi|iPhone|Android/i.test(s) ? 'mobile' : 'desktop';
  const browser = /Edg\//.test(s) ? 'Edge' : /OPR\/|Opera/.test(s) ? 'Opera' : /SamsungBrowser/.test(s) ? 'Samsung' : /Chrome\//.test(s) ? 'Chrome' : /Firefox\//.test(s) ? 'Firefox' : /Safari\//.test(s) ? 'Safari' : 'Autre';
  const os = /Windows/.test(s) ? 'Windows' : /iPhone|iPad|iOS/.test(s) ? 'iOS' : /Android/.test(s) ? 'Android' : /Mac OS X/.test(s) ? 'macOS' : /Linux/.test(s) ? 'Linux' : 'Autre';
  return { bot, device, browser, os };
}

/** Traffic source from UTM / referrer: "facebook", "google", "instagram", "direct", … */
export function sourceOf(utmSource: string | null | undefined, referrer: string | null | undefined, host: string) {
  if (utmSource) return utmSource.toLowerCase().slice(0, 40);
  if (!referrer) return 'direct';
  try {
    const h = new URL(referrer).hostname.replace(/^www\./, '').replace(/^(l|m|lm)\./, '');
    if (h === host.replace(/^www\./, '')) return 'direct';
    for (const k of ['google', 'facebook', 'instagram', 'tiktok', 'youtube', 'bing', 'snapchat', 'pinterest', 'twitter', 'whatsapp', 'yahoo']) if (h.includes(k)) return k;
    if (h === 't.co') return 'twitter';
    return h.slice(0, 40);
  } catch {
    return 'direct';
  }
}
