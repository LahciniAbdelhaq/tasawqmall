'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { adminLogout } from '@/app/admin/actions/auth';

type Badges = { orders: number; live: number };

const NAV: { grp?: string; href: string; label: string; icon: string; badge?: keyof Badges }[] = [
  { href: '/admin', label: 'Tableau de bord', icon: 'dashboard' },
  { href: '/admin/live', label: 'Visiteurs en direct', icon: 'activity', badge: 'live' },
  { href: '/admin/stats', label: 'Statistiques', icon: 'chart' },
  { grp: 'Ventes', href: '/admin/orders', label: 'Commandes', icon: 'receipt', badge: 'orders' },
  { href: '/admin/customers', label: 'Clients', icon: 'users' },
  { href: '/admin/promos', label: 'Codes promo', icon: 'percent' },
  { grp: 'Catalogue', href: '/admin/products', label: 'Produits', icon: 'box' },
  { href: '/admin/categories', label: 'Catégories', icon: 'tag' },
  { grp: 'Site & contenu', href: '/admin/editor', label: 'Éditeur visuel', icon: 'cursor' },
  { href: '/admin/pages', label: 'Pages', icon: 'file' },
  { href: '/admin/menus', label: 'Menus', icon: 'menu' },
  { href: '/admin/appearance', label: 'Apparence & logo', icon: 'palette' },
  { href: '/admin/languages', label: 'Langues & traductions', icon: 'translate' },
  { grp: 'Marketing', href: '/admin/seo', label: 'SEO', icon: 'search' },
  { href: '/admin/ads', label: 'Mes annonces & liens', icon: 'target' },
  { href: '/admin/announcements', label: 'Bandeaux & popups', icon: 'megaphone' },
  { grp: 'Configuration', href: '/admin/settings', label: 'Paramètres', icon: 'gear' },
];

export default function Shell({ admin, badges, children }: { admin: { name: string; email: string }; badges: Badges; children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const active = (href: string) => (href === '/admin' ? path === '/admin' : path.startsWith(href));

  return (
    <div className="adm">
      <aside className={`adm-side${open ? ' open' : ''}`}>
        <Link href="/admin" className="adm-brand">
          <span style={{ display: 'grid', gap: 4 }}>
            <img src="/assets/images/92f1cf10_logo-bm-1.png" alt="beautymall" style={{ filter: 'brightness(0) invert(1)', height: 26 }} />
            <small>Back-office</small>
          </span>
        </Link>
        <nav className="adm-nav">
          {NAV.map((n) => (
            <div key={n.href} style={{ display: 'contents' }}>
              {n.grp && <div className="grp">{n.grp}</div>}
              <Link href={n.href} className={active(n.href) ? 'on' : ''}>
                <Icon name={n.icon} stroke={1.7} />
                {n.label}
                {n.badge && badges[n.badge] > 0 && <span className={`badge${n.badge === 'live' ? ' live' : ''}`}>{badges[n.badge]}</span>}
              </Link>
            </div>
          ))}
        </nav>
        <div className="adm-side-foot">
          <div style={{ color: '#fff', fontWeight: 600 }}>{admin.name}</div>
          <div style={{ fontSize: 12, marginBottom: 10 }}>{admin.email}</div>
          <form action={adminLogout}><button style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Icon name="logout" size={16} /> Se déconnecter</button></form>
        </div>
      </aside>
      <div className="adm-main">
        <header className="adm-top">
          <button className="btn btn-ghost btn-icon burger" onClick={() => setOpen(!open)} aria-label="Menu"><Icon name="menu" /></button>
          <div className="spacer" />
          <Link className="btn btn-secondary btn-sm" href="/admin/editor"><Icon name="cursor" /> Modifier le site</Link>
          <a className="btn btn-secondary btn-sm" href="/" target="_blank" rel="noreferrer"><Icon name="external" /> Voir la boutique</a>
        </header>
        <div className="adm-content">{children}</div>
      </div>
    </div>
  );
}
