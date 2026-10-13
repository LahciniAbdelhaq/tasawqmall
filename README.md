# BeautyMall (Next.js)

The static clone of beautymall.ma rebuilt as a Next.js 15 shop with the original Woodmart look.

## Run

    npm install
    cp .env.example .env # then set DATABASE_URL / DATABASE_URL_UNPOOLED (PostgreSQL)
    npm run setup        # creates the tables, imports the catalogue and the admin
    npm run dev          # http://localhost:3002

## Deploy on Vercel

1. Import the GitHub repo in Vercel (framework: Next.js; the `vercel-build` script is used).
2. Storage tab: create a **Postgres** database (Neon) and a **Blob** store and connect both to the
   project. They add `DATABASE_URL`, `DATABASE_URL_UNPOOLED` and `BLOB_READ_WRITE_TOKEN`
   (if the database gives only one URL, add `DATABASE_URL_UNPOOLED` with the same value).
3. Add `AUTH_SECRET` (long random string), `SITE_URL` (https://your-domain), `ADMIN_EMAIL`,
   `ADMIN_PASSWORD`.
4. Deploy. Each build runs `prisma db push` (creates/updates the tables) and the seed, which imports
   the catalogue only when the database is empty.

To move the data of the old local SQLite database (orders, settings, edits) into Postgres:

    DATABASE_URL=... DATABASE_URL_UNPOOLED=... npm run db:import-sqlite -- prisma/dev.db --force

`--force` wipes the Postgres tables first (needed if a Vercel build already seeded them).

On Vercel the site files are read-only: admin uploads go to Vercel Blob, and the SEO image
compression must be run locally (then commit the images).

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
  re-priced on the server and saved in the database (`lib/orders.ts`). Shipping follows the
  site's published tariffs (`lib/shipping.ts`).

## Routes

`/`, `/product/[slug]`, `/product-category/[...path]`, `/product-tag/[slug]`, `/marques`,
`/marques/[slug]`, `/boutique`, `/search?s=`, `/<brand>-boutique-officielle`, `/privacy-policy`,
`/cart`, `/checkout`, `/commande/[id]`, `/wishlist`, `/my-account`.
