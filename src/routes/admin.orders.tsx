import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { setState, useAdmin, type Order } from "../admin/store";
import { BackBtn, Card, RowList } from "../admin/ui";

export const Route = createFileRoute("/admin/orders")({ component: Orders });

function Orders() {
  const s = useAdmin();
  const rows = s.orders.map((o) => ({ ...o }));
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Compute revenue and summary stats
  const totalRevenue = s.orders.reduce((sum, o) => {
    const clean = parseFloat(String(o.total).replace(/[^0-9.]/g, "")) || 0;
    return sum + clean;
  }, 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const paidOrders = s.orders.filter((o) => o.payment.toLowerCase() === "paid").length;
  const unfulfilledOrders = s.orders.filter((o) => o.status.toLowerCase() === "unfulfilled").length;

  const exportCSV = () => {
    try {
      const headers = ["Order ID", "Date", "Customer", "Email", "Items", "Total (BDT)", "Payment", "Status", "Address", "Note"];
      const csvRows = [
        headers.join(","),
        ...s.orders.map((o) =>
          [
            `"${o.id}"`,
            `"${o.date}"`,
            `"${o.customer}"`,
            `"${o.email}"`,
            `"${o.items.replace(/"/g, '""')}"`,
            `"${o.total}"`,
            `"${o.payment}"`,
            `"${o.status}"`,
            `"${o.address.replace(/"/g, '""')}"`,
            `"${(o.note || "").replace(/"/g, '""')}"`,
          ].join(","),
        ),
      ];
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `annr-orders-${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <div className="adm-top">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <BackBtn to="/admin" label="← Dashboard" />
          <div>
            <h1>Orders ({s.orders.length})</h1>
            <p className="adm-hint" style={{ margin: "2px 0 0" }}>Manage customer purchases, fulfillment, and revenue</p>
          </div>
        </div>
        <div className="adm-row">
          <button className="adm-btn ghost" onClick={exportCSV} title="Export orders as CSV spreadsheet">
            📥 {downloadSuccess ? "CSV Exported!" : "Export Orders CSV"}
          </button>
        </div>
      </div>

      {/* Quick Order Stats */}
      <div className="adm-stats">
        <div className="adm-stat accent-indigo">
          <span>Total Revenue</span>
          <b>৳{totalRevenue}</b>
          <small>{s.orders.length} total orders</small>
        </div>
        <div className="adm-stat accent-emerald">
          <span>Paid Orders</span>
          <b>{paidOrders}</b>
          <small>{paidOrders === s.orders.length ? "100% paid" : `${s.orders.length - paidOrders} pending payment`}</small>
        </div>
        <div className="adm-stat accent-amber">
          <span>Unfulfilled</span>
          <b>{unfulfilledOrders}</b>
          <small>{unfulfilledOrders > 0 ? "Awaiting packing / shipment" : "All orders fulfilled"}</small>
        </div>
      </div>

      <Card title="All Customer Orders" subtitle="Directly edit order rows, change fulfillment or payment status, or record new customer orders">
        <RowList<Order>
          rows={rows}
          onChange={(r) => setState((x) => ({ ...x, orders: r }))}
          blank={{
            date: new Date().toISOString().slice(0, 10),
            customer: "",
            email: "",
            total: "0.00",
            status: "Unfulfilled",
            payment: "Pending",
            items: "",
            address: "",
            note: "",
          }}
          fields={[
            { key: "id", label: "Order #" },
            { key: "date", label: "Date" },
            { key: "customer", label: "Customer" },
            { key: "email", label: "Email" },
            { key: "items", label: "Items" },
            { key: "total", label: "Total ৳" },
            { key: "payment", label: "Payment", type: ["Pending", "Paid", "COD", "Refunded"] },
            { key: "status", label: "Fulfillment", type: ["Unfulfilled", "Processing", "Shipped", "Fulfilled", "Cancelled", "Returned"] },
            { key: "address", label: "Shipping Address" },
            { key: "note", label: "Internal Notes" },
          ]}
        />
      </Card>
    </>
  );
}
