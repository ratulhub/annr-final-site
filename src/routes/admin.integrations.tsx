import { createFileRoute, Link } from "@tanstack/react-router";
import { IntegrationsCard } from "../admin/site/IntegrationsCard";
import { Card } from "../admin/ui";

export const Route = createFileRoute("/admin/integrations")({ component: Integrations });

function Integrations() {
  return (
    <>
      <div className="adm-top"><h1>Integrations</h1></div>
      <p className="adm-hint">Services the store uses or will use. Nothing is connected from this panel yet, so every status is honest: Not connected.</p>
      <IntegrationsCard />
      <Card title="Already working through the live store">
        <p style={{ marginTop: 0 }}>Cart, checkout, payment, VIP account login and search are handled by the live shihiko.com store, not by this panel.</p>
        <Link className="link" to="/admin/analytics/$report" params={{ report: "settings" }}>Analytics providers</Link>
      </Card>
    </>
  );
}
