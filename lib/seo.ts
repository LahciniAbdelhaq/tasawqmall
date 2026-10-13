import 'server-only';
import { getBrand, categoryTrail, type Product } from './catalog';
import type { Settings } from './settings';

export const stripTags = (html: string | null | undefined) =>
  (html || '').replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/** ~155 characters cut on a word boundary */
export function clip(text: string, max = 155) {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(' ') > 80 ? cut.lastIndexOf(' ') : cut.length).replace(/[,;:.\s]+$/, '') + '…';
}

/** Meta description for a product when none was written by hand. */
export function productDescription(p: Product, s: Settings) {
  if (p.seoDescription) return p.seoDescription;
  const body = stripTags(p.shortDescription || p.description);
  if (body.length > 60) return clip(body);
  if (!s.seo.autoMeta) return undefined;
  const brand = p.brand ? getBrand(p.brand)?.name : '';
  const off = p.regularPrice > p.price ? ` à ${p.price.toFixed(2)} DH au lieu de ${p.regularPrice.toFixed(2)} DH` : ` à ${p.price.toFixed(2)} DH`;
  return clip(`${p.name}${brand ? ` de ${brand}` : ''}${off}. Achetez en ligne sur BeautyMall, parapharmacie au Maroc : produits 100% authentiques, livraison rapide partout au Maroc, paiement à la livraison.`);
}

export function absolute(url: string, s: Settings) {
  if (!url || /^https?:/.test(url)) return url;
  return (process.env.SITE_URL || s.seo.siteUrl).replace(/\/$/, '') + url;
}

export function productJsonLd(p: Product, s: Settings) {
  const brand = p.brand ? getBrand(p.brand)?.name : undefined;
  const trail = p.primaryCat ? categoryTrail(p.primaryCat) : [];
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      image: p.images.map((i) => absolute(i, s)),
      description: productDescription(p, s),
      sku: p.sku || String(p.id),
      gtin13: p.ean || undefined,
      brand: brand ? { '@type': 'Brand', name: brand } : undefined,
      offers: {
        '@type': 'Offer',
        url: absolute(`/product/${p.slug}`, s),
        priceCurrency: 'MAD',
        price: p.price.toFixed(2),
        availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: { '@type': 'Organization', name: s.brand.name },
      },
    },
    breadcrumbJsonLd([{ name: 'Accueil', url: '/' }, ...trail.map((c) => ({ name: c.name, url: `/product-category/${c.path}` })), { name: p.name, url: `/product/${p.slug}` }], s),
  ];
}

export function breadcrumbJsonLd(items: { name: string; url: string }[], s: Settings) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: absolute(it.url, s) })),
  };
}

export function organizationJsonLd(s: Settings) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'OnlineStore',
      name: s.brand.name,
      url: absolute('/', s),
      logo: absolute(s.brand.logo || '/assets/images/92f1cf10_logo-bm-1.png', s),
      email: s.brand.email,
      telephone: s.brand.phone,
      address: { '@type': 'PostalAddress', addressLocality: s.brand.address, addressCountry: 'MA' },
      sameAs: s.seo.sameAs.filter(Boolean),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: s.brand.name,
      url: absolute('/', s),
      potentialAction: { '@type': 'SearchAction', target: absolute('/search?s={search_term_string}', s), 'query-input': 'required name=search_term_string' },
    },
  ];
}

export const JsonLdScript = (data: unknown) => ({ __html: JSON.stringify(data).replace(/</g, '\\u003c') });
