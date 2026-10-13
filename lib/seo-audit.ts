import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { db, parseJson } from './db';
import { allProducts, categories, getBrand, loadCatalog, pageInfo, type Product } from './catalog';
import { htmlFile } from './render';
import { getSettings } from './settings';
import { productDescription, stripTags } from './seo';

export type Severity = 'high' | 'med' | 'low';
export type Issue = { sev: Severity; msg: string; fix?: FixKind };
export type FixKind = 'meta' | 'title' | 'alt' | 'catdesc' | 'images' | 'h1';
export type AuditItem = {
  type: 'page' | 'category' | 'product';
  id: string; label: string; url: string; edit: string;
  title: string; description: string; score: number; issues: Issue[];
  words: number; images: number; missingAlt: number;
};

const HEAVY = 300 * 1024;
const PUBLIC = path.join(process.cwd(), 'public');
const UPLOADS = path.join(process.cwd(), 'storage');

export function fileOf(src: string) {
  if (!src || /^(https?:|data:)/.test(src)) return null;
  const clean = decodeURIComponent(src.split('?')[0]);
  const f = clean.startsWith('/uploads/') ? path.join(UPLOADS, clean) : path.join(PUBLIC, clean);
  return f.startsWith(PUBLIC) || f.startsWith(UPLOADS) ? f : null;
}
const sizeOf = (src: string) => { const f = fileOf(src); try { return f ? fs.statSync(f).size : 0; } catch { return 0; } };

function score(issues: Issue[]) {
  const w = { high: 18, med: 8, low: 3 };
  return Math.max(0, 100 - issues.reduce((s, i) => s + w[i.sev], 0));
}

function checkMeta(issues: Issue[], title: string, desc: string, customDesc: boolean, keywords: string[]) {
  if (!title) issues.push({ sev: 'high', msg: 'Titre manquant', fix: 'title' });
  else if (title.length > 65) issues.push({ sev: 'med', msg: `Titre trop long (${title.length} car. > 65) : coupé dans Google`, fix: 'title' });
  else if (title.length < 25) issues.push({ sev: 'low', msg: `Titre court (${title.length} car.) : ajoutez marque / bénéfice`, fix: 'title' });
  if (!desc) issues.push({ sev: 'high', msg: 'Méta description manquante', fix: 'meta' });
  else {
    if (!customDesc) issues.push({ sev: 'low', msg: 'Méta description générée automatiquement (non personnalisée)', fix: 'meta' });
    if (desc.length > 165) issues.push({ sev: 'low', msg: `Méta description longue (${desc.length} car.)`, fix: 'meta' });
    if (desc.length < 70) issues.push({ sev: 'med', msg: `Méta description courte (${desc.length} car.)`, fix: 'meta' });
  }
  if (keywords.length && !keywords.some((k) => `${title} ${desc}`.toLowerCase().includes(k))) issues.push({ sev: 'low', msg: 'Aucun mot-clé du site dans le titre ou la description' });
}

function auditHtml(issues: Issue[], html: string, expectH1: boolean) {
  const $ = cheerio.load(html, null, false);
  const imgs = $('img').toArray();
  const missing = imgs.filter((i) => !($(i).attr('alt') || '').trim());
  const heavy = [...new Set(imgs.map((i) => $(i).attr('src') || '').filter((s) => sizeOf(s) > HEAVY))];
  const h1 = $('h1').length;
  const words = stripTags($.html()).split(/\s+/).filter((w) => w.length > 2).length;
  if (expectH1 && h1 === 0) issues.push({ sev: 'high', msg: 'Aucun titre H1 dans la page', fix: 'h1' });
  if (h1 > 1) issues.push({ sev: 'low', msg: `${h1} titres H1 (1 recommandé)` });
  if (missing.length) issues.push({ sev: missing.length > 5 ? 'med' : 'low', msg: `${missing.length} image(s) sans texte alternatif`, fix: 'alt' });
  if (heavy.length) issues.push({ sev: 'med', msg: `${heavy.length} image(s) de plus de 300 Ko (ralentit la page)`, fix: 'images' });
  return { words, images: imgs.length, missingAlt: missing.length };
}

export async function runAudit() {
  await loadCatalog();
  const s = await getSettings();
  const keywords = s.seo.keywords.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean);
  const items: AuditItem[] = [];

  // pages
  const pages = await db.page.findMany();
  const altOverrides = await db.contentOverride.findMany({ where: { kind: 'alt' }, select: { fragment: true, key: true } });
  for (const p of pages) {
    const issues: Issue[] = [];
    const title = p.seoTitle || (p.slug === '' ? s.seo.homeTitle : `${p.title} – ${s.brand.name}`);
    const desc = p.seoDescription || (p.slug === '' ? s.seo.description : '');
    checkMeta(issues, title, desc, !!p.seoDescription || (p.slug === '' && !!s.seo.description), keywords);
    let stats = { words: 0, images: 0, missingAlt: 0 };
    if (p.kind === 'builtin') {
      const file = `pages/${p.slug || 'home'}.html`;
      const fragment = p.slug || 'home';
      const $ = cheerio.load(htmlFile(file), null, false);
      for (const o of altOverrides.filter((a) => a.fragment === fragment)) $(`[data-bm="${o.key}"]`).attr('alt', 'x');
      // pages without H1 get one injected at render time (see seoFixups)
      stats = auditHtml(issues, $.html(), false);
      if (s.seo.autoAlt && stats.missingAlt) {
        const i = issues.findIndex((x) => x.fix === 'alt');
        if (i >= 0) issues[i] = { sev: 'low', msg: `${stats.missingAlt} image(s) avec un texte alternatif automatique (nom de fichier) : à personnaliser`, fix: 'alt' };
      }
    } else {
      const blocks = parseJson<{ type: string; html?: string; alt?: string; src?: string }[]>(p.blocks, []);
      const missing = blocks.filter((b) => b.type === 'image' && !b.alt).length;
      if (missing) issues.push({ sev: 'low', msg: `${missing} image(s) sans texte alternatif` });
      stats.words = stripTags(blocks.map((b) => b.html || '').join(' ')).split(/\s+/).length;
      if (stats.words < 120) issues.push({ sev: 'low', msg: `Contenu court (${stats.words} mots)` });
    }
    if (!p.published) issues.push({ sev: 'low', msg: 'Page en brouillon (non indexée)' });
    items.push({ type: 'page', id: String(p.id), label: p.slug === '' ? 'Accueil' : p.title, url: `/${p.slug}`, edit: `/admin/pages/${p.id}`, title, description: desc, score: score(issues), issues, ...stats });
  }

  // categories (archive template is shared: audit meta + description)
  for (const [p, c] of Object.entries(categories())) {
    if (!c.count) continue;
    const issues: Issue[] = [];
    const title = c.seoTitle || `${c.name} – ${s.brand.name}`;
    const desc = c.seoDescription || '';
    checkMeta(issues, title, desc || 'auto', !!c.seoDescription, keywords);
    const words = stripTags(c.description).split(/\s+/).filter(Boolean).length;
    if (words < 40) issues.push({ sev: 'med', msg: 'Pas de texte de présentation (contenu unique recommandé : 80+ mots)', fix: 'catdesc' });
    items.push({ type: 'category', id: p, label: c.name, url: `/product-category/${p}`, edit: `/admin/categories/edit?path=${encodeURIComponent(p)}`, title, description: desc, score: score(issues), issues, words, images: 0, missingAlt: 0 });
  }

  // products
  const titles = new Map<string, number>();
  for (const p of allProducts()) titles.set(p.name.toLowerCase(), (titles.get(p.name.toLowerCase()) ?? 0) + 1);
  for (const p of allProducts()) {
    const issues: Issue[] = [];
    const title = p.seoTitle || `${p.name} – ${s.brand.name}`;
    const desc = productDescription(p, s) || '';
    checkMeta(issues, title, desc, !!p.seoDescription, keywords);
    const words = stripTags(`${p.shortDescription || ''} ${p.description || ''}`).split(/\s+/).filter(Boolean).length;
    if (words === 0) issues.push({ sev: 'high', msg: 'Aucune description produit (contenu vide)' });
    else if (words < 50) issues.push({ sev: 'med', msg: `Description courte (${words} mots)` });
    if (!p.images.length) issues.push({ sev: 'high', msg: 'Aucune image' });
    const heavy = p.images.filter((i) => sizeOf(i) > HEAVY).length;
    if (heavy) issues.push({ sev: 'med', msg: `${heavy} image(s) de plus de 300 Ko`, fix: 'images' });
    if (!p.brand) issues.push({ sev: 'low', msg: 'Marque non renseignée (données structurées incomplètes)' });
    if (!p.ean && !p.sku) issues.push({ sev: 'low', msg: 'Ni EAN ni UGS (identifiant produit pour Google Shopping)' });
    if ((titles.get(p.name.toLowerCase()) ?? 0) > 1) issues.push({ sev: 'med', msg: 'Nom identique à un autre produit (contenu dupliqué)' });
    if (p.slug.length > 90) issues.push({ sev: 'low', msg: 'URL très longue' });
    items.push({ type: 'product', id: String(p.id), label: p.name, url: `/product/${p.slug}`, edit: `/admin/products/${p.id}`, title, description: desc, score: score(issues), issues, words, images: p.images.length, missingAlt: 0 });
  }

  // site-wide checks
  const site: Issue[] = [];
  if (!s.seo.indexable) site.push({ sev: 'high', msg: 'Le site est réglé sur « ne pas indexer » : Google ne le référencera pas.' });
  if (!s.seo.jsonLd) site.push({ sev: 'med', msg: 'Données structurées (JSON-LD) désactivées.' });
  if (!s.seo.googleVerification) site.push({ sev: 'low', msg: 'Google Search Console non vérifiée (ajoutez le code de vérification).' });
  if (/localhost/.test(process.env.SITE_URL || s.seo.siteUrl)) site.push({ sev: 'med', msg: 'L’adresse du site est « localhost » : renseignez le vrai domaine (sitemap, canonical, partage).' });
  if (s.languages.enabled.length > 1) site.push({ sev: 'low', msg: `Site multilingue (${s.languages.enabled.join(', ')}) : balises hreflang générées.` });
  const dupTitles = [...titles.values()].filter((n) => n > 1).length;
  if (dupTitles) site.push({ sev: 'med', msg: `${dupTitles} nom(s) de produit en double.` });

  const avg = (t: AuditItem['type']) => { const l = items.filter((i) => i.type === t); return l.length ? Math.round(l.reduce((a, i) => a + i.score, 0) / l.length) : 100; };
  const fixable = (k: FixKind) => items.reduce((n, i) => n + (i.issues.some((x) => x.fix === k) ? 1 : 0), 0);
  return {
    items,
    site,
    scores: { overall: Math.round((avg('page') + avg('category') + avg('product') * 2) / 4), page: avg('page'), category: avg('category'), product: avg('product') },
    fixable: { meta: fixable('meta'), title: fixable('title'), alt: fixable('alt'), catdesc: fixable('catdesc'), images: heavyImages().length },
  };
}

/** All local images over 300 KB (theme assets, product photos, uploads). */
export function heavyImages() {
  const out: { file: string; url: string; size: number }[] = [];
  const walk = (dir: string, base: string) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, e.name);
      if (e.isDirectory()) walk(f, `${base}/${e.name}`);
      else if (/\.(jpe?g|png|webp)$/i.test(e.name)) {
        const size = fs.statSync(f).size;
        if (size > HEAVY) out.push({ file: f, url: `${base}/${e.name}`, size });
      }
    }
  };
  walk(path.join(PUBLIC, 'assets', 'images'), '/assets/images');
  walk(path.join(PUBLIC, 'wp-content', 'uploads'), '/wp-content/uploads');
  walk(path.join(UPLOADS, 'uploads'), '/uploads');
  return out.sort((a, b) => b.size - a.size);
}

export const productSeoTitle = (p: Product) => {
  const brand = p.brand ? getBrand(p.brand)?.name : '';
  let t = p.name.replace(/\s*\|\s*/g, ' ').replace(/\s+/g, ' ').trim();
  if (brand && !t.toLowerCase().includes(brand.toLowerCase())) t = `${brand} ${t}`;
  const suffix = ' | Maroc';
  if (t.length + suffix.length <= 65) return t + suffix;
  return t.length <= 65 ? t : t.slice(0, 62).replace(/\s+\S*$/, '') + '…';
};

export const categoryIntro = (name: string, count: number, children: string[]) =>
  `<p>Découvrez notre sélection <strong>${name}</strong> : ${count} produits de parapharmacie authentiques, choisis parmi les meilleures marques dermatologiques et vendus au meilleur prix au Maroc.${children.length ? ` Parcourez nos rayons ${children.slice(0, 4).join(', ')} pour trouver le soin adapté à vos besoins.` : ''} Profitez de promotions toute l’année, de conseils personnalisés et d’une livraison rapide partout au Maroc, avec paiement à la livraison.</p>`;

export { pageInfo };
