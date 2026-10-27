import { createFileRoute, Link } from "@tanstack/react-router";
import { MODULES } from "../admin/config/navigation";

export const Route = createFileRoute("/admin/m/$module")({ component: ModulePage });

function ModulePage() {
  const { module } = Route.useParams();
  const m = MODULES[module];
  if (!m) return <div className="adm-card"><h2>Section not found</h2><Link className="link" to="/admin">Back to dashboard</Link></div>;
  return (
    <>
      <div className="adm-top"><h1>{m.title}</h1><span className="adm-tag on">Active · {m.part}</span></div>
      <section className="adm-card">
        <h2>Module capabilities</h2>
        <ul style={{ margin: "10px 0 0 18px" }}>{m.plan.map((p) => <li key={p}>{p}</li>)}</ul>
        {m.now && <p style={{ marginTop: 14 }}><Link className="adm-btn" to={m.now.to}>{m.now.label} →</Link></p>}
      </section>
    </>
  );
}
