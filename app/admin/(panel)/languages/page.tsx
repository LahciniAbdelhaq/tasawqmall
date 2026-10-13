import * as cheerio from 'cheerio';
import { db } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { htmlFile } from '@/lib/render';
import { LOCALES } from '@/lib/locales';
import { BUILTIN_DICTIONARY } from '@/lib/dictionary';
import { PageTitle } from '@/components/admin/bits';
import LanguagesForm from './LanguagesForm';
import DictionaryForm from './DictionaryForm';
import TextsForm from './TextsForm';

export const metadata = { title: 'Langues & traductions' };

const FRAGMENTS: [string, string, string][] = [
  ['header', 'En-tête', 'header.html'], ['footer', 'Pied de page', 'footer.html'], ['mobile-nav', 'Menu mobile', 'mobile-nav.html'],
  ['tpl-product', 'Fiche produit (modèle)', 'templates/product.html'], ['tpl-archive', 'Page catégorie (modèle)', 'templates/archive.html'],
  ['home', 'Accueil', 'pages/home.html'], ['marques', 'Marques', 'pages/marques.html'], ['privacy-policy', 'Confidentialité', 'pages/privacy-policy.html'],
  ['cookie', 'Bandeau cookies', 'cookie.html'], ['toolbar', 'Barre mobile', 'toolbar.html'],
];

/** Visible texts of a fragment: [key, french text] (skips product cards and numbers). */
function fragmentTexts(file: string) {
  const $ = cheerio.load(htmlFile(file), null, false);
  const out: { key: string; text: string }[] = [];
  const seen = new Set<string>();
  $('[data-bm]').each((_, el) => {
    if ($(el).closest('.wd-product, .wd-swatches-brands, select, script, style').length) return;
    const t = (el.children || []).filter((c) => c.type === 'text').map((c) => (c as unknown as { data: string }).data).join(' ').replace(/\s+/g, ' ').trim();
    if (!t || t.length < 2 || /^[\d\s.,:%+()\/–-]+$/.test(t) || seen.has(t)) return;
    seen.add(t);
    out.push({ key: $(el).attr('data-bm')!, text: t });
  });
  return out;
}

export default async function LanguagesPage({ searchParams }: { searchParams: Promise<{ tab?: string; locale?: string; fragment?: string }> }) {
  const sp = await searchParams;
  const s = await getSettings();
  const targets = s.languages.enabled.filter((l) => l !== 'fr' && LOCALES[l]);
  const locale = sp.locale && targets.includes(sp.locale) ? sp.locale : targets[0];
  const tab = sp.tab || 'settings';
  const fragment = FRAGMENTS.find((f) => f[0] === sp.fragment) ?? FRAGMENTS[0];

  let dictRows: { src: string; builtin: string; custom: string }[] = [];
  let textRows: { key: string; text: string; value: string; auto: string }[] = [];
  if (locale && tab === 'dictionary') {
    const builtin = BUILTIN_DICTIONARY[locale] || {};
    const custom = s.dictionary[locale] || {};
    const sources = new Set([...Object.keys(BUILTIN_DICTIONARY.en || {}), ...Object.keys(custom)]);
    for (const [, , file] of FRAGMENTS.slice(0, 5)) for (const t of fragmentTexts(file)) if (t.text.length < 120) sources.add(t.text);
    dictRows = [...sources].map((src) => ({ src, builtin: builtin[src] || '', custom: custom[src] || '' }));
  }
  if (locale && tab === 'pages') {
    const rows = await db.contentOverride.findMany({ where: { fragment: fragment[0], kind: 'text', locale: { in: ['fr', locale] } } });
    const dict = { ...(BUILTIN_DICTIONARY[locale] || {}), ...(s.dictionary[locale] || {}) };
    textRows = fragmentTexts(fragment[2]).map((t) => {
      const fr = rows.find((r) => r.key === t.key && r.locale === 'fr')?.value || t.text;
      return { key: t.key, text: fr, value: rows.find((r) => r.key === t.key && r.locale === locale)?.value || '', auto: dict[fr] || '' };
    });
  }
  const tabLink = (t: string, extra = '') => `/admin/languages?tab=${t}${locale ? `&locale=${locale}` : ''}${extra}`;

  return (
    <>
      <PageTitle title="Langues & traductions" sub="Le français est la langue source. Chaque visiteur choisit sa langue via le sélecteur du menu (ou ?lang=en dans l’adresse)." />
      <div className="tabs" style={{ marginBottom: 16 }}>
        <a href={tabLink('settings')} className={tab === 'settings' ? 'on' : ''}>Langues du site</a>
        <a href={tabLink('dictionary')} className={tab === 'dictionary' ? 'on' : ''}>Dictionnaire de l’interface</a>
        <a href={tabLink('pages')} className={tab === 'pages' ? 'on' : ''}>Textes des pages</a>
      </div>

      {tab === 'settings' && <LanguagesForm initial={s.languages} all={Object.entries(LOCALES).map(([code, l]) => ({ code, name: `${l.flag} ${l.name} (${l.native})`, rtl: l.dir === 'rtl' }))} />}

      {tab !== 'settings' && !locale && <div className="alert info">Activez au moins une langue en plus du français.</div>}

      {tab !== 'settings' && locale && (
        <div className="tabs" style={{ marginBottom: 14 }}>
          {targets.map((l) => <a key={l} href={`/admin/languages?tab=${tab}&locale=${l}${tab === 'pages' ? `&fragment=${fragment[0]}` : ''}`} className={l === locale ? 'on' : ''}>{LOCALES[l].flag} {LOCALES[l].name}</a>)}
        </div>
      )}

      {tab === 'dictionary' && locale && <DictionaryForm locale={locale} rows={dictRows} all={s.dictionary} />}

      {tab === 'pages' && locale && (
        <>
          <div className="tabs" style={{ marginBottom: 14 }}>
            {FRAGMENTS.map((f) => <a key={f[0]} href={`/admin/languages?tab=pages&locale=${locale}&fragment=${f[0]}`} className={f[0] === fragment[0] ? 'on' : ''}>{f[1]}</a>)}
          </div>
          <TextsForm key={`${fragment[0]}-${locale}`} fragment={fragment[0]} locale={locale} rows={textRows} />
        </>
      )}
    </>
  );
}
