/**
 * AnnR Unique One-of-One Archival Catalog Engine
 * Handles dynamic product rendering, exact size badges, measurement tables,
 * sold/reserved states, Unique Campaign filtering, category navigation, and checkout reservation.
 */
(function () {
  "use strict";

  var SUPABASE_URL = "https://aooydxydkyjtulhduexa.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_rWZ3_sO_15nX-jMpRMrnng_CrRhuJK5";

  var CATEGORIES = [
    { slug: "hoodies", name: "Hoodies" },
    { slug: "sweatshirts", name: "Sweatshirts" },
    { slug: "trousers", name: "Trousers" },
    { slug: "sweaters", name: "Sweaters" },
    { slug: "t-shirts", name: "T-Shirts" },
    { slug: "jackets", name: "Jackets" },
    { slug: "knitwear", name: "Knitwear" },
    { slug: "accessories", name: "Accessories" }
  ];

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatMoney(amount) {
    var n = parseFloat(String(amount).replace(/[^0-9.-]+/g, "")) || 0;
    return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  // Inject Luxury Monochrome Editorial Typography & Styles
  function injectStyles() {
    if (document.getElementById("annr-unique-styles")) return;
    var st = document.createElement("style");
    st.id = "annr-unique-styles";
    st.textContent =
      "/* AnnR Unique One-of-One Luxury Editorial Styling */\n" +
      ".annr-unique-badge-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 18px 0 12px; flex-wrap: wrap; }\n" +
      ".annr-unique-pill { display: inline-flex; align-items: center; gap: 7px; background: #0a0a0a; color: #ffffff; padding: 6px 11px; font-family: 'FK Grotesk SemiMono', monospace; font-size: 10px; font-weight: 500; letter-spacing: 1.6px; text-transform: uppercase; }\n" +
      ".annr-unique-pill.sold { background: #525252; color: #f5f5f5; }\n" +
      ".annr-unique-pill.reserved { background: #92400e; color: #ffffff; }\n" +
      ".annr-unique-code { font-family: 'FK Grotesk SemiMono', monospace; font-size: 11px; font-weight: 500; color: #e05a2b; letter-spacing: 1.5px; text-transform: uppercase; }\n" +
      ".annr-exact-size-card { background: #ffffff; border: 1px solid #0a0a0a; padding: 18px 20px; margin: 12px 0 16px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }\n" +
      ".annr-size-primary { display: flex; align-items: baseline; gap: 14px; }\n" +
      ".annr-size-tag { font-family: 'FK Grotesk SemiMono', monospace; font-size: 10px; letter-spacing: 1.8px; color: #666666; text-transform: uppercase; }\n" +
      ".annr-size-value { font-family: 'Druk Wide', 'NB Architekt Std', sans-serif; font-size: 24px; font-weight: 900; color: #0a0a0a; letter-spacing: 0.5px; line-height: 1; }\n" +
      ".annr-size-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; text-align: right; font-family: 'FK Grotesk SemiMono', monospace; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #666666; }\n" +
      ".annr-size-meta strong { color: #0a0a0a; font-weight: 600; }\n" +
      ".annr-measurements-panel { background: #f8f8f6; border: 1px solid #e6e6e2; padding: 16px 18px; margin: 0 0 14px; }\n" +
      ".annr-measurements-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #e6e6e2; padding-bottom: 8px; }\n" +
      ".annr-measurements-head span { font-family: 'FK Grotesk SemiMono', monospace; font-size: 10px; font-weight: 600; letter-spacing: 1.5px; color: #0a0a0a; text-transform: uppercase; }\n" +
      ".annr-measurements-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(105px, 1fr)); gap: 8px; }\n" +
      ".annr-meas-item { background: #ffffff; border: 1px solid #e8e8e4; padding: 10px 12px; }\n" +
      ".annr-meas-label { font-family: 'FK Grotesk SemiMono', monospace; font-size: 9px; letter-spacing: 1.2px; color: #737373; text-transform: uppercase; margin-bottom: 4px; }\n" +
      ".annr-meas-val { font-family: 'NB Architekt Std', sans-serif; font-size: 14px; font-weight: 700; color: #0a0a0a; letter-spacing: 0.5px; }\n" +
      ".annr-meas-note { font-family: 'FK Grotesk SemiMono', monospace; font-size: 10px; color: #737373; margin-top: 10px; line-height: 1.5; letter-spacing: 0.2px; }\n" +
      ".annr-single-qty-lock { display: flex; align-items: center; gap: 9px; font-family: 'FK Grotesk SemiMono', monospace; font-size: 10px; letter-spacing: 1.3px; text-transform: uppercase; color: #262626; background: #ffffff; padding: 10px 14px; border: 1px solid #e4e4e0; border-left: 2px solid #0a0a0a; margin: 0 0 18px; }\n" +
      ".annr-single-qty-lock span.dot { width: 6px; height: 6px; border-radius: 50%; background: #e05a2b; display: inline-block; flex-shrink: 0; }\n" +
      ".annr-archival-banner { padding: 14px 18px; margin: 14px 0; border: 1px solid; font-family: 'NB Architekt Std', sans-serif; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; line-height: 1.45; }\n" +
      ".annr-archival-banner.sold { background: #0a0a0a; color: #ffffff; border-color: #0a0a0a; }\n" +
      ".annr-archival-banner.reserved { background: #fffbeb; color: #92400e; border-color: #f59e0b; }\n" +
      "/* Compact Monochrome Editorial Collection Header & Filter Bar */\n" +
      ".annr-campaign-hero { background: #ffffff; border-top: 1px solid #ecece8; border-bottom: 1px solid #0a0a0a; padding: 26px 24px 22px; display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; flex-wrap: wrap; margin: 0 0 20px; }\n" +
      ".annr-campaign-hero .top-badge { display: inline-block; font-family: 'FK Grotesk SemiMono', monospace; font-size: 10px; font-weight: 600; letter-spacing: 2px; color: #e05a2b; text-transform: uppercase; margin-bottom: 6px; }\n" +
      ".annr-campaign-hero h1 { font-family: 'Druk Wide', 'NB Architekt Std', sans-serif; font-size: clamp(22px, 2.6vw, 34px); font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; color: #0a0a0a; margin: 0; line-height: 1.05; }\n" +
      ".annr-campaign-hero p.lead { font-family: 'FK Grotesk SemiMono', monospace; font-size: 11px; color: #555555; max-width: 480px; margin: 0; line-height: 1.55; letter-spacing: 0.2px; }\n" +
      ".annr-grid-controls { display: flex; justify-content: space-between; align-items: center; padding: 10px 24px; background: #ffffff; border-bottom: 1px solid #ecece8; margin: 0 0 22px; flex-wrap: wrap; gap: 14px; }\n" +
      ".annr-toggle-label { display: flex; align-items: center; gap: 8px; font-family: 'FK Grotesk SemiMono', monospace; font-size: 10px; letter-spacing: 1.3px; text-transform: uppercase; color: #171717; cursor: pointer; user-select: none; }\n" +
      ".annr-toggle-label input { accent-color: #0a0a0a; width: 14px; height: 14px; cursor: pointer; }\n" +
      ".annr-sort-select { background: #ffffff; border: 1px solid #d4d4d0; font-family: 'FK Grotesk SemiMono', monospace; font-size: 10px; letter-spacing: 1.1px; text-transform: uppercase; padding: 7px 12px; color: #0a0a0a; outline: none; cursor: pointer; }\n" +
      ".annr-card-one-badge { position: absolute; top: 10px; left: 10px; z-index: 4; background: rgba(10,10,10,0.88); backdrop-filter: blur(4px); color: #ffffff; padding: 4px 9px; font-family: 'FK Grotesk SemiMono', monospace; font-size: 9px; font-weight: 600; letter-spacing: 1.3px; text-transform: uppercase; pointer-events: none; }\n" +
      ".annr-card-meta { padding: 14px 2px 4px; display: flex; flex-direction: column; gap: 4px; }\n" +
      ".annr-card-code { font-family: 'FK Grotesk SemiMono', monospace; font-size: 9.5px; color: #e05a2b; letter-spacing: 1.4px; font-weight: 600; text-transform: uppercase; }\n" +
      ".annr-card-sold-overlay { position: absolute; inset: 0; background: rgba(10,10,10,0.62); display: flex; align-items: center; justify-content: center; z-index: 5; pointer-events: none; }\n" +
      ".annr-card-sold-tag { background: #ffffff; color: #0a0a0a; font-family: 'NB Architekt Std', sans-serif; font-size: 12px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; padding: 8px 16px; border: 1.5px solid #0a0a0a; }\n" +
      ".product-card-image-wrapper img:only-child, .product-card-image:hover .product-card-image-wrapper img:only-child { opacity: 1 !important; visibility: visible !important; }\n" +
      ".js-catalog__content-preloader, .ajax-preloader.js-catalog__content-preloader { display: none !important; opacity: 0 !important; pointer-events: none !important; height: 0 !important; }\n" +
      "/* Fullscreen Lightbox for PDP Photography Inspection */\n" +
      ".annr-lightbox { position: fixed; inset: 0; z-index: 100000; background: rgba(10,10,10,0.94); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; padding: 24px; }\n" +
      ".annr-lightbox img { max-width: min(92vw, 1100px); max-height: 86vh; object-fit: contain; box-shadow: 0 24px 64px rgba(0,0,0,0.6); }\n" +
      ".annr-lightbox-btn { position: fixed; background: rgba(255,255,255,0.12); color: #fff; border: 1px solid rgba(255,255,255,0.22); cursor: pointer; font-family: 'FK Grotesk SemiMono', monospace; font-size: 14px; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }\n" +
      ".annr-lightbox-btn:hover { background: #ffffff; color: #0a0a0a; }\n" +
      "@media only screen and (max-width: 767px) {\n" +
      "  .annr-exact-size-card { padding: 14px 16px; }\n" +
      "  .annr-size-meta { align-items: flex-start; text-align: left; }\n" +
      "  .annr-campaign-hero { padding: 18px 14px 16px; }\n" +
      "  .annr-grid-controls { padding: 10px 14px; }\n" +
      "  .product-gallery-carousel .product-gallery-nav { width: 32px !important; height: 32px !important; }\n" +
      "}\n";
    document.head.appendChild(st);
  }

  var LEGACY_HANDLES = {
    "aka-manto-longsleeve": 1,
    "divine-sanctum-tee": 1,
    "ruin-and-rebirth-varsity-jacket": 1,
    "blue-moon-long-sleeve": 1,
    "hound-of-hades-tee": 1,
    "ruin-and-rebirth-reversible-hoodie": 1
  };

  var LEGACY_COLLECTION_MAP = {
    longsleeves: "sweatshirts",
    jeans: "trousers",
    bottoms: "trousers",
    joggers: "trousers",
    outwear: "jackets",
    hats: "accessories",
    socks: "accessories",
    "flight-tags-keychains": "accessories"
  };

  function safeImg(u) {
    var s = String(u == null ? "" : u).trim();
    if (!s || /[\u0000-\u001f\u007f-\u009f\\]/.test(s)) return "/_ext/annr-template-001.png";
    if (/^data:image\/(png|jpe?g|webp|gif|avif);base64,[a-z0-9+/=]+$/i.test(s)) return s;
    if (s.charAt(0) === "/" && s.charAt(1) !== "/") return s;
    if (/^https?:\/\//i.test(s)) return s;
    return "/_ext/annr-template-001.png";
  }

  function extractTagPref(tags, prefix) {
    if (!Array.isArray(tags)) return "";
    for (var i = 0; i < tags.length; i++) {
      var t = String(tags[i] || "").trim();
      if (t.indexOf(prefix) === 0) return t.slice(prefix.length).toLowerCase();
    }
    return "";
  }

  function hasTag(tags, target) {
    if (!Array.isArray(tags)) return false;
    for (var i = 0; i < tags.length; i++) {
      if (String(tags[i] || "").trim() === target) return true;
    }
    return false;
  }

  function normalizeProduct(p) {
    if (!p || !p.handle || LEGACY_HANDLES[p.handle]) return null;
    var st = String(p.status || "active").toLowerCase();
    if (p.deleted || st === "deleted" || st === "draft" || st === "archived") return null;
    var resUntil = p.reserved_until || p.reservedUntil || null;
    if (st === "reserved" && (!resUntil || new Date(String(resUntil)).getTime() <= Date.now())) {
      st = "active";
      resUntil = null;
    }

    var tags = Array.isArray(p.tags)
      ? p.tags
      : String(p.tags || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);

    var relCat = p.categories && p.categories.slug ? String(p.categories.slug).toLowerCase() : "";
    var relCamp = p.campaigns && p.campaigns.slug ? String(p.campaigns.slug).toLowerCase() : "";
    var rawCat = String(p.categorySlug || p.category || relCat || extractTagPref(tags, "cat:") || p.type || p.product_type || "").toLowerCase();
    var mappedCat = LEGACY_COLLECTION_MAP[rawCat] || rawCat;
    var rawCamp = String(p.campaignSlug || p.campaign || relCamp || extractTagPref(tags, "camp:") || "unique-campaign").toLowerCase();
    var imgs = Array.isArray(p.images) && p.images.length
      ? p.images.map(safeImg)
      : (p.image ? [safeImg(p.image)] : ["/_ext/annr-template-001.png"]);

    var cols = Array.isArray(p.collections) ? p.collections.slice() : [];
    if (mappedCat && cols.indexOf(mappedCat) === -1) cols.push(mappedCat);
    if (rawCamp && rawCamp !== "none" && cols.indexOf(rawCamp) === -1) cols.push(rawCamp);
    if (cols.indexOf("unique-campaign") === -1 && rawCamp !== "none") cols.push("unique-campaign");
    if (cols.indexOf("all") === -1) cols.push("all");

    var showSz = p.show_size !== undefined ? p.show_size !== false : (p.showSize !== undefined ? p.showSize !== false : !hasTag(tags, "__hide_size"));
    if (hasTag(tags, "__hide_size")) showSz = false;

    return {
      id: p.id || p.handle,
      handle: p.handle,
      code: p.code || ("ANNR-" + String(p.handle || "U").toUpperCase().slice(0, 12)),
      title: p.title || "Untitled Archival Piece",
      description: p.description || "",
      price: String(p.price != null ? p.price : "0").replace(/\.00$/, ""),
      compareAt: p.compareAt || (p.compare_at_price ? String(p.compare_at_price).replace(/\.00$/, "") : ""),
      currency: p.currency || "BDT",
      status: st,
      size: p.size || "ONE SIZE",
      showSize: showSz,
      measurements: p.measurements || {},
      fabric: p.fabric || "",
      condition: p.condition || "10/10 Archival",
      careInstructions: p.care_instructions || p.careInstructions || "",
      categoryId: p.category_id || p.categoryId || null,
      categorySlug: mappedCat,
      category: mappedCat,
      campaignId: p.campaign_id || p.campaignId || null,
      campaignSlug: rawCamp,
      campaign: rawCamp,
      collections: cols,
      images: imgs,
      stock: st === "sold" ? 0 : (typeof p.stock === "number" ? p.stock : 1),
      reservedUntil: resUntil,
      isOneOfOne: true
    };
  }

  function getDeletedHandlesMap() {
    var map = {};
    try {
      var rawDel = localStorage.getItem("annr_deleted_handles");
      if (rawDel) {
        var arr = JSON.parse(rawDel);
        if (Array.isArray(arr)) arr.forEach(function (h) { if (h) map[String(h)] = 1; });
      }
    } catch (e) {}
    try {
      var rawCfg = localStorage.getItem("shihiko-site-config");
      if (rawCfg) {
        var sc = JSON.parse(rawCfg);
        if (sc && Array.isArray(sc.deletedProducts)) {
          sc.deletedProducts.forEach(function (h) { if (h) map[String(h)] = 1; });
        }
      }
    } catch (e) {}
    return map;
  }

  function mergeProductLists(lists, allowHandles) {
    var byHandle = {};
    var order = [];
    var delMap = getDeletedHandlesMap();
    var allowed = allowHandles || {};
    lists.forEach(function (arr) {
      if (!Array.isArray(arr)) return;
      arr.forEach(function (raw) {
        var norm = normalizeProduct(raw);
        if (!norm || (delMap[norm.handle] && !allowed[norm.handle])) return;
        if (!byHandle[norm.handle]) order.push(norm.handle);
        byHandle[norm.handle] = norm;
      });
    });
    return order.map(function (h) { return byHandle[h]; });
  }

  // Live Products Cache
  var liveProducts = [];

  function fetchLiveProducts(callback) {
    var baseList = [];
    var remoteCacheList = [];
    var siteCfgList = [];
    var localAdmList = [];
    var ssrProd = window.__ANNR_SSR_PRODUCT__ || null;
    var ssrList = ssrProd ? [ssrProd] : [];
    var ssrAllow = {};
    if (ssrProd && ssrProd.handle) ssrAllow[ssrProd.handle] = 1;

    try {
      var rawRemote = localStorage.getItem("annr_live_products");
      if (rawRemote) remoteCacheList = JSON.parse(rawRemote) || [];
    } catch (e) {}

    try {
      var rawSiteCfg = localStorage.getItem("shihiko-site-config");
      if (rawSiteCfg) {
        var sc = JSON.parse(rawSiteCfg);
        if (sc && Array.isArray(sc.catalog)) siteCfgList = sc.catalog;
      }
    } catch (e) {}

    try {
      var rawAdm = localStorage.getItem("shihiko-admin-v1");
      if (rawAdm) {
        var parsed = JSON.parse(rawAdm);
        if (parsed && Array.isArray(parsed.products)) {
          localAdmList = parsed.products.filter(function (p) {
            if (!p) return false;
            if ((remoteCacheList.length > 0 || ssrList.length > 0) && p.handle === "annr-archival-001" && !p.id) return false;
            return true;
          });
        }
      }
    } catch (e) {}

    liveProducts = mergeProductLists([ssrList, remoteCacheList, siteCfgList, localAdmList], ssrAllow);
    if (liveProducts.length > 0 && callback) {
      callback(liveProducts);
    }

    // 2. Fetch live products from Supabase directly (without joining categories/campaigns which may fail with 401 if table grants are pending)
    var colsFull = "id,handle,code,title,description,price,compare_at_price,currency,status,size,show_size,measurement_unit,measurements,fabric,condition,care_instructions,images,tags,category_id,campaign_id,stock,reserved_until,created_at";
    var colsMin = "id,handle,code,title,description,price,compare_at_price,currency,status,size,measurements,fabric,condition,images,tags,category_id,campaign_id,stock,reserved_until,created_at";

    function querySb(selectCols) {
      var endpoint = SUPABASE_URL + "/rest/v1/products?select=" + selectCols + "&order=created_at.desc";
      return fetch(endpoint, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: "Bearer " + SUPABASE_ANON_KEY
        }
      });
    }

    querySb(colsFull)
      .then(function (r) {
        if (!r.ok) return querySb(colsMin);
        return r;
      })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (Array.isArray(data)) {
          var liveAllow = Object.assign({}, ssrAllow);
          data.forEach(function (row) {
            if (row && row.handle && row.status && row.status !== "archived" && row.status !== "draft") {
              liveAllow[row.handle] = 1;
            }
          });
          var normalizedRemote = mergeProductLists([data], liveAllow);
          try {
            localStorage.setItem("annr_live_products", JSON.stringify(normalizedRemote));
          } catch (e) {}
          var unsyncedLocal = localAdmList.filter(function (p) {
            return p && !p.id && p.handle !== "annr-archival-001";
          });
          liveProducts = mergeProductLists([ssrList, normalizedRemote, unsyncedLocal], liveAllow);
          if (callback) callback(liveProducts);
        } else if (liveProducts.length === 0) {
          fetch("/_ext/catalog.json")
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (catData) {
              var seedArr = Array.isArray(catData) ? catData : (catData && Array.isArray(catData.products) ? catData.products : []);
              baseList = Array.isArray(seedArr) ? seedArr : [];
              liveProducts = mergeProductLists([baseList, siteCfgList, localAdmList], ssrAllow);
              if (callback) callback(liveProducts);
            })
            .catch(function () {
              if (callback) callback(liveProducts);
            });
        }
      })
      .catch(function () {
        if (liveProducts.length === 0) {
          liveProducts = mergeProductLists([baseList, siteCfgList, localAdmList], ssrAllow);
        }
        if (callback) callback(liveProducts);
      });
  }

  function isHomePagePath(path) {
    var p = String(path || "/").replace(/\/+$/, "") || "/";
    return p === "/" || p === "/index.html" || p === "/home" || p === "/home.html";
  }

  function updateHeaderSearchTrending(products) {
    var list = (Array.isArray(products) ? products : []).filter(function (p) {
      return p && p.status !== "draft" && p.status !== "deleted" && p.status !== "archived";
    }).slice(0, 6);
    var searchGrids = document.querySelectorAll(".header-search-new__products");
    if (!searchGrids.length || !list.length) return;
    var cardsHtml = list.map(function (p) {
      var img1 = safeImg(p.images && p.images[0]);
      var img2 = safeImg((p.images && p.images[1]) || img1);
      var isSold = p.status === "sold" || p.stock < 1;
      var sizeLabel = (p.showSize !== false && p.size && p.size !== "NONE") ? (" · SIZE " + esc(p.size)) : "";
      return (
        "<div class='product-card' data-handle='" + esc(p.handle) + "'>" +
          "<div class='product-card-image' style='position:relative'>" +
            "<div class='annr-card-one-badge'>" + (isSold ? "SOLD / ARCHIVED" : "1 OF 1" + sizeLabel) + "</div>" +
            "<a href='/products/" + esc(p.handle) + "/index.html' class='product-card-image-wrapper' aria-label='" + esc(p.title) + "'>" +
              "<img src='" + esc(img1) + "' alt='" + esc(p.title) + "' width='800' height='800' loading='lazy' onerror=\"this.onerror=null;this.src='/_ext/annr-template-001.png'\">" +
              "<img src='" + esc(img2) + "' alt='" + esc(p.title) + "' width='800' height='800' loading='lazy' onerror=\"this.onerror=null;this.src='/_ext/annr-template-001.png'\">" +
            "</a>" +
          "</div>" +
          "<a href='/products/" + esc(p.handle) + "/index.html' class='product-card-title'>" + esc(p.title) + "</a>" +
          "<div class='product-card-price'><span class='money'>Tk " + formatMoney(p.price) + "<span class='money-currency-code'>BDT</span></span></div>" +
        "</div>"
      );
    }).join("");
    searchGrids.forEach(function (g) { g.innerHTML = cardsHtml; });
  }

  function setupHomePage() {
    var path = window.location.pathname;
    if (!isHomePagePath(path)) return;

    var showcase = document.querySelector("product-carousel-showcase");
    if (!showcase) return;

    fetchLiveProducts(function (products) {
      updateHeaderSearchTrending(products);
      var featured = (Array.isArray(products) ? products : []).filter(function (p) {
        return p && p.status !== "draft" && p.status !== "deleted" && p.status !== "archived";
      }).slice(0, 12);

      var titleEl = showcase.querySelector(".product-carousel-showcase__title");
      if (titleEl) titleEl.textContent = "UNIQUE ARCHIVE";

      var eyebrow = showcase.querySelector(".product-carousel-showcase__eyebrow");
      if (eyebrow) {
        var cnt = featured.length < 10 ? ("0" + featured.length) : String(featured.length);
        eyebrow.innerHTML = "<span aria-hidden='true'>■</span> <span>[" + cnt + "]</span>";
      }

      var cta = showcase.querySelector(".product-carousel-showcase__cta");
      if (cta) {
        cta.setAttribute("href", "/collections/unique-campaign/index.html");
      }

      var sliderEl = showcase.querySelector("[data-carousel-slider]");
      var mainWrap = sliderEl ? sliderEl.querySelector(".swiper-wrapper") : null;
      var thumbsEl = showcase.querySelector("[data-carousel-thumbs]");
      var thumbWrap = thumbsEl ? thumbsEl.querySelector(".swiper-wrapper") : null;

      if (!featured.length) {
        if (mainWrap) {
          mainWrap.innerHTML =
            "<div class='swiper-slide' style='width:100%;max-width:680px;margin:0 auto'>" +
              "<div style='padding:48px 24px;text-align:center;background:#faf8f4;border:1px dashed #dcd6ca;margin:0 24px'>" +
                "<div style='font-family:\"FK Grotesk SemiMono\",monospace;font-size:11px;letter-spacing:2px;color:#e05a2b;text-transform:uppercase;margin-bottom:8px'>[ ANNR UNIQUE ARCHIVE ]</div>" +
                "<div style='font-family:\"NB Architekt Std\",sans-serif;font-size:20px;font-weight:900;color:#111;text-transform:uppercase'>NEW 1-OF-1 DROP PREPARING</div>" +
                "<p style='font-family:Georgia,serif;font-style:italic;color:#666;margin:8px 0 0;font-size:13.5px'>Add your one-of-one archival pieces in the Admin Panel to showcase them here automatically.</p>" +
              "</div>" +
            "</div>";
        }
        if (thumbWrap) thumbWrap.innerHTML = "";
        return;
      }

      if (sliderEl) {
        sliderEl.setAttribute("data-few-items", featured.length <= 2 ? "true" : "false");
      }

      // Update Home Page parallax category section counts with real live inventory counts
      try {
        var parallaxSections = document.querySelectorAll('section[id*="__parallax_"]');
        parallaxSections.forEach(function (sec) {
          var metaEl = sec.querySelector('[class*="__meta"]');
          var linkEl = sec.querySelector('a[href*="/collections/"]');
          if (!metaEl || !linkEl) return;
          var hrefMatch = String(linkEl.getAttribute("href") || "").match(/\/collections\/([a-zA-Z0-9_-]+)/);
          if (!hrefMatch) return;
          var slug = hrefMatch[1].toLowerCase();
          var liveCount = products.filter(function (p) {
            if (!p || p.status === "sold" || p.status === "draft" || p.status === "archived") return false;
            return p.categorySlug === slug || p.category === slug || (Array.isArray(p.collections) && p.collections.indexOf(slug) !== -1);
          }).length;
          if (liveCount > 0) {
            var numStr = liveCount < 10 ? ("0" + liveCount) : String(liveCount);
            metaEl.innerHTML = "<span>" + numStr + "</span><span>//</span><span>" + (liveCount === 1 ? "PIECE" : "PIECES") + "</span>";
          } else {
            metaEl.innerHTML = "<span>1 OF 1</span><span>//</span><span>ARCHIVE</span>";
          }
        });
      } catch (e) {}

      if (mainWrap) {
        mainWrap.innerHTML = featured.map(function (p) {
          var img1 = safeImg(p.images && p.images[0]);
          var img2 = safeImg((p.images && p.images[1]) || img1);
          var isSold = p.status === "sold" || p.stock < 1;
          var sizeLabel = (p.showSize !== false && p.size && p.size !== "NONE") ? (" · SIZE " + esc(p.size)) : "";
          return (
            "<div class='swiper-slide product-carousel-showcase__slide'>" +
              "<div class='product-card' data-handle='" + esc(p.handle) + "'>" +
                "<div class='product-card-image' style='position:relative'>" +
                  "<div class='annr-card-one-badge'>" + (isSold ? "SOLD / ARCHIVED" : "1 OF 1" + sizeLabel) + "</div>" +
                  (isSold ? "<div class='annr-card-sold-overlay'><div class='annr-card-sold-tag'>SOLD / ARCHIVED</div></div>" : "") +
                  "<a href='/products/" + esc(p.handle) + "/index.html' class='product-card-image-wrapper' aria-label='" + esc(p.title) + "'>" +
                    "<img src='" + esc(img1) + "' alt='" + esc(p.title) + "' width='1200' height='1200' loading='eager' onerror=\"this.onerror=null;this.src='/_ext/annr-template-001.png'\">" +
                    "<img src='" + esc(img2) + "' alt='" + esc(p.title) + "' width='1200' height='1200' loading='lazy' onerror=\"this.onerror=null;this.src='/_ext/annr-template-001.png'\">" +
                  "</a>" +
                "</div>" +
                "<div class='annr-card-meta'>" +
                  "<div class='annr-card-code'>" + esc(p.code) + "</div>" +
                  "<a href='/products/" + esc(p.handle) + "/index.html' class='product-card-title'>" + esc(p.title) + "</a>" +
                  "<div class='product-card-price'><span class='money'>Tk " + formatMoney(p.price) + " <span class='money-currency-code'>BDT</span></span></div>" +
                "</div>" +
              "</div>" +
            "</div>"
          );
        }).join("");
      }

      if (thumbWrap) {
        thumbWrap.innerHTML = featured.map(function (p, idx) {
          var img1 = safeImg(p.images && p.images[0]);
          var img2 = safeImg((p.images && p.images[1]) || img1);
          return (
            "<div class='product-carousel-showcase__thumb-slide swiper-slide" + (idx === 0 ? " is-active swiper-slide-thumb-active" : "") + "'>" +
              "<button type='button' class='product-carousel-showcase__thumb' data-carousel-thumb='" + idx + "' aria-label='Show " + esc(p.title) + "' aria-current='" + (idx === 0 ? "true" : "false") + "'>" +
                "<img src='" + esc(img1) + "' alt='" + esc(p.title) + "' width='220' height='220' loading='lazy' onerror=\"this.onerror=null;this.src='/_ext/annr-template-001.png'\">" +
                "<img src='" + esc(img2) + "' alt='" + esc(p.title) + "' width='220' height='220' loading='lazy' onerror=\"this.onerror=null;this.src='/_ext/annr-template-001.png'\">" +
              "</button>" +
            "</div>"
          );
        }).join("");
      }

      try {
        showcase.thumbs = Array.from(showcase.querySelectorAll("[data-carousel-thumb]"));
        if (typeof showcase.bindThumbs === "function") showcase.bindThumbs();
        if (typeof showcase.reinitializeSwiper === "function") {
          showcase.reinitializeSwiper();
        } else {
          if (sliderEl && sliderEl.swiper) sliderEl.swiper.update();
          if (thumbsEl && thumbsEl.swiper) thumbsEl.swiper.update();
        }
      } catch (e) {}
    });
  }

  // Render on Product Page
  function setupProductPage() {
    var path = window.location.pathname;
    var m = path.match(/\/products\/([a-zA-Z0-9_-]+)/);
    if (!m) return;
    var handle = m[1];

    fetchLiveProducts(function (products) {
      var prod = products.find(function (p) { return p.handle === handle; });
      if (!prod) return;

      // Update Page Title
      document.title = prod.title + " (1 of 1) - AnnR";

      // Update Heading & Price
      var titleEl = document.querySelector(".product-info-title, .product-title, .product__title, h1");
      if (titleEl) titleEl.textContent = prod.title;

      var priceEl = document.querySelector(".product-info-price .money, .price-item--regular, .product-price .money, [data-product-price]");
      if (priceEl) priceEl.innerHTML = "Tk " + formatMoney(prod.price) + "<span class='money-currency-code'> BDT</span>";

      var descEl = document.querySelector(".product-info-details-header .product-info-detail-content-inner");
      if (descEl) {
        var extraMeta = [];
        if (prod.fabric) extraMeta.push("<strong>Fabric:</strong> " + esc(prod.fabric));
        if (prod.condition) extraMeta.push("<strong>Condition:</strong> " + esc(prod.condition));
        if (prod.careInstructions) extraMeta.push("<strong>Care:</strong> " + esc(prod.careInstructions));
        descEl.innerHTML =
          "<h3 class='hide-mob'>DESCRIPTION</h3>" +
          "<div style='white-space:pre-wrap;line-height:1.6'>" + esc(prod.description || "") + "</div>" +
          (extraMeta.length ? "<div style='margin-top:12px;font-size:12px;opacity:.85;display:flex;flex-direction:column;gap:4px'>" + extraMeta.join("<br>") + "</div>" : "");
      }

      // Update Product Images in Carousel & Thumbnails (adaptive natural ratio + distinct thumbs + lightbox)
      if (prod.images && prod.images.length > 0) {
        var cleanImgs = prod.images.map(safeImg);
        var mainWrapper = document.querySelector(".product-gallery-carousel .swiper-wrapper");
        var thumbWrapper = document.querySelector(".product-gallery-thumb-carousel .swiper-wrapper");
        var mainCarouselEl = document.querySelector(".product-gallery-carousel");
        var statusEl = document.querySelector(".product-gallery-status");
        var totalImgs = cleanImgs.length;
        var activeIdx = 0;

        function openLightbox(startIdx) {
          var lbIdx = startIdx;
          var old = document.getElementById("annr-pdp-lightbox");
          if (old) old.remove();
          var lb = document.createElement("div");
          lb.id = "annr-pdp-lightbox";
          lb.className = "annr-lightbox";
          lb.innerHTML =
            "<img id='annr-lb-img' src='" + esc(cleanImgs[lbIdx]) + "' alt='" + esc(prod.title) + "'>" +
            "<button type='button' class='annr-lightbox-btn' id='annr-lb-close' aria-label='Close zoom' style='top:20px;right:20px'>✕</button>" +
            (totalImgs > 1
              ? "<button type='button' class='annr-lightbox-btn' id='annr-lb-prev' aria-label='Previous photo' style='left:20px;top:50%;transform:translateY(-50%)'>←</button>" +
                "<button type='button' class='annr-lightbox-btn' id='annr-lb-next' aria-label='Next photo' style='right:20px;top:50%;transform:translateY(-50%)'>→</button>"
              : "") +
            "<div id='annr-lb-count' style='position:fixed;bottom:22px;left:50%;transform:translateX(-50%);font-family:\"FK Grotesk SemiMono\",monospace;font-size:11px;letter-spacing:2px;color:#fff;background:rgba(0,0,0,0.65);padding:6px 14px;border:1px solid rgba(255,255,255,0.2)'>" + (lbIdx + 1) + " // " + totalImgs + "</div>";
          document.body.appendChild(lb);

          function setLb(n) {
            lbIdx = (n + totalImgs) % totalImgs;
            var im = lb.querySelector("#annr-lb-img");
            var ct = lb.querySelector("#annr-lb-count");
            if (im) im.src = cleanImgs[lbIdx];
            if (ct) ct.textContent = (lbIdx + 1) + " // " + totalImgs;
            goToSlide(lbIdx);
          }
          function closeLb() {
            document.removeEventListener("keydown", onKey);
            lb.remove();
          }
          function onKey(ev) {
            if (ev.key === "Escape") closeLb();
            else if (ev.key === "ArrowRight" && totalImgs > 1) setLb(lbIdx + 1);
            else if (ev.key === "ArrowLeft" && totalImgs > 1) setLb(lbIdx - 1);
          }
          document.addEventListener("keydown", onKey);
          lb.onclick = function (ev) { if (ev.target === lb) closeLb(); };
          var cBtn = lb.querySelector("#annr-lb-close");
          if (cBtn) cBtn.onclick = closeLb;
          var pBtn = lb.querySelector("#annr-lb-prev");
          if (pBtn) pBtn.onclick = function (ev) { ev.stopPropagation(); setLb(lbIdx - 1); };
          var nBtn = lb.querySelector("#annr-lb-next");
          if (nBtn) nBtn.onclick = function (ev) { ev.stopPropagation(); setLb(lbIdx + 1); };
        }

        function syncGalleryState(idx) {
          activeIdx = Math.max(0, Math.min(totalImgs - 1, idx));
          if (statusEl) {
            statusEl.innerHTML = "<span class='swiper-pagination-current'>" + (activeIdx + 1) + "</span> // <span class='swiper-pagination-total'>" + totalImgs + "</span>";
          }
          if (thumbWrapper) {
            thumbWrapper.querySelectorAll(".prod-thumb-slide").forEach(function (s, sIdx) {
              var active = sIdx === activeIdx;
              s.classList.toggle("swiper-slide-thumb-active", active);
              s.classList.toggle("is-active", active);
              s.setAttribute("aria-current", active ? "true" : "false");
            });
          }
        }

        function goToSlide(idx) {
          var target = (idx + totalImgs) % totalImgs;
          if (mainCarouselEl && mainCarouselEl.swiper) {
            try {
              mainCarouselEl.swiper.slideTo(target);
            } catch (e) {}
          } else if (mainWrapper) {
            var slides = mainWrapper.querySelectorAll(".swiper-slide");
            slides.forEach(function (ms, mIdx) {
              ms.style.display = mIdx === target ? "block" : "none";
            });
          }
          syncGalleryState(target);
        }

        if (mainWrapper) {
          mainWrapper.innerHTML = cleanImgs.map(function (imgSrc, idx) {
            return (
              "<div class='swiper-slide' data-media-id='" + idx + "'>" +
                "<div class='carousel-item' data-slide-idx='" + idx + "' style='aspect-ratio: 4 / 3.2;'>" +
                  "<img src='" + esc(imgSrc) + "' alt='" + esc(prod.title) + " - View " + (idx + 1) + "' onerror=\"this.onerror=null;this.src='/_ext/annr-template-001.png'\" loading='" + (idx === 0 ? "eager" : "lazy") + "'>" +
                "</div>" +
              "</div>"
            );
          }).join("");

          // Adapt each slide frame to the natural photo aspect ratio (clamped 0.8..1.38) so zero garment edges clip and zero grey bars appear
          mainWrapper.querySelectorAll(".carousel-item").forEach(function (itemEl, idx) {
            var im = itemEl.querySelector("img");
            if (!im) return;
            var applyRatio = function () {
              if (im.naturalWidth > 0 && im.naturalHeight > 0) {
                var ratio = Math.max(0.8, Math.min(1.38, im.naturalWidth / im.naturalHeight));
                itemEl.style.aspectRatio = ratio.toFixed(4) + " / 1";
                if (mainCarouselEl && mainCarouselEl.swiper) {
                  try { mainCarouselEl.swiper.update(); } catch (e) {}
                }
              }
            };
            if (im.complete) applyRatio();
            else im.addEventListener("load", applyRatio, { once: true });
            itemEl.onclick = function () { openLightbox(idx); };
          });

          if (thumbWrapper) {
            thumbWrapper.innerHTML = cleanImgs.map(function (imgSrc, idx) {
              return (
                "<div class='swiper-slide prod-thumb-slide" + (idx === 0 ? " swiper-slide-thumb-active is-active" : "") + "' role='button' tabindex='0' aria-label='View photo " + (idx + 1) + " of " + totalImgs + "'>" +
                  "<div class='carousel-thumb-item'>" +
                    "<img src='" + esc(imgSrc) + "' alt='" + esc(prod.title) + " thumbnail " + (idx + 1) + "' onerror=\"this.onerror=null;this.src='/_ext/annr-template-001.png'\" loading='eager'>" +
                  "</div>" +
                "</div>"
              );
            }).join("");

            thumbWrapper.querySelectorAll(".prod-thumb-slide").forEach(function (th, tIdx) {
              th.onclick = function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                goToSlide(tIdx);
              };
              th.onkeydown = function (ev) {
                if (ev.key === "Enter" || ev.key === " ") {
                  ev.preventDefault();
                  goToSlide(tIdx);
                }
              };
            });
          }

          var thumbCarouselEl = document.querySelector(".product-gallery-thumb-carousel");
          if (thumbCarouselEl && thumbCarouselEl.swiper) {
            try { thumbCarouselEl.swiper.destroy(true, true); } catch (e) {}
          }

          var prevNav = mainCarouselEl ? mainCarouselEl.querySelector(".product-gallery-nav--prev") : null;
          var nextNav = mainCarouselEl ? mainCarouselEl.querySelector(".product-gallery-nav--next") : null;
          if (totalImgs <= 1) {
            if (prevNav) prevNav.style.display = "none";
            if (nextNav) nextNav.style.display = "none";
          } else {
            if (prevNav) {
              prevNav.style.display = "";
              prevNav.onclick = function (ev) { ev.preventDefault(); ev.stopPropagation(); goToSlide(activeIdx - 1); };
            }
            if (nextNav) {
              nextNav.style.display = "";
              nextNav.onclick = function (ev) { ev.preventDefault(); ev.stopPropagation(); goToSlide(activeIdx + 1); };
            }
          }

          if (mainCarouselEl && mainCarouselEl.swiper) {
            try {
              mainCarouselEl.swiper.update();
              mainCarouselEl.swiper.slideTo(0, 0);
              if (!mainCarouselEl.__annrSlideSyncBound) {
                mainCarouselEl.__annrSlideSyncBound = true;
                mainCarouselEl.swiper.on("slideChange", function () {
                  syncGalleryState(mainCarouselEl.swiper.realIndex || mainCarouselEl.swiper.activeIndex || 0);
                });
              }
            } catch (e) {}
          }
          syncGalleryState(0);
        }

        var ogImg = document.querySelector("meta[property='og:image']");
        if (ogImg && cleanImgs[0]) ogImg.setAttribute("content", cleanImgs[0]);
        var twImg = document.querySelector("meta[name='twitter:image']");
        if (twImg && cleanImgs[0]) twImg.setAttribute("content", cleanImgs[0]);
      }

      // Upgrade legacy PDP feature badges, Bangladesh delivery timeline, & Shipping/Returns accordion
      try {
        var featList = document.querySelector(".product-info-features");
        if (featList) {
          featList.innerHTML =
            "<li class='product-info-feature product-info-feature--points'>" +
              "<svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#0a0a0a' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' style='flex-shrink:0'><polygon points='12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2'/></svg>" +
              "<span>EARN ANNR VIP POINTS</span>" +
            "</li>" +
            "<li class='product-info-feature product-info-feature--shipping'>" +
              "<svg width='17' height='17' viewBox='0 0 24 24' fill='none' stroke='#0a0a0a' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' style='flex-shrink:0'><rect x='1' y='3' width='15' height='13'/><polygon points='16 8 20 8 23 11 23 16 16 16 16 8'/><circle cx='5.5' cy='18.5' r='2.5'/><circle cx='18.5' cy='18.5' r='2.5'/></svg>" +
              "<span>FREE DELIVERY OVER ৳5,000 BDT</span>" +
            "</li>" +
            "<li class='product-info-feature product-info-feature--stock'>" +
              "<span>1 OF 1 · AUTHENTICATED ARCHIVE</span>" +
            "</li>";
        }

        // Dynamic live Bangladesh delivery timeline (replaces stale hardcoded October dates)
        var fmtBdDate = function (addDays) {
          var d = new Date(Date.now() + addDays * 86400000);
          var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          var day = d.getDate() < 10 ? "0" + d.getDate() : String(d.getDate());
          return day + " " + months[d.getMonth()];
        };
        var updateDeliveryDates = function () {
          var delHeadingSpan = document.querySelector('[class*="delivery-heading-"] h2 span');
          if (delHeadingSpan) delHeadingSpan.textContent = fmtBdDate(2) + " - " + fmtBdDate(4) + " ";
          var delDates = document.querySelectorAll('[class*="delivery-date-"]');
          if (delDates.length >= 3) {
            delDates[0].textContent = fmtBdDate(0);
            delDates[1].textContent = fmtBdDate(1) + " - " + fmtBdDate(2);
            delDates[2].textContent = fmtBdDate(2) + " - " + fmtBdDate(4);
          }
        };
        updateDeliveryDates();
        setTimeout(updateDeliveryDates, 400);

        // Replace legacy US-only Shipping & Returns accordion with accurate AnnR Bangladesh policy
        var shipDetail = document.querySelector(".product-info-details-footer .product-info-detail-content-inner");
        if (shipDetail) {
          shipDetail.innerHTML =
            "<h3>BANGLADESH DELIVERY</h3>" +
            "<p>All archival 1-of-1 garments are inspected, steamed, and sealed in protective AnnR collector packaging prior to dispatch from Dhaka.</p>" +
            "<ul>" +
              "<li><strong>Inside Dhaka Metro:</strong> ৳70 BDT (24–48 hours express delivery)</li>" +
              "<li><strong>Outside Dhaka (All 64 Districts):</strong> ৳130 BDT (2–4 business days)</li>" +
              "<li><strong>Complimentary Shipping:</strong> Automatically unlocked on orders over <strong>৳5,000 BDT</strong></li>" +
              "<li><strong>Payment Methods:</strong> Cash on Delivery (COD), bKash, and Nagad</li>" +
            "</ul>" +
            "<p>See full details on our <a href='/pages/shipping-policy/index.html'>Shipping Policy</a> page.</p>" +
            "<h3>RETURNS &amp; ARCHIVAL GUARANTEE</h3>" +
            "<p>Every AnnR piece is a verified one-of-one garment with flat measurements provided in inches. If an item arrives damaged or differs from its verified specification, contact support within 7 days of delivery. See our <a href='/pages/return-policy/index.html'>Return Policy</a> for full terms.</p>";
        }
      } catch (e) {}

      // Replace Size Selector with 1-of-1 Archival Badge & Measurement Table
      var variantArea = document.querySelector("variant-buttons, variant-radios, .product-form__variants, .size-selector, .product-info-size-selector");
      var oldQty = document.querySelector(".product-info-quantity-selector, .product-form__quantity");
      if (oldQty) oldQty.style.display = "none";

      var targetContainer = variantArea || document.querySelector(".product-info-submit") || document.querySelector("product-form") || document.querySelector("form[action*='/cart/add']");
      if (targetContainer) {
        var existingBox = document.getElementById("annr-injected-unique-size");
        var sizeBox = existingBox || document.createElement("div");
        sizeBox.id = "annr-injected-unique-size";

        var statusPillClass = "annr-unique-pill";
        var statusLabel = "1 OF 1 ARCHIVAL PIECE";
        if (prod.status === "sold" || prod.stock < 1) {
          statusPillClass += " sold";
          statusLabel = "PERMANENTLY ARCHIVED / SOLD";
        } else if (prod.status === "reserved") {
          statusPillClass += " reserved";
          statusLabel = "HELD IN CHECKOUT (15M HOLD)";
        }

        var meas = prod.measurements || {};
        var measRows = "";
        var measKeys = [
          { k: "chest", label: "CHEST" },
          { k: "length", label: "LENGTH" },
          { k: "shoulder", label: "SHOULDER" },
          { k: "sleeve", label: "SLEEVE" },
          { k: "waist", label: "WAIST" },
          { k: "inseam", label: "INSEAM" }
        ];

        var hasMeas = false;
        measKeys.forEach(function (mk) {
          if (meas[mk.k] != null && meas[mk.k] !== "") {
            hasMeas = true;
            measRows +=
              "<div class='annr-meas-item'>" +
                "<div class='annr-meas-label'>" + esc(mk.label) + "</div>" +
                "<div class='annr-meas-val'>" + esc(String(meas[mk.k])) + "″ <span style='font-size:9.5px;font-weight:400;color:#777'>in</span></div>" +
              "</div>";
          }
        });

        var measHtml = hasMeas ?
          "<div class='annr-measurements-panel'>" +
            "<div class='annr-measurements-head'>" +
              "<span>GARMENT MEASUREMENTS (FLAT)</span>" +
              "<span style='color:#777'>INCHES (″)</span>" +
            "</div>" +
            "<div class='annr-measurements-grid'>" + measRows + "</div>" +
            "<div class='annr-meas-note'>* All measurements taken flat across garment in inches (1″ = 2.54 cm). Compare against your favorite garment before purchase.</div>" +
          "</div>" : "";

        var bannerHtml = "";
        if (prod.status === "sold" || prod.stock < 1) {
          bannerHtml =
            "<div class='annr-archival-banner sold'>" +
              "✦ ARCHIVAL PIECE: This unique 1-of-1 piece has been claimed and permanently archived into the AnnR collector vault. It will not be re-released." +
            "</div>";
        } else if (prod.status === "reserved") {
          bannerHtml =
            "<div class='annr-archival-banner reserved'>" +
              "⚠️ IN CHECKOUT: A customer currently holds this piece in checkout. If their reservation times out within 15 minutes, it will unlock." +
            "</div>";
        }

        var showSizeTag = prod.showSize !== false && prod.size && prod.size !== "NONE";
        var sizeCardPrimary = showSizeTag ?
          "<div class='annr-size-primary'>" +
            "<div class='annr-size-tag'>EXACT SIZE</div>" +
            "<div class='annr-size-value'>" + esc(prod.size) + "</div>" +
          "</div>" :
          "<div class='annr-size-primary'>" +
            "<div class='annr-size-tag'>SIZING</div>" +
            "<div class='annr-size-value' style='font-size:15px;letter-spacing:1px;font-weight:700'>FLAT MEASUREMENTS ONLY</div>" +
          "</div>";

        sizeBox.innerHTML =
          bannerHtml +
          "<div class='annr-unique-badge-row'>" +
            "<div class='" + statusPillClass + "'><span style='color:#e05a2b'>●</span> " + statusLabel + "</div>" +
            "<div class='annr-unique-code'>CODE: " + esc(prod.code) + "</div>" +
          "</div>" +
          "<div class='annr-exact-size-card'>" +
            sizeCardPrimary +
            "<div class='annr-size-meta'>" +
              (prod.condition ? "<span>CONDITION: <strong style='color:#111'>" + esc(prod.condition) + "</strong></span>" : "") +
              (prod.fabric ? "<span>FABRIC: <strong style='color:#111'>" + esc(prod.fabric) + "</strong></span>" : "") +
            "</div>" +
          "</div>" +
          measHtml +
          "<div class='annr-single-qty-lock'>" +
            "<span class='dot'></span> ONLY 1 PIECE AVAILABLE WORLDWIDE · MAXIMUM 1 PER CLIENT" +
          "</div>";

        if (!existingBox) {
          if (variantArea) {
            variantArea.style.display = "none";
            variantArea.parentNode.insertBefore(sizeBox, variantArea);
          } else {
            targetContainer.parentNode.insertBefore(sizeBox, targetContainer);
          }
        }
      }

      // Store active product for capture-phase 1-of-1 checkout interception
      window.__annrCurrentProduct = prod;

      // Update ALL Acquire / Add to Cart Buttons (desktop + mobile sticky bar) & intercept /cart/add with 1-of-1 /checkout flow
      var atcBtns = document.querySelectorAll("[name='add'], [data-product-button], .btn-add-to-cart, .product-info-submit button, .product-action-buttons button");
      atcBtns.forEach(function (atcBtn) {
        if (prod.status === "sold" || prod.stock < 1) {
          atcBtn.disabled = true;
          atcBtn.style.opacity = "0.5";
          atcBtn.style.cursor = "not-allowed";
          atcBtn.innerHTML = "<span class='content has-additional-atc-text'><span><span class='text'>ARCHIVED — SOLD OUT</span></span><span class='additional-atc-text'>PERMANENTLY CLAIMED</span></span><span class='corners'></span>";
        } else if (prod.status === "reserved") {
          atcBtn.disabled = true;
          atcBtn.style.opacity = "0.7";
          atcBtn.innerHTML = "<span class='content has-additional-atc-text'><span><span class='text'>RESERVED IN CHECKOUT</span></span><span class='additional-atc-text'>15-MINUTE COLLECTOR HOLD</span></span><span class='corners'></span>";
        } else {
          atcBtn.disabled = false;
          atcBtn.style.opacity = "1";
          atcBtn.innerHTML = "<span class='content has-additional-atc-text'><span><span class='text'>ACQUIRE 1-OF-1 PIECE</span></span><span class='additional-atc-text'>ONLY 1 IN EXISTENCE · READY TO DISPATCH</span></span><span class='corners'></span>";
        }
      });

      if (!window.__annrPdpCheckoutBound) {
        window.__annrPdpCheckoutBound = true;
        var handleAcquire = function (ev) {
          var trig = ev.target && ev.target.closest && ev.target.closest("[name='add'], [data-product-button], .btn-add-to-cart, .product-info-submit button, form[action*='/cart/add']");
          if (!trig) return;
          if (ev.type === "click" && ev.target.tagName === "FORM") return;
          ev.preventDefault();
          ev.stopPropagation();
          ev.stopImmediatePropagation();

          var active = window.__annrCurrentProduct;
          if (!active) return;
          if (active.status === "sold" || active.stock < 1) {
            alert("This 1-of-1 piece has been sold and permanently archived.");
            return;
          }
          if (active.status === "reserved") {
            alert("This 1-of-1 piece is currently reserved in another collector's checkout.");
            return;
          }

          var numericPrice = parseFloat(String(active.price || "0").replace(/[^0-9.-]+/g, "")) || 0;
          var cartItem = {
            id: String(active.id || active.handle),
            handle: active.handle,
            code: active.code || "",
            title: active.title,
            price: numericPrice,
            quantity: 1,
            size: active.showSize !== false ? (active.size || "") : "",
            showSize: active.showSize !== false,
            image: safeImg(active.images && active.images[0])
          };

          try {
            localStorage.setItem("annr-cart", JSON.stringify([cartItem]));
          } catch (e) {}

          // Reserve 1-of-1 item in Supabase for 15 minutes when UUID is present
          if (active.id && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(String(active.id))) {
            try {
              var reserveReq = fetch(SUPABASE_URL + "/rest/v1/rpc/reserve_product", {
                method: "POST",
                keepalive: true,
                headers: {
                  apikey: SUPABASE_ANON_KEY,
                  Authorization: "Bearer " + SUPABASE_ANON_KEY,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({ p_product_id: active.id })
              })
                .then(function (r) { return r.ok ? r.json() : null; })
                .then(function (data) {
                  if (data && data.ok !== false) {
                    try {
                      localStorage.setItem(
                        "annr_reservation",
                        JSON.stringify({
                          productId: active.id,
                          handle: active.handle,
                          token: data.token || data.reservation_token || null,
                          reservedUntil: data.reserved_until || null
                        })
                      );
                    } catch (e) {}
                  }
                })
                .catch(function () {});

              Promise.race([
                reserveReq,
                new Promise(function (resolve) { setTimeout(resolve, 650); })
              ]).then(function () {
                window.location.href = "/checkout";
              });
              return;
            } catch (e) {}
          }

          window.location.href = "/checkout";
        };
        document.addEventListener("click", handleAcquire, true);
        document.addEventListener("submit", handleAcquire, true);
      }
    });
  }

  // Render on Collection Page
  function purgeLegacyHeroLogo() {
    var legRe = /Shihiko_2nd_Logo|DiscordBanner|Shihiko Logo White|SHIHIKOSOCKS|shihiko\.com/i;
    document.querySelectorAll('[id$="__collection_hero"] img, .collection-hero img, img.adm-col-hero').forEach(function (im) {
      var src = im.getAttribute("src") || im.getAttribute("data-src") || "";
      if (legRe.test(src)) {
        var wrap = im.closest(".adm-col-hero") || im;
        var heroSec = im.closest('[id$="__collection_hero"]');
        wrap.remove();
        if (heroSec && !heroSec.textContent.trim() && !heroSec.querySelector("img, video, picture")) {
          heroSec.innerHTML = "";
        }
      }
    });
  }

  function setupCollectionPage() {
    purgeLegacyHeroLogo();
    var path = window.location.pathname;
    var m = path.match(/\/collections\/([a-zA-Z0-9_-]+)/);
    if (!m) return;
    var currentHandle = m[1];

    // Remove legacy static infinite-pagination so Shopify scripts cannot overwrite dynamic grids
    document.querySelectorAll("infinite-pagination, .pagination").forEach(function (el) { el.remove(); });

    var grid = document.querySelector(".collection-product-grid") || document.querySelector("[data-product-grid], .catalog__content");
    if (!grid) return;
    window.__annrUniqueCatalogOwnsGrid = true;

    var catalogRoot = grid.closest(".collection-catalog");
    if (catalogRoot) {
      if (!catalogRoot.style.getPropertyValue("--collection-columns-desktop")) {
        catalogRoot.style.setProperty("--collection-columns-desktop", catalogRoot.getAttribute("data-desktop-columns") || "4");
      }
      if (!catalogRoot.style.getPropertyValue("--collection-columns-mobile")) {
        catalogRoot.style.setProperty("--collection-columns-mobile", catalogRoot.getAttribute("data-mobile-columns") || "2");
      }
    }

    var params = new URLSearchParams(window.location.search);
    var isUniqueCampaign = currentHandle === "unique-campaign";
    var urlCat = params.get("category") || "";
    var activeCategory = urlCat ? urlCat.toLowerCase() : "all";
    var urlSort = (params.get("sort_by") || "").toLowerCase();
    var sortMap = {
      "created-descending": "newest",
      "newest": "newest",
      "created-ascending": "oldest",
      "oldest": "oldest",
      "price-ascending": "price-asc",
      "price-asc": "price-asc",
      "price-descending": "price-desc",
      "price-desc": "price-desc",
      "title-ascending": "title-asc",
      "title-asc": "title-asc",
      "title-descending": "title-desc",
      "title-desc": "title-desc",
      "manual": "newest",
      "best-selling": "newest"
    };
    var hideSold = false;
    var sortBy = sortMap[urlSort] || "newest";
    var currentProducts = [];
    var colControlsBound = false;

    function matchesCategory(p, cat) {
      if (!cat || cat === "all") return true;
      if (p.categorySlug === cat || p.category === cat) return true;
      if (p.campaignSlug === cat || p.campaign === cat) return true;
      if (Array.isArray(p.collections) && p.collections.indexOf(cat) !== -1) return true;
      return false;
    }

    function renderGrid() {
      purgeLegacyHeroLogo();
      document.querySelectorAll(".js-catalog__content").forEach(function (el) { el.classList.remove("loading"); });
      document.querySelectorAll(".js-catalog__content-preloader").forEach(function (el) { el.style.display = "none"; });
      var filtered = currentProducts.slice();

      if (!isUniqueCampaign && currentHandle !== "all") {
        filtered = filtered.filter(function (p) { return matchesCategory(p, currentHandle); });
      } else if (isUniqueCampaign && activeCategory !== "all") {
        filtered = filtered.filter(function (p) { return matchesCategory(p, activeCategory); });
      }

      if (hideSold) {
        filtered = filtered.filter(function (p) {
          return p.status !== "sold" && p.stock > 0;
        });
      }

      var sizeScope = document.querySelector("#collection-filter input[name='filter.v.option.size']")
        ? document.querySelector("#collection-filter")
        : document;
      var checkedSizes = [];
      sizeScope.querySelectorAll('[name="filter.v.option.size"]:checked').forEach(function (cb) {
        var val = String(cb.value || "").trim().toUpperCase();
        if (val && checkedSizes.indexOf(val) === -1) checkedSizes.push(val);
      });
      document.querySelectorAll("[data-desktop-filter] .filter-value").forEach(function (fv) {
        fv.textContent = checkedSizes.length > 0 ? checkedSizes.join(", ") : "Select";
      });
      if (checkedSizes.length > 0) {
        filtered = filtered.filter(function (p) {
          if (p.showSize === false || !p.size || p.size === "NONE") return false;
          return checkedSizes.indexOf(String(p.size).trim().toUpperCase()) !== -1;
        });
      }

      if (sortBy === "price-asc") {
        filtered.sort(function (a, b) { return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0); });
      } else if (sortBy === "price-desc") {
        filtered.sort(function (a, b) { return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0); });
      } else if (sortBy === "title-asc") {
        filtered.sort(function (a, b) { return String(a.title || "").localeCompare(String(b.title || "")); });
      } else if (sortBy === "title-desc") {
        filtered.sort(function (a, b) { return String(b.title || "").localeCompare(String(a.title || "")); });
      } else if (sortBy === "oldest") {
        filtered.sort(function (a, b) { return (Date.parse(a.createdAt || a.updatedAt || 0) || 0) - (Date.parse(b.createdAt || b.updatedAt || 0) || 0); });
      } else {
        filtered.sort(function (a, b) { return (Date.parse(b.createdAt || b.updatedAt || 0) || 0) - (Date.parse(a.createdAt || a.updatedAt || 0) || 0); });
      }

      document.querySelectorAll("[data-product-count]").forEach(function (cntEl) {
        cntEl.innerHTML = "<span>" + filtered.length + "</span><span>//</span><span>" + (filtered.length === 1 ? "ITEM" : "ITEMS") + "</span>";
      });

      if (filtered.length === 0) {
        grid.innerHTML =
          "<div style='grid-column: 1 / -1; padding: 60px 20px; text-align: center; background: #faf8f4; border: 1px dashed #dcd6ca; margin: 20px 0;'>" +
            "<div style='font-family:\"FK Grotesk SemiMono\",monospace;font-size:12px;letter-spacing:2px;color:#777;text-transform:uppercase;margin-bottom:8px'>[ ARCHIVE NOTICE ]</div>" +
            "<div style='font-family:\"NB Architekt Std\",sans-serif;font-size:20px;font-weight:900;text-transform:uppercase;color:#111'>NO PIECES CURRENTLY MATCH THIS FILTER</div>" +
            "<p style='font-family:Georgia,serif;font-style:italic;color:#666;margin-top:10px'>New one-of-one pieces are released into the Unique Campaign drops.</p>" +
          "</div>";
        return;
      }

      var html = filtered.map(function (p, idx) {
        var isSold = p.status === "sold" || p.stock < 1;
        var isReserved = !isSold && p.status === "reserved";
        var img = safeImg(p.images && p.images[0]);
        var img2Raw = (p.images && p.images[1]) ? safeImg(p.images[1]) : "";
        var img2 = img2Raw && img2Raw !== img ? img2Raw : "";
        var sizeTag = (p.showSize !== false && p.size && p.size !== "NONE") ? (" · SIZE " + esc(p.size)) : "";
        var badgeText = isSold ? "SOLD / ARCHIVED" : (isReserved ? "RESERVED" + sizeTag : "1 OF 1" + sizeTag);
        var loadAttr = idx < 8 ? "eager" : "lazy";

        return (
          "<div class='product-card' data-handle='" + esc(p.handle) + "'>" +
            "<div class='product-card-image' style='position:relative'>" +
              "<div class='annr-card-one-badge'>" + badgeText + "</div>" +
              (isSold ? "<div class='annr-card-sold-overlay'><div class='annr-card-sold-tag'>SOLD / ARCHIVED</div></div>" : "") +
              "<a href='/products/" + esc(p.handle) + "/index.html' class='product-card-image-wrapper' aria-label='" + esc(p.title) + "'>" +
                "<img src='" + esc(img) + "' alt='" + esc(p.title) + "' width='1200' height='1200' loading='" + loadAttr + "' decoding='async' onerror=\"this.onerror=null;this.src='/_ext/annr-template-001.png'\">" +
                (img2 ? "<img src='" + esc(img2) + "' alt='" + esc(p.title) + "' width='1200' height='1200' loading='" + loadAttr + "' decoding='async' onerror=\"this.onerror=null;this.src='/_ext/annr-template-001.png'\">" : "") +
              "</a>" +
            "</div>" +
            "<div class='annr-card-meta'>" +
              "<div class='annr-card-code'>" + esc(p.code) + "</div>" +
              "<a href='/products/" + esc(p.handle) + "/index.html' class='product-card-title' style='font-family:\"NB Architekt Std\",sans-serif;font-size:13px;font-weight:700;color:#0a0a0a;text-decoration:none'>" + esc(p.title) + "</a>" +
              "<div class='product-card-price'>" +
                "<span class='money' style='font-family:\"NB Architekt Std\",sans-serif;font-size:13px;font-weight:700;color:#0a0a0a'>Tk " + formatMoney(p.price) + " <span class='money-currency-code'>BDT</span></span>" +
              "</div>" +
            "</div>" +
          "</div>"
        );
      }).join("");

      grid.innerHTML = html;
    }

    function ensureCollectionChrome() {
      var colHeader = document.querySelector(".collection-header, .catalog-header");
      var liveCats = getActiveCategories();

      if (!isUniqueCampaign && currentHandle !== "all") {
        var matchedCat = liveCats.find(function (c) { return c.slug === currentHandle; });
        if (matchedCat) {
          document.querySelectorAll(".collection-title").forEach(function (el) {
            el.textContent = matchedCat.name;
          });
        }
      }

      if (isUniqueCampaign && !document.getElementById("annr-campaign-hero-el")) {
        var hero = document.createElement("div");
        hero.id = "annr-campaign-hero-el";
        hero.className = "annr-campaign-hero";

        hero.innerHTML =
          "<div>" +
            "<div class='top-badge'>[ ANNR ARCHIVAL DROPS ]</div>" +
            "<h1>UNIQUE CAMPAIGN</h1>" +
          "</div>" +
          "<p class='lead'>Every garment exists as exactly one singular piece worldwide. Once acquired, it is permanently locked in the AnnR collector archive.</p>";

        if (colHeader) {
          colHeader.parentNode.replaceChild(hero, colHeader);
        } else {
          grid.parentNode.insertBefore(hero, grid);
        }
      }

      if (!document.getElementById("annr-grid-controls-el")) {
        var ctrl = document.createElement("div");
        ctrl.id = "annr-grid-controls-el";
        ctrl.className = "annr-grid-controls";
        ctrl.innerHTML =
          "<label class='annr-toggle-label'>" +
            "<input type='checkbox' id='annr-hide-sold' />" +
            "<span>HIDE CLAIMED / SOLD PIECES</span>" +
          "</label>" +
          "<div style='display:flex;align-items:center;gap:10px'>" +
            "<span style='font-family:\"FK Grotesk SemiMono\",monospace;font-size:10px;color:#666'>SORT:</span>" +
            "<select id='annr-sort-products' class='annr-sort-select'>" +
              "<option value='newest'>NEWEST ARCHIVE</option>" +
              "<option value='oldest'>OLDEST ARCHIVE</option>" +
              "<option value='price-asc'>PRICE: LOW TO HIGH</option>" +
              "<option value='price-desc'>PRICE: HIGH TO LOW</option>" +
              "<option value='title-asc'>TITLE: A TO Z</option>" +
              "<option value='title-desc'>TITLE: Z TO A</option>" +
            "</select>" +
          "</div>";
        grid.parentNode.insertBefore(ctrl, grid);
      }

      var sortSelectInit = document.getElementById("annr-sort-products");
      if (sortSelectInit) sortSelectInit.value = sortBy;

      var nativeSort = document.getElementById("collection-filter-select-sort") || document.querySelector('select[name="sort_by"]');
      if (nativeSort && urlSort && nativeSort.querySelector('option[value="' + urlSort + '"]')) {
        nativeSort.value = urlSort;
      }

      if (!colControlsBound) {
        colControlsBound = true;
        var chipsList = document.querySelectorAll(".annr-cat-chip");
        chipsList.forEach(function (btn) {
          btn.onclick = function () {
            chipsList.forEach(function (b) { b.classList.remove("is-active"); });
            btn.classList.add("is-active");
            activeCategory = btn.getAttribute("data-category") || "all";
            renderGrid();
          };
        });

        var hideSoldCheckbox = document.getElementById("annr-hide-sold");
        if (hideSoldCheckbox) {
          hideSoldCheckbox.onchange = function () {
            hideSold = hideSoldCheckbox.checked;
            renderGrid();
          };
        }

        var sortSelect = document.getElementById("annr-sort-products");
        if (sortSelect) {
          sortSelect.onchange = function () {
            sortBy = sortSelect.value;
            renderGrid();
          };
        }

        if (nativeSort) {
          nativeSort.onchange = function () {
            var val = String(nativeSort.value || "").toLowerCase();
            sortBy = sortMap[val] || "newest";
            var annrSort = document.getElementById("annr-sort-products");
            if (annrSort) annrSort.value = sortBy;
            renderGrid();
          };
        }

        document.querySelectorAll("product-filter").forEach(function (pf) {
          pf.updateContent = function (url) {
            try {
              var nextUrl = new URL(url, window.location.origin);
              window.history.replaceState({}, "", nextUrl.href);
              var nextSort = (nextUrl.searchParams.get("sort_by") || "").toLowerCase();
              if (nextSort && sortMap[nextSort]) {
                sortBy = sortMap[nextSort];
                var annrSortEl = document.getElementById("annr-sort-products");
                if (annrSortEl) annrSortEl.value = sortBy;
              }
            } catch (e) {}
            var loadingEl = document.querySelector(".js-catalog__content");
            if (loadingEl) loadingEl.classList.remove("loading");
            renderGrid();
          };
        });

        document.querySelectorAll('[name="filter.v.option.size"]').forEach(function (cb) {
          cb.addEventListener("change", function () {
            var val = String(cb.value || "");
            document.querySelectorAll('[name="filter.v.option.size"]').forEach(function (other) {
              if (other !== cb && String(other.value || "") === val) other.checked = cb.checked;
            });
            renderGrid();
          });
        });

        document.querySelectorAll(".js-filter-dropdown .filter-button-clear, .js-collection-filter-clear").forEach(function (clrBtn) {
          clrBtn.addEventListener("click", function () {
            document.querySelectorAll('[name="filter.v.option.size"]').forEach(function (cb) { cb.checked = false; });
            renderGrid();
          });
        });
      }
    }

    ensureCollectionChrome();

    fetchLiveProducts(function (products) {
      currentProducts = Array.isArray(products) ? products : [];
      ensureCollectionChrome();
      renderGrid();
    });
  }

  function getActiveCategories() {
    try {
      var rawAdm = localStorage.getItem("shihiko-admin-v1");
      if (rawAdm) {
        var adm = JSON.parse(rawAdm);
        if (adm && Array.isArray(adm.categories) && adm.categories.length > 0) {
          var list = adm.categories
            .filter(function (c) { return c && c.slug && c.visible !== false && c.is_visible !== false; })
            .map(function (c) { return { slug: String(c.slug).toLowerCase(), name: String(c.name || c.slug) }; });
          if (list.length > 0) return list;
        }
      }
    } catch (e) {}
    try {
      var rawCfg = localStorage.getItem("shihiko-site-config");
      if (rawCfg) {
        var sc = JSON.parse(rawCfg);
        if (sc && Array.isArray(sc.categories) && sc.categories.length > 0) {
          var cfgList = sc.categories
            .filter(function (c) { return c && c.slug && c.visible !== false && c.is_visible !== false; })
            .map(function (c) { return { slug: String(c.slug).toLowerCase(), name: String(c.name || c.slug) }; });
          if (cfgList.length > 0) return cfgList;
        }
      }
    } catch (e) {}
    return CATEGORIES.slice();
  }

  // Update header mega-menu, mobile submenu & collection bar cleanly without disturbing theme button bindings
  function applyNavigationCategories(cats) {
    var path = window.location.pathname || "";
    var colMatch = path.match(/\/collections\/([a-zA-Z0-9_-]+)/);
    var activeHandle = colMatch ? colMatch[1].toLowerCase() : "";

    document.querySelectorAll(".header-new__desktop-bar .header-new__nav-block--right a[href*='/collections/vault']").forEach(function (a) {
      a.setAttribute("href", "/collections/unique-campaign/index.html");
      a.textContent = "Unique";
    });

    var megaLists = document.querySelectorAll(".header-new__mega-list[data-annr-categories-mega]");
    megaLists.forEach(function (ml) {
      var html =
        "<div class='header-new__mega-section'>" +
          "<div class='header-new__mega-heading'><a href='/collections/unique-campaign/index.html'>Unique Campaign</a><span>[01]</span></div>" +
        "</div>" +
        "<div class='header-new__mega-section'>" +
          "<div class='header-new__mega-heading'><a href='/collections/all/index.html'>Shop by Category</a><span>[02]</span></div>" +
          cats.map(function (c) {
            return "<a href='/collections/" + esc(c.slug) + "/index.html' class='header-submenu-list-item header-new__mega-link header-new__mega-link--nested'><span>" + esc(c.name) + "</span></a>";
          }).join("") +
          "<a href='/collections/all/index.html' class='header-submenu-list-item header-new__mega-link header-new__mega-link--nested'><span>All Archive</span></a>" +
        "</div>";
      ml.innerHTML = html;
    });

    var mobSubs = document.querySelectorAll("#header-mobile-menu .header-new__mobile-submenu[data-annr-categories-mobile]");
    var mobileSubHtml =
      "<div class='header-new__mobile-section'>" +
        "<a href='/collections/unique-campaign/index.html' class='mobile-menu-sublinks-item header-new__mobile-sublink header-new__mobile-sublink--heading'><span>Unique Campaign</span><span>[01]</span></a>" +
      "</div>" +
      "<div class='header-new__mobile-section'>" +
        "<a href='/collections/all/index.html' class='mobile-menu-sublinks-item header-new__mobile-sublink header-new__mobile-sublink--heading'><span>Shop by Category</span><span>[02]</span></a>" +
        cats.map(function (c) {
          return "<a href='/collections/" + esc(c.slug) + "/index.html' class='mobile-menu-sublinks-item header-new__mobile-sublink'><span>" + esc(c.name) + "</span></a>";
        }).join("") +
        "<a href='/collections/all/index.html' class='mobile-menu-sublinks-item header-new__mobile-sublink'><span>All Archive</span></a>" +
      "</div>";
    mobSubs.forEach(function (ms) {
      ms.innerHTML = mobileSubHtml;
    });

    // Also modernize legacy static mobile menus that lack data-annr-categories-mobile (removing Bonsai/Golden Goal/Samurai links)
    var mobLists = document.querySelectorAll("#header-mobile-menu .header-new__mobile-menu-list");
    mobLists.forEach(function (ml) {
      var topLink = ml.querySelector(":scope > a.header-new__mobile-link");
      if (topLink) {
        topLink.setAttribute("href", "/collections/unique-campaign/index.html");
        var topSpan = topLink.querySelector("span");
        if (topSpan) topSpan.textContent = "Unique Campaign";
      }
      var blocks = ml.querySelectorAll(":scope > .collapsible-block");
      if (blocks[0]) {
        var btn0 = blocks[0].querySelector(".collapsible-button span");
        if (btn0) btn0.textContent = "Categories";
        var sub0 = blocks[0].querySelector(".header-new__mobile-submenu");
        if (sub0) {
          sub0.setAttribute("data-annr-categories-mobile", "1");
          sub0.innerHTML = mobileSubHtml;
        }
      }
      if (blocks[1]) {
        var btn1 = blocks[1].querySelector(".collapsible-button span");
        if (btn1) btn1.textContent = "Campaigns";
        var sub1 = blocks[1].querySelector(".header-new__mobile-submenu");
        if (sub1) {
          sub1.innerHTML =
            "<div class='header-new__mobile-section'>" +
              "<a href='/collections/unique-campaign/index.html' class='mobile-menu-sublinks-item header-new__mobile-sublink header-new__mobile-sublink--heading'><span>Unique Campaign</span><span>[01]</span></a>" +
            "</div>" +
            "<div class='header-new__mobile-section'>" +
              "<a href='/collections/all/index.html' class='mobile-menu-sublinks-item header-new__mobile-sublink header-new__mobile-sublink--heading'><span>All Archive</span><span>[02]</span></a>" +
            "</div>";
        }
      }
    });

    document.querySelectorAll(".collection-menu__list").forEach(function (ul) {
      var items = [{ slug: "unique-campaign", name: "UNIQUE CAMPAIGN" }]
        .concat(cats.map(function (c) { return { slug: c.slug, name: c.name.toUpperCase() }; }))
        .concat([{ slug: "all", name: "ALL ITEMS" }]);

      ul.innerHTML = items.map(function (it) {
        var isAct = activeHandle === it.slug;
        return (
          "<li class='collection-menu__item'>" +
            "<a href='/collections/" + esc(it.slug) + "/index.html' class='collection-menu__link js-noreload" + (isAct ? " collection-menu__link--active" : "") + "' data-collection-navigation-link" + (isAct ? " aria-current='page'" : "") + ">" +
              esc(it.name) +
            "</a>" +
          "</li>"
        );
      }).join("");
    });
  }

  function updateNavigation() {
    applyNavigationCategories(getActiveCategories());

    fetch(SUPABASE_URL + "/rest/v1/categories?select=slug,name,is_visible,sort_order&order=sort_order.asc", {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY
      }
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (rows) {
        if (Array.isArray(rows) && rows.length > 0) {
          var live = rows
            .filter(function (c) { return c && c.slug && c.is_visible !== false && c.visible !== false; })
            .map(function (c) { return { slug: String(c.slug).toLowerCase(), name: String(c.name || c.slug) }; });
          if (live.length > 0) applyNavigationCategories(live);
        }
      })
      .catch(function () {});
  }

  // Init
  function init() {
    injectStyles();
    purgeLegacyHeroLogo();
    updateNavigation();

    var path = window.location.pathname;
    if (isHomePagePath(path)) {
      setupHomePage();
    } else if (path.indexOf("/products/") >= 0) {
      setupProductPage();
    } else if (path.indexOf("/collections/") >= 0) {
      setupCollectionPage();
    }
  }

  if (!window.__annrCatalogEventsBound) {
    window.__annrCatalogEventsBound = true;
    window.addEventListener("annr:products:updated", init);
    window.addEventListener("annr:categories:updated", updateNavigation);
    window.addEventListener("shihiko:collection:loaded", init);
    window.addEventListener("popstate", init);
    window.addEventListener("storage", function (e) {
      if (!e || e.key === "shihiko-admin-v1" || e.key === "shihiko-site-config" || e.key === "annr_live_products") {
        init();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

