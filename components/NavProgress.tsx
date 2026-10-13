'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

/*
 * Retour visuel de chargement, commun boutique + back-office :
 *  - barre de progression en haut de l'écran à chaque clic sur un lien interne ou envoi de formulaire ;
 *  - spinner dans le bouton qui a envoyé le formulaire, jusqu'à la réponse du serveur.
 */

const CSS = `
.nprogress{position:fixed;top:0;left:0;height:3px;z-index:9999;pointer-events:none;
  background:var(--c-primary,var(--a-primary,#C8861A));box-shadow:0 0 10px var(--c-primary,var(--a-primary,#C8861A));
  transition:width .3s ease,opacity .4s ease;border-radius:0 3px 3px 0}
.nprogress::after{content:'';position:absolute;right:0;top:0;height:100%;width:80px;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.7));animation:npShine 1s linear infinite}
@keyframes npShine{from{opacity:.2}50%{opacity:1}to{opacity:.2}}
.is-loading{position:relative!important;color:transparent!important;pointer-events:none}
.is-loading>*{visibility:hidden}
.is-loading::after{content:'';position:absolute;inset:0;margin:auto;width:16px;height:16px;border-radius:50%;
  border:2px solid currentColor;border-color:var(--spin,#fff) var(--spin,#fff) transparent transparent;animation:npSpin .7s linear infinite}
.btn-secondary.is-loading,.btn-ghost.is-loading,.icon-btn.is-loading,.btn--ghost.is-loading,.btn-danger.is-loading{--spin:var(--c-primary,var(--a-primary,#C8861A))}
@keyframes npSpin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.nprogress::after,.is-loading::after{animation-duration:2s}}
`;

function Bar() {
  const path = usePathname();
  const search = useSearchParams();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const active = useRef(false);
  const buttons = useRef<Set<HTMLElement>>(new Set());

  const start = () => {
    if (active.current) return;
    active.current = true;
    setVisible(true);
    setWidth(8);
    timer.current && clearInterval(timer.current);
    // progression qui ralentit à l'approche de 90 %
    timer.current = setInterval(() => setWidth((w) => (w < 90 ? w + (90 - w) * 0.08 : w)), 200);
  };
  const done = () => {
    buttons.current.forEach((b) => b.classList.remove('is-loading'));
    buttons.current.clear();
    if (!active.current) return;
    active.current = false;
    timer.current && clearInterval(timer.current);
    setWidth(100);
    setTimeout(() => { setVisible(false); setWidth(0); }, 350);
  };

  // la navigation est terminée quand l'URL a changé
  useEffect(() => { done(); }, [path, search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // phase de capture : <Link> de Next appelle preventDefault() pour la navigation côté client
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // ancre, même page
      start();
    };

    let quiet: ReturnType<typeof setTimeout> | null = null;
    let fallback: ReturnType<typeof setTimeout> | null = null;
    let observer: MutationObserver | null = null;
    const onSubmit = (e: SubmitEvent) => {
      // phase de capture : React annule l'envoi natif des formulaires à action serveur.
      // Les annulations (confirmations) se font au clic, avant tout envoi.
      const btn = (e.submitter as HTMLElement | null) || (e.target as HTMLFormElement).querySelector<HTMLElement>('button[type=submit],button:not([type])');
      if (btn) { btn.classList.add('is-loading'); buttons.current.add(btn); }
      start();
      // action serveur sans changement d'URL : terminé quand la page a été mise à jour puis s'est stabilisée
      observer?.disconnect();
      const t0 = Date.now();
      observer = new MutationObserver(() => {
        if (Date.now() - t0 < 250) return;
        quiet && clearTimeout(quiet);
        quiet = setTimeout(() => { observer?.disconnect(); done(); }, 300);
      });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      fallback && clearTimeout(fallback);
      fallback = setTimeout(() => { observer?.disconnect(); done(); }, 15000);
    };

    document.addEventListener('click', onClick, true);
    window.addEventListener('submit', onSubmit, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('submit', onSubmit, true);
      observer?.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return visible ? <div className="nprogress" style={{ width: `${width}%`, opacity: width >= 100 ? 0 : 1 }} role="progressbar" aria-label="Chargement" /> : null;
}

export default function NavProgress() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <Suspense fallback={null}><Bar /></Suspense>
    </>
  );
}
