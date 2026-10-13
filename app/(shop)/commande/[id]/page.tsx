import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import WpPage from '@/components/WpPage';
import { getOrderForCustomer, ORDER_STATUSES } from '@/lib/orders';
import { amount } from '@/lib/render';
import { getI18n } from '@/lib/i18n';

export const metadata: Metadata = { title: 'Commande reçue', robots: { index: false } };
export const dynamic = 'force-dynamic';

const Money = ({ n }: { n: number }) => <span dangerouslySetInnerHTML={{ __html: amount(n) }} />;

export default async function OrderPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const { id } = await params;
  const { key = '' } = await searchParams;
  const [order, { t }] = await Promise.all([getOrderForCustomer(id, key), getI18n()]);
  if (!order) notFound();
  return (
    <WpPage title={t('Commande reçue')} bodyClass="woocommerce-checkout woocommerce-order-received">
      <div className="woocommerce-order">
        <p className="woocommerce-notice woocommerce-notice--success woocommerce-thankyou-order-received">
          Merci. Votre commande a bien été reçue. Notre équipe vous appellera au {order.phone} pour la confirmer.
        </p>
        <ul className="woocommerce-order-overview woocommerce-thankyou-order-details order_details">
          <li className="woocommerce-order-overview__order order">N° : <strong>{order.number}</strong></li>
          <li className="woocommerce-order-overview__date date">Date : <strong>{order.createdAt.toLocaleDateString('fr-FR')}</strong></li>
          <li className="woocommerce-order-overview__status">Statut : <strong>{ORDER_STATUSES[order.status]?.label ?? order.status}</strong></li>
          <li className="woocommerce-order-overview__total total">{t('Total')} : <strong><Money n={order.total} /></strong></li>
          <li className="woocommerce-order-overview__payment-method method"><strong>{t('Paiement à la livraison')}</strong></li>
        </ul>
        <section className="woocommerce-order-details">
          <table className="woocommerce-table woocommerce-table--order-details shop_table order_details">
            <thead><tr><th className="product-name">{t('Produit')}</th><th className="product-total">{t('Total')}</th></tr></thead>
            <tbody>
              {order.lines.map((l) => (
                <tr key={l.id} className="woocommerce-table__line-item order_item">
                  <td className="product-name"><Link href={`/product/${l.slug}`}>{l.name}</Link> <strong className="product-quantity">×&nbsp;{l.qty}</strong></td>
                  <td className="product-total"><Money n={l.total} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><th scope="row">{t('Sous-total')} :</th><td><Money n={order.subtotal} /></td></tr>
              {order.discount > 0 && <tr><th scope="row">{t('Réduction')} ({order.promoCode}) :</th><td>−<Money n={order.discount} /></td></tr>}
              <tr><th scope="row">{t('Expédition')} :</th><td>{order.shipping ? <Money n={order.shipping} /> : t('Livraison gratuite')}</td></tr>
              <tr><th scope="row">{t('Total')} :</th><td><Money n={order.total} /></td></tr>
            </tfoot>
          </table>
        </section>
        <section className="woocommerce-customer-details">
          <h2 className="woocommerce-column__title">{t('Adresse')}</h2>
          <address>
            {order.firstName} {order.lastName}<br />{order.address}<br />{order.city}<br />{order.phone}{order.email && <><br />{order.email}</>}
          </address>
        </section>
      </div>
    </WpPage>
  );
}
