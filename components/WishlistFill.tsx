'use client';
import { useEffect, useRef } from 'react';
import { useWishlist } from '@/lib/store';

/**
 * Fills the theme's wishlist widget (`.wd-wishlist-content`, rendered empty by the server)
 * with the product cards of the locally saved wishlist.
 */
export default function WishlistFill() {
  const ids = useWishlist();
  const emptyHtml = useRef<string | null>(null);

  useEffect(() => {
    const box = document.querySelector<HTMLElement>('.wd-wishlist-content');
    if (!box) return;
    emptyHtml.current ??= box.innerHTML;
    if (!ids.length) {
      box.innerHTML = emptyHtml.current;
      return;
    }
    let cancelled = false;
    fetch(`/api/cards?ids=${ids.join(',')}`)
      .then((r) => r.json())
      .then((cards: { id: number; html: string }[]) => {
        if (cancelled) return;
        const withRemove = cards.map(({ id, html }) =>
          html.replace(
            '<div class="product-wrapper">',
            `<div class="product-wrapper"><div class="wd-wishlist-product-actions"><div class="wd-wishlist-product-remove-wrap"><a href="#" class="wd-wishlist-product-remove wd-action-btn wd-style-text wd-cross-icon" data-wishlist-remove="${id}">Retirer</a></div></div>`,
          ));
        box.innerHTML = `<div class="wd-products-element"><div class="products wd-products wd-grid-g grid-columns-4 elements-grid pagination-pagination title-line-two wd-products-with-bg" style="--wd-col-lg:4;--wd-col-md:3;--wd-col-sm:2;--wd-gap-lg:20px;">${withRemove.join('')}</div></div>`;
        box.querySelectorAll('.wd-wishlist-btn a').forEach((a) => a.classList.add('added'));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [ids]);

  return null;
}
