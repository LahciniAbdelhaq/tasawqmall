'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CURRENCY, money } from '@/lib/store';

type SavedOrder = { id: string; key: string; date: string; total: number };

/** Orders placed from this browser (there are no customer accounts on this shop). */
export default function AccountView() {
  const [orders, setOrders] = useState<SavedOrder[] | null>(null);
  useEffect(() => {
    try {
      setOrders(JSON.parse(localStorage.getItem('bm_orders_v1') || '[]'));
    } catch {
      setOrders([]);
    }
  }, []);
  if (!orders) return null;
  return (
    <div className="woocommerce-MyAccount-content">
      <p>
        Pas besoin de compte pour commander sur BeautyMall : passez commande directement, nous vous appelons pour la confirmer.
        Pour toute question : <strong>06 61 93 37 67 / 06 62 69 10 87</strong>.
      </p>
      <h3>Mes commandes</h3>
      {orders.length === 0 ? (
        <div className="woocommerce-message woocommerce-message--info woocommerce-Message woocommerce-Message--info woocommerce-info">
          Aucune commande n&apos;a encore été passée depuis cet appareil.{' '}
          <Link className="woocommerce-Button button" href="/boutique">Parcourir les produits</Link>
        </div>
      ) : (
        <table className="woocommerce-orders-table woocommerce-MyAccount-orders shop_table shop_table_responsive my_account_orders account-orders-table">
          <thead><tr><th>Commande</th><th>Date</th><th>Total</th><th><span className="nobr">Actions</span></th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="woocommerce-orders-table__row order">
                <td data-title="Commande">#{o.id}</td>
                <td data-title="Date"><time dateTime={o.date}>{new Date(o.date).toLocaleDateString('fr-FR')}</time></td>
                <td data-title="Total">{CURRENCY}{money(o.total)}</td>
                <td data-title="Actions"><Link href={`/commande/${o.id}?key=${o.key}`} className="woocommerce-button button view">Voir</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
