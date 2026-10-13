'use server';
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { allProducts, bumpCatalog, categories, loadCatalog } from '@/lib/catalog';
import { bumpContent } from '@/lib/cms';
import { htmlFile } from '@/lib/render';
import { getSettings } from '@/lib/settings';
import { clip, productDescription, stripTags } from '@/lib/seo';
import { categoryIntro, heavyImages, productSeoTitle } from '@/lib/seo-audit';
import { ok, type Result } from '@/lib/form';

const humanize = (src: string) =>
  decodeURIComponent(src.split('/').pop() || '').replace(/\.[a-z0-9]+$/i, '').replace(/^[a-f0-9]{8}_/, '').replace(/[-_]+/g, ' ').replace(/\b\d{2,4}x\d{2,4}\b/g, '').replace(/\s+/g, ' ').trim();

/** One-click SEO fixes ("injection SEO"): every change is written to the normal editable fields. */
export async function fixSeo(kind: 'meta' | 'title' | 'alt' | 'catdesc'): Promise<Result> {
  await requireAdmin();
  await loadCatalog();
  const s = await getSettings();
  let n = 0;

  if (kind === 'meta') {
    for (const p of allProducts()) {
      if (p.seoDescription) continue;
      const d = productDescription({ ...p, seoDescription: null }, { ...s, seo: { ...s.seo, autoMeta: true } });
      if (d) { await db.product.update({ where: { id: p.id }, data: { seoDescription: d } }); n++; }
    }
    for (const [p, c] of Object.entries(categories())) {
      if (c.seoDescription || !c.count) continue;
      const d = clip(stripTags(c.description) || `${c.name} au Maroc : ${c.count} produits authentiques au meilleur prix sur BeautyMall. Promotions toute l’année, livraison partout au Maroc et paiement à la livraison.`);
      await db.category.update({ where: { path: p }, data: { seoDescription: d } }); n++;
    }
    for (const page of await db.page.findMany({ where: { seoDescription: null } })) {
      let text = '';
      if (page.kind === 'builtin') text = stripTags(cheerio.load(htmlFile(`pages/${page.slug || 'home'}.html`), null, false)('p, .wd-text-block').first().text());
      const d = clip(text.length > 60 ? text : page.slug === '' ? s.seo.description : `${page.title} – ${s.brand.name}, votre parapharmacie en ligne au Maroc : produits authentiques, meilleurs prix et livraison partout au Maroc.`);
      await db.page.update({ where: { id: page.id }, data: { seoDescription: d } }); n++;
    }
    await bumpCatalog();
    return ok(`${n} méta description(s) générée(s) — modifiables dans chaque fiche.`);
  }

  if (kind === 'title') {
    for (const p of allProducts()) {
      if (p.seoTitle) continue;
      const full = `${p.name} – ${s.brand.name}`;
      if (full.length <= 65 && full.length >= 25) continue;
      await db.product.update({ where: { id: p.id }, data: { seoTitle: productSeoTitle(p) } }); n++;
    }
    await bumpCatalog();
    return ok(`${n} titre(s) SEO optimisé(s) (≤ 65 caractères, marque + « Maroc »).`);
  }

  if (kind === 'catdesc') {
    for (const [p, c] of Object.entries(categories())) {
      if (!c.count || stripTags(c.description).split(/\s+/).filter(Boolean).length >= 40) continue;
      const children = Object.entries(categories()).filter(([, x]) => x.parent === p && x.count).map(([, x]) => x.name);
      await db.category.update({ where: { path: p }, data: { description: categoryIntro(c.name, c.count, children) } }); n++;
    }
    await bumpCatalog();
    return ok(`${n} texte(s) de présentation ajouté(s) aux catégories — personnalisez-les dans chaque catégorie.`);
  }

  // alt: images without alternative text in the imported pages get one from their context
  const pages = await db.page.findMany({ where: { kind: 'builtin' } });
  const fragments: [string, string][] = [
    ...pages.map((p) => [p.slug || 'home', `pages/${p.slug || 'home'}.html`] as [string, string]),
    ['header', 'header.html'], ['footer', 'footer.html'], ['tpl-product', 'templates/product.html'],
  ];
  for (const [fragment, file] of fragments) {
    const $ = cheerio.load(htmlFile(file), null, false);
    const existing = new Set((await db.contentOverride.findMany({ where: { fragment, kind: 'alt' }, select: { key: true } })).map((o) => o.key));
    for (const el of $('img[data-bm]').toArray()) {
      const img = $(el);
      const key = img.attr('data-bm')!;
      if ((img.attr('alt') || '').trim() || existing.has(key)) continue;
      const ctx = img.closest('a').attr('aria-label') || img.attr('title') || img.closest('.elementor-widget, .wd-product').find('h1,h2,h3,h4,.title').first().text().trim() || humanize(img.attr('src') || '');
      const alt = (ctx || s.brand.name).replace(/\s+/g, ' ').slice(0, 120);
      await db.contentOverride.create({ data: { fragment, key, locale: 'fr', kind: 'alt', value: alt } });
      n++;
    }
  }
  await bumpContent();
  return ok(`${n} texte(s) alternatif(s) ajouté(s) aux images.`);
}

/**
 * Compresses heavy images in place (originals kept in storage/originals): max 1600 px wide,
 * JPEG q80 (mozjpeg), PNG palette, WebP q80. Processes a batch per call so the UI can loop.
 */
export async function compressImages(batch = 25): Promise<Result & { remaining?: number; saved?: number }> {
  await requireAdmin();
  // on Vercel the site files are read-only: compress locally, then commit and push
  if (process.env.VERCEL) return { ok: false, message: 'Sur Vercel les fichiers du site sont en lecture seule : lancez la compression en local (npm run dev), puis poussez les images sur GitHub.' };
  const sharp = (await import('sharp')).default;
  const backup = path.join(process.cwd(), 'storage', 'originals');
  const done = path.join(process.cwd(), 'storage', 'compressed.json');
  const skip: string[] = fs.existsSync(done) ? JSON.parse(fs.readFileSync(done, 'utf8')) : [];
  const todo = heavyImages().filter((i) => !skip.includes(i.url));
  let saved = 0, count = 0;
  for (const img of todo.slice(0, batch)) {
    try {
      const input = fs.readFileSync(img.file);
      const pipeline = sharp(input, { failOn: 'none' }).rotate().resize({ width: 1600, withoutEnlargement: true });
      const ext = path.extname(img.file).toLowerCase();
      const out = ext === '.png' ? await pipeline.png({ palette: true, quality: 80, compressionLevel: 9 }).toBuffer()
        : ext === '.webp' ? await pipeline.webp({ quality: 80 }).toBuffer()
        : await pipeline.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
      if (out.length < input.length * 0.95) {
        const b = path.join(backup, img.url);
        fs.mkdirSync(path.dirname(b), { recursive: true });
        if (!fs.existsSync(b)) fs.writeFileSync(b, input);
        fs.writeFileSync(img.file, out);
        saved += input.length - out.length;
        count++;
      }
    } catch { /* unreadable image: skip it */ }
    skip.push(img.url);
  }
  fs.mkdirSync(path.dirname(done), { recursive: true });
  fs.writeFileSync(done, JSON.stringify(skip));
  const remaining = Math.max(0, todo.length - batch);
  return { ok: true, message: `${count} image(s) compressée(s), ${(saved / 1048576).toFixed(1)} Mo économisés.`, remaining, saved };
}
