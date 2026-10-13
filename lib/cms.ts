import 'server-only';
import * as cheerio from 'cheerio';
import type { AnyNode, Element } from 'domhandler';
import { db } from './db';
import { SOURCE_LOCALE } from './locales';

/**
 * CMS layer: imported HTML fragments carry data-bm keys; admins' edits are stored as
 * ContentOverride rows (fragment, key, locale, kind, value) and applied at render time.
 * Language fallback: French edits apply to every language, then the language's own edits,
 * then the dictionary translates any remaining source text.
 */
export type OverrideKind = 'text' | 'html' | 'src' | 'alt' | 'href' | 'icon' | 'hide' | 'style' | 'bg';
type Row = { key: string; locale: string; kind: string; value: string };

let cache: { at: number; version: string; byFragment: Map<string, Row[]> } | null = null;

async function loadOverrides() {
  // version checked on every call: actions and pages may not share this module instance
  const v = (await db.setting.findUnique({ where: { key: 'content_version' } }))?.value ?? '0';
  if (cache && cache.version === v) return cache;
  const rows = await db.contentOverride.findMany({ select: { fragment: true, key: true, locale: true, kind: true, value: true } });
  const byFragment = new Map<string, Row[]>();
  for (const r of rows) {
    if (!byFragment.has(r.fragment)) byFragment.set(r.fragment, []);
    byFragment.get(r.fragment)!.push(r);
  }
  cache = { at: Date.now(), version: v, byFragment };
  return cache;
}

export async function bumpContent() {
  const v = String(Date.now());
  await db.setting.upsert({ where: { key: 'content_version' }, create: { key: 'content_version', value: v }, update: { value: v } });
  cache = null;
}

const SKIP_TEXT = new Set(['script', 'style', 'svg', 'noscript', 'textarea']);

function setOwnText($: cheerio.CheerioAPI, el: Element, value: string) {
  const texts = el.children.filter((c) => c.type === 'text' && (c as unknown as { data: string }).data.trim());
  if (!texts.length) {
    $(el).append(cheerio.load(value, null, false).text());
    return;
  }
  texts.forEach((t, i) => {
    const node = t as unknown as { data: string };
    const lead = node.data.match(/^\s*/)![0], trail = node.data.match(/\s*$/)![0];
    node.data = i === 0 ? lead + value + trail : '';
  });
}

function applyRow($: cheerio.CheerioAPI, r: Row) {
  const el = $(`[data-bm="${r.key}"]`).first();
  if (!el.length) return;
  const node = el.get(0) as Element;
  switch (r.kind as OverrideKind) {
    case 'text': setOwnText($, node, r.value); break;
    case 'html': el.html(r.value); break;
    case 'src':
      el.attr('src', r.value).removeAttr('srcset').removeAttr('sizes');
      break;
    case 'alt': el.attr('alt', r.value); break;
    case 'href': el.attr('href', r.value); break;
    case 'hide': if (r.value === '1') el.attr('style', `${el.attr('style') ?? ''};display:none!important`); break;
    case 'style': el.attr('style', `${el.attr('style') ?? ''};${r.value}`); break;
    case 'bg': el.attr('style', `${el.attr('style') ?? ''};background-image:url("${r.value}")`); break;
    case 'icon':
      if (node.tagName === 'svg' || node.tagName === 'img') {
        el.replaceWith(`<img src="${r.value.replace(/"/g, '&quot;')}" alt="" class="bm-icon-img" data-bm="${r.key}">`);
      } else {
        el.addClass('bm-icon-custom').attr('style', `${el.attr('style') ?? ''};--bm-icon:url("${r.value}")`);
      }
      break;
  }
}

/** Replace exact-matching text nodes (and placeholders) using the language dictionary. */
export function applyDictionary($: cheerio.CheerioAPI, dict: Record<string, string>) {
  if (!Object.keys(dict).length) return;
  const walk = (nodes: AnyNode[]) => {
    for (const n of nodes) {
      if (n.type === 'text') {
        const t = n as unknown as { data: string };
        const key = t.data.replace(/\s+/g, ' ').trim();
        if (key && dict[key]) {
          const lead = t.data.match(/^\s*/)![0], trail = t.data.match(/\s*$/)![0];
          t.data = lead + dict[key] + trail;
        }
      } else if (n.type === 'tag' && !SKIP_TEXT.has((n as Element).tagName)) {
        const el = n as Element;
        for (const a of ['placeholder', 'title', 'data-hover', 'aria-label', 'data-added-text']) {
          const v = el.attribs[a]?.trim();
          if (v && dict[v]) el.attribs[a] = dict[v];
        }
        walk(el.children);
      }
    }
  };
  walk($.root().children().toArray() as AnyNode[]);
}

/**
 * Applies CMS edits for one fragment (and optionally translates leftovers).
 * `extraFragments` lets templates share edits (e.g. product template edits on every product).
 */
export async function renderFragment(html: string, fragment: string, locale: string, dict: Record<string, string> = {}) {
  if (!html) return html;
  const { byFragment } = await loadOverrides();
  const rows = byFragment.get(fragment) ?? [];
  const $ = cheerio.load(html, null, false);
  for (const r of rows) if (r.locale === SOURCE_LOCALE) applyRow($, r);
  if (locale !== SOURCE_LOCALE) for (const r of rows) if (r.locale === locale) applyRow($, r);
  if (locale !== SOURCE_LOCALE) applyDictionary($, dict);
  return $.html();
}

/** Overrides of a fragment, for the admin editor. */
export async function fragmentOverrides(fragment: string) {
  return db.contentOverride.findMany({ where: { fragment }, orderBy: { updatedAt: 'desc' } });
}
