'use client';
import { useActionState, useState } from 'react';
import { saveTexts } from '../../actions/content';
import { SaveBar } from '@/components/admin/ui';

type Row = { key: string; text: string; value: string; auto: string };

/** Translation table of one page/fragment: French text → this language. */
export default function TextsForm({ fragment, locale, rows }: { fragment: string; locale: string; rows: Row[] }) {
  const [state, action] = useActionState(saveTexts, null);
  const [values, setValues] = useState<Record<string, string>>(Object.fromEntries(rows.map((r) => [r.key, r.value])));
  const [q, setQ] = useState('');
  const changed = rows.filter((r) => (values[r.key] ?? '') !== r.value);
  const done = rows.filter((r) => values[r.key] || r.auto).length;
  const shown = rows.filter((r) => !q || r.text.toLowerCase().includes(q.toLowerCase()));
  return (
    <form action={action}>
      <input type="hidden" name="rows" value={JSON.stringify(changed.map((r) => ({ fragment, key: r.key, locale, value: values[r.key] ?? '' })))} />
      <div className="card">
        <div className="toolbar">
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" />
          <span className="muted" style={{ marginLeft: 'auto' }}>{done}/{rows.length} traduits · {changed.length} modification(s) non enregistrée(s)</span>
        </div>
        <div className="card-body">
          {shown.length === 0 && <p className="muted">Aucun texte.</p>}
          {shown.map((r) => (
            <div className="dict-row" key={r.key}>
              <div className="src">{r.text}<div className="muted" style={{ fontSize: 11 }}>{r.key}</div></div>
              <textarea dir={locale === 'ar' ? 'rtl' : 'ltr'} value={values[r.key] ?? ''} placeholder={r.auto || 'À traduire…'} onChange={(e) => setValues({ ...values, [r.key]: e.target.value })} />
            </div>
          ))}
        </div>
      </div>
      <SaveBar state={state} label={`Enregistrer (${changed.length})`} />
    </form>
  );
}
