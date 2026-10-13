# BeautyMall (Next.js)

The static clone of beautymall.ma rebuilt as a Next.js 15 shop with the original Woodmart look.

## Run

    npm install
    npm run dev          # http://localhost:3000
    npm run build && npm start

## How it is built

- `scripts/import-clone.mjs <clone-dir>`: reads the static clone and writes `data/` (827 products,
  161 categories, 1314 brands, page bodies, templates) and `public/assets/` (images, fonts, merged CSS).
  It rewrites every link to local routes, drops tracking scripts, resolves lazy-load placeholders
  and un-freezes the carousels. Re-run it whenever the clone is refreshed.
- Pages keep the original markup, so the original stylesheet (`public/assets/css/site.css`, the
  21 per-page bundles merged in order) styles them unchanged. Product cards, archives and product
  pages are generated from the data in `lib/render.ts`.
- `components/SiteRuntime.tsx` replaces the WordPress/jQuery front-end: side panels, carousels,
  hero slider, add-to-cart, wishlist, live search, filters, sticky header, cookie banner, chat button.
- Cart and wishlist live in localStorage (`lib/store.ts`). Checkout is cash on delivery; orders are
  re-priced on the server and saved to `data/orders.json` (`lib/orders.ts`). Shipping follows the
  site's published tariffs (`lib/shipping.ts`).

## Routes

`/`, `/product/[slug]`, `/product-category/[...path]`, `/product-tag/[slug]`, `/marques`,
`/marques/[slug]`, `/boutique`, `/search?s=`, `/<brand>-boutique-officielle`, `/privacy-policy`,
`/cart`, `/checkout`, `/commande/[id]`, `/wishlist`, `/my-account`.
