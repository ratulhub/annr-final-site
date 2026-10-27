import { createFileRoute } from "@tanstack/react-router";
import { setState, useAdmin, type Order } from "../admin/store";
import { Card, RowList } from "../admin/ui";

export const Route = createFileRoute("/admin/orders")({ component: Orders });

function Orders() {
  const s = useAdmin();
  const rows = s.orders.map((o) => ({ ...o }));
  return (
    <>
      <div className="adm-top"><h1>Orders ({s.orders.length})</h1></div>
      <Card>
        <RowList<Order> rows={rows} onChange={(r) => setState((x) => ({ ...x, orders: r }))}
          blank={{ date: new Date().toISOString().slice(0, 10), customer: "", email: "", total: "0.00", status: "Unfulfilled", payment: "Pending", items: "", address: "", note: "" }}
          fields={[
            { key: "id", label: "Order" }, { key: "date", label: "Date" }, { key: "customer", label: "Customer" }, { key: "email", label: "Email" },
            { key: "items", label: "Items" }, { key: "total", label: "Total ৳" },
            { key: "payment", label: "Payment", type: ["Pending", "Paid", "COD", "Refunded"] },
            { key: "status", label: "Status", type: ["Unfulfilled", "Processing", "Shipped", "Fulfilled", "Cancelled", "Returned"] },
            { key: "address", label: "Address" }, { key: "note", label: "Note" },
          ]} />
      </Card>
    </>
  );
}
