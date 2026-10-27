import { createFileRoute } from "@tanstack/react-router";
import { setState, useAdmin, type Customer } from "../admin/store";
import { Card, RowList } from "../admin/ui";

export const Route = createFileRoute("/admin/customers")({ component: Customers });

function Customers() {
  const s = useAdmin();
  return (
    <>
      <div className="adm-top"><h1>Customers ({s.customers.length})</h1></div>
      <Card>
        <RowList<Customer> rows={s.customers} onChange={(r) => setState((x) => ({ ...x, customers: r }))}
          blank={{ name: "", email: "", phone: "", orders: 0, points: 0, tier: "Bronze", tags: "", blocked: false }}
          fields={[
            { key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "phone", label: "Phone" },
            { key: "orders", label: "Orders", type: "number" }, { key: "points", label: "Points", type: "number" },
            { key: "tier", label: "VIP tier", type: ["Bronze", "Silver", "Gold", "Diamond"] },
            { key: "tags", label: "Tags" }, { key: "blocked", label: "Blocked", type: "bool" },
          ]} />
      </Card>
    </>
  );
}
