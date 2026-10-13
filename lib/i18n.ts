import 'server-only';
import { cookies, headers } from 'next/headers';
import { getSettings } from './settings';
import { BUILTIN_DICTIONARY, translate } from './dictionary';
import { LOCALES, SOURCE_LOCALE } from './locales';

/** Active language: ?lang= (via middleware header) > cookie > site default. */
export async function getLocale(): Promise<string> {
  const s = await getSettings();
  const enabled = s.languages.enabled.filter((l) => LOCALES[l]);
  const h = (await headers()).get('x-bm-locale');
  const c = (await cookies()).get('bm_lang')?.value;
  for (const cand of [h, c, s.languages.default]) if (cand && enabled.includes(cand)) return cand;
  return enabled[0] || SOURCE_LOCALE;
}

export async function getDictionary(locale: string): Promise<Record<string, string>> {
  if (locale === SOURCE_LOCALE) return {};
  const s = await getSettings();
  return { ...(BUILTIN_DICTIONARY[locale] || {}), ...(s.dictionary[locale] || {}) };
}

export async function getI18n() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  return { locale, dict, t: (s: string, vars?: Record<string, string | number>) => translate(dict, s, vars) };
}
export type I18n = Awaited<ReturnType<typeof getI18n>>;
