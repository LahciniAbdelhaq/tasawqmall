// Copies every row of the old SQLite database (prisma/dev.db) into the PostgreSQL database of DATABASE_URL.
//   node scripts/sqlite-to-postgres.mjs [path/to/dev.db] [--force]
// The target must be empty; --force first wipes it (e.g. after a Vercel build seeded the catalogue).
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { PrismaClient, Prisma } from '@prisma/client';

const force = process.argv.includes('--force');
const file = process.argv.slice(2).find((a) => !a.startsWith('--')) || 'prisma/dev.db';
if (!fs.existsSync(file)) throw new Error(`SQLite file not found: ${file}`);

// parents before children (foreign keys)
const ORDER = ['AdminUser', 'Setting', 'Product', 'Category', 'Brand', 'Customer', 'Order', 'PromoCode', 'Page',
  'ContentOverride', 'Campaign', 'Click', 'Visit', 'PageView', 'Announcement'];

const src = new DatabaseSync(file, { readOnly: true });
const db = new PrismaClient();
const models = Object.fromEntries(Prisma.dmmf.datamodel.models.map((m) => [m.name, m]));
const delegate = (name) => db[name[0].toLowerCase() + name.slice(1)];

// SQLite keeps DateTime as epoch ms and Boolean as 0/1
const convert = (model, row) => {
  const out = {};
  for (const f of models[model].fields) {
    if (f.kind !== 'scalar' || !(f.name in row)) continue;
    const v = row[f.name];
    if (v === null || v === undefined) out[f.name] = null;
    else if (f.type === 'DateTime') out[f.name] = new Date(typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v);
    else if (f.type === 'Boolean') out[f.name] = v === true || v === 1 || v === '1' || v === 'true';
    else if (f.type === 'Int' || f.type === 'Float') out[f.name] = Number(v);
    else out[f.name] = v;
  }
  return out;
};

async function main() {
  const counts = await Promise.all(ORDER.map((m) => delegate(m).count()));
  if (counts.some(Boolean)) {
    if (!force) {
      console.log('The PostgreSQL database is not empty: nothing done (use --force to wipe it and copy the SQLite data).');
      return;
    }
    for (const m of [...ORDER].reverse()) await delegate(m).deleteMany();
  }

  for (const m of ORDER) {
    const rows = src.prepare(`SELECT * FROM "${m}"`).all().map((r) => convert(m, r));
    for (let i = 0; i < rows.length; i += 100) await delegate(m).createMany({ data: rows.slice(i, i + 100) });
    // explicit ids were inserted: move autoincrement sequences past them
    const id = models[m].fields.find((f) => f.isId);
    if (id?.type === 'Int' && id.default?.name === 'autoincrement') {
      await db.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"${m}"', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM "${m}"`);
    }
    console.log(`${m}: ${rows.length}`);
  }
  console.log('Done.');
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => db.$disconnect());
