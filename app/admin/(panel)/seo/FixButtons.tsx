'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { compressImages, fixSeo } from '../../actions/seo';

const FIXES: { kind: 'meta' | 'title' | 'alt' | 'catdesc'; label: string; help: string }[] = [
  { kind: 'meta', label: 'Générer les méta descriptions manquantes', help: 'Produits, catégories et pages : description unique avec marque, prix et arguments de vente.' },
  { kind: 'title', label: 'Optimiser les titres trop longs / trop courts', help: 'Titres produits ≤ 65 caractères avec marque et « Maroc ».' },
  { kind: 'alt', label: 'Ajouter les textes alternatifs des images', help: 'D’après le titre, le lien ou le nom de fichier de chaque image.' },
  { kind: 'catdesc', label: 'Ajouter un texte de présentation aux catégories', help: 'Contenu unique (80+ mots) en haut de chaque catégorie, à personnaliser.' },
];

export default function FixButtons({ fixable }: { fixable: Record<string, number> }) {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const run = async (kind: (typeof FIXES)[number]['kind']) => {
    setBusy(kind); setMsg('');
    const r = await fixSeo(kind);
    setMsg(r?.message || '');
    setBusy('');
    router.refresh();
  };
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {msg && <div className="alert ok">{msg}</div>}
      {FIXES.map((f) => (
        <div key={f.kind} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ flex: 1 }}><strong>{f.label}</strong><div className="muted" style={{ fontSize: 12.5 }}>{f.help} {fixable[f.kind] ? `· ${fixable[f.kind]} élément(s) concerné(s)` : '· rien à corriger'}</div></div>
          <button type="button" className="btn btn-sm" disabled={!!busy || !fixable[f.kind]} onClick={() => run(f.kind)}>{busy === f.kind ? 'En cours…' : 'Corriger'}</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ flex: 1 }}><strong>Compresser les images lourdes</strong><div className="muted" style={{ fontSize: 12.5 }}>{fixable.images} image(s) de plus de 300 Ko — voir « Outils techniques ».</div></div>
        <a className="btn btn-secondary btn-sm" href="/admin/seo?tab=tools">Ouvrir</a>
      </div>
    </div>
  );
}

export function CompressButton({ count }: { count: number }) {
  const router = useRouter();
  const [state, setState] = useState<{ busy: boolean; done: number; saved: number; left: number; msg: string }>({ busy: false, done: 0, saved: 0, left: count, msg: '' });
  const run = async () => {
    setState((s) => ({ ...s, busy: true, msg: '' }));
    let left = count, saved = 0, done = 0;
    while (left > 0) {
      const r = await compressImages(20);
      if (!r?.ok) break;
      saved += r.saved || 0; done += 20; left = r.remaining ?? 0;
      setState({ busy: true, done, saved, left, msg: '' });
    }
    setState({ busy: false, done, saved, left: 0, msg: `Terminé : ${(saved / 1048576).toFixed(1)} Mo économisés.` });
    router.refresh();
  };
  return (
    <div>
      <button type="button" className="btn" disabled={state.busy || !count} onClick={run}>{state.busy ? `Compression… (${state.left} restantes)` : `Compresser ${count} image(s)`}</button>
      {state.busy && <span className="muted" style={{ marginLeft: 10 }}>{(state.saved / 1048576).toFixed(1)} Mo économisés</span>}
      {state.msg && <div className="alert ok" style={{ marginTop: 10 }}>{state.msg}</div>}
    </div>
  );
}
