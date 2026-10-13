import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { put } from '@vercel/blob';
import { getAdmin } from '@/lib/auth';

const ROOT = path.join(process.cwd(), 'storage', 'uploads');
const ALLOWED = /\.(png|jpe?g|gif|webp|avif|svg|ico|mp4|webm|pdf|woff2?)$/i;
const MAX = 15 * 1024 * 1024;

/**
 * Admin uploads (images, icons, logos, videos). With BLOB_READ_WRITE_TOKEN (Vercel) they go to
 * Vercel Blob and the public blob URL is stored; otherwise to storage/uploads/<yyyy-mm>/ (local dev).
 */
export async function POST(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const form = await req.formData();
  const urls: string[] = [];
  const month = new Date().toISOString().slice(0, 7);
  const blob = !!process.env.BLOB_READ_WRITE_TOKEN;
  if (!blob) await fs.mkdir(path.join(ROOT, month), { recursive: true });
  for (const f of form.getAll('file')) {
    if (!(f instanceof File)) continue;
    if (!ALLOWED.test(f.name)) return NextResponse.json({ error: `Type de fichier non autorisé : ${f.name}` }, { status: 400 });
    if (f.size > MAX) return NextResponse.json({ error: `Fichier trop lourd (max 15 Mo) : ${f.name}` }, { status: 400 });
    const base = f.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '-').toLowerCase();
    const name = `${crypto.randomBytes(3).toString('hex')}-${base}`;
    if (blob) {
      const r = await put(`uploads/${month}/${name}`, f, { access: 'public', contentType: f.type || undefined });
      urls.push(r.url);
      continue;
    }
    await fs.writeFile(path.join(ROOT, month, name), Buffer.from(await f.arrayBuffer()));
    urls.push(`/uploads/${month}/${name}`);
  }
  return NextResponse.json({ urls });
}
