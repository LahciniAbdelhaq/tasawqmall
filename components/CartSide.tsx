'use client';
import Link from 'next/link';
import { CURRENCY, cartStore, cartTotal, money, useCart } from '@/lib/store';
import { useT } from './I18nProvider';

const Amount = ({ n }: { n: number }) => (
  <span className="woocommerce-Price-amount amount">
    <bdi><span className="woocommerce-Price-currencySymbol">{CURRENCY}</span>{money(n)}</bdi>
  </span>
);

/** The theme's off-canvas mini cart (`.cart-widget-side`), driven by the local cart. */
export default function CartSide() {
  const lines = useCart();
  const t = useT();
  return (
    <div className="cart-widget-side wd-side-hidden wd-right bm-react" role="complementary" aria-label="Shopping cart sidebar">
      <div className="wd-heading">
        <span className="title">{t('Panier')}</span>
        <div className="close-side-widget wd-action-btn wd-style-text wd-cross-icon">
          <a href="#" rel="nofollow">{t('Fermer')}</a>
        </div>
      </div>
      <div className="widget woocommerce widget_shopping_cart">
        <div className="widget_shopping_cart_content">
          <div className="shopping-cart-widget-body wd-scroll">
            <div className="wd-scroll-content">
              {lines.length === 0 ? (
                <div className="wd-empty-mini-cart">
                  <p className="woocommerce-mini-cart__empty-message empty title">{t('Votre panier est vide.')}</p>
                  <Link className="btn wc-backward" href="/boutique">{t('Retour à la boutique')}</Link>
                </div>
              ) : (
                <ul className="cart_list product_list_widget woocommerce-mini-cart">
                  {lines.map((l) => (
                    <li key={l.id} className="woocommerce-mini-cart-item mini_cart_item">
                      <Link href={`/product/${l.slug}`} className="cart-item-link wd-fill">Afficher</Link>
                      <a
                        href="#"
                        className="remove remove_from_cart_button"
                        aria-label={`Retirer ${l.name} du panier`}
                        onClick={(e) => { e.preventDefault(); cartStore.remove(l.id); }}
                      >×</a>
                      <Link href={`/product/${l.slug}`} className="cart-item-image">
                        <img width={400} height={457} src={l.image} alt={l.name} />
                      </Link>
                      <div className="cart-info">
                        <span className="wd-entities-title">{l.name}</span>
                        <div className="quantity">
                          <input type="button" value="-" className="minus btn" aria-label="Diminuer la quantité"
                            onClick={() => (l.qty > 1 ? cartStore.setQty(l.id, l.qty - 1) : cartStore.remove(l.id))} />
                          <input type="number" className="input-text qty text" value={l.qty} min={1} max={l.stockQty}
                            aria-label="Quantité" onChange={(e) => cartStore.setQty(l.id, +e.target.value)} />
                          <input type="button" value="+" className="plus btn" aria-label="Augmenter la quantité"
                            onClick={() => cartStore.setQty(l.id, l.qty + 1)} />
                        </div>
                        <span className="quantity">{l.qty} × <Amount n={l.price} /></span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className={`shopping-cart-widget-footer${lines.length ? '' : ' wd-cart-empty'}`}>
            {lines.length > 0 && (
              <>
                <p className="woocommerce-mini-cart__total total">
                  <strong>{t('Sous-total :')}</strong> <Amount n={cartTotal(lines)} />
                </p>
                <p className="woocommerce-mini-cart__buttons buttons">
                  <Link href="/cart" className="button btn-cart wc-forward">{t('Voir le panier')}</Link>
                  <Link href="/checkout" className="button checkout wc-forward">{t('Commander')}</Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
