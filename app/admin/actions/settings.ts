'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { DEFAULTS, saveSetting, type SettingKey } from '@/lib/settings';
import { bumpContent } from '@/lib/cms';
import { fail, json, ok, str, type Result } from '@/lib/form';

const EDITABLE: SettingKey[] = ['brand', 'theme', 'languages', 'seo', 'ads', 'injection', 'shipping', 'orders', 'dictionary'];

/** Saves one settings group (JSON in "value"), keeping only known fields. */
export async function saveSettings(_: Result, f: FormData): Promise<Result> {
  const admin = await requireAdmin();
  const key = str(f, 'key') as SettingKey;
  if (!EDITABLE.includes(key)) return fail('Réglage inconnu.');
  if ((key === 'injection' || key === 'ads') && admin.role !== 'admin') return fail('Réservé aux administrateurs.');
  const value = json<Record<string, unknown>>(f, 'value', {});
  const allowed = DEFAULTS[key] as Record<string, unknown>;
  const clean = key === 'dictionary'
    // empty entries fall back to the built-in translation instead of hiding it
    ? Object.fromEntries(Object.entries(value).filter(([l]) => /^[a-z]{2}$/.test(l)).map(([l, d]) => [l, Object.fromEntries(Object.entries(d as Record<string, string>).filter(([, t]) => typeof t === 'string' && t.trim()))]))
    : Object.fromEntries(Object.entries(value).filter(([k]) => k in allowed));
  if (key === 'languages') {
    const v = clean as { enabled?: string[]; default?: string };
    if (!v.enabled?.length) return fail('Activez au moins une langue.');
    if (v.default && !v.enabled.includes(v.default)) return fail('La langue par défaut doit être activée.');
  }
  await saveSetting(key, clean as never);
  if (key === 'dictionary' || key === 'languages') await bumpContent();
  revalidatePath('/', 'layout');
  return ok('Réglages enregistrés.');
}
