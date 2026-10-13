'use client';
import SettingsForm from '@/components/admin/SettingsForm';

type Inj = { head: string; bodyStart: string; bodyEnd: string };
const mono = { minHeight: 150, fontFamily: 'ui-monospace, monospace', fontSize: 12.5 } as const;

export default function InjectionForm({ initial }: { initial: Inj }) {
  return (
    <SettingsForm group="injection" initial={initial as unknown as Record<string, unknown>}>
      {(raw, set) => {
        const v = raw as unknown as Inj;
        return (
          <div className="card">
            <div className="card-head"><h2>Injection de code</h2></div>
            <div className="card-body">
              <div className="alert info">Pour les balises de vérification, scripts de chat, Google Tag Manager, données structurées supplémentaires… Les pixels publicitaires se règlent plus simplement dans « Mes annonces ». Code inséré tel quel sur toutes les pages : à réserver aux scripts de confiance.</div>
              <div className="field"><label>Dans &lt;head&gt;</label><textarea value={v.head} onChange={(e) => set({ head: e.target.value } as never)} style={mono} placeholder={'<meta name="facebook-domain-verification" content="…">'} /></div>
              <div className="field"><label>Début de &lt;body&gt;</label><textarea value={v.bodyStart} onChange={(e) => set({ bodyStart: e.target.value } as never)} style={mono} placeholder="<noscript>…</noscript>" /></div>
              <div className="field"><label>Fin de &lt;body&gt;</label><textarea value={v.bodyEnd} onChange={(e) => set({ bodyEnd: e.target.value } as never)} style={mono} placeholder="<script>…</script>" /></div>
            </div>
          </div>
        );
      }}
    </SettingsForm>
  );
}
