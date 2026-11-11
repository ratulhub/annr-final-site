import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { setState, useAdmin, type Order } from "../admin/store";
import { BackBtn, Card, RowList } from "../admin/ui";
import { updateStoreOrderStatus } from "../lib/loyalty";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export const Route = createFileRoute("/admin/orders")({ component: Orders });

function Orders() {
  const s = useAdmin();
  const rows = s.orders.map((o) => ({ ...o }));
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Sync new orders from checkout (localStorage or Supabase)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("annr-orders");
      if (raw) {
        const localPlaced: any[] = JSON.parse(raw);
        if (Array.isArray(localPlaced) && localPlaced.length > 0) {
          setState((prev) => {
            const existingIds = new Set(prev.orders.map((o) => o.id));
            const toAdd: Order[] = [];
            for (const po of localPlaced) {
              const id = po.id || `#${po.order_number}`;
              if (!existingIds.has(id)) {
                toAdd.push({
                  id,
                  date: po.created_at ? po.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
                  customer: po.customer_name || po.customer || "Store Customer",
                  email: po.email || "",
                  total: String(po.total || "0.00"),
                  status: po.status || "Unfulfilled",
                  payment: po.payment_method?.toUpperCase() || po.payment || "Pending",
                  items: Array.isArray(po.items) ? po.items.map((i: any) => `${i.title} × ${i.quantity}`).join(", ") : (po.items || ""),
                  address: po.full_address || po.address || "",
                  note: po.customer_notes || po.trx_id ? `TrxID: ${po.trx_id || ""}` : "",
                });
              }
            }
            if (toAdd.length > 0) {
              return { ...prev, orders: [...toAdd, ...prev.orders] };
            }
            return prev;
          });
        }
      }

      // Also query Supabase orders table if configured
      if (isSupabaseConfigured()) {
        supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(50).then(({ data }) => {
          if (data && data.length > 0) {
            setState((prev) => {
              const existingIds = new Set(prev.orders.map((o) => o.id));
              const remoteAdd: Order[] = [];
              for (const ro of data) {
                const id = `#${ro.order_number || ro.id.slice(0, 8)}`;
                if (!existingIds.has(id)) {
                  remoteAdd.push({
                    id,
                    date: ro.created_at.slice(0, 10),
                    customer: ro.customer_name || "Customer",
                    email: ro.email || "",
                    total: String(ro.total_bdt || ro.total || "0"),
                    status: ro.status || "Unfulfilled",
                    payment: ro.payment_status || "Pending",
                    items: "Store items",
                    address: ro.shipping_address || "",
                    note: ro.trx_id ? `TrxID: ${ro.trx_id}` : "",
                  });
                }
              }
              if (remoteAdd.length > 0) {
                return { ...prev, orders: [...remoteAdd, ...prev.orders] };
              }
              return prev;
            });
          }
        }, () => {});
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleOrdersChange = (newOrders: Order[]) => {
    // Check which order changed status
    const oldMap = new Map(s.orders.map((o) => [o.id, o]));
    for (const no of newOrders) {
      const old = oldMap.get(no.id);
      if (old && (old.status !== no.status || old.payment !== no.payment)) {
        updateStoreOrderStatus(no.id, no.status, no.payment).catch(console.error);
      }
    }
    setState((x) => ({ ...x, orders: newOrders }));
  };

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
        <div className="adm-row" style={{ gap: 8 }}>
          {s.orders.length > 0 && (
            <button
              type="button"
              className="adm-btn ghost"
              onClick={() => {
                if (window.confirm("Are you sure you want to clear all orders?")) {
                  setState((x) => ({ ...x, orders: [] }));
                  try { localStorage.removeItem("annr-orders"); } catch {}
                }
              }}
              style={{ color: "#d97706" }}
            >
              Clear All Orders
            </button>
          )}
          <button className="adm-btn ghost" onClick={exportCSV} title="Export orders as CSV spreadsheet">
            {downloadSuccess ? "CSV exported" : "Export CSV"}
          </button>
        </div>
      </div>

      {/* Quick Order Stats */}
      <div className="adm-stats">
        <div className="adm-stat">
          <span>Total revenue</span>
          <b>৳{totalRevenue}</b>
          <small>{s.orders.length} total orders</small>
        </div>
        <div className="adm-stat">
          <span>Paid orders</span>
          <b>{paidOrders}</b>
          <small>{paidOrders === s.orders.length ? "100% paid" : `${s.orders.length - paidOrders} pending payment`}</small>
        </div>
        <div className="adm-stat">
          <span>Unfulfilled</span>
          <b>{unfulfilledOrders}</b>
          <small>{unfulfilledOrders > 0 ? "Awaiting fulfillment" : "All orders fulfilled"}</small>
        </div>
      </div>

      <Card title="Orders" subtitle="Manage customer orders, shipping details, payment, and fulfillment status">
        <RowList<Order>
          rows={rows}
          onChange={handleOrdersChange}
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
