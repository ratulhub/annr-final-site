import { createFileRoute } from "@tanstack/react-router";
import { setState, useAdmin, type Discount } from "../admin/store";
import { Card, RowList } from "../admin/ui";

export const Route = createFileRoute("/admin/discounts")({ component: Discounts });

function Discounts() {
  const s = useAdmin();
  return (
    <>
      <div className="adm-top"><h1>Discounts</h1></div>
      <Card>
        <RowList<Discount> rows={s.discounts} onChange={(r) => setState((x) => ({ ...x, discounts: r }))}
          blank={{ code: "", type: "percentage", value: "", minOrder: "0", uses: 0, limit: "", active: true, starts: "", ends: "" }}
          fields={[
            { key: "code", label: "Code" }, { key: "type", label: "Type", type: ["percentage", "fixed amount", "free shipping", "buy x get y"] },
            { key: "value", label: "Value" }, { key: "minOrder", label: "Min order ৳" }, { key: "limit", label: "Usage limit" },
            { key: "uses", label: "Used", type: "number" }, { key: "starts", label: "Starts" }, { key: "ends", label: "Ends" },
            { key: "active", label: "Active", type: "bool" },
          ]} />
      </Card>
    </>
  );
}
