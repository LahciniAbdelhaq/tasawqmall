import type { Metadata } from 'next';
import BodyClass from '@/components/BodyClass';
import { PageContent } from '@/components/Html';
import WishlistFill from '@/components/WishlistFill';
import { pageInfo } from '@/lib/catalog';
import { contentPage, pageContext } from '@/lib/page';

export const metadata: Metadata = { title: 'Liste de souhaits', robots: { index: false } };

export default async function WishlistPage() {
  const tr = await pageContext();
  const info = pageInfo('/wishlist');
  return (
    <>
      <BodyClass value={info.bodyClass} />
      <PageContent html={await contentPage('pages/wishlist.html', 'wishlist', tr)} styles={info.styles} fragment="wishlist" />
      <WishlistFill />
    </>
  );
}
