import { createFileRoute } from "@tanstack/react-router";
import { setState, useAdmin, type Customer } from "../admin/store";
import { BackBtn, Card, RowList } from "../admin/ui";

export const Route = createFileRoute("/admin/customers")({ component: Customers });

function Customers() {
  const s = useAdmin();
  const vipCount = s.customers.filter((c) => c.tier !== "Bronze" || (c.tags && c.tags.includes("vip"))).length;
  const totalPoints = s.customers.reduce((sum, c) => sum + (Number(c.points) || 0), 0);
  const blockedCount = s.customers.filter((c) => c.blocked).length;

  return (
    <>
      <div className="adm-top">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <BackBtn to="/admin" label="← Dashboard" />
          <div>
            <h1>Customers ({s.customers.length})</h1>
            <p className="adm-hint" style={{ margin: "2px 0 0" }}>Manage customer accounts, VIP loyalty tiers, and reward points</p>
          </div>
        </div>
      </div>

      {/* Customer Insights */}
      <div className="adm-stats">
        <div className="adm-stat accent-indigo">
          <span>Registered Customers</span>
          <b>{s.customers.length}</b>
          <small>Active shopper database</small>
        </div>
        <div className="adm-stat accent-purple">
          <span>VIP Loyalty Members</span>
          <b>{vipCount}</b>
          <small>Silver, Gold & Diamond</small>
        </div>
        <div className="adm-stat accent-amber">
          <span>Total Reward Points</span>
          <b>{totalPoints.toLocaleString()}</b>
          <small>Points in circulation</small>
        </div>
        <div className="adm-stat accent-rose">
          <span>Blocked Accounts</span>
          <b>{blockedCount}</b>
          <small>{blockedCount > 0 ? "Restricted from ordering" : "No blocked users"}</small>
        </div>
      </div>

      <Card title="Customer Directory & VIP Tiers" subtitle="Edit customer attributes, award loyalty points, change VIP tiers, or restrict abusive accounts">
        <RowList<Customer>
          rows={s.customers}
          onChange={(r) => setState((x) => ({ ...x, customers: r }))}
          blank={{
            name: "",
            email: "",
            phone: "",
            orders: 0,
            points: 0,
            tier: "Bronze",
            tags: "",
            blocked: false,
          }}
          fields={[
            { key: "name", label: "Full Name" },
            { key: "email", label: "Email Address" },
            { key: "phone", label: "Phone #" },
            { key: "orders", label: "Order Count", type: "number" },
            { key: "points", label: "Reward Points", type: "number" },
            { key: "tier", label: "VIP Tier", type: ["Bronze", "Silver", "Gold", "Diamond"] },
            { key: "tags", label: "Customer Tags (e.g. vip, wholesale)" },
            { key: "blocked", label: "Blocked?", type: "bool" },
          ]}
        />
      </Card>
    </>
  );
}
