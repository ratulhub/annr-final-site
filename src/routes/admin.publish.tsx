import { createFileRoute } from "@tanstack/react-router";
import { discardDraft, getHistory, getPublished, publish, restoreVersion, siteConfig, unpublishAll, useAdmin } from "../admin/store";
import { confirmReauth, getSession, logAuthEvent } from "../admin/security/auth";
import { can } from "../admin/security/permissions";
import { BackBtn, Card } from "../admin/ui";
import { DevicePreview } from "../admin/site/fields";

export const Route = createFileRoute("/admin/publish")({ component: PublishPage });

export function useDirty() {
  const s = useAdmin();
  const pub = getPublished();
  if (!pub) return true;
  const { publishedAt: _a, ...cur } = siteConfig(s);
  const { publishedAt: _b, ...old } = pub;
  return JSON.stringify(cur) !== JSON.stringify(old);
}

function PublishPage() {
  useAdmin();
  const pub = getPublished();
  const dirty = useDirty();
  const hist = getHistory();
  const mayPublish = can(getSession()?.role, "site.publish");
  return (
    <>
      <div className="adm-top">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <BackBtn to="/admin" label="← Dashboard" />
          <h1>Preview & publish</h1>
        </div>
        <div className="adm-row">
          {pub && <button className="adm-btn danger" disabled={!mayPublish} onClick={async () => { if (!mayPublish) return; if (confirm("Remove all published admin overrides and return the store to the original site?") && await confirmReauth("unpublish all overrides")) { unpublishAll(); logAuthEvent("site_unpublish"); } }}>Revert live store to original</button>}
          <button className="adm-btn ghost" disabled={!dirty || !pub || !mayPublish} onClick={() => { if (!mayPublish) return; if (confirm("Throw away all changes since the last publish?")) { discardDraft(); logAuthEvent("site_discard"); } }}>Discard draft</button>
          <button className="adm-btn" disabled={!dirty || !mayPublish} onClick={() => { if (!mayPublish) return; publish(); logAuthEvent("site_publish"); }}>Publish to store</button>
        </div>
      </div>
      <div className={`adm-banner ${dirty ? "warning" : "success"}`} style={{ marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            {dirty ? "Unpublished changes pending" : "Storefront is up to date"}
          </div>
          <div style={{ fontSize: 13, marginTop: 4, opacity: 0.9 }}>
            {dirty
              ? "You have modified store configurations in the admin panel. The public storefront currently serves the last published release until you click 'Publish to store'."
              : "The live storefront is currently serving all your latest configurations, products, and styles."}
          </div>
          <div style={{ fontSize: 12, marginTop: 6, opacity: 0.8 }}>
            Last published: <b>{pub ? new Date(pub.publishedAt).toLocaleString() : "Never (serving original baseline)"}</b>
          </div>
        </div>
        <a href="/home.html" target="_blank" rel="noreferrer" className="adm-btn ghost sm" style={{ alignSelf: "center" }}>
          View live store ↗
        </a>
      </div>
      <Card title="Draft preview (real store pages)"><DevicePreview url="/home.html" /></Card>
      <Card title="Published versions">
        {hist.length ? <div className="adm-table-wrap"><table><thead><tr><th>Published</th><th /></tr></thead><tbody>
          {hist.map((h, i) => <tr key={h.at}><td>{new Date(h.at).toLocaleString()}{i === 0 && " (current)"}</td>
            <td style={{ textAlign: "right" }}><button className="adm-btn ghost sm" disabled={!mayPublish} onClick={() => { if (!mayPublish) return; if (confirm("Load this version into the draft? Publish afterwards to make it live.")) { restoreVersion(i); logAuthEvent("site_restore"); } }}>Restore to draft</button></td></tr>)}
        </tbody></table></div> : <p>No versions yet. Each publish saves one here (last 10).</p>}
      </Card>
    </>
  );
}
