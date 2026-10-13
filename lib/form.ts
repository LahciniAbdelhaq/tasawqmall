/* FormData helpers + result type shared by the back-office server actions. */
export type Result = { ok: boolean; message: string; id?: number | string } | null;
export const ok = (message = 'Modifications enregistrées.', id?: number | string): Result => ({ ok: true, message, id });
export const fail = (message: string): Result => ({ ok: false, message });

export const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
export const optStr = (f: FormData, k: string) => str(f, k) || null;
export const num = (f: FormData, k: string, d = 0) => {
  const n = Number(String(f.get(k) ?? '').replace(',', '.'));
  return String(f.get(k) ?? '').trim() !== '' && Number.isFinite(n) ? n : d;
};
export const optNum = (f: FormData, k: string) => (str(f, k) === '' ? null : num(f, k));
export const bool = (f: FormData, k: string) => ['on', 'true', '1'].includes(String(f.get(k)));
export const json = <T,>(f: FormData, k: string, d: T): T => {
  try {
    return JSON.parse(String(f.get(k) ?? '')) as T;
  } catch {
    return d;
  }
};
export const date = (f: FormData, k: string) => (str(f, k) ? new Date(str(f, k)) : null);

export const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);

export const money = (n: number) => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`;
export const fmtDate = (d: Date | string) => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const fmtDay = (d: Date | string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
