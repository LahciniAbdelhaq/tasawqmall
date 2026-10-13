import 'server-only';
import { db, parseJson } from './db';

/* Every admin-editable site setting, with defaults matching the original site. */
export const DEFAULTS = {
  brand: {
    name: 'beautymall',
    logo: '',            // empty = original logo from the theme
    logoMobile: '',
    favicon: '/assets/images/0d2772f0_cropped-favicon-180x180.png',
    phone: '+212 (0) 661 93 37 67 / 662 69 10 87',
    whatsapp: '212650123456',
    email: 'support@beautymall.ma',
    address: 'Casablanca, Maroc',
  },
  theme: {
    primary: '',          // --wd-primary-color (default rgb(101,203,203))
    buttonBg: '', buttonText: '', buttonRadius: '',
    textColor: '', titleColor: '', linkColor: '', linkHover: '', bodyBg: '',
    fontText: '', fontTitle: '', fontSize: '', radius: '',
    headerBg: '', headerBorder: '', navColor: '', navHover: '', navSize: '', navWeight: '', navUppercase: false,
    catButtonBg: '', catButtonText: '', iconBg: '', iconColor: '', headerSticky: true,
    footerBg: '', footerText: '', footerLink: '', footerTitle: '',
    priceColor: '', saleBadgeBg: '',
    customCss: '',
  },
  languages: {
    default: 'fr',
    enabled: ['fr', 'en', 'ar'] as string[],
    showSwitcher: true,
  },
  seo: {
    titleTemplate: '%s – beautymall',
    homeTitle: 'beautymall',
    description: 'BeautyMall.ma, votre parapharmacie en ligne au Maroc : soins visage, corps, cheveux, solaires, bébé et santé, au meilleur prix.',
    keywords: 'parapharmacie maroc, cosmétique, soins visage, crème solaire, la roche posay, cerave',
    ogImage: '/assets/images/92f1cf10_logo-bm-1.png',
    siteUrl: 'http://localhost:3000',
    indexable: true,
    jsonLd: true,
    autoMeta: true,       // generate missing meta descriptions from content
    autoAlt: true,        // fill missing image alt texts
    googleVerification: '',
    bingVerification: '',
    sameAs: ['https://www.facebook.com/beautymallmaroc', 'https://www.instagram.com/beautymallma/', 'https://www.tiktok.com/@beautymall.ma'],
  },
  ads: {
    facebookPixel: '', tiktokPixel: '', ga4: '', googleAds: '', snapchatPixel: '',
    requireConsent: true,
  },
  injection: { head: '', bodyStart: '', bodyEnd: '' },
  shipping: {
    zones: [
      { name: 'Casablanca & Rabat', cities: 'Casablanca, Casa, Rabat, Bouskoura, Mohammedia, Dar Bouazza', fee: 15, freeFrom: 150 },
      { name: 'Témara & Salé', cities: 'Témara, Temara, Salé, Sale', fee: 15, freeFrom: 300 },
    ],
    otherFee: 25,
    otherFreeFrom: 300,
  },
  orders: {
    confirmMessage: 'Bonjour {name}, merci pour votre commande n°{number} chez BeautyMall ({total} DH). Pouvez-vous nous confirmer votre adresse de livraison : {address}, {city} ?',
    shippedMessage: 'Bonjour {name}, votre commande n°{number} a été expédiée. Elle vous sera livrée très bientôt.',
  },
  menus: {
    headerExtra: [] as { label: string; href: string; icon?: string; newTab?: boolean }[],
    mobileExtra: [] as { label: string; href: string; icon?: string }[],
  },
  dictionary: {} as Record<string, Record<string, string>>, // { en: { "Ajouter au panier": "Add to cart" } }
};
export type Settings = typeof DEFAULTS;
export type SettingKey = keyof Settings;

// Server actions and pages can live in separate module instances in production, so an
// in-memory flag can't invalidate the cache: a version row is checked on every call instead.
let cache: { version: string; value: Settings } | null = null;
const VERSION_KEY = 'settings_version';

export async function getSettings(): Promise<Settings> {
  const version = (await db.setting.findUnique({ where: { key: VERSION_KEY } }))?.value ?? '0';
  if (cache && cache.version === version) return cache.value;
  const rows = await db.setting.findMany({ where: { key: { in: Object.keys(DEFAULTS) } } });
  const out = structuredClone(DEFAULTS) as Settings;
  for (const r of rows) {
    const k = r.key as SettingKey;
    const v = parseJson<unknown>(r.value, null);
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof out[k] === 'object') Object.assign(out[k] as object, v);
  }
  cache = { version, value: out };
  return out;
}

export async function saveSetting<K extends SettingKey>(key: K, value: Partial<Settings[K]>) {
  const current = (await getSettings())[key];
  const next = { ...(current as object), ...(value as object) };
  await db.setting.upsert({ where: { key }, create: { key, value: JSON.stringify(next) }, update: { value: JSON.stringify(next) } });
  const v = String(Date.now());
  await db.setting.upsert({ where: { key: VERSION_KEY }, create: { key: VERSION_KEY, value: v }, update: { value: v } });
  cache = null;
  return next as Settings[K];
}

export function invalidateSettings() {
  cache = null;
}
