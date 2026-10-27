import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { setSite, uid } from "../admin/store";
import { Card } from "../admin/ui";
import { F, move, OrderBtns, useSite } from "../admin/site/fields";
import type { FormCfg, FormField } from "../admin/site/types";

export const Route = createFileRoute("/admin/forms")({ component: Forms });

const APPLIED: Record<string, string> = {
  newsletter: "Title, button, placeholder and consent text update on the store.",
  search: "Placeholder updates on the store.",
  "vip-login": "Wording here is saved for later; the VIP login is handled by Shopify.",
  "vip-register": "Wording here is saved for later; the VIP signup is handled by Shopify.",
};

function Forms() {
  const site = useSite();
  const [open, setOpen] = useState(site.forms[0]?.id);
  const save = (f: FormCfg) => setSite("forms", site.forms.map((x) => (x.id === f.id ? f : x)));
  return (
    <>
      <div className="adm-top"><h1>Forms & submissions</h1></div>
      <div className="adm-row" style={{ marginBottom: 14 }}>{site.forms.map((f) => <button key={f.id} className={`adm-btn ${open === f.id ? "" : "ghost"}`} onClick={() => setOpen(f.id)}>{f.name}</button>)}</div>
      {site.forms.filter((f) => f.id === open).map((f) => {
        const setF = (fields: FormField[]) => save({ ...f, fields });
        return <div key={f.id}>
          <Card title={f.name}>
            <p className="adm-hint">Appears on: {f.where}. {APPLIED[f.id]}</p>
            <div className="adm-grid">
              <F label="Title" value={f.title} onChange={(title) => save({ ...f, title })} />
              <F label="Submit button" value={f.button} onChange={(button) => save({ ...f, button })} />
              <F label="Success message" value={f.success} onChange={(success) => save({ ...f, success })} />
              <F label="Error message" value={f.error} onChange={(error) => save({ ...f, error })} />
              <F label="Consent / privacy text" value={f.consent} onChange={(consent) => save({ ...f, consent })} />
            </div>
          </Card>
          <Card title="Fields" action={<button className="adm-btn ghost" onClick={() => setF([...f.fields, { id: uid(), key: "field", label: "New field", placeholder: "", required: false, enabled: true }])}>+ Add field</button>}>
            <table><thead><tr><th /><th>Label</th><th>Placeholder</th><th>Required</th><th>Enabled</th><th /></tr></thead><tbody>
              {f.fields.map((x, i) => { const up = (p: Partial<FormField>) => setF(f.fields.map((y) => (y.id === x.id ? { ...y, ...p } : y))); return <tr key={x.id}>
                <td><OrderBtns i={i} n={f.fields.length} onMove={(to) => setF(move(f.fields, i, to))} /></td>
                <td><input value={x.label} onChange={(e) => up({ label: e.target.value })} /></td>
                <td><input value={x.placeholder} onChange={(e) => up({ placeholder: e.target.value })} /></td>
                <td><input type="checkbox" checked={x.required} onChange={(e) => up({ required: e.target.checked })} /></td>
                <td><input type="checkbox" checked={x.enabled} onChange={(e) => up({ enabled: e.target.checked })} /></td>
                <td><button className="adm-btn danger sm" onClick={() => confirm("Remove field?") && setF(f.fields.filter((y) => y.id !== x.id))}>✕</button></td></tr>; })}
            </tbody></table>
          </Card>
          <Card title="Submissions">
            <p>No submissions. This store's forms send to Shopify (shihiko.com), not to this admin, so nothing is recorded here yet. Submissions will appear once a backend is connected.</p>
          </Card>
        </div>;
      })}
    </>
  );
}
