'use client';
/**
 * Visual editor bridge. Active only when the shop runs inside the back-office editor frame
 * (admin session + iframe): hovering outlines editable elements, clicking one sends its
 * details to the editor, and the editor can preview changes live before saving.
 */
import { useEffect } from 'react';

const FRAGMENTS: [string, string][] = [
  ['header.whb-header', 'header'],
  ['footer.wd-footer', 'footer'],
  ['.mobile-nav', 'mobile-nav'],
  ['.wd-toolbar', 'toolbar'],
  ['.login-form-side', 'login-side'],
  ['.chaty', 'chaty'],
  ['.cky-consent-container, .cky-modal', 'cookie'],
  ['[data-bm-fragment]', ''],
];

function fragmentOf(el: Element) {
  for (const [sel, name] of FRAGMENTS) {
    const root = el.closest(sel);
    if (root) return name || root.getAttribute('data-bm-fragment') || '';
  }
  return '';
}

function ownText(el: Element) {
  return Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
}

export default function EditBridge() {
  useEffect(() => {
    if (window.self === window.top) return; // only inside the admin editor frame
    let editing = true;
    const style = document.createElement('style');
    style.textContent = `
      html.bm-editing [data-bm]:hover{outline:2px dashed #2fa9a9!important;outline-offset:2px;cursor:pointer!important}
      html.bm-editing [data-bm].bm-selected{outline:2px solid #e8590c!important;outline-offset:2px}
      html.bm-editing .wd-dropdown{transition:none}
      .cky-consent-container,.cky-overlay,.bm-popup-wrap{display:none!important}`;
    document.head.appendChild(style);
    document.documentElement.classList.add('bm-editing');
    const post = (m: unknown) => window.parent.postMessage(m, window.location.origin);

    const onClick = (e: MouseEvent) => {
      if (!editing) return;
      // announcement bars are managed in "Bandeaux & popups"
      const bar = (e.target as Element).closest('.bm-announce[data-ann-id]');
      if (bar) {
        e.preventDefault();
        e.stopPropagation();
        post({ type: 'bm-announce', id: Number(bar.getAttribute('data-ann-id')) });
        return;
      }
      const el = (e.target as Element).closest('[data-bm]');
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      document.querySelectorAll('.bm-selected').forEach((x) => x.classList.remove('bm-selected'));
      el.classList.add('bm-selected');
      const link = el.closest('a');
      const cs = getComputedStyle(el);
      post({
        type: 'bm-select',
        fragment: fragmentOf(el),
        key: el.getAttribute('data-bm'),
        tag: el.tagName.toLowerCase(),
        text: ownText(el),
        html: el.innerHTML.length < 4000 ? el.innerHTML : '',
        src: el.getAttribute('src') || '',
        alt: el.getAttribute('alt') || '',
        href: el.tagName === 'A' ? el.getAttribute('href') : link?.getAttribute('href') || '',
        linkKey: el.tagName === 'A' ? el.getAttribute('data-bm') : link?.getAttribute('data-bm') || '',
        isIcon: el.tagName === 'svg' || /icon/.test(el.getAttribute('class') || ''),
        bg: /url\(/.test(el.getAttribute('style') || ''),
        color: cs.color, background: cs.backgroundColor, fontSize: cs.fontSize,
        path: location.pathname,
      });
    };
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const m = e.data as { type: string; key?: string; kind?: string; value?: string; edit?: boolean };
      if (m.type === 'bm-mode') {
        editing = !!m.edit;
        document.documentElement.classList.toggle('bm-editing', editing);
      }
      if (m.type === 'bm-preview' && m.key) {
        const el = document.querySelector(`[data-bm="${m.key}"]`) as HTMLElement | null;
        if (!el) return;
        const v = m.value ?? '';
        if (m.kind === 'text') {
          const t = Array.from(el.childNodes).find((n) => n.nodeType === 3 && n.textContent!.trim());
          if (t) t.textContent = v; else el.append(v);
        }
        if (m.kind === 'html') el.innerHTML = v;
        if (m.kind === 'src') { el.setAttribute('src', v); el.removeAttribute('srcset'); }
        if (m.kind === 'hide') el.style.opacity = v === '1' ? '.25' : '';
        if (m.kind === 'style') el.setAttribute('style', `${el.getAttribute('style') || ''};${v}`);
      }
      if (m.type === 'bm-reload') location.reload();
    };
    document.addEventListener('click', onClick, true);
    window.addEventListener('message', onMessage);
    post({ type: 'bm-ready', path: location.pathname + location.search, title: document.title });
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('message', onMessage);
      style.remove();
    };
  }, []);
  return null;
}
