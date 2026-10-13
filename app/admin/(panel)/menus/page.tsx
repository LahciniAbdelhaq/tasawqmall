import * as cheerio from 'cheerio';
import Link from 'next/link';
import { db } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { htmlFile } from '@/lib/render';
import { PageTitle } from '@/components/admin/bits';
import MenusForm from './MenusForm';

export const metadata = { title: 'Menus' };

export default async function MenusPage() {
  const [s, pages, cats] = await Promise.all([
    getSettings(),
    db.page.findMany({ where: { published: true }, select: { slug: true, title: true } }),
    db.category.findMany({ where: { parent: null }, orderBy: { position: 'asc' }, select: { path: true, name: true } }),
  ]);
  const $ = cheerio.load(htmlFile('header.html'), null, false);
  const main = $('ul.wd-nav-secondary > li > a').map((_, a) => ({ label: $(a).text().trim(), href: $(a).attr('href') || '' })).get();
  const catMenu = $('#menu-categories > li > a').map((_, a) => ({ label: $(a).text().trim(), href: $(a).attr('href') || '' })).get();
  const links = [
    ...pages.map((p) => ({ href: `/${p.slug}`, label: p.title })),
    ...cats.map((c) => ({ href: `/product-category/${c.path}`, label: c.name })),
    { href: '/boutique', label: 'Boutique' }, { href: '/marques', label: 'Marques' },
  ];
  return (
    <>
      <PageTitle title="Menus" sub="Ajoutez des liens aux menus. Pour modifier, masquer ou changer l’icône d’un lien existant, utilisez l’éditeur visuel.">
        <Link className="btn btn-secondary btn-sm" href="/admin/editor?path=/">Modifier les liens existants</Link>
        <Link className="btn btn-secondary btn-sm" href="/admin/appearance#header">Style de la barre de navigation</Link>
      </PageTitle>
      <div className="grid-2">
        <MenusForm headerExtra={s.menus.headerExtra} mobileExtra={s.menus.mobileExtra} links={links} />
        <div>
          <div className="card">
            <div className="card-head"><h2>Menu principal actuel</h2></div>
            <div className="card-body" style={{ display: 'grid', gap: 6 }}>
              {main.map((m, i) => <div key={i}>• {m.label} <span className="muted">{m.href}</span></div>)}
              {s.menus.headerExtra.map((m, i) => <div key={`x${i}`}>• {m.label} <span className="muted">{m.href}</span> <span className="pill plain blue">ajouté</span></div>)}
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h2>Menu « Catégories »</h2><Link className="link" href="/admin/categories">Catégories</Link></div>
            <div className="card-body" style={{ display: 'grid', gap: 6 }}>
              {catMenu.map((m, i) => <div key={i}>• {m.label}</div>)}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
