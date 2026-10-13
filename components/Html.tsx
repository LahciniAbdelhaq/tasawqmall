import * as cheerio from 'cheerio';
import { createElement, type CSSProperties, type ReactNode } from 'react';

const RENAME: Record<string, string> = {
  class: 'className', for: 'htmlFor', tabindex: 'tabIndex', readonly: 'readOnly', maxlength: 'maxLength',
  colspan: 'colSpan', rowspan: 'rowSpan', autocomplete: 'autoComplete', enctype: 'encType',
  crossorigin: 'crossOrigin', srcset: 'srcSet', fetchpriority: 'fetchPriority', inputmode: 'inputMode',
  spellcheck: 'spellCheck', contenteditable: 'contentEditable', 'accept-charset': 'acceptCharset',
  'http-equiv': 'httpEquiv', frameborder: 'frameBorder', allowfullscreen: 'allowFullScreen',
  novalidate: 'noValidate', playsinline: 'playsInline', autoplay: 'autoPlay', itemprop: 'itemProp',
  datetime: 'dateTime', viewbox: 'viewBox',
};
const BOOLEAN = new Set(['open', 'checked', 'disabled', 'selected', 'hidden', 'required', 'multiple', 'readOnly', 'autoPlay', 'muted', 'loop', 'controls', 'playsInline', 'noValidate', 'allowFullScreen']);
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

export function styleToObject(style: string): CSSProperties {
  const out: Record<string, string> = {};
  for (const decl of style.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const k = decl.slice(0, i).trim();
    const v = decl.slice(i + 1).trim();
    if (!k) continue;
    out[k.startsWith('--') ? k : k.toLowerCase().replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
  }
  return out as CSSProperties;
}

export function attrsToProps(attribs: Record<string, string>) {
  const props: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(attribs)) {
    const key = RENAME[name] ?? name;
    if (key === 'style') props.style = styleToObject(value);
    else if (BOOLEAN.has(key)) props[key] = true;
    else if (key === 'value') props.defaultValue = value;
    else props[key] = value;
  }
  return props;
}

/**
 * Renders an HTML fragment's top-level elements as real React elements (so no extra
 * wrapper changes the DOM the theme's CSS expects), each with its original inner HTML.
 */
export function Html({ html }: { html: string }): ReactNode {
  if (!html) return null;
  const $ = cheerio.load(html, null, false);
  return $.root().contents().toArray().map((node, i) => {
    if (node.type === 'text') return node.data.trim() ? node.data : null;
    if (node.type !== 'tag') return null;
    const props = { key: i, ...attrsToProps(node.attribs) };
    if (VOID.has(node.name)) return createElement(node.name, props);
    return createElement(node.name, { ...props, dangerouslySetInnerHTML: { __html: $(node).html() ?? '' } });
  });
}

/** The `.wd-page-content` wrapper every page body lives in. */
export function PageContent({ html, styles = [], fragment }: { html: string; styles?: string[]; fragment?: string }) {
  return (
    <>
      {styles.map((css, i) => <style key={i} dangerouslySetInnerHTML={{ __html: css }} />)}
      <div className="wd-page-content main-page-wrapper" data-bm-fragment={fragment} dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
