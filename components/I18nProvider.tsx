'use client';
import { createContext, useContext } from 'react';
import { translate } from '@/lib/dictionary';

type Ctx = { locale: string; dict: Record<string, string> };
const I18nCtx = createContext<Ctx>({ locale: 'fr', dict: {} });

export function I18nProvider({ locale, dict, children }: Ctx & { children: React.ReactNode }) {
  return <I18nCtx.Provider value={{ locale, dict }}>{children}</I18nCtx.Provider>;
}

/** t('Texte français', { n: 3 }) in the visitor's language */
export function useT() {
  const { dict, locale } = useContext(I18nCtx);
  const t = (s: string, vars?: Record<string, string | number>) => translate(dict, s, vars);
  return Object.assign(t, { locale });
}
