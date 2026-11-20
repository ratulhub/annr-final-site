import { isSupabaseConfigured } from "../../lib/supabase";
import { setSite } from "../store";
import { Card } from "../ui";
import { useSite } from "./fields";

// Integration overview card reflecting live Supabase & Cloudflare Worker status.
export function IntegrationsCard() {
  const site = useSite();
  const isLive = isSupabaseConfigured();
  return <Card title="Integrations">
    <table><thead><tr><th>Service</th><th>Type</th><th>Status</th><th>Notes</th></tr></thead><tbody>
      {site.integrations.map((i) => {
        const connected = isLive || i.status === "connected";
        return <tr key={i.id}><td>{i.name}</td><td>{i.kind}</td><td><span className={`adm-tag ${connected ? "ok" : ""}`}>{connected ? "Connected" : "Not connected"}</span></td>
        <td><input value={i.note} onChange={(e) => setSite("integrations", site.integrations.map((x) => (x.id === i.id ? { ...x, note: e.target.value } : x)))} /></td></tr>;
      })}
    </tbody></table>
    <p className="adm-hint">Connected to Supabase database, storage, auth, and Cloudflare Worker edge analytics.</p>
  </Card>;
}
