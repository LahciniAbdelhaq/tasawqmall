import Link from 'next/link';
import { getSettings } from '@/lib/settings';
import { runAudit, heavyImages } from '@/lib/seo-audit';
import { PageTitle } from '@/components/admin/bits';
import SeoSettingsForm from './SeoSettingsForm';
import InjectionForm from './InjectionForm';
import FixButtons, { CompressButton } from './FixButtons';

export const metadata = { title: 'SEO' };

const scoreCls = (n: number) => (n >= 80 ? 'good' : n >= 55 ? 'mid' : 'bad');
const TYPE_LABEL = { page: 'Page', category: 'Catégorie', product: 'Produit' };

export default async function SeoPage({ searchParams }: { searchParams: Promise<{ tab?: string; type?: string; q?: string; sort?: string }> }) {
  const sp = await searchParams;
  const tab = sp.tab || 'report';
  const s = await getSettings();
  const tabs: [string, string][] = [['report', 'Rapport SEO'], ['settings', 'Réglages'], ['injection', 'Injection de code'], ['tools', 'Outils techniques']];

  return (
    <>
      <PageTitle title="SEO" sub="Analyse du référencement de chaque page, produit et catégorie, avec corrections en un clic." />
      <div className="tabs" style={{ marginBottom: 16 }}>
        {tabs.map(([k, l]) => <a key={k} href={`/admin/seo?tab=${k}`} className={tab === k ? 'on' : ''}>{l}</a>)}
      </div>
      {tab === 'report' && <Report sp={sp} />}
      {tab === 'settings' && <SeoSettingsForm initial={s.seo} />}
      {tab === 'injection' && <InjectionForm initial={s.injection} />}
      {tab === 'tools' && <Tools siteUrl={s.seo.siteUrl} />}
    </>
  );
}

async function Report({ sp }: { sp: { type?: string; q?: string; sort?: string } }) {
  const a = await runAudit();
  const issueCount = (sev: string) => a.items.reduce((n, i) => n + i.issues.filter((x) => x.sev === sev).length, 0);
  let rows = a.items.filter((i) => (!sp.type || i.type === sp.type) && (!sp.q || i.label.toLowerCase().includes(sp.q.toLowerCase())));
  rows = rows.sort((x, y) => (sp.sort === 'best' ? y.score - x.score : x.score - y.score));
  const shown = rows.slice(0, 120);
  const link = (p: Record<string, string>) => `/admin/seo?${new URLSearchParams({ tab: 'report', ...(sp.type ? { type: sp.type } : {}), ...(sp.q ? { q: sp.q } : {}), ...p })}`;
  return (
    <>
      <div className="kpis">
        <div className="card kpi"><div className="label">Score global</div><div className="value"><span className={`score ${scoreCls(a.scores.overall)}`}>{a.scores.overall}</span></div><div className="delta flat">/ 100</div></div>
        <div className="card kpi"><div className="label">Pages</div><div className="value"><span className={`score ${scoreCls(a.scores.page)}`}>{a.scores.page}</span></div></div>
        <div className="card kpi"><div className="label">Catégories</div><div className="value"><span className={`score ${scoreCls(a.scores.category)}`}>{a.scores.category}</span></div></div>
        <div className="card kpi"><div className="label">Produits</div><div className="value"><span className={`score ${scoreCls(a.scores.product)}`}>{a.scores.product}</span></div><div className="delta flat">{issueCount('high')} critiques · {issueCount('med')} importants · {issueCount('low')} mineurs</div></div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head"><h2>Corrections automatiques (injection SEO)</h2></div>
          <div className="card-body"><FixButtons fixable={a.fixable} /></div>
        </div>
        <div className="card">
          <div className="card-head"><h2>Diagnostic du site</h2></div>
          <div className="card-body">
            {a.site.length === 0 && <p className="muted">Aucun problème global détecté.</p>}
            {a.site.map((i, k) => <div className="issue" key={k}><span className={`sev ${i.sev}`} />{i.msg}</div>)}
            <div className="issue"><span className="sev low" />Sitemap XML, robots.txt, balises canonical, Open Graph et données structurées Produit / Fil d’Ariane / Organisation générés automatiquement.</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="toolbar">
          <div className="tabs">
            <a href={link({ type: '' })} className={!sp.type ? 'on' : ''}>Tout ({a.items.length})</a>
            {(['page', 'category', 'product'] as const).map((t) => <a key={t} href={link({ type: t })} className={sp.type === t ? 'on' : ''}>{TYPE_LABEL[t]}s ({a.items.filter((i) => i.type === t).length})</a>)}
          </div>
          <form style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <input type="hidden" name="tab" value="report" />
            {sp.type && <input type="hidden" name="type" value={sp.type} />}
            <input className="input" name="q" defaultValue={sp.q} placeholder="Rechercher…" />
            <select className="input" name="sort" defaultValue={sp.sort || ''}><option value="">Pires scores d’abord</option><option value="best">Meilleurs scores d’abord</option></select>
            <button className="btn btn-secondary btn-sm">OK</button>
          </form>
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th style={{ width: 70 }}>Score</th><th>Élément</th><th>Problèmes et recommandations</th><th className="num">Mots</th><th className="actions-col" /></tr></thead>
            <tbody>
              {shown.map((i) => (
                <tr key={`${i.type}-${i.id}`}>
                  <td><span className={`score ${scoreCls(i.score)}`} style={{ width: 40, height: 40, fontSize: 13 }}>{i.score}</span></td>
                  <td style={{ maxWidth: 320 }}>
                    <span className="pill plain gray">{TYPE_LABEL[i.type]}</span> <Link className="row-link" href={i.edit}>{i.label}</Link>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{i.title}</div>
                  </td>
                  <td>
                    {i.issues.length === 0 ? <span className="pill green">Parfait</span> : i.issues.map((x, k) => <div className="issue" key={k}><span className={`sev ${x.sev}`} />{x.msg}</div>)}
                  </td>
                  <td className="num">{i.words}</td>
                  <td><div className="row-actions"><a className="icon-btn" href={i.url} target="_blank" rel="noreferrer">↗</a><Link className="icon-btn icon-btn--edit" href={i.edit}>✎</Link></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > shown.length && <div className="pager"><span>{shown.length} sur {rows.length} affichés — filtrez pour voir les autres.</span></div>}
      </div>
    </>
  );
}

function Tools({ siteUrl }: { siteUrl: string }) {
  const heavy = heavyImages();
  const total = heavy.reduce((s, i) => s + i.size, 0);
  return (
    <div className="grid-2">
      <div>
        <div className="card">
          <div className="card-head"><h2>Images lourdes ({heavy.length})</h2><span className="muted">{(total / 1048576).toFixed(1)} Mo</span></div>
          <div className="card-body">
            <p className="muted" style={{ marginTop: 0 }}>Les images de plus de 300 Ko ralentissent le site (critère Google « Core Web Vitals »). La compression garde la même adresse et une copie de l’original dans <code>storage/originals</code>. Sur Vercel, lancez-la en local puis poussez les images.</p>
            <CompressButton count={heavy.length} />
            <div style={{ marginTop: 14, maxHeight: 360, overflowY: 'auto' }}>
              {heavy.slice(0, 60).map((h) => (
                <div key={h.url} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '4px 0', fontSize: 12.5 }}>
                  <img src={h.url} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.url}</span>
                  <strong>{(h.size / 1024).toFixed(0)} Ko</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div>
        <div className="card">
          <div className="card-head"><h2>Fichiers pour les moteurs de recherche</h2></div>
          <div className="card-body" style={{ display: 'grid', gap: 10 }}>
            <a className="link" href="/sitemap.xml" target="_blank">/sitemap.xml</a>
            <a className="link" href="/robots.txt" target="_blank">/robots.txt</a>
            <p className="muted" style={{ margin: 0 }}>Soumettez <code>{siteUrl.replace(/\/$/, '')}/sitemap.xml</code> dans Google Search Console et Bing Webmaster Tools.</p>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h2>Ce qui est déjà optimisé</h2></div>
          <div className="card-body" style={{ display: 'grid', gap: 6, fontSize: 13.5 }}>
            {['Balise canonical sur chaque page', 'hreflang pour chaque langue activée', 'Données structurées : Product (prix, stock, marque, EAN), BreadcrumbList, OnlineStore, SearchAction',
              'Open Graph (partage Facebook / WhatsApp)', 'Pages panier, compte, recherche et liens de suivi exclues de l’index', 'Images en chargement différé (lazy loading)',
              'Textes alternatifs automatiques pour les images qui n’en ont pas', 'H1 ajouté aux pages qui n’en ont pas', 'Méta descriptions générées pour les produits sans description'].map((t) => <div key={t}>✓ {t}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
