'use client';
import { useActionState, useState } from 'react';
import { saveMenus } from '../../actions/content';
import { LinkInput, MediaInput, SaveBar, type LinkOption } from '@/components/admin/ui';

type Item = { label: string; href: string; icon?: string; newTab?: boolean };

function ItemList({ title, items, onChange, links, withTab }: { title: string; items: Item[]; onChange: (v: Item[]) => void; links: LinkOption[]; withTab?: boolean }) {
  const set = (i: number, patch: Partial<Item>) => onChange(items.map((it, k) => (k === i ? { ...it, ...patch } : it)));
  const move = (i: number, d: number) => { const n = [...items]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
  return (
    <div className="card">
      <div className="card-head"><h2>{title}</h2><button type="button" className="btn btn-secondary btn-sm" onClick={() => onChange([...items, { label: '', href: '' }])}>+ Lien</button></div>
      <div className="card-body">
        {items.length === 0 && <p className="muted">Aucun lien ajouté.</p>}
        <div className="block-list">
          {items.map((it, i) => (
            <div className="block-card" key={i}>
              <div className="head">
                <strong>{it.label || 'Nouveau lien'}</strong>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(i, -1)}>↑</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(i, 1)}>↓</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(items.filter((_, k) => k !== i))}>✕</button>
              </div>
              <div className="body">
                <div className="cols-2">
                  <div className="field"><label>Texte</label><input value={it.label} onChange={(e) => set(i, { label: e.target.value })} /></div>
                  <div className="field"><label>Lien</label><LinkInput value={it.href} onChange={(v) => set(i, { href: v })} links={links} /></div>
                </div>
                <div className="field"><label>Icône (facultatif)</label><MediaInput value={it.icon || ''} onChange={(v) => set(i, { icon: v })} /></div>
                {withTab && <label className="check" style={{ marginTop: 8 }}><input type="checkbox" checked={!!it.newTab} onChange={(e) => set(i, { newTab: e.target.checked })} /> Ouvrir dans un nouvel onglet</label>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MenusForm({ headerExtra, mobileExtra, links }: { headerExtra: Item[]; mobileExtra: Item[]; links: LinkOption[] }) {
  const [state, action] = useActionState(saveMenus, null);
  const [head, setHead] = useState<Item[]>(headerExtra);
  const [mob, setMob] = useState<Item[]>(mobileExtra);
  return (
    <form action={action}>
      <input type="hidden" name="headerExtra" value={JSON.stringify(head)} />
      <input type="hidden" name="mobileExtra" value={JSON.stringify(mob)} />
      <ItemList title="Liens ajoutés au menu principal" items={head} onChange={setHead} links={links} withTab />
      <ItemList title="Liens ajoutés au menu mobile" items={mob} onChange={setMob} links={links} />
      <SaveBar state={state} />
    </form>
  );
}
