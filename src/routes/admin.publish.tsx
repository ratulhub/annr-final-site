import { createFileRoute } from "@tanstack/react-router";
import { discardDraft, getHistory, getPublished, publish, restoreVersion, siteConfig, unpublishAll, useAdmin } from "../admin/store";
import { confirmReauth } from "../admin/security/auth";
import { Card } from "../admin/ui";
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
  return (
    <>
      <div className="adm-top"><h1>Preview & publish</h1>
        <div className="adm-row">
          {pub && <button className="adm-btn danger" onClick={async () => { if (confirm("Remove all published admin overrides and return the store to the original site?") && await confirmReauth("unpublish all overrides")) unpublishAll(); }}>Revert live store to original</button>}
          <button className="adm-btn ghost" disabled={!dirty || !pub} onClick={() => confirm("Throw away all changes since the last publish?") && discardDraft()}>Discard draft</button>
          <button className="adm-btn" disabled={!dirty} onClick={() => publish()}>Publish to store</button>
        </div>
      </div>
      <Card title="Status">
        <p>{dirty ? "You have unpublished changes. The store still shows the last published version." : "The store is showing your latest changes."}</p>
        <p>Last published: <b>{pub ? new Date(pub.publishedAt).toLocaleString() : "never (store shows the original site)"}</b></p>
        <p className="adm-hint">Demo mode: drafts, publishing and history are kept in this browser only. Shared publishing and lasting version history need a backend.</p>
      </Card>
      <Card title="Draft preview (real store pages)"><DevicePreview url="/home.html" /></Card>
      <Card title="Published versions">
        {hist.length ? <table><thead><tr><th>Published</th><th /></tr></thead><tbody>
          {hist.map((h, i) => <tr key={h.at}><td>{new Date(h.at).toLocaleString()}{i === 0 && " (current)"}</td>
            <td style={{ textAlign: "right" }}><button className="adm-btn ghost sm" onClick={() => confirm("Load this version into the draft? Publish afterwards to make it live.") && restoreVersion(i)}>Restore to draft</button></td></tr>)}
        </tbody></table> : <p>No versions yet. Each publish saves one here (last 10).</p>}
      </Card>
    </>
  );
}
