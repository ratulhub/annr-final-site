import { createFileRoute } from "@tanstack/react-router";
import { setState, useAdmin, type Discount } from "../admin/store";
import { BackBtn, Card, RowList } from "../admin/ui";

export const Route = createFileRoute("/admin/discounts")({ component: Discounts });

function Discounts() {
  const s = useAdmin();
  const activeCount = s.discounts.filter((d) => d.active).length;
  const totalUses = s.discounts.reduce((sum, d) => sum + (Number(d.uses) || 0), 0);

  return (
    <>
      <div className="adm-top">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <BackBtn to="/admin" label="← Dashboard" />
          <div>
            <h1>Promotions & Discounts ({s.discounts.length})</h1>
            <p className="adm-hint" style={{ margin: "2px 0 0" }}>Create coupon codes, percentage sales, and free shipping vouchers</p>
          </div>
        </div>
      </div>

      <div className="adm-stats">
        <div className="adm-stat">
          <span>Active discount codes</span>
          <b>{activeCount}</b>
          <small>{s.discounts.length - activeCount} inactive / expired</small>
        </div>
        <div className="adm-stat">
          <span>Total redemptions</span>
          <b>{totalUses}</b>
          <small>Times discounts applied</small>
        </div>
        <div className="adm-stat">
          <span>Supported types</span>
          <b>4</b>
          <small>% Off, ৳ Flat, Free shipping, BOGO</small>
        </div>
      </div>

      <Card title="Discounts" subtitle="Manage active coupon codes, set minimum order values, and schedule expiration dates">
        <RowList<Discount>
          rows={s.discounts}
          onChange={(r) => setState((x) => ({ ...x, discounts: r }))}
          blank={{
            code: "",
            type: "percentage",
            value: "10",
            minOrder: "0",
            uses: 0,
            limit: "",
            active: true,
            starts: new Date().toISOString().slice(0, 10),
            ends: "",
          }}
          fields={[
            { key: "code", label: "Coupon Code" },
            { key: "type", label: "Discount Type", type: ["percentage", "fixed amount", "free shipping", "buy x get y"] },
            { key: "value", label: "Value (% or ৳)" },
            { key: "minOrder", label: "Min Order Amount (৳)" },
            { key: "limit", label: "Max Total Uses" },
            { key: "uses", label: "Times Used", type: "number" },
            { key: "starts", label: "Start Date" },
            { key: "ends", label: "End Date" },
            { key: "active", label: "Active?", type: "bool" },
          ]}
        />
      </Card>
    </>
  );
}
