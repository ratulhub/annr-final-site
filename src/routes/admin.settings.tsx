import { IntegrationsCard } from "../admin/site/IntegrationsCard";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { replaceState, resetState, setState, useAdmin, type State } from "../admin/store";
import { confirmReauth, getSession, logAuthEvent } from "../admin/security/auth";
import { can, ROLES } from "../admin/security/permissions";
import { Card, KeyValueEditor } from "../admin/ui";
import { Big, Chk, F, Obj, UrlF } from "../admin/site/fields";

export const Route = createFileRoute("/admin/settings")({ component: Settings });

export function isValidImport(x: unknown): x is State {
  if (!x || typeof x !== "object" || Array.isArray(x)) return false;
  const o = x as Record<string, unknown>;
  if (!Array.isArray(o["products"]) || o["products"].length > 500) return false;
  if (!Array.isArray(o["collections"]) || o["collections"].length > 100) return false;
  if (!Array.isArray(o["pages"]) || o["pages"].length > 200) return false;
  if (typeof o["site"] !== "object" || o["site"] === null || Array.isArray(o["site"])) return false;
  if (o["admins"] !== undefined) {
    if (!Array.isArray(o["admins"]) || o["admins"].length > 100) return false;
    for (const a of o["admins"]) {
      if (!a || typeof a !== "object") return false;
      const role = String((a as Record<string, unknown>)["role"] ?? "");
      if (!(ROLES as readonly string[]).includes(role)) return false;
    }
  }
  return true;
}

function Settings() {
  const s = useAdmin();
  const [dataMsg, setDataMsg] = useState("");
  const exportJson = async () => {
    if (!can(getSession()?.role, "data.export")) { setDataMsg("Permission denied: data.export required."); return; }
    if (!(await confirmReauth("export all admin data"))) return;
    logAuthEvent("data_export");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(s, null, 2)], { type: "application/json" }));
    a.download = "annr-admin-data.json"; a.click();
    setDataMsg("Exported admin data.");
  };
  return (
    <>
      <div className="adm-top"><h1>Settings</h1></div>
      <Card title="General"><Obj k="general">{(g, set) => <div className="adm-grid">
        <F label="Site name" value={g.siteName} onChange={(siteName) => set({ siteName })} validate={(v) => (v.trim() ? null : "Required")} />
        <F label="Tagline" value={g.tagline} onChange={(tagline) => set({ tagline })} />
        <F label="Phone" value={g.phone} onChange={(phone) => set({ phone })} />
        <F label="Address" value={g.address} onChange={(address) => set({ address })} />
        <F label="Language" value={g.locale} onChange={(locale) => set({ locale })} />
        <F label="Time zone" value={g.timezone} onChange={(timezone) => set({ timezone })} />
        <Big label="Description" value={g.description} onChange={(description) => set({ description })} rows={2} />
      </div>}</Obj><p className="adm-hint">Logo and favicon are under Appearance; contact email and copyright under Navigation & footer.</p></Card>
      <Card title="Social profiles"><Obj k="social">{(v, set) => <div className="adm-grid">
        {(Object.keys(v) as (keyof typeof v)[]).map((k) => <UrlF key={k} label={k} value={v[k]} onChange={(x) => set({ [k]: x } as Partial<typeof v>)} />)}
      </div>}</Obj><p className="adm-hint">Footer social links are edited in Navigation → Footer columns.</p></Card>
      <Card title="Technical"><Obj k="technical">{(t, set) => <div className="adm-grid">
        <Chk label="Maintenance mode (covers the store)" value={t.maintenance} onChange={(maintenance) => set({ maintenance })} />
        <F label="Maintenance title" value={t.maintenanceTitle} onChange={(maintenanceTitle) => set({ maintenanceTitle })} />
        <F label="Maintenance message" value={t.maintenanceText} onChange={(maintenanceText) => set({ maintenanceText })} />
        <F label="Hidden page title" value={t.notFoundTitle} onChange={(notFoundTitle) => set({ notFoundTitle })} />
        <F label="Hidden page message" value={t.notFoundText} onChange={(notFoundText) => set({ notFoundText })} />
      </div>}</Obj></Card>
      <Card title="Legal & privacy"><Obj k="cookie">{(c, set) => <div className="adm-grid">
        <Chk label="Show cookie notice" value={c.on} onChange={(on) => set({ on })} />
        <F label="Notice text" value={c.text} onChange={(text) => set({ text })} />
        <F label="Button" value={c.button} onChange={(button) => set({ button })} />
        <UrlF label="Policy link" value={c.policyUrl} onChange={(policyUrl) => set({ policyUrl })} />
      </div>}</Obj><p className="adm-hint">Policy page wording is edited under Pages.</p></Card>
      <IntegrationsCard />
      <Card title="Store settings (orders & shipping)"><KeyValueEditor data={s.settings} onChange={(k, v) => setState((x) => ({ ...x, settings: { ...x.settings, [k]: v } }))} /></Card>
      <Card title="Staff & admins"><p style={{ marginTop: 0 }}>Moved to <Link className="link" to="/admin/users">Users & permissions</Link>.</p></Card>
      <Card title="Data">
        <p style={{ marginTop: 0 }}>Test mode: changes are saved in this browser only until a database is connected.</p>
        <div className="adm-row">
          <button className="adm-btn" onClick={exportJson}>Export all data</button>
          <label className="adm-btn ghost">Import data<input type="file" accept="application/json" hidden onChange={async (e) => {
            const f = e.target.files?.[0]; e.target.value = "";
            if (!f) return;
            setDataMsg("");
            if (f.size > 5 * 1024 * 1024) { setDataMsg("Import file is too large (max 5 MB)."); return; }
            try {
              const parsed = JSON.parse(await f.text());
              if (!isValidImport(parsed)) { setDataMsg("Invalid admin backup file."); return; }
              if (await confirmReauth("import admin data")) { replaceState(parsed); logAuthEvent("data_import"); setDataMsg("Data imported into draft."); }
            } catch { setDataMsg("Could not read JSON file."); }
          }} /></label>
          <button className="adm-btn danger" onClick={async () => { if (confirm("Reset everything to the original store data?") && await confirmReauth("reset all admin data")) { resetState(); logAuthEvent("data_reset"); setDataMsg("Reset to original."); } }}>Reset to original</button>
        </div>
        {dataMsg && <p className="adm-hint" style={{ marginTop: 8 }}>{dataMsg}</p>}
      </Card>
    </>
  );
}
