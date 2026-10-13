/**
 * Delivery tariffs. Defaults follow the site's "Nos tarifs de livraison" banner
 * (Casablanca/Rabat/… 15 DH free ≥150; Témara/Salé 15 DH free ≥300; elsewhere 25 DH free ≥300)
 * and are editable in the back-office. Shared by checkout and the order API.
 */
export type ShippingConfig = {
  zones: { name: string; cities: string; fee: number; freeFrom: number }[];
  otherFee: number;
  otherFreeFrom: number;
};

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');

export function shippingFor(cfg: ShippingConfig, city: string, subtotal: number) {
  const c = fold(city);
  const zone = cfg.zones.find((z) => z.cities.split(',').map(fold).filter(Boolean).includes(c));
  const fee = zone ? zone.fee : cfg.otherFee;
  const freeFrom = zone ? zone.freeFrom : cfg.otherFreeFrom;
  return { fee: freeFrom > 0 && subtotal >= freeFrom ? 0 : fee, freeFrom, baseFee: fee, zone: zone?.name ?? null };
}

export const zoneCities = (cfg: ShippingConfig) =>
  [...new Set(cfg.zones.flatMap((z) => z.cities.split(',').map((x) => x.trim()).filter(Boolean)))];
export const lowestFreeFrom = (cfg: ShippingConfig) => Math.min(...cfg.zones.map((z) => z.freeFrom).filter((n) => n > 0), cfg.otherFreeFrom || Infinity);
