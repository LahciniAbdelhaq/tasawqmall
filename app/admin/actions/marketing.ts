'use server';
import crypto from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { bool, date, fail, json, num, ok, optNum, optStr, slugify, str, type Result } from '@/lib/form';

/* --------------------------------------------------------- campaigns / ads */
export async function saveCampaign(_: Result, f: FormData): Promise<Result> {
  await requireAdmin();
  const id = num(f, 'id');
  const name = str(f, 'name');
  if (!name) return fail('Nommez la campagne.');
  let code = slugify(str(f, 'code')) || `${slugify(name).slice(0, 20)}-${crypto.randomBytes(2).toString('hex')}`;
  const clash = await db.campaign.findFirst({ where: { code, NOT: id ? { id } : undefined } });
  if (clash) return fail(`Le code « ${code} » est déjà utilisé.`);
  const destination = str(f, 'destination') || '/';
  if (!/^\/|^https?:\/\//.test(destination)) return fail('La destination doit commencer par / ou https://');
  const data = {
    name, code, destination,
    platform: str(f, 'platform') || 'other',
    utmSource: optStr(f, 'utmSource'), utmMedium: optStr(f, 'utmMedium'), utmCampaign: optStr(f, 'utmCampaign'),
    budget: optNum(f, 'budget'), startsAt: date(f, 'startsAt'), endsAt: date(f, 'endsAt'),
    active: bool(f, 'active'), notes: optStr(f, 'notes'),
  };
  if (id) await db.campaign.update({ where: { id }, data });
  else {
    const c = await db.campaign.create({ data });
    redirect(`/admin/ads/${c.id}?created=1`);
  }
  revalidatePath('/admin/ads');
  return ok('Campagne enregistrée.');
}

export async function deleteCampaign(f: FormData) {
  await requireAdmin();
  await db.campaign.delete({ where: { id: Number(f.get('id')) } });
  revalidatePath('/admin/ads');
  redirect('/admin/ads');
}

/* ------------------------------------------------------------ promo codes */
export async function savePromo(_: Result, f: FormData): Promise<Result> {
  await requireAdmin();
  const id = num(f, 'id');
  const code = str(f, 'code').toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (code.length < 3) return fail('Le code doit faire au moins 3 caractères (lettres, chiffres, - ou _).');
  const type = ['percent', 'fixed', 'freeship'].includes(str(f, 'type')) ? str(f, 'type') : 'percent';
  const value = num(f, 'value');
  if (type === 'percent' && !(value > 0 && value <= 100)) return fail('Pourcentage entre 1 et 100.');
  if (type === 'fixed' && !(value > 0)) return fail('Montant de réduction requis.');
  const clash = await db.promoCode.findFirst({ where: { code, NOT: id ? { id } : undefined } });
  if (clash) return fail(`Le code ${code} existe déjà.`);
  const data = {
    code, type, value: type === 'freeship' ? 0 : value, minSubtotal: num(f, 'minSubtotal'),
    maxUses: optNum(f, 'maxUses'), startsAt: date(f, 'startsAt'), endsAt: date(f, 'endsAt'),
    active: bool(f, 'active'), description: optStr(f, 'description'),
  };
  if (id) await db.promoCode.update({ where: { id }, data });
  else await db.promoCode.create({ data });
  revalidatePath('/admin/promos');
  if (!id) redirect('/admin/promos?created=1');
  return ok('Code promo enregistré.');
}

export async function deletePromo(f: FormData) {
  await requireAdmin();
  await db.promoCode.delete({ where: { id: Number(f.get('id')) } });
  revalidatePath('/admin/promos');
  redirect('/admin/promos');
}

/* ---------------------------------------------------- announcements / popups */
const ANIMATIONS = ['none', 'scroll-rtl', 'scroll-ltr', 'slide-left', 'slide-right', 'pulse'];
export async function saveAnnouncement(_: Result, f: FormData): Promise<Result> {
  await requireAdmin();
  const id = num(f, 'id');
  const text = str(f, 'text');
  const image = optStr(f, 'image');
  if (!text && !image) return fail('Ajoutez un texte ou une image.');
  const data = {
    type: str(f, 'type') === 'popup' ? 'popup' : 'bar',
    text, image, link: optStr(f, 'link'),
    bgColor: str(f, 'bgColor') || '#65cbcb', textColor: str(f, 'textColor') || '#ffffff',
    animation: ANIMATIONS.includes(str(f, 'animation')) ? str(f, 'animation') : 'none',
    speed: Math.min(120, Math.max(1, Math.round(num(f, 'speed', 15)))),
    pages: str(f, 'pages') || '*', startsAt: date(f, 'startsAt'), endsAt: date(f, 'endsAt'),
    active: bool(f, 'active'), position: num(f, 'position'),
    i18n: JSON.stringify(json<Record<string, unknown>>(f, 'i18n', {})),
  };
  if (id) await db.announcement.update({ where: { id }, data });
  else await db.announcement.create({ data });
  revalidatePath('/admin/announcements');
  if (!id) redirect('/admin/announcements?created=1');
  return ok('Annonce enregistrée.');
}

export async function deleteAnnouncement(f: FormData) {
  await requireAdmin();
  await db.announcement.delete({ where: { id: Number(f.get('id')) } });
  revalidatePath('/admin/announcements');
  redirect('/admin/announcements');
}
