/* Languages the shop can be shown in (shared by server and client code). */
export const LOCALES: Record<string, { name: string; native: string; dir: 'ltr' | 'rtl'; flag: string }> = {
  fr: { name: 'Français', native: 'Français', dir: 'ltr', flag: '🇫🇷' },
  en: { name: 'Anglais', native: 'English', dir: 'ltr', flag: '🇬🇧' },
  ar: { name: 'Arabe', native: 'العربية', dir: 'rtl', flag: '🇲🇦' },
  es: { name: 'Espagnol', native: 'Español', dir: 'ltr', flag: '🇪🇸' },
  de: { name: 'Allemand', native: 'Deutsch', dir: 'ltr', flag: '🇩🇪' },
  it: { name: 'Italien', native: 'Italiano', dir: 'ltr', flag: '🇮🇹' },
  nl: { name: 'Néerlandais', native: 'Nederlands', dir: 'ltr', flag: '🇳🇱' },
  pt: { name: 'Portugais', native: 'Português', dir: 'ltr', flag: '🇵🇹' },
  tr: { name: 'Turc', native: 'Türkçe', dir: 'ltr', flag: '🇹🇷' },
  zh: { name: 'Chinois', native: '中文', dir: 'ltr', flag: '🇨🇳' },
};
export const SOURCE_LOCALE = 'fr';
export const isRtl = (l: string) => LOCALES[l]?.dir === 'rtl';
