import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { clearActivity, useAdmin } from "../admin/store";

export const Route = createFileRoute("/admin/activity")({ component: ActivityLog });

function ActivityLog() {
  const s = useAdmin();
  const [q, setQ] = useState("");
  const [sec, setSec] = useState("all");
  const log = s.activity || [];
  const sections = ["all", ...Array.from(new Set(log.map((a) => a.section)))];
  const list = log.filter((a) => (sec === "all" || a.section === sec) && (a.item + " " + a.fields).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="adm-top"><h1>Activity Log ({log.length})</h1>
        <button className="adm-btn danger" onClick={() => confirm("Clear the whole activity log?") && clearActivity()}>Clear log</button>
      </div>
      <p className="adm-hint" style={{ marginBottom: 10 }}>Demo history saved in this browser. It can be cleared, so it is not a tamper-proof security audit trail.</p>
      <div className="adm-row" style={{ marginBottom: 14 }}>
        <input placeholder="Search item or field" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 300 }} />
        <select value={sec} onChange={(e) => setSec(e.target.value)} style={{ maxWidth: 180 }}>{sections.map((o) => <option key={o}>{o}</option>)}</select>
      </div>
      <div className="adm-card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th>When</th><th>Section</th><th>Action</th><th>Item</th><th>Changed fields</th><th>By</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={6}>No changes recorded yet.</td></tr>}
            {list.map((a) => (
              <tr key={a.id}>
                <td>{new Date(a.at).toLocaleString()}</td>
                <td>{a.section}</td>
                <td><span className={"adm-tag" + (a.action === "added" ? " on" : "")}>{a.action}</span></td>
                <td>{a.item}</td>
                <td>{a.fields || "—"}</td>
                <td>{a.by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
