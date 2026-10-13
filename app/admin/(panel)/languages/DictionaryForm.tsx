'use client';
import { useMemo, useState } from 'react';
import SettingsForm from '@/components/admin/SettingsForm';

type Row = { src: string; builtin: string; custom: string };

/** Interface strings: the built-in translation is shown as placeholder; typing overrides it. */
export default function DictionaryForm({ locale, rows, all }: { locale: string; rows: Row[]; all: Record<string, Record<string, string>> }) {
  const [q, setQ] = useState('');
  const [onlyMissing, setOnlyMissing] = useState(false);
  const initial = useMemo(() => ({ ...all, [locale]: Object.fromEntries(rows.filter((r) => r.custom).map((r) => [r.src, r.custom])) }), [all, locale, rows]);
  const done = rows.filter((r) => r.builtin || r.custom).length;
  return (
    <SettingsForm group="dictionary" initial={initial as Record<string, unknown>}>
      {(raw, set) => {
        const v = raw as Record<string, Record<string, string>>;
        const cur = v[locale] || {};
        const shown = rows.filter((r) => (!q || r.src.toLowerCase().includes(q.toLowerCase()) || (cur[r.src] || r.builtin).toLowerCase().includes(q.toLowerCase())) && (!onlyMissing || !(cur[r.src] || r.builtin)));
        return (
          <div className="card">
            <div className="toolbar">
              <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un texte…" />
              <label className="check"><input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} /> Non traduits uniquement</label>
              <span className="muted" style={{ marginLeft: 'auto' }}>{done}/{rows.length} traduits ({Math.round((done / Math.max(1, rows.length)) * 100)} %)</span>
            </div>
            <div className="card-body" dir="auto">
              {shown.slice(0, 400).map((r) => (
                <div className="dict-row" key={r.src}>
                  <div className="src">{r.src}</div>
                  <textarea
                    dir={locale === 'ar' ? 'rtl' : 'ltr'}
                    value={cur[r.src] ?? ''}
                    placeholder={r.builtin || 'À traduire…'}
                    onChange={(e) => set({ [locale]: { ...cur, [r.src]: e.target.value } } as never)}
                  />
                </div>
              ))}
              {shown.length > 400 && <p className="muted">Affinez la recherche pour voir plus de lignes.</p>}
            </div>
          </div>
        );
      }}
    </SettingsForm>
  );
}
