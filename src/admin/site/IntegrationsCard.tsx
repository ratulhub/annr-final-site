import { setSite } from "../store";
import { Card } from "../ui";
import { useSite } from "./fields";

// Integration placeholders. Status is always "Not connected" until a backend really connects a service.
export function IntegrationsCard() {
  const site = useSite();
  return <Card title="Integrations">
    <table><thead><tr><th>Service</th><th>Type</th><th>Status</th><th>Notes</th></tr></thead><tbody>
      {site.integrations.map((i) => <tr key={i.id}><td>{i.name}</td><td>{i.kind}</td><td><span className="adm-tag">Not connected</span></td>
        <td><input value={i.note} onChange={(e) => setSite("integrations", site.integrations.map((x) => (x.id === i.id ? { ...x, note: e.target.value } : x)))} /></td></tr>)}
    </tbody></table>
    <p className="adm-hint">No keys are stored here. Real connections need a backend so secrets stay private.</p>
  </Card>;
}
