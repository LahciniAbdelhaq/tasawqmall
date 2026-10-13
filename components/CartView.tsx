'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CURRENCY, cartStore, cartTotal, fetchSnapshots, money, useCart } from '@/lib/store';
import { useT } from './I18nProvider';

export const Amount = ({ n }: { n: number }) => (
  <span className="woocommerce-Price-amount amount">
    <bdi><span className="woocommerce-Price-currencySymbol">{CURRENCY}</span>{money(n)}</bdi>
  </span>
);

/** WooCommerce cart page (table + totals) on the local cart. */
export default function CartView({ freeFrom }: { freeFrom: number }) {
  const lines = useCart();
  const t = useT();
  const params = useSearchParams();
  const [notice, setNotice] = useState('');

  // old "?add-to-cart=ID" links from the original site still work
  useEffect(() => {
    const id = Number(params.get('add-to-cart'));
    if (!id) return;
    fetchSnapshots([id]).then(([p]) => {
      if (p?.inStock) {
        cartStore.add(p, Math.max(1, Math.floor(Number(params.get('quantity')) || 1)));
        setNotice(`« ${p.name} » a été ajouté à votre panier.`);
      }
      window.history.replaceState(null, '', '/cart');
    }).catch(() => {});
  }, [params]);

  if (!lines.length) {
    return (
      <div className="wd-empty-cart-wrap">
        {notice && <div className="woocommerce-message" role="alert">{notice}</div>}
        <p className="cart-empty wd-empty-page wc-empty-cart-message">{t('Votre panier est actuellement vide.')}</p>
        <div className="wd-empty-page-text">{t('Avant de procéder au paiement, vous devez ajouter des produits à votre panier.')}</div>
        <p className="return-to-shop"><Link className="button wc-backward" href="/boutique">{t('Retour à la boutique')}</Link></p>
      </div>
    );
  }
  const subtotal = cartTotal(lines);
  return (
    <div className="bm-cart">
      {notice && <div className="woocommerce-message" role="alert">{notice}</div>}
      <div className="bm-cart-grid">
        <form className="woocommerce-cart-form" onSubmit={(e) => e.preventDefault()}>
          <table className="shop_table shop_table_responsive cart woocommerce-cart-form__contents" cellSpacing={0}>
            <thead>
              <tr>
                <th className="product-remove"><span className="screen-reader-text">Retirer</span></th>
                <th className="product-thumbnail"><span className="screen-reader-text">Image</span></th>
                <th className="product-name">{t('Produit')}</th>
                <th className="product-price">{t('Prix')}</th>
                <th className="product-quantity">{t('Quantité')}</th>
                <th className="product-subtotal">{t('Sous-total')}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id} className="woocommerce-cart-form__cart-item cart_item">
                  <td className="product-remove">
                    <a href="#" className="remove" aria-label={`Retirer ${l.name}`} onClick={(e) => { e.preventDefault(); cartStore.remove(l.id); }}>×</a>
                  </td>
                  <td className="product-thumbnail">
                    <Link href={`/product/${l.slug}`}><img width={400} height={457} src={l.image} alt={l.name} /></Link>
                  </td>
                  <td className="product-name" data-title="Produit"><Link href={`/product/${l.slug}`}>{l.name}</Link></td>
                  <td className="product-price" data-title="Prix">
                    {l.regularPrice > l.price && <del><Amount n={l.regularPrice} /></del>} <Amount n={l.price} />
                  </td>
                  <td className="product-quantity" data-title="Quantité">
                    <div className="quantity">
                      <input type="button" value="-" className="minus btn" aria-label="Diminuer la quantité"
                        onClick={() => cartStore.setQty(l.id, l.qty - 1)} />
                      <input type="number" className="input-text qty text" value={l.qty} min={1} max={l.stockQty}
                        aria-label="Quantité" onChange={(e) => cartStore.setQty(l.id, +e.target.value)} />
                      <input type="button" value="+" className="plus btn" aria-label="Augmenter la quantité"
                        onClick={() => cartStore.setQty(l.id, l.qty + 1)} />
                    </div>
                  </td>
                  <td className="product-subtotal" data-title="Sous-total"><Amount n={l.price * l.qty} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </form>
        <div className="cart-collaterals">
          <div className="cart_totals">
            <h2>{t('Total panier')}</h2>
            <table cellSpacing={0} className="shop_table shop_table_responsive">
              <tbody>
                <tr className="cart-subtotal"><th>{t('Sous-total')}</th><td data-title="Sous-total"><Amount n={subtotal} /></td></tr>
                <tr className="woocommerce-shipping-totals shipping">
                  <th>{t('Expédition')}</th>
                  <td data-title="Expédition">
                    {t('Calculée à la commande selon votre ville.')}
                    {subtotal < freeFrom && <small className="bm-hint">{t('Gratuite dès {n} DH', { n: freeFrom })}</small>}
                  </td>
                </tr>
                <tr className="order-total"><th>{t('Total')}</th><td data-title="Total"><strong><Amount n={subtotal} /></strong></td></tr>
              </tbody>
            </table>
            <div className="wc-proceed-to-checkout">
              <Link href="/checkout" className="checkout-button button alt wc-forward">{t('Valider la commande')}</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
