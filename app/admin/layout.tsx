import type { Metadata } from 'next';
import './admin.css';
import NavProgress from '@/components/NavProgress';

export const metadata: Metadata = {
  title: { default: 'Back-office', template: '%s · Back-office BeautyMall' },
  robots: { index: false, follow: false },
  icons: { icon: '/assets/images/0d2772f0_cropped-favicon-180x180.png' },
};
export const dynamic = 'force-dynamic';

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <NavProgress />
        {children}
      </body>
    </html>
  );
}
