'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

type Item = { id: number; type: string; text: string; link: string | null; image: string | null; bgColor: string; textColor: string; pages: string; animation?: string; speed?: number };

/** One announcement bar; also used as the live preview in the back-office. */
export function AnnounceBar({ a, onClose }: { a: Pick<Item, 'id' | 'text' | 'link' | 'bgColor' | 'textColor' | 'animation' | 'speed'>; onClose?: () => void }) {
  const anim = a.animation || 'none';
  return (
    <div className={`bm-announce bm-anim-${anim}`} data-ann-id={a.id} style={{ background: a.bgColor, color: a.textColor, ['--bm-speed' as string]: `${a.speed || 15}s` }}>
      <div className="bm-ann-track">
        <span className="bm-ann-item">{a.link ? <a href={a.link} style={{ color: a.textColor }}>{a.text}</a> : a.text}</span>
      </div>
      {onClose && <button type="button" aria-label="Fermer" onClick={onClose} style={{ color: a.textColor }}>×</button>}
    </div>
  );
}

const matches = (pages: string, path: string) =>
  !pages || pages.trim() === '*' || pages.split(',').map((p) => p.trim()).filter(Boolean).some((p) => (p === '/' ? path === '/' : path.startsWith(p)));

/** Top announcement bars and promotional popups managed from the back-office. */
export default function Announcements({ items }: { items: Item[] }) {
  const path = usePathname();
  const [closed, setClosed] = useState<number[]>([]);
  const [popup, setPopup] = useState<Item | null>(null);

  useEffect(() => {
    try { setClosed(JSON.parse(sessionStorage.getItem('bm_ann_closed') || '[]')); } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    if (window.self !== window.top) return;
    const next = items.find((a) => a.type === 'popup' && matches(a.pages, path) && !localStorage.getItem(`bm_ann_${a.id}`));
    if (!next) return;
    const t = window.setTimeout(() => setPopup(next), 2500);
    return () => window.clearTimeout(t);
  }, [items, path]);

  const close = (id: number) => {
    const next = [...closed, id];
    setClosed(next);
    try { sessionStorage.setItem('bm_ann_closed', JSON.stringify(next)); } catch { /* ignore */ }
  };
  const closePopup = () => {
    if (popup) try { localStorage.setItem(`bm_ann_${popup.id}`, '1'); } catch { /* ignore */ }
    setPopup(null);
  };

  const bars = items.filter((a) => a.type === 'bar' && matches(a.pages, path) && !closed.includes(a.id));
  return (
    <>
      {bars.map((a) => <AnnounceBar key={a.id} a={a} onClose={() => close(a.id)} />)}
      {popup && (
        <div className="bm-popup-wrap" role="dialog" aria-modal="true" onClick={closePopup}>
          <div className="bm-popup" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="bm-popup-close" aria-label="Fermer" onClick={closePopup}>×</button>
            {popup.image && (popup.link ? <a href={popup.link} onClick={closePopup}><img src={popup.image} alt="" /></a> : <img src={popup.image} alt="" />)}
            {popup.text && (
              <div className="bm-popup-text" style={{ background: popup.bgColor, color: popup.textColor }}>
                {popup.link ? <a href={popup.link} style={{ color: popup.textColor }} onClick={closePopup}>{popup.text}</a> : popup.text}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
