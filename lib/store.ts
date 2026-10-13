/**
 * Browser-side cart & wishlist, persisted in localStorage and shared between the React
 * islands (side cart, cart/checkout pages) and the DOM runtime that drives the theme markup.
 */
import { useSyncExternalStore } from 'react';

export type CartLine = {
  id: number;
  qty: number;
  slug: string;
  name: string;
  price: number;
  regularPrice: number;
  image: string;
  stockQty?: number;
};
export type ProductSnapshot = Omit<CartLine, 'qty'> & { inStock: boolean };

const CART_KEY = 'bm_cart_v1';
const WISH_KEY = 'bm_wishlist_v1';
const listeners = new Set<() => void>();

function readJson<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* private mode / quota: keep the in-memory copy */
  }
}

let cart: CartLine[] | null = null;
let wish: number[] | null = null;
const getCart = () => (cart ??= typeof window === 'undefined' ? [] : readJson<CartLine[]>(CART_KEY, []));
const getWish = () => (wish ??= typeof window === 'undefined' ? [] : readJson<number[]>(WISH_KEY, []));
const EMPTY_CART: CartLine[] = [];
const EMPTY_WISH: number[] = [];

function emit() {
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === CART_KEY) cart = null;
    if (e.key === WISH_KEY) wish = null;
    if (e.key === CART_KEY || e.key === WISH_KEY) emit();
  });
}

const clampQty = (q: number, max?: number) => Math.max(1, Math.min(Math.floor(q) || 1, max || 999));

export const cartStore = {
  get: getCart,
  add(p: ProductSnapshot, qty = 1) {
    const lines = [...getCart()];
    const i = lines.findIndex((l) => l.id === p.id);
    const { inStock: _ignored, ...snap } = p;
    if (i >= 0) lines[i] = { ...lines[i], ...snap, qty: clampQty(lines[i].qty + qty, p.stockQty) };
    else lines.push({ ...snap, qty: clampQty(qty, p.stockQty) });
    cart = lines;
    writeJson(CART_KEY, lines);
    emit();
  },
  setQty(id: number, qty: number) {
    cart = getCart().map((l) => (l.id === id ? { ...l, qty: clampQty(qty, l.stockQty) } : l));
    writeJson(CART_KEY, cart);
    emit();
  },
  remove(id: number) {
    cart = getCart().filter((l) => l.id !== id);
    writeJson(CART_KEY, cart);
    emit();
  },
  /** refresh names/prices from the server copy; drops products that no longer exist */
  sync(fresh: ProductSnapshot[]) {
    const byId = new Map(fresh.map((p) => [p.id, p]));
    cart = getCart().filter((l) => byId.get(l.id)?.inStock).map((l) => {
      const { inStock: _i, ...snap } = byId.get(l.id)!;
      return { ...l, ...snap, qty: clampQty(l.qty, snap.stockQty) };
    });
    writeJson(CART_KEY, cart);
    emit();
  },
  clear() {
    cart = [];
    writeJson(CART_KEY, cart);
    emit();
  },
};

export const wishlistStore = {
  get: getWish,
  has: (id: number) => getWish().includes(id),
  toggle(id: number) {
    wish = getWish().includes(id) ? getWish().filter((x) => x !== id) : [...getWish(), id];
    writeJson(WISH_KEY, wish);
    emit();
    return wish.includes(id);
  },
  remove(id: number) {
    wish = getWish().filter((x) => x !== id);
    writeJson(WISH_KEY, wish);
    emit();
  },
};

export const subscribeStore = subscribe;
export const useCart = () => useSyncExternalStore(subscribe, getCart, () => EMPTY_CART);
export const useWishlist = () => useSyncExternalStore(subscribe, getWish, () => EMPTY_WISH);

export const cartCount = (lines: CartLine[]) => lines.reduce((s, l) => s + l.qty, 0);
export const cartTotal = (lines: CartLine[]) => Math.round(lines.reduce((s, l) => s + l.qty * l.price, 0) * 100) / 100;

export async function fetchSnapshots(ids: number[]): Promise<ProductSnapshot[]> {
  if (!ids.length) return [];
  const r = await fetch(`/api/products?ids=${ids.join(',')}`);
  if (!r.ok) throw new Error('products');
  return r.json();
}

export const CURRENCY = 'د.م.';
export const money = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

