'use client';
import { useState } from 'react';

export function CopyLink({ url }: { url: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="copy-field">
      <input className="input" value={url} readOnly onFocus={(e) => e.target.select()} />
      <button type="button" className="btn btn-secondary btn-sm" onClick={async () => { await navigator.clipboard.writeText(url).catch(() => {}); setDone(true); setTimeout(() => setDone(false), 1500); }}>
        {done ? 'Copié ✓' : 'Copier'}
      </button>
    </div>
  );
}
