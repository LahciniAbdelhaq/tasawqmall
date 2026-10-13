import BodyClass from './BodyClass';
import { PageContent } from './Html';
import { type Product, pageInfo, parseListQuery, runListQuery } from '@/lib/catalog';
import { renderArchive, type Tr } from '@/lib/render';

export type SP = Record<string, string | string[] | undefined>;
const ARCHIVE_BODY =
  'archive tax-product_cat wp-theme-woodmart wp-child-theme-woodmart-child theme-woodmart woocommerce woocommerce-page woocommerce-js wrapper-custom categories-accordion-on woodmart-archive-shop woodmart-ajax-shop-on sticky-toolbar-on elementor-default elementor-kit-12';

export function toSearchParams(sp: SP) {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v == null || k === 'lang') continue;
    out.set(k, Array.isArray(v) ? v[0] : v);
  }
  return out;
}

/** Product archive (category, tag, brand, shop, search) in the theme's archive template. */
export default async function ArchivePage(props: {
  tr: Tr;
  route: string;
  basePath: string;
  heading: string;
  crumbs: { label: string; href?: string }[];
  products: Product[];
  searchParams: SP;
  currentCategory?: string;
  description?: string | null;
  keepOrder?: boolean;
  emptyMessage?: string;
  jsonLd?: unknown;
}) {
  const query = parseListQuery(props.searchParams);
  const result = runListQuery(props.products, query, props.keepOrder);
  const info = pageInfo(props.route);
  const html = await renderArchive({
    basePath: props.basePath,
    heading: props.heading,
    crumbs: props.crumbs,
    result,
    query,
    search: toSearchParams(props.searchParams),
    currentCategory: props.currentCategory,
    description: props.description || info?.termDescription,
    emptyMessage: props.emptyMessage,
  }, props.tr);
  return (
    <>
      <BodyClass value={info?.bodyClass || ARCHIVE_BODY} />
      {props.jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(props.jsonLd).replace(/</g, '\\u003c') }} /> : null}
      <PageContent html={html} styles={info?.styles} fragment="tpl-archive" />
    </>
  );
}
