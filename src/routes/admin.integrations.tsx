import { createFileRoute, Link } from "@tanstack/react-router";
import { IntegrationsCard } from "../admin/site/IntegrationsCard";
import { BackBtn, Card } from "../admin/ui";

export const Route = createFileRoute("/admin/integrations")({ component: Integrations });

function Integrations() {
  return (
    <>
      <div className="adm-top">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <BackBtn to="/admin" label="← Dashboard" />
          <h1>Integrations</h1>
        </div>
      </div>
      <p className="adm-hint">Live services connected to your AnnR storefront, edge worker, and Supabase backend.</p>
      <IntegrationsCard />
      <Card title="Already working through the live store">
        <p style={{ marginTop: 0 }}>Cart, checkout, payment, VIP account login, 1-of-1 reservations, first-party analytics tracking, and predictive search run natively through AnnR Cloudflare Worker routes and Supabase.</p>
        <Link className="link" to="/admin/analytics/$report" params={{ report: "settings" }}>Analytics providers</Link>
      </Card>
    </>
  );
}
