'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cartStore, cartTotal, useCart } from '@/lib/store';
import { shippingFor, zoneCities, type ShippingConfig } from '@/lib/shipping';
import { Amount } from './CartView';
import { useT } from './I18nProvider';

type Field = 'firstName' | 'lastName' | 'phone' | 'email' | 'city' | 'address' | 'notes';
type Promo = { code: string; type: string; value: number; minSubtotal: number; label: string };
const ORDERS_KEY = 'bm_orders_v1';

function discountFor(p: Promo | null, subtotal: number) {
  if (!p || subtotal < p.minSubtotal) return 0;
  if (p.type === 'percent') return Math.round(subtotal * Math.min(100, p.value)) / 100;
  if (p.type === 'fixed') return Math.min(subtotal, p.value);
  return 0;
}

/** WooCommerce checkout (billing form + promo code + order review), cash on delivery. */
export default function CheckoutView({ shipping }: { shipping: ShippingConfig }) {
  const lines = useCart();
  const router = useRouter();
  const t = useT();
  const [form, setForm] = useState<Record<Field, string>>({ firstName: '', lastName: '', phone: '', email: '', city: '', address: '', notes: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [promo, setPromo] = useState<Promo | null>(null);
  const [promoMsg, setPromoMsg] = useState('');
  const set = (k: Field) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (lines.length) window.dispatchEvent(new CustomEvent('bm:event', { detail: { name: 'InitiateCheckout', value: cartTotal(lines), ids: lines.map((l) => l.id) } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!lines.length && !busy) {
    return (
      <div className="wd-empty-cart-wrap">
        <p className="cart-empty wd-empty-page wc-empty-cart-message">{t('Votre panier est actuellement vide.')}</p>
        <p className="return-to-shop"><Link className="button wc-backward" href="/boutique">{t('Retour à la boutique')}</Link></p>
      </div>
    );
  }

  const subtotal = cartTotal(lines);
  const discount = discountFor(promo, subtotal);
  const ship = form.city ? shippingFor(shipping, form.city, subtotal - discount) : null;
  const shipFee = promo?.type === 'freeship' && subtotal >= promo.minSubtotal ? 0 : ship?.fee ?? 0;
  const total = Math.max(0, subtotal - discount) + shipFee;

  async function applyPromo() {
    setPromoMsg('');
    const r = await fetch(`/api/promo?code=${encodeURIComponent(code.trim())}&subtotal=${subtotal}`);
    const data = await r.json();
    if (!r.ok) { setPromo(null); setPromoMsg(data.error); return; }
    setPromo(data);
    setPromoMsg(data.label);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer: form, lines: lines.map((l) => ({ id: l.id, qty: l.qty })), promoCode: promo?.code, locale: t.locale }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Erreur');
      try {
        const mine = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
        localStorage.setItem(ORDERS_KEY, JSON.stringify([{ id: data.id, key: data.key, date: new Date().toISOString(), total: data.total }, ...mine].slice(0, 50)));
      } catch { /* storage blocked */ }
      window.dispatchEvent(new CustomEvent('bm:event', { detail: { name: 'Purchase', value: data.total, ids: lines.map((l) => l.id) } }));
      router.push(`/commande/${data.id}?key=${data.key}`);
      cartStore.clear();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const input = (k: Field, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, required = true) => (
    <p className={`form-row form-row-wide${required ? ' validate-required' : ''}`} id={`billing_${k}_field`}>
      <label htmlFor={`billing_${k}`}>{t(label)}&nbsp;{required ? <abbr className="required" title="obligatoire">*</abbr> : <span className="optional">{t('(facultatif)')}</span>}</label>
      <span className="woocommerce-input-wrapper">
        <input type="text" className="input-text" id={`billing_${k}`} name={k} value={form[k]} onChange={set(k)} required={required} {...props} />
      </span>
    </p>
  );

  return (
    <form className="checkout woocommerce-checkout bm-checkout" onSubmit={submit} noValidate={false}>
      {error && <ul className="woocommerce-error" role="alert"><li>{error}</li></ul>}
      <div className="bm-checkout-grid">
        <div className="col2-set" id="customer_details">
          <div className="woocommerce-billing-fields">
            <h3>{t('Détails de facturation')}</h3>
            <div className="woocommerce-billing-fields__field-wrapper">
              <div className="bm-row-2">
                {input('firstName', 'Prénom', { autoComplete: 'given-name' })}
                {input('lastName', 'Nom', { autoComplete: 'family-name' })}
              </div>
              {input('phone', 'Téléphone', { type: 'tel', autoComplete: 'tel', placeholder: '06 XX XX XX XX' })}
              {input('email', 'Adresse e-mail', { type: 'email', autoComplete: 'email' }, false)}
              {input('city', 'Ville', { list: 'bm-cities', autoComplete: 'address-level2' })}
              <datalist id="bm-cities">{zoneCities(shipping).map((c) => <option key={c} value={c} />)}</datalist>
              {input('address', 'Adresse', { autoComplete: 'street-address', placeholder: t('Numéro et nom de rue, quartier') })}
            </div>
          </div>
          <div className="woocommerce-additional-fields">
            <p className="form-row notes" id="order_comments_field">
              <label htmlFor="order_comments">{t('Notes de commande')}&nbsp;<span className="optional">{t('(facultatif)')}</span></label>
              <span className="woocommerce-input-wrapper">
                <textarea name="notes" className="input-text" id="order_comments" rows={3} value={form.notes} onChange={set('notes')}
                  placeholder={t('Commentaires concernant votre commande, ex. : consignes de livraison.')} />
              </span>
            </p>
          </div>
        </div>
        <div className="bm-order-review">
          <h3 id="order_review_heading">{t('Votre commande')}</h3>
          <div id="order_review" className="woocommerce-checkout-review-order">
            <table className="shop_table woocommerce-checkout-review-order-table">
              <thead><tr><th className="product-name">{t('Produit')}</th><th className="product-total">{t('Sous-total')}</th></tr></thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} className="cart_item">
                    <td className="product-name">{l.name}&nbsp;<strong className="product-quantity">×&nbsp;{l.qty}</strong></td>
                    <td className="product-total"><Amount n={l.price * l.qty} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="cart-subtotal"><th>{t('Sous-total')}</th><td><Amount n={subtotal} /></td></tr>
                {discount > 0 && <tr className="cart-discount"><th>{t('Réduction')} ({promo?.code})</th><td>−<Amount n={discount} /></td></tr>}
                <tr className="woocommerce-shipping-totals shipping">
                  <th>{t('Expédition')}</th>
                  <td>
                    {!ship ? t('Indiquez votre ville') : shipFee === 0 ? t('Livraison gratuite') : <><Amount n={shipFee} /><br /><small className="bm-hint">{t('Gratuite dès {n} DH', { n: ship.freeFrom })}</small></>}
                  </td>
                </tr>
                <tr className="order-total"><th>{t('Total')}</th><td><strong><Amount n={total} /></strong></td></tr>
              </tfoot>
            </table>
            <div className="bm-promo">
              <label htmlFor="bm-promo">{t('Code promo')}</label>
              <div className="bm-promo-row">
                <input id="bm-promo" type="text" className="input-text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
                <button type="button" className="button" onClick={applyPromo} disabled={!code.trim()}>{t('Appliquer')}</button>
              </div>
              {promoMsg && <small className={promo ? 'bm-promo-ok' : 'bm-promo-err'}>{promoMsg}</small>}
            </div>
            <div id="payment" className="woocommerce-checkout-payment">
              <ul className="wc_payment_methods payment_methods methods">
                <li className="wc_payment_method payment_method_cod">
                  <input id="payment_method_cod" type="radio" className="input-radio" name="payment_method" value="cod" defaultChecked />
                  <label htmlFor="payment_method_cod">{t('Paiement à la livraison')}</label>
                  <div className="payment_box payment_method_cod"><p>{t('Payez en espèces à la livraison.')}</p></div>
                </li>
              </ul>
              <div className="form-row place-order">
                <button type="submit" className="button alt" id="place_order" disabled={busy}>
                  {busy ? t('Traitement…') : t('Commander')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
