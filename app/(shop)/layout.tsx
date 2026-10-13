import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { Html } from '@/components/Html';
import CartSide from '@/components/CartSide';
import SiteRuntime from '@/components/SiteRuntime';
import Tracker from '@/components/Tracker';
import Announcements from '@/components/Announcements';
import EditBridge from '@/components/EditBridge';
import { I18nProvider } from '@/components/I18nProvider';
import { db, parseJson } from '@/lib/db';
import { getI18n } from '@/lib/i18n';
import { getSettings } from '@/lib/settings';
import { buildShell } from '@/lib/shell';
import { fontHref, themeCss } from '@/lib/theme';
import { htmlFile } from '@/lib/render';
import { isRtl, LOCALES } from '@/lib/locales';
import { verifyAdminToken, ADMIN_COOKIE } from '@/lib/auth';

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(process.env.SITE_URL || s.seo.siteUrl || 'http://localhost:3000'),
    title: { default: s.seo.homeTitle, template: s.seo.titleTemplate },
    description: s.seo.description,
    keywords: s.seo.keywords,
    icons: { icon: s.brand.favicon },
    robots: s.seo.indexable ? undefined : { index: false, follow: false },
    verification: {
      google: s.seo.googleVerification || undefined,
      other: s.seo.bingVerification ? { 'msvalidate.01': s.seo.bingVerification } : undefined,
    },
    openGraph: { siteName: s.brand.name, images: s.seo.ogImage ? [s.seo.ogImage] : undefined, type: 'website' },
  };
}
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

const BASE_BODY =
  'wp-theme-woodmart wp-child-theme-woodmart-child theme-woodmart woocommerce-js wrapper-custom categories-accordion-on woodmart-ajax-shop-on sticky-toolbar-on elementor-default elementor-kit-12';

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [s, { locale, dict }] = await Promise.all([getSettings(), getI18n()]);
  const shell = await buildShell(locale, dict, s);
  const rtl = isRtl(locale);
  const now = new Date();
  const announcements = (await db.announcement.findMany({ where: { active: true }, orderBy: { position: 'asc' } }))
    .filter((a) => (!a.startsAt || a.startsAt <= now) && (!a.endsAt || a.endsAt >= now))
    .map((a) => {
      const tr = parseJson<Record<string, { text?: string }>>(a.i18n, {})[locale];
      return { id: a.id, type: a.type, text: tr?.text || a.text, link: a.link, image: a.image, bgColor: a.bgColor, textColor: a.textColor, pages: a.pages, animation: a.animation, speed: a.speed };
    });
  // admins can click-to-edit the live site from the back-office (inside its preview frame)
  const isAdmin = !!(await verifyAdminToken((await cookies()).get(ADMIN_COOKIE)?.value));
  const pixels = { fb: s.ads.facebookPixel, tt: s.ads.tiktokPixel, ga: s.ads.ga4, gads: s.ads.googleAds, snap: s.ads.snapchatPixel, consent: s.ads.requireConsent };

  return (
    <html lang={locale} dir={rtl ? 'rtl' : 'ltr'}>
      <head>
        <link rel="stylesheet" href="/assets/css/site.css" />
        <link rel="stylesheet" href="/assets/css/inline.css" />
        <link rel="stylesheet" href="/app.css" />
        <link rel="stylesheet" href="/announce.css" />
        {fontHref(s.theme) && <link rel="stylesheet" href={fontHref(s.theme)!} />}
        <style id="bm-theme" dangerouslySetInnerHTML={{ __html: themeCss(s.theme, rtl) }} />
        {s.languages.enabled.filter((l) => LOCALES[l]).map((l) => (
          <link key={l} rel="alternate" hrefLang={l} href={`?lang=${l}`} />
        ))}
        {s.injection.head && <Html html={s.injection.head} />}
      </head>
      <body className={`${BASE_BODY}${rtl ? ' rtl' : ''}`} suppressHydrationWarning>
        {s.injection.bodyStart && <Html html={s.injection.bodyStart} />}
        <I18nProvider locale={locale} dict={dict}>
          <Html html={shell.cookie} />
          <Announcements items={announcements} />
          <div className="wd-page-wrapper website-wrapper">
            <Html html={shell.header} />
            {children}
            <Html html={shell.footer} />
          </div>
          <Html html={htmlFile('close-side.html')} />
          <Html html={shell.mobileNav} />
          <CartSide />
          <Html html={shell.loginSide} />
          <Html html={shell.toolbar} />
          <Html html={shell.chaty} />
          <Html html={htmlFile('scroll-top.html')} />
          <Suspense>
            <SiteRuntime whatsapp={s.brand.whatsapp} />
            <Tracker pixels={pixels} />
            {isAdmin && <EditBridge />}
          </Suspense>
        </I18nProvider>
        {s.injection.bodyEnd && <Html html={s.injection.bodyEnd} />}
      </body>
    </html>
  );
}
