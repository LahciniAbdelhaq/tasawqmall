'use client';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';

const TEAL = '#2FA9A9';
const COLORS = ['#2FA9A9', '#F2994A', '#6C63FF', '#EB5757', '#27AE60', '#F2C94C', '#56CCF2', '#BB6BD9', '#828282'];
const GRID = '#E5EDEE';
const axis = { tick: { fill: '#3E5257', fontSize: 11.5 }, axisLine: false, tickLine: false } as const;
const tip = { borderRadius: 10, border: '1px solid #DFE8E9', fontSize: 12.5 };

type Point = Record<string, string | number>;

/** Daily time series; `keys` = [dataKey, label, color?] */
export function TimeChart({ data, keys, unit = '', height = 280 }: { data: Point[]; keys: [string, string, string?][]; unit?: string; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label={keys.map((k) => k[1]).join(', ')}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <defs>
            {keys.map(([k, , c], i) => (
              <linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c || COLORS[i]} stopOpacity={0.28} />
                <stop offset="100%" stopColor={c || COLORS[i]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" {...axis} minTickGap={18} />
          <YAxis {...axis} width={48} allowDecimals={false} />
          <Tooltip formatter={(v, name) => [`${Math.round(Number(v)).toLocaleString('fr-FR')}${unit}`, name]} contentStyle={tip} />
          {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 12.5 }} />}
          {keys.map(([k, label, c], i) => (
            <Area key={k} type="monotone" dataKey={k} name={label} stroke={c || COLORS[i]} strokeWidth={2} fill={`url(#g-${k})`} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarsChart({ data, dataKey, label, height = 260 }: { data: Point[]; dataKey: string; label: string; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" {...axis} minTickGap={12} />
          <YAxis {...axis} width={40} allowDecimals={false} />
          <Tooltip contentStyle={tip} />
          <Bar dataKey={dataKey} name={label} fill={TEAL} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Donut({ data, height = 230 }: { data: { name: string; count: number }[]; height?: number }) {
  if (!data.length) return <div className="empty" style={{ padding: 24 }}>Aucune donnée.</div>;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={tip} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
