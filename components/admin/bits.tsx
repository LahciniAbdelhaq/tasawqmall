import Icon from '@/components/Icon';
import { ORDER_STATUSES } from '@/lib/orders';

/* small server-friendly building blocks for back-office pages */

export function PageTitle({ title, sub, children }: { title: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="page-title">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="actions">{children}</div>}
    </div>
  );
}

export function Kpi({ icon, label, value, delta, hint }: { icon: string; label: string; value: React.ReactNode; delta?: number | null; hint?: string }) {
  const cls = delta == null ? '' : delta > 0.5 ? 'up' : delta < -0.5 ? 'down' : 'flat';
  return (
    <div className="card kpi">
      <div className="label"><Icon name={icon} /> {label}</div>
      <div className="value">{value}</div>
      {delta != null && <div className={`delta ${cls}`}>{delta > 0 ? '▲' : delta < 0 ? '▼' : '•'} {Math.abs(delta).toFixed(0)}% vs période précédente</div>}
      {hint && <div className="delta flat">{hint}</div>}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const s = ORDER_STATUSES[status] ?? { label: status, tone: 'gray' };
  return <span className={`pill ${s.tone}`}>{s.label}</span>;
}

export function BarList({ rows, value = (r) => r.count ?? 0, format = (n) => String(n), empty = 'Aucune donnée.' }: {
  rows: { name: string; count?: number; [k: string]: unknown }[];
  value?: (r: { name: string; count?: number; [k: string]: unknown }) => number;
  format?: (n: number, r: { name: string; [k: string]: unknown }) => string;
  empty?: string;
}) {
  if (!rows.length) return <div className="empty" style={{ padding: 24 }}>{empty}</div>;
  const max = Math.max(...rows.map((r) => value(r) as number), 1);
  return (
    <div className="bar-list">
      {rows.map((r) => (
        <div className="row" key={r.name}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.name}>{r.name}</span>
          <strong>{format(value(r) as number, r)}</strong>
          <div className="bar"><span style={{ width: `${((value(r) as number) / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

export function PeriodTabs({ base, days, extra = '' }: { base: string; days: number; extra?: string }) {
  return (
    <div className="tabs">
      {[[1, "Aujourd'hui"], [7, '7 jours'], [30, '30 jours'], [90, '90 jours'], [365, '12 mois']].map(([d, l]) => (
        <a key={d} href={`${base}?days=${d}${extra}`} className={days === d ? 'on' : ''}>{l}</a>
      ))}
    </div>
  );
}

export const pct = (n: number) => `${n.toFixed(1).replace('.', ',')} %`;
export const dh = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} DH`;
/** 75 → "1 min 15 s", 3700 → "1 h 1 min" */
export const dur = (s: number) => {
  s = Math.round(s);
  return s < 60 ? `${s} s` : s < 3600 ? `${Math.floor(s / 60)} min${s % 60 ? ` ${s % 60} s` : ''}` : `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`;
};
