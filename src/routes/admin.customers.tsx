import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { setState, uid, useAdmin, type Customer } from "../admin/store";
import { BackBtn, Card } from "../admin/ui";

export const Route = createFileRoute("/admin/customers")({ component: Customers });

const PAGE_SIZE = 20;

function Customers() {
  const s = useAdmin();
  const [q, setQ] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [page, setPage] = useState(1);

  const vipCount = s.customers.filter((c) => c.tier !== "Bronze" || (c.tags && c.tags.includes("vip"))).length;
  const totalPoints = s.customers.reduce((sum, c) => sum + (Number(c.points) || 0), 0);
  const blockedCount = s.customers.filter((c) => c.blocked).length;

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return s.customers.filter((c) => {
      if (tierFilter !== "all" && c.tier !== tierFilter) return false;
      if (!query) return true;
      const hay = `${c.name} ${c.email} ${c.phone} ${c.tier} ${c.tags || ""}`.toLowerCase();
      return hay.includes(query);
    });
  }, [s.customers, q, tierFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedList = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const addCustomer = () => {
    const newCust: Customer = {
      id: uid(),
      name: "New Customer",
      email: `customer-${uid()}@example.com`,
      phone: "+8801700000000",
      orders: 0,
      points: 100,
      tier: "Silver",
      tags: "vip",
      blocked: false,
    };
    setState((x) => ({ ...x, customers: [newCust, ...x.customers] }));
  };

  const updateCustomer = (id: string, patch: Partial<Customer>) => {
    setState((x) => ({
      ...x,
      customers: x.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  };

  const deleteCustomer = (id: string) => {
    if (confirm("Delete this customer account?")) {
      setState((x) => ({ ...x, customers: x.customers.filter((c) => c.id !== id) }));
    }
  };

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
        <button className="adm-btn primary" onClick={addCustomer}>
          + Add Customer
        </button>
      </div>

      {/* Customer Insights */}
      <div className="adm-stats">
        <div className="adm-stat">
          <span>Customers</span>
          <b>{s.customers.length}</b>
          <small>Registered shopper accounts</small>
        </div>
        <div className="adm-stat">
          <span>VIP members</span>
          <b>{vipCount}</b>
          <small>Silver, Gold & Diamond</small>
        </div>
        <div className="adm-stat">
          <span>Reward points</span>
          <b>{totalPoints.toLocaleString()}</b>
          <small>Points in circulation</small>
        </div>
        <div className="adm-stat">
          <span>Blocked accounts</span>
          <b>{blockedCount}</b>
          <small>{blockedCount > 0 ? "Restricted from ordering" : "No blocked users"}</small>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="adm-card" style={{ padding: 14, marginBottom: 16 }}>
        <div className="adm-row" style={{ gap: 10, flexWrap: "wrap", justifyContent: "space-between" }}>
          <div className="adm-row" style={{ gap: 8, flex: "1 1 350px", flexWrap: "wrap" }}>
            <input
              placeholder="Search by name, email, phone, tags..."
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              style={{ flex: "1 1 200px" }}
            />
            <select
              value={tierFilter}
              onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
              style={{ flex: "0 1 150px" }}
            >
              <option value="all">All Tiers ({s.customers.length})</option>
              <option value="Bronze">Bronze Tier</option>
              <option value="Silver">Silver Tier (VIP)</option>
              <option value="Gold">Gold Tier (VIP)</option>
              <option value="Diamond">Diamond Tier (VIP)</option>
            </select>
            {q && (
              <button className="adm-btn ghost sm" onClick={() => { setQ(""); setPage(1); }}>
                Clear
              </button>
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--p-text-subdued)" }}>
            Found {filtered.length} customer{filtered.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="adm-card adm-table-wrap" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Orders</th>
              <th>Points</th>
              <th>VIP Tier</th>
              <th>Status</th>
              <th style={{ textAlign: "right", paddingRight: 16 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedList.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "40px 20px", color: "var(--p-text-subdued)" }}>
                  No customer records found matching search.
                </td>
              </tr>
            ) : (
              pagedList.map((c) => (
                <tr key={c.id || c.email}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    {c.tags && (
                      <span className="adm-tag" style={{ fontSize: 9, padding: "1px 4px", marginTop: 2 }}>
                        {c.tags}
                      </span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: 13, color: "var(--p-text)" }}>{c.email}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: "var(--p-text-subdued)" }}>{c.phone || "—"}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{c.orders || 0}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: "#e05a2b" }}>{(c.points || 0).toLocaleString()} PTS</span>
                  </td>
                  <td>
                    <select
                      value={c.tier || "Bronze"}
                      onChange={(e) => updateCustomer(c.id, { tier: e.target.value })}
                      style={{ fontSize: 12, padding: "3px 6px", borderRadius: 4, border: "1px solid var(--p-border-subdued)" }}
                    >
                      <option value="Bronze">Bronze</option>
                      <option value="Silver">Silver</option>
                      <option value="Gold">Gold</option>
                      <option value="Diamond">Diamond</option>
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => updateCustomer(c.id, { blocked: !c.blocked })}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      <span className={`adm-tag ${c.blocked ? "danger" : "active"}`}>
                        {c.blocked ? "Blocked" : "Active"}
                      </span>
                    </button>
                  </td>
                  <td style={{ textAlign: "right", paddingRight: 16 }}>
                    <button
                      type="button"
                      className="adm-btn danger sm"
                      onClick={() => deleteCustomer(c.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, padding: "0 4px" }}>
          <div style={{ fontSize: 12, color: "var(--p-text-subdued)" }}>
            Page {currentPage} of {totalPages} ({filtered.length} total customers)
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="adm-btn ghost sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Previous
            </button>
            <button
              className="adm-btn ghost sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
