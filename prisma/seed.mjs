// Loads the imported clone data (data/*.json) into the database and creates the admin.
//   node prisma/seed.mjs            (refuses to overwrite a non-empty catalogue)
//   node prisma/seed.mjs --force    (re-imports products/categories/brands, keeps orders & edits)
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const DATA = path.join(process.cwd(), 'data');
const json = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const force = process.argv.includes('--force');

async function main() {
  const existing = await db.product.count();
  if (existing && !force) {
    console.log(`Catalogue already has ${existing} products: nothing done (use --force to re-import).`);
  } else {
    const products = json('products.json');
    const categories = json('categories.json');
    const brands = json('brands.json');
    await db.$transaction([db.product.deleteMany(), db.category.deleteMany(), db.brand.deleteMany()]);
    await db.brand.createMany({ data: brands.map((b) => ({ slug: b.slug, name: b.name })) });
    await db.category.createMany({
      data: Object.entries(categories).map(([p, c], i) => ({ path: p, slug: c.slug, name: c.name, parent: c.parent, position: i })),
    });
    for (let i = 0; i < products.length; i += 200) {
      await db.product.createMany({
        data: products.slice(i, i + 200).map((p, j) => ({
          id: p.id, slug: p.slug, name: p.name, brand: p.brand, price: p.price, regularPrice: p.regularPrice,
          label: p.label, images: JSON.stringify(p.images), cats: JSON.stringify(p.cats), primaryCat: p.primaryCat ?? null,
          tags: JSON.stringify(p.tags), inStock: p.inStock, stockQty: p.stockQty ?? null, sku: p.sku, ean: p.ean,
          shortDescription: p.shortDescription ?? null, description: p.description ?? null, position: i + j,
        })),
      });
    }
    console.log(`Imported ${products.length} products, ${Object.keys(categories).length} categories, ${brands.length} brands.`);
  }

  // built-in pages (Elementor pages from the clone) so SEO / titles can be edited
  const pages = json('pages.json');
  for (const [route, info] of Object.entries(pages)) {
    if (!['home', 'boutique', 'page', 'wishlist'].includes(info.kind)) continue;
    const slug = route === '/' ? '' : route.slice(1);
    const title = info.title.replace(/\s*–\s*beautymall$/i, '') || 'Accueil';
    await db.page.upsert({ where: { slug }, create: { slug, title, kind: 'builtin' }, update: {} });
  }

  const email = process.env.ADMIN_EMAIL || 'admin@beautymall.ma';
  if (!(await db.adminUser.findUnique({ where: { email } }))) {
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    await db.adminUser.create({ data: { email, name: 'Administrateur', passwordHash: await bcrypt.hash(password, 10) } });
    console.log(`Admin created: ${email} / ${password}  (change it in Paramètres)`);
  }

  // orders placed before the database existed
  const legacy = path.join(DATA, 'orders.json');
  if (fs.existsSync(legacy) && !(await db.order.count())) {
    for (const o of JSON.parse(fs.readFileSync(legacy, 'utf8'))) {
      await db.order.create({
        data: {
          number: o.id, key: o.key, status: 'pending', firstName: o.customer.firstName, lastName: o.customer.lastName,
          phone: o.customer.phone, email: o.customer.email || null, city: o.customer.city, address: o.customer.address,
          notes: o.customer.notes || null, lines: JSON.stringify(o.lines), subtotal: o.subtotal, shipping: o.shipping,
          total: o.total, createdAt: new Date(o.createdAt),
        },
      });
    }
  }
}

main().then(() => db.$disconnect()).catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
