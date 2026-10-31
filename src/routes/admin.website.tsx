import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { setSite, setState, uid, useAdmin } from "../admin/store";
import { Card } from "../admin/ui";
import { move, OrderBtns } from "../admin/site/fields";
import type { CustomPage } from "../admin/site/types";

export const Route = createFileRoute("/admin/website")({ component: WebsitePagesManager });

type Tab = "all" | "store" | "collections" | "pages" | "custom";

function WebsitePagesManager() {
  const s = useAdmin();
  const cps = s.site.customPages || [];
  const hidden = s.site.hiddenPages || [];
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");

  const setCps = (l: CustomPage[]) => setSite("customPages", l);
  const setHiddenBatch = (paths: string[], hide: boolean) => {
    let next = [...hidden];
    paths.forEach((p) => {
      const variants = [p, p.replace(/\/index\.html$/, ""), p.replace(/\/index\.html$/, "") + "/index.html", p.replace(/\/index\.html$/, "") + "/"];
      variants.forEach((v) => {
        if (hide) {
          if (!next.includes(v)) next.push(v);
        } else {
          next = next.filter((x) => x !== v);
        }
      });
    });
    setSite("hiddenPages", next);
  };

  const toggleHidden = (path: string) => {
    const isHidden = hidden.includes(path) || hidden.includes(path.replace(/\/index\.html$/, ""));
    setHiddenBatch([path], !isHidden);
  };

  const slugOk = (slug: string, id: string) =>
    /^[a-z0-9-]+$/.test(slug) && !cps.some((c) => c.slug === slug && c.id !== id);

  const addPage = () => {
    const n = cps.length + 1;
    const newPage: CustomPage = {
      id: uid(),
      slug: `page-${uid()}`,
      title: `Custom Page ${n}`,
      status: "draft",
      showInNav: false,
      seoTitle: "",
      seoDescription: "",
      blocks: [{ id: uid(), type: "heading", text: `Custom Page ${n}`, level: "h1", align: "left" }],
    };
    setCps([...cps, newPage]);
  };

  // Build complete page registry
  type PageEntry = {
    category: "store" | "collections" | "pages" | "custom";
    title: string;
    url: string;
    key: string;
    visible: boolean;
    canToggle: boolean;
    editLink: string;
    isCustom?: boolean;
    customPage?: CustomPage;
  };

  const pagesList: PageEntry[] = [
    {
      category: "store",
      title: "Home Page",
      url: "/home.html",
      key: "home",
      visible: !s.site.technical.maintenance,
      canToggle: false,
      editLink: "/admin/sections",
    },
    ...s.pages.map((p) => {
      const isHidden = p.visible === false || hidden.includes(`/pages/${p.handle}`) || hidden.includes(`/pages/${p.handle}/index.html`);
      return {
        category: "pages" as const,
        title: p.title,
        url: `/pages/${p.handle}/index.html`,
        key: p.handle,
        visible: !isHidden,
        canToggle: true,
        editLink: "/admin/pages",
      };
    }),
    ...s.collections.map((c) => {
      const isHidden = c.visible === false || hidden.includes(`/collections/${c.handle}`) || hidden.includes(`/collections/${c.handle}/index.html`);
      return {
        category: "collections" as const,
        title: `Collection: ${c.title}`,
        url: `/collections/${c.handle}/index.html`,
        key: `col-${c.handle}`,
        visible: !isHidden,
        canToggle: true,
        editLink: "/admin/collections",
      };
    }),
    {
      category: "store",
      title: "VIP Account Login",
      url: "/account/login/index.html",
      key: "account-login",
      visible: !hidden.includes("/account/login/index.html"),
      canToggle: true,
      editLink: "/admin/forms",
    },
    {
      category: "store",
      title: "VIP Account Register",
      url: "/account/register/index.html",
      key: "account-register",
      visible: !hidden.includes("/account/register/index.html"),
      canToggle: true,
      editLink: "/admin/forms",
    },
    {
      category: "store",
      title: "Search Results Page",
      url: "/search/index.html",
      key: "search",
      visible: !hidden.includes("/search/index.html"),
      canToggle: true,
      editLink: "/admin/sections",
    },
    ...cps.map((cp) => ({
      category: "custom" as const,
      title: cp.title,
      url: `/p/${cp.slug}`,
      key: `cp-${cp.id}`,
      visible: cp.status === "published",
      canToggle: true,
      editLink: `/admin/website/${cp.id}`,
      isCustom: true,
      customPage: cp,
    })),
  ];

  const handleToggle = (item: PageEntry) => {
    if (!item.canToggle) return;
    if (item.isCustom && item.customPage) {
      const nextStatus = item.customPage.status === "published" ? "draft" : "published";
      setCps(cps.map((x) => (x.id === item.customPage!.id ? { ...x, status: nextStatus } : x)));
      return;
    }

    // If it's in catalog s.pages:
    const pageItem = s.pages.find((p) => p.handle === item.key);
    if (pageItem) {
      const nextVisible = !item.visible;
      setState((prev) => ({
        ...prev,
        pages: prev.pages.map((p) => (p.handle === item.key ? { ...p, visible: nextVisible } : p)),
      }));
      setHiddenBatch([`/pages/${item.key}`, `/pages/${item.key}/index.html`], !nextVisible);
      return;
    }

    // If it's a collection:
    if (item.key.startsWith("col-")) {
      const colHandle = item.key.replace("col-", "");
      const nextVisible = !item.visible;
      setState((prev) => ({
        ...prev,
        collections: prev.collections.map((c) => (c.handle === colHandle ? { ...c, visible: nextVisible } : c)),
      }));
      setHiddenBatch([`/collections/${colHandle}`, `/collections/${colHandle}/index.html`], !nextVisible);
      return;
    }

    // General URL hidden toggle:
    toggleHidden(item.url);
  };

  const filteredPages = pagesList.filter((p) => {
    if (tab !== "all" && p.category !== tab) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.url.toLowerCase().includes(q);
    }
    return true;
  });

  const visibleTotal = pagesList.filter((p) => p.visible).length;
  const hiddenTotal = pagesList.length - visibleTotal;

  return (
    <>
      <div className="adm-top">
        <div>
          <h1>Website Pages & Visibility</h1>
          <p className="adm-hint" style={{ marginTop: 4 }}>
            Control visibility for every page on the website. Show or hide individual collections, store pages, or create and publish custom block pages.
          </p>
        </div>
        <div className="adm-row" style={{ gap: 8 }}>
          <button className="adm-btn" onClick={addPage}>
            + New Custom Page
          </button>
        </div>
      </div>

      {/* Tabs & Search Filter */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { id: "all", label: `All (${pagesList.length})` },
            { id: "store", label: "Store Pages" },
            { id: "collections", label: `Collections (${s.collections.length})` },
            { id: "pages", label: `Info Pages (${s.pages.length})` },
            { id: "custom", label: `Custom Pages (${cps.length})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={`adm-btn sm ${tab === t.id ? "" : "ghost"}`}
              style={{ fontWeight: tab === t.id ? 700 : 400 }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontFamily: "'FK Grotesk SemiMono', monospace", color: "#666" }}>
            {visibleTotal} visible · {hiddenTotal} hidden
          </span>
          <input
            type="search"
            placeholder="Search pages by title or URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 240, padding: "6px 10px", fontSize: 12 }}
          />
        </div>
      </div>

      <Card title={`Page Directory (${filteredPages.length})`}>
        <table>
          <thead>
            <tr>
              <th style={{ width: "30%" }}>Page Title</th>
              <th>Address / Route</th>
              <th style={{ width: 110 }}>Visibility</th>
              <th style={{ width: 90 }}>Action</th>
              <th style={{ width: 140 }}>Manage</th>
            </tr>
          </thead>
          <tbody>
            {filteredPages.map((item) => (
              <tr key={item.url} style={{ opacity: item.visible ? 1 : 0.6 }}>
                <td>
                  <div style={{ fontWeight: 600 }}>{item.title}</div>
                  <div style={{ fontSize: 10, opacity: 0.5, fontFamily: "'FK Grotesk SemiMono', monospace", textTransform: "uppercase" }}>
                    {item.category}
                  </div>
                </td>
                <td>
                  <a className="link" href={item.url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                    {item.url}
                  </a>
                </td>
                <td>
                  <span
                    style={{
                      fontSize: 9,
                      fontFamily: "'FK Grotesk SemiMono', monospace",
                      padding: "2px 6px",
                      borderRadius: 2,
                      background: item.visible ? "#050505" : "#e5e5e5",
                      color: item.visible ? "#fff" : "#666",
                      fontWeight: 600,
                    }}
                  >
                    {item.visible ? "VISIBLE" : "HIDDEN"}
                  </span>
                </td>
                <td>
                  {item.canToggle ? (
                    <button
                      className={`adm-btn sm ${item.visible ? "ghost" : ""}`}
                      onClick={() => handleToggle(item)}
                      style={{ minWidth: 64, fontSize: 11 }}
                    >
                      {item.visible ? "Hide" : "Show"}
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, opacity: 0.5 }}>Always</span>
                  )}
                </td>
                <td>
                  <div className="adm-row" style={{ gap: 6 }}>
                    <Link className="adm-btn ghost sm" to={item.editLink}>
                      Edit
                    </Link>
                    {item.isCustom && item.customPage && (
                      <button
                        className="adm-btn ghost sm"
                        style={{ color: "#c00" }}
                        onClick={() =>
                          confirm(`Delete custom page "${item.title}"?`) &&
                          setCps(cps.filter((x) => x.id !== item.customPage!.id))
                        }
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!filteredPages.length && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "32px 12px", color: "#888" }}>
                  No pages match your search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="adm-hint" style={{ marginTop: 12 }}>
          Pages toggled to "Hidden" immediately become inaccessible on the storefront and display AnnR's custom unavailable screen.
        </p>
      </Card>

      {/* Custom Pages Table */}
      {cps.length > 0 && (
        <Card title={`Custom Block-Based Pages (${cps.length})`}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }} />
                <th>Title</th>
                <th>URL Slug</th>
                <th>Status</th>
                <th>Show in Menu</th>
                <th style={{ width: 180 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cps.map((c, i) => {
                const up = (p: Partial<CustomPage>) => setCps(cps.map((x) => (x.id === c.id ? { ...x, ...p } : x)));
                return (
                  <tr key={c.id}>
                    <td>
                      <OrderBtns i={i} n={cps.length} onMove={(to) => setCps(move(cps, i, to))} />
                    </td>
                    <td>
                      <input value={c.title} onChange={(e) => up({ title: e.target.value })} style={{ fontWeight: 600 }} />
                    </td>
                    <td>
                      <input
                        value={c.slug}
                        aria-invalid={!slugOk(c.slug, c.id)}
                        onChange={(e) => up({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                      />
                      {!slugOk(c.slug, c.id) && <small className="adm-err">Already used</small>}
                      <small className="adm-hint">/p/{c.slug}</small>
                    </td>
                    <td>
                      <select
                        value={c.status}
                        onChange={(e) => up({ status: e.target.value as CustomPage["status"] })}
                        style={{ fontSize: 11 }}
                      >
                        <option value="draft">draft</option>
                        <option value="published">published</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={c.showInNav}
                        onChange={(e) => up({ showInNav: e.target.checked })}
                      />
                    </td>
                    <td>
                      <div className="adm-row" style={{ gap: 4 }}>
                        <Link className="adm-btn sm" to="/admin/website/$id" params={{ id: c.id }}>
                          Builder
                        </Link>
                        <button
                          className="adm-btn ghost sm"
                          onClick={() =>
                            setCps([
                              ...cps.slice(0, i + 1),
                              {
                                ...structuredClone(c),
                                id: uid(),
                                slug: `${c.slug}-copy`,
                                title: `${c.title} (Copy)`,
                                status: "draft",
                              },
                              ...cps.slice(i + 1),
                            ])
                          }
                        >
                          Copy
                        </button>
                        <button
                          className="adm-btn danger sm"
                          onClick={() =>
                            confirm(`Delete "${c.title}"?`) && setCps(cps.filter((x) => x.id !== c.id))
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="adm-hint" style={{ marginTop: 12 }}>
            Custom pages support full modular block layouts (headings, rich text, images, FAQ accordions, buttons, product showcases, and galleries).
          </p>
        </Card>
      )}
    </>
  );
}
