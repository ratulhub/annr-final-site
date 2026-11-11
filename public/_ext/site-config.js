/* Applies the PUBLISHED AnnR admin configuration to the static store pages (demo: this browser only).
   Only values that differ from the original defaults are applied, so untouched pages stay identical.
   Add ?preview=1 to any page to preview the unpublished draft instead. */
(function () {
  // Prevent app.js ReferenceError: Fancybox is not defined from halting .js-sizes-trigger binding
  if (typeof window !== "undefined" && typeof window.Fancybox === "undefined") {
    window.Fancybox = { bind: function () {} };
  }

  var qs = new URLSearchParams(location.search);
  // Persist referral / promo code from URL (?ref=VIP-XXXX or ?coupon=VIP-XXXX) across the entire session
  var incomingRef = qs.get("ref") || qs.get("coupon");
  if (incomingRef && /^[A-Za-z0-9_-]{3,24}$/.test(incomingRef.trim())) {
    try {
      var cleanRef = incomingRef.trim().toUpperCase();
      localStorage.setItem("annr_active_ref_code", cleanRef);
      localStorage.setItem("annr_cart_coupon", cleanRef);
    } catch (e) {}
  }

  // Inside the admin preview frame the flag lives in window.name so it never leaks to other tabs.
  var framed = window.self !== window.top;
  if (qs.get("preview") === "1") { if (framed) window.name = "shihiko-preview"; else sessionStorage.setItem("shihiko-preview", "1"); }
  if (qs.get("preview") === "0") { window.name = ""; sessionStorage.removeItem("shihiko-preview"); }
  var preview = false;
  var cfg = null, P = {}, C = {}, G = {}, S = {}, D = {}, allCols = [];
  var path = location.pathname;
  var tpl = /\/products\//.test(path) ? "product" : /\/collections\//.test(path) ? "collection" : /\/(pages|policies)\//.test(path) ? "page" : /\/search\b/.test(path) ? "search" : /\/home\.html$|^\/$/.test(path) ? "home" : "other";
  function refreshState() {
    var framed = window.self !== window.top;
    preview = framed ? window.name === "shihiko-preview" : sessionStorage.getItem("shihiko-preview") === "1";
    try { cfg = JSON.parse(localStorage.getItem(preview ? "shihiko-site-draft" : "shihiko-site-config") || "null"); } catch (e) { cfg = null; }
    if (!cfg) {
      cfg = { products: {}, collections: {}, pages: {}, site: {}, defaults: {}, allCollections: [] };
    }
    P = cfg.products || {}; C = cfg.collections || {}; G = cfg.pages || {};
    S = cfg.site || {}; D = cfg.defaults || {};
    allCols = cfg.allCollections || [];

    // Also merge live admin product edits (e.g. Size Guide edits from /admin/products/$handle)
    try {
      var rawAdm = localStorage.getItem("shihiko-admin-v1");
      if (rawAdm) {
        var adm = JSON.parse(rawAdm);
        if (adm && Array.isArray(adm.products)) {
          adm.products.forEach(function (ap) {
            if (ap && ap.handle) {
              if (ap.sizeChart || P[ap.handle]) {
                P[ap.handle] = Object.assign({}, P[ap.handle] || {}, {
                  sizeChart: ap.sizeChart || (P[ap.handle] && P[ap.handle].sizeChart) || ""
                });
              }
            }
          });
        }
      }
    } catch (e) {}

    path = location.pathname;
    tpl = /\/products\//.test(path) ? "product" : /\/collections\//.test(path) ? "collection" : /\/(pages|policies)\//.test(path) ? "page" : /\/search\b/.test(path) ? "search" : /\/home\.html$|^\/$/.test(path) ? "home" : "other";
    return !!cfg;
  }
  refreshState();

  var J = JSON.stringify;
  function changed(k) { return J(S[k]) !== J(D[k]); }
  function diff(k, f) { return S[k] && D[k] && S[k][f] !== D[k][f]; }
  // Security: mirrors src/admin/security/sanitize.ts. Admin content is untrusted (import files, compromised accounts).
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"'`]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;" }[c]; }); }
  function safeUrl(u) {
    var s = String(u == null ? "" : u).trim();
    if (!s || s.length > 2048 || /[\u0000-\u001f\u007f-\u009f\\]/.test(s)) return "#";
    if (s.charAt(0) === "#") return s;
    if (s.charAt(0) === "/") return s.charAt(1) === "/" ? "#" : s;
    return /^(https?:\/\/|mailto:|tel:)/i.test(s) ? s : "#";
  }
  function isLegacyShihikoAsset(u) {
    return /Shihiko_2nd_Logo|DiscordBanner|Shihiko Logo White|SHIHIKOSOCKS|shihiko\.com/i.test(String(u == null ? "" : u));
  }
  function safeImg(u) {
    var s = String(u == null ? "" : u).trim();
    if (!s || isLegacyShihikoAsset(s)) return "";
    if (/^data:image\/(png|jpe?g|webp|gif|avif);base64,[a-z0-9+\/=]+$/i.test(s)) return s;
    var r = safeUrl(s); return r.charAt(0) === "#" || /^(mailto|tel):/i.test(r) ? "" : r;
  }

  var LEGACY_PRODUCT_HANDLES = {
    "aka-manto-longsleeve": 1,
    "divine-sanctum-tee": 1,
    "ruin-and-rebirth-varsity-jacket": 1,
    "blue-moon-long-sleeve": 1,
    "hound-of-hades-tee": 1,
    "ruin-and-rebirth-reversible-hoodie": 1
  };

  function isPublicStatus(st) {
    return !st || st === "active" || st === "sold" || st === "reserved";
  }

  function renderProductCardHtml(p, o) {
    o = o || (P && P[p.handle]) || {};
    var title = o.title != null ? o.title : p.title || "";
    var price = o.price != null ? o.price : p.price || "0";
    var pr = String(price).replace(/\.00$/, "");
    var compareAt = o.compareAt != null ? o.compareAt : p.compareAt;
    var img = (o.images && o.images[0]) || (p.images && p.images[0]) || p.image || "";
    var img2 = (o.images && o.images[1]) || (p.images && p.images[1]) || p.image2 || img;
    var st = String(o.status || p.status || "active").toLowerCase();
    var isSold = st === "sold" || o.stock === 0 || p.stock === 0;
    var code = o.code || p.code || "";
    var sz = o.size != null ? o.size : p.size;
    var showSz = (o.showSize !== undefined ? o.showSize !== false : p.showSize !== false) && sz && sz !== "NONE";
    var badge = o.badge != null ? o.badge : (p.badge || (isSold ? "SOLD / ARCHIVED" : "1 OF 1" + (showSz ? " · SIZE " + sz : "")));
    var badgeHtml = badge ? "<div class='product-card-labels' style='background:#111;color:#fff'>" + esc(badge) + "</div>" : "";
    var soldOverlay = isSold ? "<div class='annr-card-sold-overlay' style='position:absolute;inset:0;background:rgba(17,17,17,0.68);display:flex;align-items:center;justify-content:center;z-index:4;pointer-events:none'><div class='annr-card-sold-tag' style='background:#fff;color:#111;padding:6px 12px;font-weight:900;font-size:11px;letter-spacing:1.5px;border:2px solid #111'>SOLD / ARCHIVED</div></div>" : "";
    var codeHtml = code ? "<div style='font-family:\"FK Grotesk SemiMono\",monospace;font-size:9.5px;color:#e05a2b;letter-spacing:1.5px;margin-top:6px;font-weight:700'>" + esc(code) + "</div>" : "";
    var cmpHtml = compareAt ? "<span class='old-price money' style='opacity:.55;margin-left:6px;text-decoration:line-through;font-size:.9em'>Tk " + esc(String(compareAt).replace(/\.00$/, "")) + "<span class='money-currency-code'>BDT</span></span>" : "";

    return "<div class='lazy-item product-card' data-handle='" + esc(p.handle) + "'>" +
      "<div class='product-card-image' style='position:relative'>" + badgeHtml + soldOverlay +
        "<a href='/products/" + esc(p.handle) + "/index.html' class='product-card-image-wrapper' aria-label='" + esc(title) + "'>" +
          "<img src='" + esc(safeImg(img)) + "' alt='" + esc(title) + "' width='1200' height='1200' loading='lazy'>" +
          (img2 && img2 !== img ? "<img src='" + esc(safeImg(img2)) + "' alt='" + esc(title) + "' width='1200' height='1200' loading='lazy'>" : "") +
        "</a>" +
      "</div>" +
      codeHtml +
      "<a href='/products/" + esc(p.handle) + "/index.html' class='product-card-title'>" + esc(title) + "</a>" +
      "<div class='product-card-price'>" +
        "<span class='money'>Tk " + esc(pr) + "<span class='money-currency-code'>BDT</span></span>" +
        cmpHtml +
      "</div>" +
    "</div>";
  }

  // Search Engine & Dynamic Catalog
  var baseCatalog = [];
  try {
    var cachedCat = sessionStorage.getItem("annr_base_catalog_cache");
    if (cachedCat) {
      var parsedCached = JSON.parse(cachedCat);
      baseCatalog = Array.isArray(parsedCached) ? parsedCached : (parsedCached && Array.isArray(parsedCached.products) ? parsedCached.products : []);
    }
  } catch (e) {}

  function loadBaseCatalog() {
    try {
      fetch("/_ext/catalog.json").then(function (r) {
        return r.ok ? r.json() : null;
      }).then(function (data) {
        var prods = Array.isArray(data) ? data : (data && Array.isArray(data.products) ? data.products : []);
        if (prods && prods.length) {
          baseCatalog = prods;
          try { sessionStorage.setItem("annr_base_catalog_cache", JSON.stringify(prods)); } catch (err) {}
          if (tpl === "search") setupSearchPage();
        }
      }).catch(function () {});
    } catch (e) {}
  }
  loadBaseCatalog();

  function getFullCatalog() {
    var map = {};
    var list = [];
    function upsertCat(p) {
      if (!p || !p.handle || LEGACY_PRODUCT_HANDLES[p.handle]) return;
      if (!map[p.handle]) list.push(p);
      map[p.handle] = Object.assign({}, map[p.handle] || {}, p);
    }

    (baseCatalog || []).forEach(upsertCat);

    // Merge remote Supabase products cached in this browser
    try {
      var rawLive = localStorage.getItem("annr_live_products");
      if (rawLive) {
        var liveParsed = JSON.parse(rawLive);
        if (Array.isArray(liveParsed)) liveParsed.forEach(upsertCat);
      }
    } catch (e) {}

    if (cfg && Array.isArray(cfg.catalog)) {
      cfg.catalog.forEach(upsertCat);
    }

    // Merge live admin products so newly created/edited products appear immediately in this browser
    try {
      var rawAdm = localStorage.getItem("shihiko-admin-v1");
      if (rawAdm) {
        var admParsed = JSON.parse(rawAdm);
        if (admParsed && Array.isArray(admParsed.products)) {
          admParsed.products.forEach(upsertCat);
        }
      }
    } catch (e) {}

    var delSet = {};
    if (cfg && Array.isArray(cfg.deletedProducts)) {
      cfg.deletedProducts.forEach(function (h) { delSet[h] = true; });
    }
    return list.filter(function (p) {
      if (!p || !p.handle || LEGACY_PRODUCT_HANDLES[p.handle] || delSet[p.handle]) return false;
      var o = P && P[p.handle];
      if (o && (o.deleted || o.status === "deleted" || o.status === "draft" || o.status === "archived")) return false;
      var mergedStatus = String((o && o.status) || p.status || "active").toLowerCase();
      if (!isPublicStatus(mergedStatus)) return false;
      return true;
    }).map(function (p) {
      return Object.assign({}, map[p.handle] || p, (P && P[p.handle]) || {});
    });
  }

  var SEARCH_SYNONYMS = {
    "tshirt": "t-shirts",
    "t-shirt": "t-shirts",
    "shirt": "t-shirts",
    "tee": "t-shirts",
    "tees": "t-shirts",
    "hoody": "hoodies",
    "hoodie": "hoodies",
    "sweatshirt": "sweatshirts",
    "crewneck": "sweatshirts",
    "sweater": "sweaters",
    "jacket": "jackets",
    "coat": "jackets",
    "outerwear": "jackets",
    "pant": "trousers",
    "pants": "trousers",
    "jean": "trousers",
    "jeans": "trousers",
    "trouser": "trousers",
    "trousers": "trousers",
    "jogger": "trousers",
    "joggers": "trousers",
    "cargo": "trousers",
    "bottom": "trousers",
    "bottoms": "trousers",
    "knit": "knitwear",
    "knitwear": "knitwear",
    "cap": "accessories",
    "beanie": "accessories",
    "hat": "accessories",
    "hats": "accessories",
    "sock": "accessories",
    "socks": "accessories"
  };

  function searchProducts(query) {
    var q = String(query || "").trim().toLowerCase();
    var rawTerms = q.split(/\s+/).filter(Boolean);
    var all = getFullCatalog();
    if (!rawTerms.length) return all.filter(function (p) { return isPublicStatus(p.status); });

    var terms = rawTerms.map(function (t) { return SEARCH_SYNONYMS[t] || t; });

    var scored = [];
    for (var i = 0; i < all.length; i++) {
      var p = all[i];
      if (!isPublicStatus(p.status)) continue;
      var o = (P && P[p.handle]) || {};
      if (!isPublicStatus(o.status)) continue;

      var title = (o.title || p.title || "").toLowerCase();
      var desc = (o.description || p.description || "").toLowerCase();
      var handle = (p.handle || "").toLowerCase();
      var codeStr = String(o.code || p.code || "").toLowerCase();
      var tagsVal = o.tags != null ? o.tags : p.tags;
      var tags = Array.isArray(tagsVal) ? tagsVal.join(" ").toLowerCase() : String(tagsVal || "").toLowerCase();
      var type = (o.categorySlug || o.category || p.categorySlug || p.category || o.type || p.type || "").toLowerCase();
      var campaignStr = (o.campaignSlug || o.campaign || p.campaignSlug || p.campaign || "").toLowerCase();
      var colsStr = Array.isArray(p.collections) ? p.collections.join(" ").toLowerCase() : "";
      var showSz = o.showSize !== undefined ? o.showSize !== false : p.showSize !== false;
      var sizeStr = showSz ? String(o.size || p.size || "").toLowerCase() : "";
      var idStr = String(o.id != null ? o.id : (p.id != null ? p.id : "")).toLowerCase();
      var skuList = [];
      if (Array.isArray(p.skus)) skuList = skuList.concat(p.skus);
      if (Array.isArray(o.skus)) skuList = skuList.concat(o.skus);
      if (p.sku) skuList.push(p.sku);
      if (o.sku) skuList.push(o.sku);
      var skusStr = skuList.join(" ").toLowerCase();

      var matchedAll = true;
      var score = 0;

      for (var j = 0; j < terms.length; j++) {
        var t = terms[j];
        var rawT = rawTerms[j];
        var termMatched = false;

        if (codeStr && (codeStr === t || codeStr === rawT || codeStr.indexOf(t) >= 0 || codeStr.indexOf(rawT) >= 0)) {
          score += 160;
          termMatched = true;
        }
        if (idStr && (idStr === t || idStr === rawT || idStr.indexOf(t) >= 0 || idStr.indexOf(rawT) >= 0)) {
          score += 150;
          termMatched = true;
        }
        if (skusStr && (skusStr.indexOf(t) >= 0 || skusStr.indexOf(rawT) >= 0)) {
          score += 130;
          termMatched = true;
        }
        if (title.indexOf(t) >= 0 || title.indexOf(rawT) >= 0) {
          score += 100;
          if (title.indexOf(t) === 0 || title.indexOf(rawT) === 0) score += 50;
          termMatched = true;
        }
        if (handle.indexOf(t) >= 0 || handle.indexOf(rawT) >= 0) {
          score += 60;
          termMatched = true;
        }
        if (tags.indexOf(t) >= 0 || tags.indexOf(rawT) >= 0 || colsStr.indexOf(t) >= 0 || colsStr.indexOf(rawT) >= 0) {
          score += 40;
          termMatched = true;
        }
        if (type.indexOf(t) >= 0 || type.indexOf(rawT) >= 0 || campaignStr.indexOf(t) >= 0 || campaignStr.indexOf(rawT) >= 0) {
          score += 35;
          termMatched = true;
        }
        if (sizeStr && (sizeStr === t || sizeStr === rawT)) {
          score += 20;
          termMatched = true;
        }
        if (desc.indexOf(t) >= 0 || desc.indexOf(rawT) >= 0) {
          score += 10;
          termMatched = true;
        }

        if (!termMatched) {
          matchedAll = false;
          break;
        }
      }

      if (matchedAll) {
        scored.push({ p: p, score: score });
      }
    }

    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.map(function (item) { return item.p; });
  }

  window.annrSearchProducts = searchProducts;

  window.annrSearchPredictiveHtml = function (query) {
    var q = String(query || "").trim();
    if (!q) return "";
    var matches = searchProducts(q).slice(0, 10);
    if (!matches.length) {
      return "<div id='shopify-section-predictive-search-new' class='shopify-section'>" +
        "<div id='predictive-search-new-results'>" +
          "<div style='padding:24px 16px;text-align:center;font:11px/1.6 \"NB Architekt Std\",sans-serif;letter-spacing:1px;text-transform:uppercase;color:#888'>" +
            "<div style='margin-bottom:10px;font-weight:700;color:#aaa'>No direct matches for “" + esc(q) + "”</div>" +
            "<div style='font-size:10px;opacity:.7'>Browse archive: " +
              "<a href='/collections/unique-campaign/index.html' style='color:#fff;margin:0 4px;text-decoration:underline'>Unique Campaign</a> · " +
              "<a href='/collections/hoodies/index.html' style='color:#fff;margin:0 4px;text-decoration:underline'>Hoodies</a> · " +
              "<a href='/collections/jackets/index.html' style='color:#fff;margin:0 4px;text-decoration:underline'>Jackets</a> · " +
              "<a href='/collections/trousers/index.html' style='color:#fff;margin:0 4px;text-decoration:underline'>Trousers</a>" +
            "</div>" +
          "</div>" +
        "</div>" +
      "</div>";
    }

    var cards = matches.map(function (p) {
      return renderProductCardHtml(p, P && P[p.handle]);
    }).join("\n");

    return "<div id='shopify-section-predictive-search-new' class='shopify-section'>" +
      "<div id='predictive-search-new-results'>" +
        "<div class='header-search-new__result-products' data-header-search-new-result-products>" +
          cards +
        "</div>" +
      "</div>" +
    "</div>";
  };
  function cv(v) {
    var s = String(v == null ? "" : v).trim();
    if (!s || s.length > 120 || /[;{}<>\\"`]|url\s*\(|expression\s*\(|@import|javascript:|\/\*/i.test(s)) return "";
    return /^[#a-z0-9 ,.%()'+-]+$/i.test(s) ? s : "";
  }
  function cleanCss(c) {
    return String(c || "").slice(0, 20000).replace(/<\/?\s*style/gi, "").replace(/@import[^;]*;?/gi, "")
      .replace(/expression\s*\(/gi, "").replace(/javascript:/gi, "")
      .replace(/url\s*\(\s*(['"]?)\s*(?!\/(?!\/)|data:image\/(?!svg))[^)]*\)/gi, "none");
  }
  function css(text) { var st = document.createElement("style"); st.setAttribute("data-admin", ""); st.textContent = text; document.head.appendChild(st); }
  function meta(name, val, attr) {
    if (val == null || val === "") return;
    attr = attr || "name";
    var m = document.querySelector("meta[" + attr + '="' + name + '"]');
    if (!m) { m = document.createElement("meta"); m.setAttribute(attr, name); document.head.appendChild(m); }
    m.setAttribute("content", val);
  }
  function handleOf(href, kind) { var m = (href || "").match(new RegExp("/" + kind + "/([^/?#]+)")); return m ? m[1] : null; }
  function pageHandle(p) {
    var h = handleOf(p, "pages") || handleOf(p, "policies");
    if (h === "privacy-policy") return "legal-privacy";
    if (h === "refund-policy") return "return-policy";
    return h;
  }
  function money(p) { return "Tk " + String(p).replace(/\.00$/, ""); }
  function setMoney(el, price, compareAt) {
    if (!el) return;
    var span = el.querySelector(".money") || el, code = span.querySelector(".money-currency-code");
    if (price != null) { span.textContent = money(price); if (code) span.appendChild(code); }
    var oldDel = el.querySelector(".adm-compare"); if (oldDel) oldDel.remove();
    if (compareAt) {
      var del = document.createElement("del");
      del.className = "adm-compare";
      del.style.cssText = "opacity:.55;margin-left:6px;text-decoration:line-through;font-size:.9em";
      del.textContent = money(compareAt);
      el.appendChild(del);
    }
  }
  function inScope(scope) { return !scope || scope === "all" || scope === tpl || (scope.charAt(0) === "/" && path.indexOf(scope) === 0); }
  function overlay(id, html, style) {
    if (document.getElementById(id)) return;
    var m = document.createElement("div"); m.id = id; m.innerHTML = html;
    m.style.cssText = style; document.body.appendChild(m); return m;
  }
  var FULL = "position:fixed;inset:0;z-index:99999;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;text-align:center;font:28px/1.4 'Druk Wide',sans-serif;text-transform:uppercase;padding:20px";

  function showUnavailable(title, subtitle) {
    document.title = "AnnR — " + (title || "Unavailable");
    var earlyStyle = document.getElementById("adm-early-hide");
    if (earlyStyle) earlyStyle.remove();
    var t = title || "PAGE UNAVAILABLE";
    var s = subtitle || "This page or collection is currently offline or unavailable.";
    var html = "<div style='position:fixed;inset:0;z-index:999999;background:#050505;color:#ffffff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;box-sizing:border-box'>" +
      "<div style='font:9px \"FK Grotesk SemiMono\",monospace;letter-spacing:2px;color:#e10600;margin-bottom:12px'>[ 404 / OFFLINE ]</div>" +
      "<h1 style='font:28px/1.2 \"Druk Wide\",sans-serif;letter-spacing:2px;text-transform:uppercase;margin:0 0 16px;color:#fff'>" + esc(t) + "</h1>" +
      "<p style='font:12px/1.6 \"NB Architekt Std\",sans-serif;letter-spacing:1px;max-width:480px;opacity:.7;margin:0 0 28px;text-transform:uppercase'>" + esc(s) + "</p>" +
      "<a href='/home.html' style='display:inline-block;background:#ffffff;color:#000000;text-decoration:none;padding:14px 32px;font:11px/1 \"NB Architekt Std\",sans-serif;letter-spacing:1.5px;font-weight:700;text-transform:uppercase;border-radius:2px;box-shadow:0 4px 14px rgba(0,0,0,.4)'>RETURN TO STORE</a>" +
    "</div>";
    if (document.body) {
      document.body.innerHTML = html;
    } else {
      document.write(html);
    }
  }

  // Early protection: suppress flash of hidden pages/collections before DOM rendering
  (function earlyHideCheck() {
    refreshState();
    var norm = path.toLowerCase().replace(/\/index\.html$/, "").replace(/\/$/, "");
    if (!norm) norm = "/";
    var colH = handleOf(path, "collections");
    var pgH = pageHandle(path);
    var hideNow = false;
    if (S.hiddenPages && S.hiddenPages.some(function(hp) {
      var nhp = String(hp).toLowerCase().replace(/\/index\.html$/, "").replace(/\/$/, "");
      return nhp && (norm === nhp || norm.indexOf(nhp + "/") === 0);
    })) hideNow = true;
    if (colH && ((C[colH] && C[colH].visible === false) || (allCols.some(function(c) { return c && c.handle === colH && c.visible === false; })))) hideNow = true;
    if (pgH && G[pgH] && G[pgH].visible === false) hideNow = true;
    if (hideNow && !preview) {
      var s = document.createElement("style");
      s.id = "adm-early-hide";
      s.textContent = "body, #MainContent, .main-content, .shopify-section, main { display: none !important; }";
      (document.head || document.documentElement).appendChild(s);
    }
  })();

  // Design tokens go in early so there is no flash.
  (function design() {
    var d = S.design || {}, o = D.design || {}, r = [];
    function on(k) { return d[k] && d[k] !== o[k] && cv(d[k]); }
    if (on("background")) r.push("body{background:" + cv(d.background) + "!important}");
    if (on("text")) r.push("body,body a{color:" + cv(d.text) + "}");
    if (on("headingFont")) r.push("h1,h2,h3,h4,.product-info-title{font-family:'" + cv(d.headingFont) + "',sans-serif!important}");
    if (on("bodyFont")) r.push("body{font-family:'" + cv(d.bodyFont) + "',sans-serif!important}");
    if (on("fontScale")) r.push("html{font-size:" + cv(d.fontScale) + "}");
    if (on("buttonBg")) r.push(".btn,button[type=submit]{background:" + cv(d.buttonBg) + "!important;border-color:" + cv(d.buttonBg) + "!important}");
    if (on("buttonText")) r.push(".btn,.btn *,button[type=submit]{color:" + cv(d.buttonText) + "!important}");
    if (on("buttonRadius")) r.push(".btn,button[type=submit]{border-radius:" + cv(d.buttonRadius) + "!important}");
    if (on("inputRadius")) r.push("input,select,textarea{border-radius:" + cv(d.inputRadius) + "!important}");
    if (on("accent")) r.push(".product-card-labels{background:" + cv(d.accent) + "!important}");
    if (on("containerWidth")) r.push(".container{max-width:" + cv(d.containerWidth) + "!important;margin-left:auto;margin-right:auto}");
    if (on("headerBg")) r.push(".header,.header-new__desktop-bar{background:" + cv(d.headerBg) + "!important}");
    if (on("headerText")) r.push(".header,.header a,.header button{color:" + cv(d.headerText) + "!important}");
    if (on("footerBg")) r.push("footer.footer{background:" + cv(d.footerBg) + "!important}");
    if (on("footerText")) r.push("footer.footer,footer.footer a{color:" + cv(d.footerText) + "!important}");
    if (d.mode === "dark" && o.mode !== "dark") r.push("html{filter:invert(1) hue-rotate(180deg)}img,video,svg image{filter:invert(1) hue-rotate(180deg)}");
    var t = S.technical || {};
    if (t.productLabels === false) r.push(".product-card-labels{display:none!important}");
    if (t.customCss) r.push(cleanCss(t.customCss));
    r.push(".header-new .header-logo{position:absolute!important;left:50%!important;top:38px!important;transform:translate(-50%,-50%)!important;z-index:3!important;display:inline-flex!important;align-items:center!important;justify-content:center!important}.header-logo{display:inline-flex!important;align-items:center!important;justify-content:center!important}.icon-logo{display:inline-block!important;vertical-align:middle!important;width:108px!important;height:48px!important;background-color:currentColor!important;-webkit-mask:url(/cdn/shop/t/75/assets/image_logo.svg) no-repeat center/contain!important;mask:url(/cdn/shop/t/75/assets/image_logo.svg) no-repeat center/contain!important;font-size:0!important;line-height:0!important}.icon-logo:before{content:''!important;display:none!important}@media only screen and (max-width:767px){.header-new .header-logo{top:50%!important;transform:translate(-50%,-50%)!important}.icon-logo{width:80px!important;height:36px!important}}");
    // Section look (spacing, background, alignment, width, device visibility)
    (S.sections && S.sections[tpl] || []).forEach(function (s) {
      var sel = s.key === "template-faq"
        ? '[id^="shopify-section-"][id$="__template-faq"],[id^="shopify-section-"][id$="__template-policy"],.shopify-policy__container'
        : '[id^="shopify-section-"][id$="__' + s.key + '"]', rule = [];
      if (!s.visible) rule.push("display:none!important");
      if (cv(s.padTop)) rule.push("padding-top:" + cv(s.padTop) + "!important");
      if (cv(s.padBottom)) rule.push("padding-bottom:" + cv(s.padBottom) + "!important");
      if (cv(s.background)) rule.push("background:" + cv(s.background) + "!important");
      if (cv(s.align)) rule.push("text-align:" + cv(s.align) + "!important");
      if (s.width === "contained") rule.push("max-width:1440px;margin-left:auto!important;margin-right:auto!important");
      if (rule.length) r.push(sel + "{" + rule.join(";") + "}");
      if (s.device === "desktop") r.push("@media(max-width:767px){" + sel + "{display:none!important}}");
      if (s.device === "mobile") r.push("@media(min-width:768px){" + sel + "{display:none!important}}");
    });
    if (r.length) css(r.join("\n"));
  })();

  function whenReady(fn) { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn); else fn(); }

  function previewBar() {
    overlay("adm-preview", "PREVIEWING UNPUBLISHED DRAFT &nbsp; <a href='?preview=0' style='color:#fff;text-decoration:underline'>EXIT PREVIEW</a>",
      "position:fixed;left:0;right:0;bottom:0;z-index:99998;background:#e10600;color:#fff;text-align:center;font:10px/1 'NB Architekt Std',sans-serif;letter-spacing:1px;padding:10px");
  }

  
  // =========================================================================
  // UNIVERSAL GLOBAL SEARCH SYSTEM FOR FULL SITE
  // Handles desktop & mobile search triggers, live predictive drawer, and
  // product code / SKU / barcode / ID / name / tag matching across all pages.
  // =========================================================================
  function initGlobalSearchEngine() {
    var modal = document.querySelector("header-search-new, .header-search-new");
    var overflow = document.querySelector(".header-search-overflow");
    var input = document.getElementById("header-search-new-input");
    var resultsEl = document.querySelector("[data-header-search-new-results]");
    var trendingEl = document.querySelector("[data-header-search-new-trending]");

    function openSearch() {
      if (modal) {
        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
        modal.style.setProperty("display", "flex", "important");
      }
      if (overflow) {
        overflow.classList.add("open");
        overflow.style.setProperty("display", "block", "important");
      }
      if (input) {
        setTimeout(function () { input.focus(); }, 60);
      }
    }

    function closeSearch() {
      if (modal) {
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
        modal.style.setProperty("display", "none", "important");
      }
      if (overflow) {
        overflow.classList.remove("open");
        overflow.style.setProperty("display", "none", "important");
      }
    }

    // Attach to all search trigger buttons across desktop and mobile headers
    var triggers = document.querySelectorAll(".js-header-search-trigger, .header-search-button, [data-header-search-trigger], #header-search-trigger, a[href*='/search']");
    triggers.forEach(function (btn) {
      if (btn.__annrSearchBound) return;
      btn.__annrSearchBound = true;
      btn.addEventListener("click", function (e) {
        var isClose = btn.getAttribute("data-type") === "close" || btn.classList.contains("header-search-new__close");
        if (isClose) {
          e.preventDefault();
          e.stopPropagation();
          closeSearch();
          return;
        }
        // If clicking a search button in header, toggle/open modal
        if (modal) {
          e.preventDefault();
          e.stopPropagation();
          if (modal.classList.contains("open")) {
            closeSearch();
          } else {
            openSearch();
          }
        }
      });
    });

    if (overflow && !overflow.__annrCloseBound) {
      overflow.__annrCloseBound = true;
      overflow.addEventListener("click", function (e) {
        e.preventDefault();
        closeSearch();
      });
    }

    // Close on Escape key
    if (!window.__annrSearchEscBound) {
      window.__annrSearchEscBound = true;
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && modal && modal.classList.contains("open")) {
          closeSearch();
        }
      });
    }

    // Live instant search typing listener inside predictive drawer
    if (input && !input.__annrLiveBound) {
      input.__annrLiveBound = true;
      var liveTimer = null;
      input.addEventListener("input", function () {
        clearTimeout(liveTimer);
        liveTimer = setTimeout(function () {
          var val = input.value.trim();
          if (!val) {
            if (trendingEl) trendingEl.classList.add("is-active");
            if (resultsEl) {
              resultsEl.classList.remove("is-active");
              resultsEl.innerHTML = "";
            }
            return;
          }
          if (trendingEl) trendingEl.classList.remove("is-active");
          if (resultsEl) resultsEl.classList.add("is-active");

          var matches = searchProducts(val).slice(0, 12);
          if (matches.length > 0) {
            var cardsHtml = matches.map(function (p) {
              var pr = String(p.price || "0").replace(/\.00$/, "");
              var img = (p.images && p.images[0]) || p.image || "";
              return "<div class='product-card'>" +
                "<a href='/products/" + esc(p.handle) + "/index.html' class='product-card-image-wrapper' aria-label='" + esc(p.title) + "'>" +
                  "<img src='" + esc(safeImg(img)) + "' alt='" + esc(p.title) + "' loading='lazy'>" +
                "</a>" +
                "<a href='/products/" + esc(p.handle) + "/index.html' class='product-card-title'>" + esc(p.title) + "</a>" +
                "<div class='product-card-price'>Tk " + esc(pr) + " BDT</div>" +
              "</div>";
            }).join("");

            resultsEl.innerHTML = "<div class='header-search-new__heading'>RESULTS FOR “" + esc(val.toUpperCase()) + "” (" + matches.length + ")</div>" +
              "<div class='header-search-new__result-products'>" + cardsHtml + "</div>" +
              "<div style='text-align:center;margin-top:16px'>" +
                "<a href='/search/index.html?type=product&q=" + encodeURIComponent(val) + "' style='display:inline-block;padding:9px 20px;background:#e05a2b;color:#ffffff;font-family:\"NB Architekt Std\",sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;border-radius:4px;text-decoration:none'>VIEW ALL " + matches.length + "+ RESULTS →</a>" +
              "</div>";
          } else {
            resultsEl.innerHTML = "<div class='header-search-new__empty-state'>" +
              "<p style='font-size:13px;font-weight:700;color:#fff;margin-bottom:6px'>NO PRODUCTS FOUND FOR “" + esc(val.toUpperCase()) + "”</p>" +
              "<p style='font-size:11px;color:#a1a1aa'>Try searching by product title, piece code (e.g. ANNR-001), or category (e.g. hoodies, jackets, trousers).</p>" +
            "</div>";
          }
        }, 120);
      });
    }

    // Trending pills in search drawer
    document.querySelectorAll(".header-search-new__tab").forEach(function (tab) {
      if (tab.__annrPillBound) return;
      tab.__annrPillBound = true;
      tab.addEventListener("click", function (e) {
        var term = tab.textContent.trim();
        if (term.toLowerCase() === "all items") term = "";
        if (input) {
          input.value = term;
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
      });
    });
  }

  function setupSearchPage() {
    var q = (new URLSearchParams(location.search).get("q") || "").trim();
    var input = document.getElementById("search");
    if (input) input.value = q;
    var headInput = document.getElementById("header-search-new-input");
    if (headInput && q) headInput.value = q;

    var clearBtn = document.querySelector(".js-clear-search-input");
    if (clearBtn) {
      clearBtn.style.display = q ? "" : "none";
      clearBtn.classList.toggle("hide", !q);
    }

    var countEl = document.querySelector(".search-head-count");
    var titleEl = document.querySelector(".collection-top .collection-title");
    var gridEl = document.querySelector(".collection-product-grid");
    var resultsWrap = document.querySelector(".lazy-element.search-results");

    var matches = searchProducts(q);

    // Sorting
    var sortActive = document.querySelector(".collection-filter-option-value input[name='sort_by']:checked");
    var sortVal = sortActive ? sortActive.value : "relevance";
    if (sortVal === "price-ascending") {
      matches.sort(function (a, b) {
        var pa = parseFloat(String(a.price || "0").replace(/[^0-9.]/g, "")) || 0;
        var pb = parseFloat(String(b.price || "0").replace(/[^0-9.]/g, "")) || 0;
        return pa - pb;
      });
    } else if (sortVal === "price-descending") {
      matches.sort(function (a, b) {
        var pa = parseFloat(String(a.price || "0").replace(/[^0-9.]/g, "")) || 0;
        var pb = parseFloat(String(b.price || "0").replace(/[^0-9.]/g, "")) || 0;
        return pb - pa;
      });
    }

    if (countEl) {
      if (q) {
        countEl.innerHTML = "<span>" + matches.length + "</span><span>//</span><span>results found for your search</span><span> //</span><span>“" + esc(q) + "”</span>";
      } else {
        countEl.innerHTML = "<span>" + matches.length + "</span><span>//</span><span>products in catalog</span>";
      }
    }

    if (titleEl) {
      if (q) {
        titleEl.textContent = matches.length ? 'RESULTS FOR “' + q.toUpperCase() + '”' : 'NO RESULTS FOR “' + q.toUpperCase() + '”';
      } else {
        titleEl.textContent = "ALL PRODUCTS";
      }
    }

    if (resultsWrap) {
      resultsWrap.classList.toggle("empty", matches.length === 0);
    }

    if (gridEl) {
      if (matches.length > 0) {
        gridEl.innerHTML = matches.map(function (p) {
          return renderProductCardHtml(p, P && P[p.handle]);
        }).join("");
      } else if (q) {
        gridEl.innerHTML = "<div style='grid-column:1/-1;text-align:center;padding:60px 20px;font:12px/1.6 \"NB Architekt Std\",sans-serif;letter-spacing:1px;text-transform:uppercase;opacity:.8'>" +
          "<p style='font-size:14px;margin-bottom:8px'>No products found matching “" + esc(q) + "”</p>" +
          "<p style='font-size:11px;opacity:.6'>Try checking your spelling, piece code (e.g. ANNR-001), or keywords like “hoodies”, “jackets”, “t-shirts”, “trousers”.</p>" +
        "</div>";
      }
    }

    // Top Category Filters on Search Page
    var topFilter = document.querySelector(".collection-top-filter");
    if (topFilter) {
      var categories = ["ALL", "UNIQUE CAMPAIGN", "HOODIES", "SWEATSHIRTS", "TROUSERS", "SWEATERS", "T-SHIRTS", "JACKETS", "KNITWEAR", "ACCESSORIES"];
      topFilter.innerHTML = "<div style='display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 20px'>" +
        categories.map(function (cat) {
          var slug = cat === "UNIQUE CAMPAIGN" ? "unique-campaign" : cat.toLowerCase();
          var isActive = (!q && cat === "ALL") || (q.toLowerCase() === slug) || (q.toLowerCase() === (SEARCH_SYNONYMS[slug] || slug));
          return "<button type='button' class='annr-search-tag-pill' data-cat='" + esc(slug) + "' style='padding:6px 14px;border:1px solid " + (isActive ? "#e05a2b" : "rgba(0,0,0,0.15)") + ";background:" + (isActive ? "#e05a2b" : "#ffffff") + ";color:" + (isActive ? "#ffffff" : "#111111") + ";font-family:\"NB Architekt Std\",sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;cursor:pointer;border-radius:3px;transition:all .15s ease'>" + esc(cat) + "</button>";
        }).join("") +
      "</div>";

      topFilter.querySelectorAll(".annr-search-tag-pill").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var cat = btn.getAttribute("data-cat");
          var term = cat === "all" ? "" : cat;
          var newUrl = term ? ("/search/index.html?type=product&q=" + encodeURIComponent(term)) : "/search/index.html";
          history.pushState(null, "", newUrl);
          setupSearchPage();
        });
      });
    }

    var searchForm = document.querySelector(".search-head-form.js-search-form");
    if (searchForm && !searchForm.__annrBound) {
      searchForm.__annrBound = true;
      searchForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var searchInput = document.getElementById("search");
        var val = (searchInput ? searchInput.value : "").trim();
        var newUrl = "/search/index.html?type=product&q=" + encodeURIComponent(val);
        history.pushState(null, "", newUrl);
        setupSearchPage();
      });
    }

    var clr = document.querySelector(".js-clear-search-input");
    if (clr && !clr.__annrBound) {
      clr.__annrBound = true;
      clr.addEventListener("click", function () {
        var inp = document.getElementById("search");
        if (inp) inp.value = "";
        history.pushState(null, "", "/search/index.html");
        setupSearchPage();
      });
    }

    var inpLive = document.getElementById("search");
    if (inpLive && !inpLive.__annrBound) {
      inpLive.__annrBound = true;
      var liveDebounce = null;
      inpLive.addEventListener("input", function () {
        var val = inpLive.value.trim();
        if (clearBtn) {
          clearBtn.style.display = val ? "" : "none";
          clearBtn.classList.toggle("hide", !val);
        }
        clearTimeout(liveDebounce);
        liveDebounce = setTimeout(function () {
          var newUrl = val ? ("/search/index.html?type=product&q=" + encodeURIComponent(val)) : "/search/index.html";
          history.replaceState(null, "", newUrl);
          setupSearchPage();
        }, 220);
      });
    }

    // Inject mobile-optimized styling for touch targets & iOS zoom prevention
    if (!document.getElementById("adm-search-mobile-css")) {
      var sStyle = document.createElement("style");
      sStyle.id = "adm-search-mobile-css";
      sStyle.textContent =
        "input[type='search'], #search, #header-search-new-input { font-size: 16px !important; -webkit-text-size-adjust: 100%; touch-action: manipulation; }" +
        ".js-clear-search-input { min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer; }" +
        ".collection-product-grid { display: grid; gap: 16px; }" +
        "@media (max-width: 767px) { .collection-product-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; } }";
      (document.head || document.documentElement).appendChild(sStyle);
    }

    document.querySelectorAll(".collection-filter-option-value input[name='sort_by']").forEach(function (radio) {
      if (!radio.__annrBound) {
        radio.__annrBound = true;
        radio.addEventListener("change", function () {
          setupSearchPage();
        });
      }
    });
  }

  function apply() {
    refreshState();
    if (preview) previewBar();
    initGlobalSearchEngine();
    if (tpl === "search") {
      setupSearchPage();
    }
    if (!cfg) return;
    var gen = S.general || {}, tech = S.technical || {}, seo = S.seo || {};

    var colsMap = {};
    (allCols || []).forEach(function (c) {
      if (c && c.handle) colsMap[c.handle] = { title: c.title, visible: c.visible !== false };
    });
    Object.keys(C || {}).forEach(function (h) {
      colsMap[h] = colsMap[h] || {};
      if (C[h].title != null) colsMap[h].title = C[h].title;
      if (C[h].visible != null) colsMap[h].visible = C[h].visible !== false;
    });

    // Hidden pages, collection visibility and maintenance
    var normPath = path.toLowerCase().replace(/\/index\.html$/, "").replace(/\/$/, "");
    if (!normPath) normPath = "/";

    var isHidden = false;

    // A. Check S.hiddenPages
    (S.hiddenPages || []).forEach(function (hp) {
      if (!hp) return;
      var nhp = String(hp).toLowerCase().replace(/\/index\.html$/, "").replace(/\/$/, "");
      if (nhp && (normPath === nhp || normPath.indexOf(nhp + "/") === 0)) {
        isHidden = true;
      }
    });

    // B. Check collections
    var colHandle = handleOf(path, "collections");
    if (colHandle) {
      var colData = colsMap[colHandle] || (C && C[colHandle]);
      if (colData && colData.visible === false) isHidden = true;
      if (cfg && Array.isArray(cfg.deletedCollections) && cfg.deletedCollections.indexOf(colHandle) >= 0) isHidden = true;
    }

    // C. Check pages
    var pageH = pageHandle(path);
    if (pageH) {
      var pgData = G && G[pageH];
      if (pgData && pgData.visible === false) isHidden = true;
      if (cfg && Array.isArray(cfg.deletedPages) && cfg.deletedPages.indexOf(pageH) >= 0) isHidden = true;
    }

    if (tech.maintenance && !preview) {
      showUnavailable(tech.maintenanceTitle || gen.siteName || "ANNR", tech.maintenanceText || "We'll be back soon");
      return;
    }

    if (isHidden && !preview) {
      showUnavailable(tech.notFoundTitle || "PAGE UNAVAILABLE", tech.notFoundText || "This page or collection is currently offline.");
      return;
    }

    // 1. Purge ALL hidden collection links from the entire DOM (desktop mega menu, mobile drawer, secondary menus, footers):
    Object.keys(colsMap).forEach(function (h) {
      if (colsMap[h].visible === false) {
        var anchors = document.querySelectorAll("a[href*='/collections/" + h + "/'], a[href*='/collections/" + h + "']");
        anchors.forEach(function (a) {
          var targetH = handleOf(a.getAttribute("href"), "collections");
          if (targetH !== h) return;

          a.style.setProperty("display", "none", "important");

          var item = a.closest(".header-submenu-list-item, .header-new__mega-link, .mobile-menu-sublinks-item, .header-new__mobile-sublink, .collection-menu__item, .footer-menu-list-item, .header-new__mega-section");
          if (item) {
            var headLink = item.querySelector && item.querySelector(".header-new__mega-heading > a");
            if (headLink && handleOf(headLink.getAttribute("href"), "collections") === h) {
              item.style.setProperty("display", "none", "important");
            } else if (!item.classList.contains("header-new__mega-section")) {
              item.style.setProperty("display", "none", "important");
            }
          }
        });
      }
    });

    // 2. Purge ALL paths in S.hiddenPages from navigation:
    (S.hiddenPages || []).forEach(function (hp) {
      if (!hp) return;
      var clean = String(hp).replace(/\/index\.html$/, "").replace(/\/$/, "");
      var anchors = document.querySelectorAll("a[href*='" + clean + "/'], a[href*='" + clean + "'], a[href*='" + hp + "']");
      anchors.forEach(function (a) {
        a.style.setProperty("display", "none", "important");
        var item = a.closest(".header-submenu-list-item, .header-new__mega-link, .mobile-menu-sublinks-item, .header-new__mobile-sublink, .collection-menu__item, .footer-menu-list-item, .header-menu-item, .header-new__mega-section");
        if (item) item.style.setProperty("display", "none", "important");
      });
    });

    // 3. Dynamic Collections reference synchronization & index numbers in Navbar:
    var megaSections = document.querySelectorAll(".header-submenu-list.header-new__mega-list > .header-new__mega-section");
    var visibleIdx = 1;
    megaSections.forEach(function (sec) {
      var a = sec.querySelector(".header-new__mega-heading > a");
      if (!a) return;
      var h = handleOf(a.getAttribute("href"), "collections");
      if (!h) return;
      var info = colsMap[h];
      if (info) {
        if (info.visible === false || info.is_visible === false) {
          sec.style.setProperty("display", "none", "important");
          return;
        } else {
          sec.style.removeProperty("display");
        }
        if (info.title != null && info.title !== "") a.textContent = info.title;
        var numSpan = sec.querySelector(".header-new__mega-heading > span");
        if (numSpan) {
          numSpan.textContent = "\n\t\t\t\t\t\t\t\t\t\t\t\t\t[" + (visibleIdx < 10 ? "0" + visibleIdx : visibleIdx) + "]\n\t\t\t\t\t\t\t\t\t\t\t\t";
        }
        visibleIdx++;
      }
    });

    // 2. Mobile navigation sublinks under Collections
    var mobileColLinks = document.querySelectorAll(".header-new__mobile-section > a.mobile-menu-sublinks-item[href*='/collections/']");
    mobileColLinks.forEach(function (a) {
      var h = handleOf(a.getAttribute("href"), "collections");
      if (!h) return;
      var info = colsMap[h];
      var wrapper = a.closest(".header-new__mobile-section") || a;
      if (info) {
        if (info.visible === false || info.is_visible === false) {
          wrapper.style.setProperty("display", "none", "important");
          return;
        } else {
          wrapper.style.removeProperty("display");
        }
        if (info.title != null && info.title !== "") {
          var span = a.querySelector("span") || a;
          span.textContent = info.title;
        }
      }
    });

    // 3. Collection secondary menu on collection pages (.collection-menu)
    var colMenuItems = document.querySelectorAll(".collection-menu__list > .collection-menu__item");
    var activeColHandle = handleOf(path, "collections");
    colMenuItems.forEach(function (item) {
      var a = item.querySelector("a.collection-menu__link");
      if (!a) return;
      var h = handleOf(a.getAttribute("href"), "collections");
      if (!h) return;
      var info = colsMap[h];
      if (info) {
        if (info.visible === false || info.is_visible === false) {
          item.style.setProperty("display", "none", "important");
          return;
        } else {
          item.style.removeProperty("display");
        }
        if (info.title != null && info.title !== "") a.textContent = info.title.toUpperCase();
      }
      if (activeColHandle && h === activeColHandle) {
        a.classList.add("collection-menu__link--active");
        a.setAttribute("aria-current", "page");
      } else if (activeColHandle) {
        a.classList.remove("collection-menu__link--active");
        a.removeAttribute("aria-current");
      }
    });

    // Page transition off: the delegated handler needs .reload-overflow, so removing it disables the effect.
    if (tech.pageTransition === false) document.querySelectorAll(".reload-overflow,.loading-bar").forEach(function (e) { e.remove(); });

    // Products everywhere (cards on home, collections, search, recommendations)
    document.querySelectorAll("a.product-card-title").forEach(function (a) {
      var h = handleOf(a.getAttribute("href"), "products");
      if (!h) return;
      var o = P && P[h];
      var isDel = LEGACY_PRODUCT_HANDLES[h] ||
                  (cfg && Array.isArray(cfg.deletedProducts) && cfg.deletedProducts.indexOf(h) !== -1) ||
                  (o && (o.deleted || o.status === "deleted" || o.status === "draft" || o.status === "archived"));
      var card = a.closest(".product-card, li, .grid__item") || a.parentElement;
      if (isDel) {
        if (card) card.style.setProperty("display", "none", "important");
        return;
      }
      if (!o) return;
      if (o.title != null) a.textContent = o.title;
      if (o.price != null || o.compareAt != null) setMoney(a.parentElement && a.parentElement.querySelector(".product-card-price"), o.price, o.compareAt);
      if (o.badge != null && card) {
        var lbl = card.querySelector(".product-card-labels");
        if (!o.badge) { if (lbl) lbl.style.display = "none"; }
        else {
          if (!lbl) {
            var imgBox = card.querySelector(".product-card-image");
            if (imgBox) { lbl = document.createElement("div"); lbl.className = "product-card-labels"; lbl.style.cssText = "background:#000;color:#fff"; imgBox.insertBefore(lbl, imgBox.firstChild); }
          }
          if (lbl) { lbl.style.display = ""; lbl.textContent = o.badge; }
        }
      }
      if (o.images && o.images.length && card) {
        var cImgs = card.querySelectorAll(".product-card-image-wrapper img");
        var u0 = safeImg(o.images[0]), u1 = safeImg(o.images[1] || o.images[0]);
        if (cImgs[0] && u0) { cImgs[0].src = u0; cImgs[0].removeAttribute("srcset"); }
        if (cImgs[1] && u1) { cImgs[1].src = u1; cImgs[1].removeAttribute("srcset"); }
      }
    });

    var ph = handleOf(path, "products"), ch = handleOf(path, "collections"), gh = pageHandle(path);
    var o = ph ? (P && P[ph]) : ch ? (C[ch] || colsMap[ch]) : gh ? G[gh] : null;

    if (ph) {
      var isDel = LEGACY_PRODUCT_HANDLES[ph] ||
                  (cfg && Array.isArray(cfg.deletedProducts) && cfg.deletedProducts.indexOf(ph) !== -1) ||
                  (P && P[ph] && (P[ph].deleted || P[ph].status === "deleted" || P[ph].status === "draft" || P[ph].status === "archived"));
      if (isDel && !preview) {
        showUnavailable(tech.notFoundTitle || "PRODUCT UNAVAILABLE", tech.notFoundText || "This product is currently offline.");
        return;
      }
      var prod = getFullCatalog().find(function (x) { return x.handle === ph; }) || (P && P[ph]) || {};
      if (prod.title) {
        document.title = (prod.seoTitle || prod.title) + " – AnnR";
        meta("og:title", prod.title, "property");
        meta("twitter:title", prod.title, "name");
      }
      var t = document.querySelector(".product-info-title"); if (t && prod.title != null) t.textContent = prod.title;
      if (prod.price != null || prod.compareAt != null) setMoney(document.querySelector(".product-info-price"), prod.price, prod.compareAt);
      if (prod.description != null) {
        var descBox = document.querySelector(".product-info-details-header .product-info-detail-content-inner");
        if (descBox) descBox.innerHTML = "<h3 class='hide-mob'>DESCRIPTION</h3><div style='white-space:pre-wrap'>" + esc(prod.description) + "</div>";
      }
      // Universal Interactive Size Guide Popup (#sizes-popup) + Admin Panel Sync (Inches Default)
      (function setupUniversalSizeGuide(handle, productObj) {
        var DEFAULT_PRESETS = {
          tee: {
            unit: "in",
            fitType: "oversized fit",
            headers: ["SIZE", "CHEST", "LENGTH", "SLEEVE"],
            rows: [
              { size: "S", col1: "22.5", col2: "27.5", col3: "8.3" },
              { size: "M", col1: "23.6", col2: "28.3", col3: "8.7" },
              { size: "L", col1: "24.8", col2: "29.5", col3: "9.1" },
              { size: "XL", col1: "26.0", col2: "30.3", col3: "9.4" },
              { size: "XXL", col1: "27.2", col2: "31.1", col3: "9.8" }
            ],
            notes: "Measurements shown in inches (1″ = 2.54 cm). Heavyweight 280 GSM combed cotton, drop-shoulder silhouette."
          },
          hoodie: {
            unit: "in",
            fitType: "oversized fit",
            headers: ["SIZE", "CHEST", "LENGTH", "SLEEVE"],
            rows: [
              { size: "S", col1: "24.4", col2: "26.8", col3: "23.2" },
              { size: "M", col1: "25.6", col2: "28.0", col3: "24.0" },
              { size: "L", col1: "26.8", col2: "29.1", col3: "24.4" },
              { size: "XL", col1: "28.0", col2: "29.9", col3: "24.8" },
              { size: "XXL", col1: "29.1", col2: "31.1", col3: "25.2" }
            ],
            notes: "Measurements shown in inches (1″ = 2.54 cm). 480 GSM heavyweight French terry fleece, boxy drop-shoulder fit."
          },
          sweatshirt: {
            unit: "in",
            fitType: "relaxed fit",
            headers: ["SIZE", "CHEST", "LENGTH", "SLEEVE"],
            rows: [
              { size: "S", col1: "22.8", col2: "27.2", col3: "23.6" },
              { size: "M", col1: "24.0", col2: "28.3", col3: "24.4" },
              { size: "L", col1: "25.2", col2: "29.1", col3: "24.8" },
              { size: "XL", col1: "26.4", col2: "30.3", col3: "25.6" },
              { size: "XXL", col1: "27.6", col2: "31.1", col3: "26.0" }
            ],
            notes: "Measurements shown in inches (1″ = 2.54 cm). Relaxed silhouette with ribbed cuffs."
          },
          jacket: {
            unit: "in",
            fitType: "boxy fit",
            headers: ["SIZE", "CHEST", "LENGTH", "SLEEVE"],
            rows: [
              { size: "S", col1: "24.8", col2: "26.0", col3: "24.0" },
              { size: "M", col1: "26.0", col2: "26.8", col3: "24.4" },
              { size: "L", col1: "27.2", col2: "28.0", col3: "25.2" },
              { size: "XL", col1: "28.3", col2: "28.7", col3: "25.6" },
              { size: "XXL", col1: "29.5", col2: "29.5", col3: "26.4" }
            ],
            notes: "Measurements shown in inches (1″ = 2.54 cm). Cropped boxy outerwear cut."
          },
          trousers: {
            unit: "in",
            fitType: "relaxed fit",
            headers: ["SIZE", "WAIST", "LENGTH", "INSEAM"],
            rows: [
              { size: "S (30)", col1: "30.0", col2: "40.9", col3: "29.1" },
              { size: "M (32)", col1: "31.9", col2: "41.7", col3: "29.5" },
              { size: "L (34)", col1: "33.9", col2: "42.5", col3: "30.3" },
              { size: "XL (36)", col1: "35.8", col2: "43.3", col3: "30.7" },
              { size: "XXL (38)", col1: "37.8", col2: "44.1", col3: "31.1" }
            ],
            notes: "Measurements shown in inches (1″ = 2.54 cm). Wide-leg architectural cut; waist measured flat × 2."
          },
          shorts: {
            unit: "in",
            fitType: "relaxed fit",
            headers: ["SIZE", "WAIST", "LENGTH", "OPENING"],
            rows: [
              { size: "S", col1: "29.1", col2: "18.9", col3: "12.2" },
              { size: "M", col1: "31.1", col2: "19.7", col3: "12.6" },
              { size: "L", col1: "33.1", col2: "20.5", col3: "13.4" },
              { size: "XL", col1: "35.0", col2: "21.3", col3: "13.8" },
              { size: "XXL", col1: "37.0", col2: "22.0", col3: "14.2" }
            ],
            notes: "Measurements shown in inches (1″ = 2.54 cm). Elasticated drawstring waist with relaxed knee-length cut."
          }
        };

        var titleText = (productObj.title || (document.querySelector(".product-info-title") || {}).textContent || handle || "").toLowerCase();
        var combinedKey = (handle + " " + titleText + " " + (productObj.category || "")).toLowerCase();
        var isBottoms = /jean|pant|trouser|cargo|jogger|sweatpant|short/.test(combinedKey);
        var defaultPreset = /short/.test(combinedKey)
          ? DEFAULT_PRESETS.shorts
          : isBottoms
          ? DEFAULT_PRESETS.trousers
          : /jacket|coat|bomber|vest|workwear|windbreaker/.test(combinedKey)
          ? DEFAULT_PRESETS.jacket
          : /hoodie|zip|fleece/.test(combinedKey)
          ? DEFAULT_PRESETS.hoodie
          : /sweatshirt|sweater|knitwear|crewneck|thermal/.test(combinedKey)
          ? DEFAULT_PRESETS.sweatshirt
          : DEFAULT_PRESETS.tee;

        // Check if Admin Panel saved a custom sizeChart for this product
        var rawChart = productObj.sizeChart || (P && P[handle] && P[handle].sizeChart) || "";
        if (!rawChart) {
          try {
            var rawAdm = localStorage.getItem("shihiko-admin-v1");
            if (rawAdm) {
              var admParsed = JSON.parse(rawAdm);
              var foundP = (admParsed.products || []).find(function (x) { return x && x.handle === handle; });
              if (foundP && foundP.sizeChart) rawChart = foundP.sizeChart;
            }
          } catch (e) {}
        }

        var parsedCustom = null;
        var plainNotes = "";
        if (rawChart && String(rawChart).trim().charAt(0) === "{") {
          try {
            var obj = JSON.parse(rawChart);
            if (obj && Array.isArray(obj.rows) && obj.rows.length > 0) {
              parsedCustom = obj;
            }
          } catch (e) {}
        } else if (rawChart && String(rawChart).trim()) {
          plainNotes = String(rawChart).trim();
        }

        // Technical Garment Blueprint SVG (replaces broken external shihiko.com SVG URLs)
        var blueprintSvg = isBottoms
          ? "<svg viewBox='0 0 260 220' width='220' height='185' fill='none' xmlns='http://www.w3.org/2000/svg' style='display:block;margin:0 auto'>" +
              "<path d='M65 20 H195 L210 195 H152 L135 82 H125 L108 195 H50 L65 20 Z' stroke='#111' stroke-width='1.6' fill='rgba(0,0,0,0.02)'/>" +
              "<line x1='65' y1='34' x2='195' y2='34' stroke='#ff5a26' stroke-width='1.4' stroke-dasharray='4 3'/>" +
              "<line x1='40' y1='20' x2='40' y2='195' stroke='#111' stroke-width='1.2' stroke-dasharray='3 3'/>" +
              "<line x1='130' y1='82' x2='114' y2='195' stroke='#111' stroke-width='1.2' stroke-dasharray='3 3'/>" +
              "<rect x='114' y='24' width='32' height='16' fill='#111'/><text x='130' y='35' fill='#fff' font-family='monospace' font-size='9' text-anchor='middle'>[1]</text>" +
              "<rect x='24' y='100' width='32' height='16' fill='#111'/><text x='40' y='111' fill='#fff' font-family='monospace' font-size='9' text-anchor='middle'>[2]</text>" +
              "<rect x='118' y='135' width='32' height='16' fill='#111'/><text x='134' y='146' fill='#fff' font-family='monospace' font-size='9' text-anchor='middle'>[3]</text>" +
            "</svg>"
          : "<svg viewBox='0 0 280 220' width='240' height='185' fill='none' xmlns='http://www.w3.org/2000/svg' style='display:block;margin:0 auto'>" +
              "<path d='M95 22 C110 34 170 34 185 22 L248 62 L224 104 L192 84 V196 H88 V84 L56 104 L32 62 L95 22 Z' stroke='#111' stroke-width='1.6' fill='rgba(0,0,0,0.02)'/>" +
              "<line x1='88' y1='106' x2='192' y2='106' stroke='#ff5a26' stroke-width='1.5' stroke-dasharray='4 3'/>" +
              "<line x1='140' y1='28' x2='140' y2='196' stroke='#111' stroke-width='1.3' stroke-dasharray='3 3'/>" +
              "<line x1='188' y1='25' x2='244' y2='60' stroke='#111' stroke-width='1.3' stroke-dasharray='3 3'/>" +
              "<rect x='102' y='98' width='28' height='15' fill='#111'/><text x='116' y='109' fill='#fff' font-family='monospace' font-size='9' text-anchor='middle'>[1]</text>" +
              "<rect x='126' y='146' width='28' height='15' fill='#111'/><text x='140' y='157' fill='#fff' font-family='monospace' font-size='9' text-anchor='middle'>[2]</text>" +
              "<rect x='206' y='34' width='28' height='15' fill='#111'/><text x='220' y='45' fill='#fff' font-family='monospace' font-size='9' text-anchor='middle'>[3]</text>" +
            "</svg>";

        // 1. Ensure a "Size Guide" trigger button exists on every product page
        var triggerBtn = document.querySelector(".sizes-popup-trigger.js-sizes-trigger");
        if (!triggerBtn) {
          var sizeHeader = document.querySelector(".size-selector-header");
          if (sizeHeader) {
            triggerBtn = document.createElement("button");
            triggerBtn.type = "button";
            triggerBtn.className = "sizes-popup-trigger js-sizes-trigger";
            triggerBtn.textContent = "Size Guide";
            sizeHeader.appendChild(triggerBtn);
          } else {
            var formEl = document.querySelector(".product-info-form") || document.querySelector(".product-info-details");
            if (formEl && !document.querySelector(".js-sizes-trigger")) {
              var wrapDiv = document.createElement("div");
              wrapDiv.style.cssText = "margin:10px 0;display:flex;justify-content:flex-end";
              wrapDiv.innerHTML = "<button type='button' class='sizes-popup-trigger js-sizes-trigger' style='background:none;border:none;text-decoration:underline;font:11px/1 \"NB Architekt Std\",sans-serif;text-transform:uppercase;letter-spacing:1px;cursor:pointer;color:inherit'>Size Guide (IN)</button>";
              formEl.parentNode.insertBefore(wrapDiv, formEl);
            }
          }
        }

        // 2. Ensure .sizes-popup-overflow and #sizes-popup exist in the DOM
        var overflowEl = document.querySelector(".sizes-popup-overflow");
        if (!overflowEl) {
          overflowEl = document.createElement("div");
          overflowEl.className = "sizes-popup-overflow js-sizes-trigger";
          document.body.appendChild(overflowEl);
        }

        var popupEl = document.getElementById("sizes-popup");
        var buildTablesHtml = function (guide) {
          var hdrs = guide.headers || ["SIZE", "CHEST", "LENGTH", "SLEEVE"];
          var rows = guide.rows || defaultPreset.rows;
          var storedInCm = guide.unit === "cm";
          var toIn = function (val) {
            if (!storedInCm) return val;
            var n = parseFloat(String(val).replace(/[^0-9.]/g, ""));
            return isFinite(n) ? (Math.round((n / 2.54) * 10) / 10) : val;
          };
          var toCm = function (val) {
            if (storedInCm) return val;
            var n = parseFloat(String(val).replace(/[^0-9.]/g, ""));
            return isFinite(n) ? (Math.round((n * 2.54) * 10) / 10) : val;
          };
          var headRow = "<thead><tr><th>" + esc(hdrs[0]) + "</th><th>" + esc(hdrs[1]) + "<span>[1]</span></th><th>" + esc(hdrs[2]) + "<span>[2]</span></th><th>" + esc(hdrs[3]) + "<span>[3]</span></th></tr></thead>";
          var inBody = "<tbody>" + rows.map(function (r) {
            return "<tr><td>" + esc(r.size) + "</td><td>" + esc(toIn(r.col1)) + "″</td><td>" + esc(toIn(r.col2)) + "″</td><td>" + esc(toIn(r.col3)) + "″</td></tr>";
          }).join("") + "</tbody>";
          var cmBody = "<tbody>" + rows.map(function (r) {
            return "<tr><td>" + esc(r.size) + "</td><td>" + esc(toCm(r.col1)) + "</td><td>" + esc(toCm(r.col2)) + "</td><td>" + esc(toCm(r.col3)) + "</td></tr>";
          }).join("") + "</tbody>";

          return "<div class='sizes-popup-table' data-size-unit='in'><table>" + headRow + inBody + "</table></div>" +
                 "<div class='sizes-popup-table hide' data-size-unit='cm'><table>" + headRow + cmBody + "</table></div>" +
                 (guide.notes ? "<div class='adm-size-notes' style='margin-top:14px;padding:10px 12px;background:rgba(0,0,0,0.04);border-left:2px solid #111;font:11px/1.5 \"NB Architekt Std\",sans-serif;text-transform:uppercase;letter-spacing:0.5px;color:#222'>" + esc(guide.notes) + "</div>" : "");
        };

        var applyPopupUnit = function (pop, unit) {
          if (!pop) return;
          pop.querySelectorAll("table.sizes-popup-table-cm").forEach(function (tbl) {
            tbl.style.display = unit === "cm" ? "table" : "none";
          });
          pop.querySelectorAll("table.sizes-popup-table-in").forEach(function (tbl) {
            tbl.style.display = unit === "in" ? "table" : "none";
          });
          pop.querySelectorAll(".sizes-popup-table[data-size-unit]").forEach(function (tbl) {
            var dataU = tbl.getAttribute("data-size-unit");
            if (dataU) tbl.classList.toggle("hide", dataU !== unit);
          });
        };

        if (!popupEl) {
          var activeGuide = parsedCustom || defaultPreset;
          if (plainNotes && !parsedCustom) activeGuide = Object.assign({}, defaultPreset, { notes: plainNotes });
          popupEl = document.createElement("div");
          popupEl.id = "sizes-popup";
          popupEl.className = "sizes-popup";
          popupEl.innerHTML =
            "<div class='sizes-popup-inner'>" +
              "<div class='sizes-popup-header'>" +
                "<div class='sizes-popup-title'>Size Chart</div>" +
                "<button type='button' class='sizes-popup-close js-sizes-trigger' aria-label='Close Size Guide'>" +
                  "<span class='icon icon-close'>✕</span>" +
                "</button>" +
              "</div>" +
              "<div class='sizes-popup-image'>" +
                blueprintSvg +
                "<div class='sizes-popup-badge'>" + esc(activeGuide.fitType || "oversized fit") + "</div>" +
              "</div>" +
              "<div class='sizes-popup-Content'>" +
                "<div class='sizes-popup-Content-header'>" +
                  "<div class='sizes-popup-Content-title'>Select unit</div>" +
                  "<div class='sizes-popup-switcher'>" +
                    "<input type='radio' name='unit' value='in' id='unit-in' checked class='js-size-switcher'>" +
                    "<label for='unit-in' class='sizes-popup-switcher-label'>IN</label>" +
                    "<input type='radio' name='unit' value='cm' id='unit-cm' class='js-size-switcher'>" +
                    "<label for='unit-cm' class='sizes-popup-switcher-label'>CM</label>" +
                  "</div>" +
                "</div>" +
                "<div class='adm-sizes-tables-wrap'>" + buildTablesHtml(activeGuide) + "</div>" +
              "</div>" +
            "</div>";
          document.body.appendChild(popupEl);
        } else {
          // Popup already exists in static HTML: default unit switcher to Inches ("in")
          var unitCheckbox = popupEl.querySelector("input[type='checkbox'].js-size-switcher");
          var unitInRadio = popupEl.querySelector("#unit-in, input[type='radio'].js-size-switcher[value='in']");
          var unitCmRadio = popupEl.querySelector("#unit-cm, input[type='radio'].js-size-switcher[value='cm']");
          if (!popupEl.dataset.annrUnitInit) {
            popupEl.dataset.annrUnitInit = "1";
            if (unitCheckbox) unitCheckbox.checked = true;
            if (unitInRadio) unitInRadio.checked = true;
            if (unitCmRadio) unitCmRadio.checked = false;
            applyPopupUnit(popupEl, "in");
          }

          var imgContainer = popupEl.querySelector(".sizes-popup-image");
          if (imgContainer) {
            var extImg = imgContainer.querySelector("img[src*='shihiko.com']");
            if (extImg) {
              var badgeEl = imgContainer.querySelector(".sizes-popup-badge");
              var badgeText = (parsedCustom && parsedCustom.fitType) || (badgeEl ? badgeEl.textContent : (defaultPreset.fitType || "oversized fit"));
              imgContainer.innerHTML = blueprintSvg + "<div class='sizes-popup-badge'>" + esc(badgeText) + "</div>";
            } else if (parsedCustom && parsedCustom.fitType) {
              var bEl = imgContainer.querySelector(".sizes-popup-badge");
              if (bEl) bEl.textContent = parsedCustom.fitType;
            }
          }

          if (parsedCustom) {
            var contentBox = popupEl.querySelector(".sizes-popup-Content");
            if (contentBox) {
              contentBox.querySelectorAll(".sizes-popup-table, .adm-size-notes").forEach(function (el) { el.remove(); });
              var tempDiv = document.createElement("div");
              tempDiv.innerHTML = buildTablesHtml(parsedCustom);
              while (tempDiv.firstChild) {
                contentBox.appendChild(tempDiv.firstChild);
              }
              var checkedUnit = popupEl.querySelector(".js-size-switcher:checked");
              applyPopupUnit(popupEl, checkedUnit ? checkedUnit.value : "in");
            }
          } else if (plainNotes) {
            var cBox = popupEl.querySelector(".sizes-popup-Content");
            if (cBox && !cBox.querySelector(".adm-size-notes")) {
              var nDiv = document.createElement("div");
              nDiv.className = "adm-size-notes";
              nDiv.style.cssText = "margin-top:14px;padding:10px 12px;background:rgba(0,0,0,0.04);border-left:2px solid #111;font:11px/1.5 'NB Architekt Std',sans-serif;text-transform:uppercase;letter-spacing:0.5px;color:#222";
              nDiv.textContent = plainNotes;
              cBox.appendChild(nDiv);
            }
          }
        }

        // 3. Bind rock-solid delegated event listeners for .js-sizes-trigger & .js-size-switcher (runs once per document)
        if (!window.__annrSizeGuideBound) {
          window.__annrSizeGuideBound = true;
          document.addEventListener("click", function (ev) {
            var trig = ev.target && ev.target.closest && ev.target.closest(".js-sizes-trigger");
            if (!trig) return;
            ev.preventDefault();
            ev.stopImmediatePropagation();
            var pop = document.getElementById("sizes-popup");
            var ov = document.querySelector(".sizes-popup-overflow");
            if (!pop) return;
            var isOpen = pop.classList.contains("active");
            pop.classList.toggle("active", !isOpen);
            if (ov) ov.classList.toggle("active", !isOpen);
            document.body.classList.toggle("overflow", !isOpen);
          }, true);

          document.addEventListener("change", function (ev) {
            var sw = ev.target && ev.target.closest && ev.target.closest(".js-size-switcher");
            if (!sw) return;
            ev.stopImmediatePropagation();
            var unit = sw.type === "checkbox" ? (sw.checked ? "in" : "cm") : (sw.value === "cm" || sw.id === "unit-cm" ? "cm" : "in");
            var pop = document.getElementById("sizes-popup");
            if (!pop) return;
            applyPopupUnit(pop, unit);
          }, true);
        }
      })(ph, prod);
      var prodImgs = prod.images || (prod.image ? [prod.image] : []);
      if (prodImgs && prodImgs.length) {
        var validImgs = prodImgs.map(safeImg).filter(Boolean);
        if (validImgs.length) {
          document.querySelectorAll(".product-gallery-carousel .swiper-slide img").forEach(function (img, idx) {
            var u = validImgs[idx % validImgs.length]; img.src = u; img.removeAttribute("srcset");
          });
          document.querySelectorAll(".product-gallery-thumb-carousel .swiper-slide img").forEach(function (img, idx) {
            var u = validImgs[idx % validImgs.length]; img.src = u; img.removeAttribute("srcset");
          });
        }
      }
      if (prod.isOneOfOne === false && Array.isArray(prod.variants) && prod.variants.length) {
        var sizeContainer = document.querySelector(".size-selector-sizes");
        var headerSize = document.querySelector(".js-size-selector-header-size");
        if (sizeContainer) {
          sizeContainer.innerHTML = prod.variants.map(function (v, idx) {
            var opt = esc(v.option || "One Size");
            var vid = "adm-var-" + idx;
            var chk = idx === 0 ? " checked" : "";
            return "<label for='" + vid + "' class='size-selector-button" + (idx === 0 ? " active" : "") + "'>" + opt + "</label>" +
                   "<input type='radio' name='id' id='" + vid + "' value='" + esc(v.id || idx) + "'" + chk + " style='display:none' data-option='" + opt + "'>";
          }).join("\n");
          if (headerSize && prod.variants[0]) headerSize.textContent = prod.variants[0].option || "One Size";
          sizeContainer.querySelectorAll("input[type=radio]").forEach(function (r) {
            r.addEventListener("change", function () {
              if (headerSize) headerSize.textContent = this.getAttribute("data-option") || "";
              sizeContainer.querySelectorAll(".size-selector-button").forEach(function (btn) { btn.classList.remove("active"); });
              var l = sizeContainer.querySelector("label[for='" + this.id + "']");
              if (l) l.classList.add("active");
            });
          });
        }
      }
      if (prod.trackStock !== false && !prod.allowBackorder) {
        var totalStock = Array.isArray(prod.variants)
          ? prod.variants.reduce(function (n, v) { return n + (Number(v && v.stock) || 0); }, 0)
          : (Number(prod.stock) || 0);
        if (totalStock <= 0 || prod.status === "sold") {
          var subBtn = document.querySelector(".product-info-submit button[type=submit]");
          if (subBtn) { subBtn.disabled = true; var sbt = subBtn.querySelector(".text") || subBtn; sbt.textContent = "SOLD OUT"; }
        }
      }
    }

    if (ch) {
      var isColDel = (cfg && Array.isArray(cfg.deletedCollections) && cfg.deletedCollections.indexOf(ch) !== -1) ||
                     (C && C[ch] && (C[ch].deleted || C[ch].visible === false)) ||
                     (colsMap[ch] && colsMap[ch].visible === false);
      if (isColDel && !preview) {
        showUnavailable(tech.notFoundTitle || "COLLECTION UNAVAILABLE", tech.notFoundText || "This collection is currently offline.");
        return;
      }
      var colTitle = document.querySelector(".collection-title"); if (colTitle && o && o.title != null) colTitle.textContent = o.title;
      if (o && o.description != null && o.description !== "") {
        var tbLeft = document.querySelector(".collection-display-toolbar__left");
        if (tbLeft && !tbLeft.querySelector(".adm-col-desc")) {
          var cd = document.createElement("div"); cd.className = "adm-col-desc";
          cd.style.cssText = "font:11px/1.5 'NB Architekt Std',sans-serif;margin-top:6px;opacity:.8;max-width:640px";
          cd.textContent = o.description; tbLeft.appendChild(cd);
        }
      }
      var cHero = document.querySelector('[id$="__collection_hero"]');
      if (cHero) {
        cHero.querySelectorAll("img").forEach(function (im) {
          if (isLegacyShihikoAsset(im.getAttribute("src") || im.getAttribute("data-src") || "")) im.remove();
        });
        var cleanHeroUrl = o && o.image ? safeImg(o.image) : "";
        if (cleanHeroUrl && !cHero.querySelector(".adm-col-hero")) {
          cHero.innerHTML = "<img class='adm-col-hero' src='" + esc(cleanHeroUrl) + "' alt='" + esc(o.title || "") + "' style='width:100%;max-height:360px;object-fit:cover;display:block'>";
        }
      }
      var grid = document.querySelector(".collection-product-grid");
      if (grid && !window.__annrUniqueCatalogOwnsGrid) {
        // Collect existing product handles in the grid
        var existingInGrid = {};
        grid.querySelectorAll(".product-card").forEach(function (card) {
          var link = card.querySelector("a.product-card-title");
          var h = link && handleOf(link.getAttribute("href"), "products");
          if (h) {
            existingInGrid[h] = true;
            var isProductDeleted = LEGACY_PRODUCT_HANDLES[h] ||
                                   (cfg && Array.isArray(cfg.deletedProducts) && cfg.deletedProducts.indexOf(h) !== -1) ||
                                   (P && P[h] && (P[h].deleted || (P[h].status && !isPublicStatus(P[h].status))));
            if (isProductDeleted) card.style.setProperty("display", "none", "important");
          }
        });

        // Hide products manually removed by admin collection.products
        if (o && Array.isArray(o.products) && o.products.length) {
          var allowed = {}; o.products.forEach(function (h) { allowed[h] = true; });
          grid.querySelectorAll(".product-card").forEach(function (card) {
            var link = card.querySelector("a.product-card-title");
            var h = link && handleOf(link.getAttribute("href"), "products");
            if (h && !allowed[h]) card.style.setProperty("display", "none", "important");
          });
        }

        // Dynamically append any public product belonging to this collection that isn't in DOM
        var allProds = getFullCatalog();
        allProds.forEach(function (p) {
          if (!p || !p.handle || existingInGrid[p.handle]) return;
          if (!isPublicStatus(p.status)) return;
          var inCol = ch === "all" || ch === "unique-campaign" ||
                      p.category === ch || p.categorySlug === ch ||
                      (Array.isArray(p.collections) && p.collections.indexOf(ch) !== -1) ||
                      (o && Array.isArray(o.products) && o.products.indexOf(p.handle) !== -1);
          if (inCol) {
            var temp = document.createElement("div");
            temp.innerHTML = renderProductCardHtml(p, P && P[p.handle]);
            if (temp.firstElementChild) {
              grid.appendChild(temp.firstElementChild);
              existingInGrid[p.handle] = true;
            }
          }
        });

        // Sorting
        if (o && o.sort && o.sort !== "manual") {
          var cards = Array.prototype.slice.call(grid.querySelectorAll(".product-card"));
          var priceVal = function (c) { var t = (c.querySelector(".product-card-price") || {}).textContent || ""; return parseFloat(t.replace(/[^0-9.]/g, "")) || 0; };
          var titleVal = function (c) { return ((c.querySelector(".product-card-title") || {}).textContent || "").trim().toLowerCase(); };
          if (o.sort === "price low-high") cards.sort(function (a, b) { return priceVal(a) - priceVal(b); });
          else if (o.sort === "price high-low") cards.sort(function (a, b) { return priceVal(b) - priceVal(a); });
          else if (o.sort === "a-z") cards.sort(function (a, b) { return titleVal(a) < titleVal(b) ? -1 : titleVal(a) > titleVal(b) ? 1 : 0; });
          cards.forEach(function (c) { grid.appendChild(c); });
        }
      }
    }
    if (gh && o) {
      var pageTitleEl = document.querySelector(".js-textContent-section h1, .shopify-policy__title h1");
      if (pageTitleEl && o.title != null) pageTitleEl.textContent = o.title;
      if (o.body != null) {
        var body = document.querySelector(".js-textContent-section, .shopify-policy__body, [id$='__template-faq'] .container");
        if (body) {
          var hText = (o.title != null ? o.title : (pageTitleEl && pageTitleEl.textContent) || "").trim();
          body.innerHTML = (hText && !document.querySelector(".shopify-policy__title") ? "<h1>" + esc(hText) + "</h1>" : "") + "<div style='padding:16px 0 40px;white-space:pre-wrap'>" + esc(o.body) + "</div>";
        }
      }
    }

    // SEO
    if (o && o.seoTitle != null) document.title = o.seoTitle;
    else if (tpl === "home" && seo.homeTitle) document.title = seo.homeTitle;
    if (seo.titlePattern && seo.titlePattern.indexOf("{title}") >= 0 && tpl !== "home") document.title = seo.titlePattern.replace("{title}", document.title.split("|")[0].trim()).replace("{site}", gen.siteName || "");
    if (o && o.seoDescription != null) { meta("description", o.seoDescription); meta("og:description", o.seoDescription, "property"); }
    else if (seo.defaultDescription && !document.querySelector('meta[name="description"]')) meta("description", seo.defaultDescription);
    if (o && o.seoTitle != null) meta("og:title", o.seoTitle, "property");
    if (safeImg(seo.ogImage)) meta("og:image", safeImg(seo.ogImage), "property");
    if (seo.noindex) meta("robots", "noindex");
    if (diff("seo", "canonicalBase") && /^https?:\/\//i.test(safeUrl(seo.canonicalBase))) {
      var canLink = document.querySelector("link[rel='canonical']");
      if (canLink) canLink.href = safeUrl(seo.canonicalBase).replace(/\/$/, "") + path;
    }
    var favUrl = (gen.favicon && safeImg(gen.favicon)) || "/favicon.svg";
    var favs = document.querySelectorAll("link[rel~='icon']");
    if (favs.length) { favs.forEach(function (f) { f.href = favUrl; }); }
    else { var nl = document.createElement("link"); nl.rel = "icon"; nl.href = favUrl; document.head.appendChild(nl); }

    // Header
    if (changed("header")) {
      var h = S.header, menu = document.querySelector(".header-new__desktop-bar .header-menu");
      if (menu) {
        var orig = {};
        menu.querySelectorAll(":scope > .header-menu-item").forEach(function (el) { orig[el.getAttribute("data-header-menu-index")] = el; });
        var tmpl = orig["0"];
        var items = (h.items || []).slice();
        (S.customPages || []).forEach(function (cp) { if (cp.status === "published" && cp.showInNav) items.push({ label: cp.title, url: "/p/" + cp.slug, visible: true, original: null, device: "all" }); });
        items.forEach(function (it) {
          var el = it.original != null ? orig[String(it.original)] : null;
          if (it.original != null) delete orig[String(it.original)];
          if (!el && tmpl) { el = tmpl.cloneNode(true); el.removeAttribute("data-header-menu-index"); }
          if (!el) return;
          var lab = el.querySelector(".header-menu-item-label > span"); if (lab) lab.textContent = it.label;
          var a = el.querySelector("a.header-menu-item-label"); if (a && it.url) { a.setAttribute("href", safeUrl(it.url)); if (it.newTab) { a.target = "_blank"; a.rel = "noopener noreferrer"; } }
          el.style.display = it.visible ? "" : "none";
          if (it.device !== "all") el.classList.add("adm-only-" + it.device);
          menu.appendChild(el);
        });
        Object.keys(orig).forEach(function (k) { orig[k].style.display = "none"; });
        css("@media(max-width:767px){.adm-only-desktop{display:none!important}}@media(min-width:768px){.adm-only-mobile{display:none!important}}");
      }
      if (!h.showVip) css(".header-new__account-button,.js-vip-page-link{display:none!important}");
      if (!h.showCart) css(".header-cart-button{display:none!important}");
      if (h.sticky === false) css(".header{position:relative!important}");
      if (h.ctaLabel && menu) { var cta = document.createElement("a"); cta.href = safeUrl(h.ctaUrl); cta.textContent = h.ctaLabel; cta.className = "header-new__nav-link"; cta.style.cssText = "border:1px solid currentColor;padding:4px 10px;margin-left:12px"; menu.appendChild(cta); }
    }
    if (gen.logoUrl && safeImg(gen.logoUrl)) document.querySelectorAll(".header-logo").forEach(function (l) { l.innerHTML = "<img src='" + esc(safeImg(gen.logoUrl)) + "' alt='" + esc(gen.logoAlt) + "' style='max-height:40px'>"; });
    if (gen.secondaryLogo && safeImg(gen.secondaryLogo)) document.querySelectorAll(".footer-logo,.header-logo--mobile").forEach(function (l) { l.innerHTML = "<img src='" + esc(safeImg(gen.secondaryLogo)) + "' alt='" + esc(gen.logoAlt) + "' style='max-height:40px'>"; });

    // Footer
    if (changed("footer")) {
      var f = S.footer, colEl = document.querySelector(".footer-column.menu-column");
      if (colEl) colEl.innerHTML = (f.columns || []).filter(function (c) { return c.visible; }).map(function (c) {
        return "<div class='footer-menu'><div class='footer-menu-title'>" + esc(c.title) + "</div><ul class='footer-menu-list'>" +
          c.links.filter(function (l) { return l.visible; }).map(function (l) { return "<li class='footer-menu-list-item'><a href='" + esc(safeUrl(l.url)) + "'" + (l.newTab ? " target='_blank' rel='noopener noreferrer'" : "") + ">" + esc(l.label) + "</a></li>"; }).join("") + "</ul></div>";
      }).join("");
      if (!f.showSubscribe) css(".footer-subscribe-title,.footer-subscribe-form{display:none!important}");
      if (!f.showEmail) css(".footer-email{display:none!important}");
      if (!f.showPayments) css(".footer-payments{display:none!important}");
    }
    if (changed("social")) {
      var soc = S.social || {};
      var mapSoc = { instagram: "instagram.com", facebook: "facebook.com", tiktok: "tiktok.com", discord: "discord.", youtube: "youtube.com", x: "x.com" };
      Object.keys(mapSoc).forEach(function (k) {
        if (!soc[k] || !diff("social", k)) return;
        document.querySelectorAll("footer.footer a[href*='" + mapSoc[k] + "']").forEach(function (a) { a.href = safeUrl(soc[k]); });
      });
    }
    if (diff("general", "contactEmail")) document.querySelectorAll(".footer-email-link").forEach(function (a) { a.textContent = gen.contactEmail; a.href = "mailto:" + gen.contactEmail; });
    if (diff("general", "contactLabel")) document.querySelectorAll(".footer-email-label").forEach(function (a) { a.textContent = gen.contactLabel; });
    if (diff("general", "copyright")) { var cp = document.querySelector(".footer-copyright"); if (cp) cp.textContent = gen.copyright; }

    // Forms (newsletter, search, VIP login, VIP register)
    (S.forms || []).forEach(function (fm, i) {
      var od = (D.forms || [])[i] || {};
      if (fm.id === "newsletter") {
        if (fm.title !== od.title) document.querySelectorAll(".footer-subscribe-title").forEach(function (e) { e.textContent = fm.title; });
        if (fm.button !== od.button) document.querySelectorAll(".footer-subscribe-button .text").forEach(function (e) { e.textContent = fm.button; });
        var fld = fm.fields[0], ofl = (od.fields || [])[0] || {};
        if (fld && fld.placeholder !== ofl.placeholder) document.querySelectorAll(".footer-subscribe-form input[type=email]").forEach(function (e) { e.placeholder = fld.placeholder; });
        if (fm.consent) document.querySelectorAll(".footer-subscribe-form").forEach(function (e) { if (!e.querySelector(".adm-consent")) { var p = document.createElement("p"); p.className = "adm-consent"; p.style.cssText = "font-size:9px;opacity:.6;margin-top:8px"; p.textContent = fm.consent; e.appendChild(p); } });
      }
      if (fm.id === "search") { var sf = fm.fields[0], so = (od.fields || [])[0] || {}; if (sf && sf.placeholder !== so.placeholder) document.querySelectorAll("input[name=q]").forEach(function (e) { e.placeholder = sf.placeholder; }); }
      if ((fm.id === "vip-login" && /\/account\/login/.test(path)) || (fm.id === "vip-register" && /\/account\/register/.test(path))) {
        if (fm.title && fm.title !== od.title) document.querySelectorAll(".vip-form__info").forEach(function (e) { e.textContent = fm.title; });
        if (fm.button && fm.button !== od.button) document.querySelectorAll("#customer_login button[type=submit] .text, #create_customer button[type=submit] .text").forEach(function (e) { e.textContent = fm.button; });
        (fm.fields || []).forEach(function (vf) {
          if (vf.key === "email" && vf.placeholder) { var em = document.getElementById("CustomerEmailLogin"); if (em) em.placeholder = vf.placeholder; }
          if (vf.key === "password" && vf.placeholder) { var pw = document.getElementById("CustomerPasswordLogin"); if (pw) pw.placeholder = vf.placeholder; }
        });
        if (fm.consent) document.querySelectorAll("#customer_login, #create_customer").forEach(function (e) { if (!e.querySelector(".adm-consent")) { var p = document.createElement("p"); p.className = "adm-consent"; p.style.cssText = "font-size:10px;opacity:.7;margin-top:10px"; p.textContent = fm.consent; e.appendChild(p); } });
      }
    });

    // Text and image replacements
    var rules = (S.texts || []).filter(function (r) { return r.enabled && r.find && inScope(r.scope); });
    if (rules.length) {
      var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), n;
      while ((n = w.nextNode())) {
        if (n.parentNode && /SCRIPT|STYLE/.test(n.parentNode.nodeName)) continue;
        var v = n.nodeValue, nv = v;
        rules.forEach(function (r) { nv = nv.split(r.find).join(r.replace); });
        if (nv !== v) n.nodeValue = nv;
      }
    }
    (S.images || []).filter(function (r) { return r.enabled && r.from && r.to && inScope(r.scope); }).forEach(function (r) {
      document.querySelectorAll("img, source, video").forEach(function (el) {
        ["src", "srcset", "data-src", "data-srcset", "poster"].forEach(function (at) {
          var v = el.getAttribute(at); if (v && v.indexOf(r.from) >= 0) el.setAttribute(at, at.indexOf("srcset") >= 0 ? r.to : v.split(r.from).join(r.to));
        });
        if (el.tagName === "IMG" && (el.getAttribute("src") || "").indexOf(r.to) >= 0) { if (r.alt) el.alt = r.alt; if (r.position) el.style.objectPosition = "center " + r.position; }
      });
    });

    // Copied and admin-added sections
    var secs = S.sections && S.sections[tpl], dsecs = D.sections && D.sections[tpl];
    (secs || []).forEach(function (s) {
      if ((!s.copyOf && !s.added) || document.querySelector('[id$="__' + s.key + '"]')) return;
      var anchor = document.querySelector('[id^="shopify-section-"][id$="__main-footer"]') || document.querySelector("footer.footer");
      var el;
      if (s.copyOf) {
        var src = document.querySelector('[id^="shopify-section-"][id$="__' + s.copyOf + '"]'); if (!src) return;
        el = src.cloneNode(true);
      } else {
        var a = s.added; el = document.createElement("section");
        var img = (a.kind === "image" || a.kind === "gift_banner") && a.image ? "<img src='" + esc(safeUrl(a.image)) + "' alt='" + esc(a.alt || a.heading || "") + "' style='width:100%;max-height:480px;object-fit:cover;display:block;margin-bottom:20px'>" : "";
        var btn = a.button ? "<a href='" + esc(safeUrl(a.url || "/collections/all/index.html")) + "' style='display:inline-block;margin-top:16px;background:#000;color:#fff;padding:12px 24px;text-decoration:none;text-transform:uppercase;font:11px/1 \"NB Architekt Std\",sans-serif;letter-spacing:1px;font-weight:700'>" + esc(a.button) + "</a>" : "";
        var extraHtml = "";
        if (a.kind === "countdown") {
          extraHtml = "<div data-countdown-end='" + esc(a.endDate || "") + "' style='margin:16px 0'><div class='adm-countdown-digits' style='font-family:\"Druk Wide\",sans-serif;font-size:26px;letter-spacing:2px;color:currentColor;margin:12px 0'>00D : 00H : 00M : 00S</div></div>";
        } else if (a.kind === "products") {
          var prods = getFullCatalog().filter(function(p) { return !a.collection || a.collection === "all" || (p.collections && p.collections.indexOf(a.collection) >= 0); }).slice(0, Number(a.limit) || 4);
          extraHtml = "<div class='collection-product-grid' style='display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:20px;margin-top:24px'>" + prods.map(function(p) { return renderProductCardHtml(p, P && P[p.handle]); }).join("") + "</div>";
        }
        el.innerHTML = "<div style='padding:48px 20px;max-width:1440px;margin:0 auto'>" + img + (a.heading ? "<h2 style='font-family:\"Druk Wide\",sans-serif;text-transform:uppercase;font-size:24px;margin:0 0 12px'>" + esc(a.heading) + "</h2>" : "") + (a.text ? "<p style='font-family:\'NB Architekt Std\',sans-serif;font-size:12px;line-height:1.6;white-space:pre-line;margin:0'>" + esc(a.text) + "</p>" : "") + extraHtml + btn + "</div>";
      }
      el.id = "shopify-section-adm__" + s.key;
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(el, anchor); else document.body.appendChild(el);
    });

    // Realtime countdown clock ticker
    document.querySelectorAll("[data-countdown-end]").forEach(function (el) {
      if (el.__annrTimer) return;
      var endStr = el.getAttribute("data-countdown-end");
      if (!endStr) return;
      var target = new Date(endStr).getTime();
      if (isNaN(target)) return;
      function tick() {
        var diff = Math.max(0, target - Date.now());
        var d = Math.floor(diff / 86400000);
        var h = Math.floor((diff % 86400000) / 3600000);
        var m = Math.floor((diff % 3600000) / 60000);
        var s = Math.floor((diff % 60000) / 1000);
        var pad = function (n) { return (n < 10 ? "0" : "") + n; };
        var disp = el.querySelector(".adm-countdown-digits");
        if (disp) {
          disp.textContent = pad(d) + "D : " + pad(h) + "H : " + pad(m) + "M : " + pad(s) + "S";
        }
        if (diff <= 0 && el.__annrTimer) clearInterval(el.__annrTimer);
      }
      tick();
      el.__annrTimer = setInterval(tick, 1000);
    });
    // Section order
    if (secs && dsecs && J(secs.map(function (s) { return s.key; })) !== J(dsecs.map(function (s) { return s.key; }))) {
      var els = secs.map(function (s) { return document.querySelector('[id^="shopify-section-"][id$="__' + s.key + '"]'); }).filter(Boolean);
      var parent = els.length > 2 && els[1].parentNode;
      if (parent) els.forEach(function (e) { if (e.parentNode === parent) parent.appendChild(e); });
      var footer = document.querySelector("footer.footer"); if (footer && parent && footer.parentNode === parent) parent.appendChild(footer);
    }

    // Global messages
    var an = S.announcement || {};
    if (an.on && an.text && !document.getElementById("adm-announce")) {
      var bar = document.createElement(an.url ? "a" : "div"); bar.id = "adm-announce"; bar.textContent = an.text;
      if (an.url) bar.href = safeUrl(an.url);
      bar.style.cssText = "display:block;text-decoration:none;background:" + (cv(an.background) || "#000") + ";color:" + (cv(an.color) || "#fff") + ";text-align:center;font:10px/1 'NB Architekt Std',sans-serif;letter-spacing:1px;text-transform:uppercase;padding:11px 12px;position:fixed;top:0;left:0;right:0;z-index:10001";
      css("body{padding-top:32px!important}[id$='__main-header'],.header{top:32px!important}");
      if (an.device !== "all") bar.className = "adm-only-" + an.device;
      document.body.insertBefore(bar, document.body.firstChild);
    }
    var pu = S.popup || {};
    if (pu.on && pu.title && !(pu.showOnce && localStorage.getItem("shihiko-popup-seen"))) setTimeout(function () {
      var box = overlay("adm-popup", "<div style='background:#fff;color:#000;max-width:380px;padding:28px;border:1px solid #000;font:12px/1.5 \"NB Architekt Std\",sans-serif;text-transform:none'><div style='font:18px \"Druk Wide\",sans-serif;text-transform:uppercase;margin-bottom:10px'>" + esc(pu.title) + "</div><p>" + esc(pu.text) + "</p>" + (pu.button ? "<a href='" + esc(safeUrl(pu.url)) + "' style='display:inline-block;margin-top:12px;background:#000;color:#fff;padding:10px 16px;text-decoration:none;text-transform:uppercase'>" + esc(pu.button) + "</a>" : "") + "<button type='button' data-close style='display:block;margin-top:14px;background:none;border:0;text-decoration:underline;cursor:pointer'>Close</button></div>",
        "position:fixed;inset:0;z-index:99990;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center");
      if (box) box.addEventListener("click", function (e) { if (e.target === box || e.target.hasAttribute("data-close")) { box.remove(); localStorage.setItem("shihiko-popup-seen", "1"); } });
    }, (Number(pu.delaySec) || 0) * 1000);
    var ck = S.cookie || {};
    if (ck.on && !localStorage.getItem("shihiko-cookie-ok")) {
      var cb = overlay("adm-cookie", esc(ck.text) + (ck.policyUrl ? " <a href='" + esc(safeUrl(ck.policyUrl)) + "' style='color:#fff'>Policy</a>" : "") + " <button type='button' style='margin-left:10px;background:#fff;color:#000;border:0;padding:6px 12px;cursor:pointer'>" + esc(ck.button || "OK") + "</button>",
        "position:fixed;left:16px;right:16px;bottom:16px;z-index:99980;background:#000;color:#fff;padding:14px;font:11px 'NB Architekt Std',sans-serif;text-align:center");
      if (cb) cb.querySelector("button").onclick = function () { localStorage.setItem("shihiko-cookie-ok", "1"); cb.remove(); };
    }

    // Gift Campaigns & Events Engine (Pure Authentic Streetwear Presentation · Non-Interruptive)
    (function applyCampaignsAndEvents() {
      // 1. Permanently remove all intrusive bars, covering tickers, header links, and floating pills
      var toRemove = [
        "adm-event-topbar",
        "adm-event-ticker",
        "adm-floating-gift-pill",
        "adm-header-event-link",
        "adm-mobile-event-link",
        "adm-pdp-gift-perk"
      ];
      toRemove.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.remove();
      });

      // Also clean up any lingering links or bars in the DOM
      document.querySelectorAll("#adm-event-topbar, #adm-event-ticker, #adm-floating-gift-pill, #adm-header-event-link, #adm-mobile-event-link").forEach(function(el) {
        el.remove();
      });

      var events = S.events || [];
      var now = new Date().toISOString().slice(0, 10);
      var activeEvent = events.find(function (ev) {
        if (!ev || ev.status === "paused") return false;
        if (ev.status === "active") return true;
        if (ev.status === "scheduled") {
          return (!ev.startsAt || ev.startsAt <= now) && (!ev.endsAt || ev.endsAt >= now);
        }
        return false;
      });

      // Sanitize stored event flags so legacy localStorage never re-enables intrusive header bars
      if (cfg && cfg.site && Array.isArray(cfg.site.events)) {
        var changed = false;
        cfg.site.events.forEach(function(ev) {
          if (ev.showTopBar || ev.showTicker || ev.showFloatingGiftPill) {
            ev.showTopBar = false;
            ev.showTicker = false;
            ev.showFloatingGiftPill = false;
            changed = true;
          }
        });
        if (changed) {
          try { localStorage.setItem(preview ? "shihiko-site-draft" : "shihiko-site-config", JSON.stringify(cfg)); } catch(e) {}
        }
      }

      if (!activeEvent) return;

      // Ensure activeEvent runtime flags are strictly clean
      activeEvent.showTopBar = false;
      activeEvent.showTicker = false;
      activeEvent.showFloatingGiftPill = false;

      // 2. Non-Interruptive Style & Position: Cart Drawer Reward Perk (Appears exclusively inside the customer bag)
      if (activeEvent.showCartReward !== false) {
        var injectCartPerk = function() {
          var cartPopup = document.getElementById("cart-popup");
          if (!cartPopup) return;
          if (document.getElementById("adm-cart-gift-perk")) return;

          var perkEl = document.createElement("div");
          perkEl.id = "adm-cart-gift-perk";
          perkEl.style.cssText = "background:#0a0a0a;color:#ffffff;border:1px solid #222222;border-radius:4px;padding:12px 14px;margin:12px 16px;font:11px/1.4 'NB Architekt Std',sans-serif;letter-spacing:0.5px;display:flex;align-items:center;gap:10px;cursor:pointer";
          perkEl.onclick = function() { openGiftModal(activeEvent); };

          var iconSvg = "<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' style='opacity:0.9;flex-shrink:0'><polyline points='20 12 20 22 4 22 4 12'></polyline><rect x='2' y='7' width='20' height='5'></rect><line x1='12' y1='22' x2='12' y2='7'></line><path d='M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z'></path><path d='M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z'></path></svg>";
          var giftLabel = activeEvent.giftItem ? "COMPLIMENTARY " + esc(activeEvent.giftItem.toUpperCase()) : "COMPLIMENTARY GIFT DROP";
          var spendCond = Number(activeEvent.minSpend) > 0 ? "Qualified on orders over ৳" + esc(activeEvent.minSpend) : "Complimentary with your order";
          perkEl.innerHTML = iconSvg + "<div style='flex:1'><div style='font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#fff'>" + giftLabel + "</div><div style='font-size:11px;opacity:0.75;margin-top:2px'>" + spendCond + "</div></div><span style='font-size:11px;opacity:0.6'>DETAILS →</span>";

          var targetContainer = cartPopup.querySelector(".cart-popup-content, form, .cart-popup-items");
          if (targetContainer) {
            targetContainer.insertBefore(perkEl, targetContainer.firstChild);
          } else {
            cartPopup.appendChild(perkEl);
          }
        };

        var cartEl = document.getElementById("cart-popup");
        if (cartEl && !cartEl.__annrObserved) {
          cartEl.__annrObserved = true;
          var obs = new MutationObserver(function() {
            if (!document.getElementById("adm-cart-gift-perk")) {
              injectCartPerk();
            }
          });
          obs.observe(cartEl, { childList: true, subtree: true });
        }
        injectCartPerk();
      }

      // 3. Non-Interruptive Style & Position: Native Product Detail Page Feature List Bullet
      if (tpl === "product" && activeEvent.showPdpPerk !== false) {
        var featuresList = document.querySelector(".product-info-features");
        if (featuresList && !document.getElementById("adm-pdp-gift-feature")) {
          var giftLi = document.createElement("li");
          giftLi.id = "adm-pdp-gift-feature";
          giftLi.className = "product-info-feature product-info-feature--gift";
          giftLi.style.cssText = "cursor:pointer";
          giftLi.innerHTML = "<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' style='opacity:0.85;margin-right:8px;flex-shrink:0'><polyline points='20 12 20 22 4 22 4 12'></polyline><rect x='2' y='7' width='20' height='5'></rect><line x1='12' y1='22' x2='12' y2='7'></line><path d='M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z'></path><path d='M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z'></path></svg>" +
            "<span>" + esc(activeEvent.giftItem ? "FREE " + activeEvent.giftItem.toUpperCase() + (Number(activeEvent.minSpend) > 0 ? " (ORDERS OVER ৳" + activeEvent.minSpend + ")" : "") : "FREE GIFT WITH PURCHASE") + "</span>";
          giftLi.onclick = function() { openGiftModal(activeEvent); };
          featuresList.appendChild(giftLi);
        }
      }
    })();

    function openGiftModal(ev) {
      var modal = document.getElementById("adm-gift-modal");
      if (modal) modal.remove();
      var img = ev.giftImage ? "<img src='" + esc(safeImg(ev.giftImage)) + "' alt='" + esc(ev.giftItem) + "' style='width:100%;max-height:260px;object-fit:cover;border-radius:2px;margin-bottom:18px;background:#111'>" : "";
      var cond = Number(ev.minSpend) > 0 ? "Complimentary with orders over ৳" + esc(ev.minSpend) : "Complimentary with all orders";
      var codeHtml = ev.discountCode ? "<div style='font-size:11px;letter-spacing:1px;margin-top:10px;display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#151515;border:1px solid #282828'><span>CODE: <strong style='font-family:monospace;letter-spacing:1.5px'>" + esc(ev.discountCode) + "</strong></span><button type='button' id='adm-copy-code' style='background:#fff;border:none;color:#000;font:9px/1 \"NB Architekt Std\",sans-serif;font-weight:700;letter-spacing:1px;padding:5px 10px;cursor:pointer'>COPY</button></div>" : "";
      modal = overlay("adm-gift-modal",
        "<div style='background:#000000;color:#ffffff;max-width:420px;width:92%;padding:32px 28px;border:1px solid #262626;box-shadow:0 24px 64px rgba(0,0,0,0.9);font:12px/1.5 \"NB Architekt Std\",sans-serif;position:relative'>" +
          "<button type='button' data-close style='position:absolute;top:16px;right:18px;background:none;border:0;color:#ffffff;font-size:18px;cursor:pointer;line-height:1;opacity:.6'>✕</button>" +
          "<div style='font:10px/1 \"FK Grotesk SemiMono\",monospace;letter-spacing:2px;color:#888888;text-transform:uppercase;margin-bottom:8px'>" + esc(ev.tag || "EXCLUSIVE DROP") + " // " + esc(ev.badgeText || "SPECIAL OFFER") + "</div>" +
          "<div style='font:22px/1.1 \"Druk Wide\",sans-serif;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px'>" + esc(ev.title) + "</div>" +
          img +
          "<div style='font-size:14px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:6px'>" + esc(ev.giftItem) + " <span style='font-size:11px;opacity:.6;font-weight:400'>(" + esc(ev.giftValue || "COMPLIMENTARY") + ")</span></div>" +
          (ev.giftDescription ? "<p style='opacity:.75;font-size:12px;line-height:1.6;margin:0 0 14px'>" + esc(ev.giftDescription) + "</p>" : "") +
          "<div style='border-top:1px solid #222222;padding-top:12px;margin-bottom:18px;font-size:11px;letter-spacing:0.5px;text-transform:uppercase;opacity:.8'>" + cond + "</div>" +
          codeHtml +
          "<a href='/collections/all/index.html' style='display:block;text-align:center;background:#ffffff;color:#000000;padding:14px 20px;text-decoration:none;text-transform:uppercase;font:11px/1 \"NB Architekt Std\",sans-serif;letter-spacing:1.5px;font-weight:700;margin-top:16px'>SHOP COLLECTION →</a>" +
        "</div>",
        "position:fixed;inset:0;z-index:99995;background:rgba(0,0,0,.82);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px"
      );
      if (modal) {
        modal.addEventListener("click", function (e) {
          if (e.target === modal || e.target.hasAttribute("data-close")) modal.remove();
        });
        var copyBtn = modal.querySelector("#adm-copy-code");
        if (copyBtn && ev.discountCode) {
          copyBtn.onclick = function() {
            navigator.clipboard.writeText(ev.discountCode).then(function() {
              copyBtn.textContent = "COPIED";
              setTimeout(function() { copyBtn.textContent = "COPY"; }, 2000);
            });
          };
        }
      }
    }

    // 4. Cart Drawer Checkout Redirection, Cart Coupon Input & Cart Sync
    (function initCartCheckoutSync() {
      function syncCartItems() {
        try {
          fetch("/cart.js").then(function(r) { return r.ok ? r.json() : null; }).then(function(cart) {
            if (cart && Array.isArray(cart.items) && cart.items.length > 0) {
              var formatted = cart.items.map(function(it) {
                var size = (it.variant_options && it.variant_options[0]) ||
                           (it.options_with_values && it.options_with_values[0] && it.options_with_values[0].value) || "Standard";
                return {
                  id: String(it.id || it.variant_id || it.handle),
                  title: it.title || it.product_title || "AnnR Product",
                  price: Math.round((it.price || 0) / 100),
                  quantity: it.quantity || 1,
                  size: size,
                  image: it.featured_image ? it.featured_image.url : (it.image || "")
                };
              });
              localStorage.setItem("annr-cart", JSON.stringify(formatted));
            }
          }).catch(function() {});
        } catch(e) {}
      }

      // Inject a clean VIP Referral Coupon bar inside the slide-out cart drawer (#cart-popup)
      function injectCartCouponBar() {
        var cartPopup = document.getElementById("cart-popup");
        if (!cartPopup || document.getElementById("adm-cart-coupon-box")) return;
        var footerEl = cartPopup.querySelector(".cart-popup-footer") || cartPopup.querySelector("form");
        if (!footerEl) return;

        var savedCode = "";
        try {
          savedCode = (localStorage.getItem("annr_cart_coupon") || localStorage.getItem("annr_active_ref_code") || "").toUpperCase();
        } catch (e) {}

        var box = document.createElement("div");
        box.id = "adm-cart-coupon-box";
        box.style.cssText = "padding:10px 0 12px;border-top:1px solid rgba(0,0,0,0.1);margin-bottom:8px;font:11px/1.4 'NB Architekt Std',sans-serif";
        box.innerHTML =
          "<div style='display:flex;gap:6px;align-items:center'>" +
            "<input type='text' id='adm-cart-coupon-input' value='" + esc(savedCode) + "' placeholder='VIP REFERRAL / PROMO CODE' style='flex:1;padding:8px 10px;border:1px solid rgba(0,0,0,0.22);background:#fff;color:#000;font:11px/1 monospace;text-transform:uppercase;letter-spacing:1px;outline:none'>" +
            "<button type='button' id='adm-cart-coupon-btn' style='padding:8px 12px;background:#000;color:#fff;border:1px solid #000;font:10px/1 \"NB Architekt Std\",sans-serif;font-weight:700;letter-spacing:1px;text-transform:uppercase;cursor:pointer'>APPLY</button>" +
          "</div>" +
          "<div id='adm-cart-coupon-msg' style='font-size:10px;margin-top:5px;letter-spacing:0.5px;color:" + (savedCode ? "#008060" : "#555") + "'>" +
            (savedCode ? "✓ Code " + esc(savedCode) + " queued for 10% OFF at checkout" : "") +
          "</div>";

        footerEl.insertBefore(box, footerEl.firstChild);

        var inp = box.querySelector("#adm-cart-coupon-input");
        var btn = box.querySelector("#adm-cart-coupon-btn");
        var msg = box.querySelector("#adm-cart-coupon-msg");
        if (btn && inp && msg) {
          btn.onclick = function () {
            var cVal = String(inp.value || "").trim().toUpperCase();
            if (!cVal) {
              try { localStorage.removeItem("annr_cart_coupon"); } catch (e) {}
              msg.style.color = "#666";
              msg.textContent = "Coupon cleared.";
              return;
            }
            if (/^(VIP-|ANNR-|LUCK|FREESHIP|FREEGIFT)/.test(cVal)) {
              try {
                localStorage.setItem("annr_cart_coupon", cVal);
                localStorage.setItem("annr_active_ref_code", cVal);
              } catch (e) {}
              msg.style.color = "#008060";
              msg.textContent = "✓ " + cVal + " applied! Discount will be deducted at checkout.";
            } else {
              msg.style.color = "#e10600";
              msg.textContent = "Invalid coupon format. Use a valid VIP-XXXX or promo code.";
            }
          };
        }
      }

      var cpEl = document.getElementById("cart-popup");
      if (cpEl && !cpEl.__annrCouponObserved) {
        cpEl.__annrCouponObserved = true;
        var cpObs = new MutationObserver(function () {
          if (!document.getElementById("adm-cart-coupon-box")) injectCartCouponBar();
        });
        cpObs.observe(cpEl, { childList: true, subtree: true });
      }
      injectCartCouponBar();

      // Sync when cart popup opens or item is added
      document.addEventListener("click", function(e) {
        var a = e.target.closest && e.target.closest(".js-cart-trigger, [href*='/cart'], button[name='add'], .js-add-to-cart");
        if (a) setTimeout(function () { syncCartItems(); injectCartCouponBar(); }, 500);

        // Intercept Checkout Buttons
        var chk = e.target.closest && e.target.closest("button[name='checkout'], a[href*='/checkout'], .cart-popup-checkout, [data-checkout-button]");
        if (chk) {
          e.preventDefault();
          e.stopPropagation();
          syncCartItems();
          window.location.href = "/checkout";
        }
      }, true);
    })();

    // 5. Bangladesh VIP Loyalty & Points Hub — Full-Page Cover Pro Architectural Design
    (function initVipHub() {
      var BD_GEO = {
        "Dhaka": ["Dhaka", "Gazipur", "Narayanganj", "Tangail", "Faridpur", "Gopalganj", "Kishoreganj", "Madaripur", "Manikganj", "Munshiganj", "Narsingdi", "Rajbari", "Shariatpur"],
        "Chattogram": ["Chattogram", "Cox's Bazar", "Cumilla", "Feni", "Brahmanbaria", "Chandpur", "Noakhali", "Lakshmipur", "Khagrachhari", "Rangamati", "Bandarban"],
        "Rajshahi": ["Rajshahi", "Bogura", "Pabna", "Sirajganj", "Naogaon", "Natore", "Chapainawabganj", "Joypurhat"],
        "Khulna": ["Khulna", "Jashore", "Kushtia", "Satkhira", "Bagerhat", "Jhenaidah", "Chuadanga", "Magura", "Meherpur", "Narail"],
        "Barishal": ["Barishal", "Patuakhali", "Bhola", "Pirojpur", "Barguna", "Jhalokati"],
        "Sylhet": ["Sylhet", "Moulvibazar", "Habiganj", "Sunamganj"],
        "Rangpur": ["Rangpur", "Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat", "Nilphamari", "Panchagarh", "Thakurgaon"],
        "Mymensingh": ["Mymensingh", "Jamalpur", "Netrokona", "Sherpur"]
      };

      var SB_URL = "https://aooydxydkyjtulhduexa.supabase.co";
      var SB_KEY = "sb_publishable_rWZ3_sO_15nX-jMpRMrnng_CrRhuJK5";
      var VIP_SESSION_KEY = "annr_vip_member_session";
      var VIP_ACCOUNTS_KEY = "annr_vip_accounts_v1";
      var VIP_LEDGER_KEY = "annr-vip-points-ledger-v1";
      var VIP_NOTIFS_KEY = "annr-vip-notifications-v1";
      var VIP_TIERS_KEY = "annr-vip-tiers-v1";
      var VIP_CAMPAIGNS_KEY = "annr-vip-campaigns-v1";

      function getVipTiers() {
        var defaultTiers = [
          {
            id: "tier-silver",
            name: "Silver",
            rank_order: 1,
            badge_color: "#a1a1aa",
            min_earned_points: 0,
            min_referrals: 0,
            point_multiplier: 1.0,
            points_multiplier: 1.0,
            extra_discount_percent: 0,
            tier_discount_percent: 0,
            perks: ["200 Welcome ANNR Points", "Personal 10% OFF Referral Coupon", "Redeem Points at Checkout or MFS"],
            active: true
          },
          {
            id: "tier-gold",
            name: "Gold",
            rank_order: 2,
            badge_color: "#f59e0b",
            min_earned_points: 500,
            min_referrals: 3,
            point_multiplier: 1.25,
            points_multiplier: 1.25,
            extra_discount_percent: 3,
            tier_discount_percent: 3,
            perks: ["1.25× Points Multiplier on Orders & Referrals", "3% Extra VIP Tier Discount", "Early Drop Access"],
            active: true
          },
          {
            id: "tier-platinum",
            name: "Platinum",
            rank_order: 3,
            badge_color: "#38bdf8",
            min_earned_points: 1500,
            min_referrals: 8,
            point_multiplier: 1.5,
            points_multiplier: 1.5,
            extra_discount_percent: 5,
            tier_discount_percent: 5,
            perks: ["1.5× Points Multiplier", "5% Extra VIP Tier Discount", "Priority MFS Payout Processing"],
            active: true
          },
          {
            id: "tier-diamond",
            name: "Diamond",
            rank_order: 4,
            badge_color: "#c084fc",
            min_earned_points: 3500,
            min_referrals: 15,
            point_multiplier: 2.0,
            points_multiplier: 2.0,
            extra_discount_percent: 10,
            tier_discount_percent: 10,
            perks: ["2.0× Double Points Multiplier", "10% Extra VIP Tier Discount", "Dedicated VIP Concierge & Birthday Gift"],
            active: true
          }
        ];
        try {
          var raw = localStorage.getItem(VIP_TIERS_KEY);
          if (raw) {
            var parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length) {
              return parsed.map(function (t) {
                return Object.assign({}, t, {
                  point_multiplier: Number(t.point_multiplier != null ? t.point_multiplier : (t.points_multiplier != null ? t.points_multiplier : 1)),
                  extra_discount_percent: Number(t.extra_discount_percent != null ? t.extra_discount_percent : (t.tier_discount_percent != null ? t.tier_discount_percent : 0)),
                  perks: Array.isArray(t.perks) ? t.perks : []
                });
              });
            }
          }
        } catch (e) {}
        return defaultTiers;
      }

      function getActiveVipCampaigns() {
        var defaultCampaigns = [
          {
            id: "camp-welcome-200",
            name: "VIP Vault Welcome Grant",
            description: "Every new VIP member automatically receives Welcome ANNR Points upon registration.",
            status: "active",
            points_multiplier: 1,
            bonus_points: 200
          },
          {
            id: "camp-spend-5000",
            name: "Heavyweight Spend Bonus (৳5,000+)",
            description: "Earn +150 Bonus ANNR Points automatically on any order above ৳5,000.",
            status: "active",
            points_multiplier: 1,
            bonus_points: 150
          }
        ];
        try {
          var raw = localStorage.getItem(VIP_CAMPAIGNS_KEY);
          if (raw) {
            var parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length) {
              return parsed
                .filter(function (c) { return c && (!c.status || c.status === "active"); })
                .map(function (c) {
                  return Object.assign({}, c, {
                    points_multiplier: c.reward_type === "multiplier" ? Number(c.reward_value || 2) : Number(c.points_multiplier || 1),
                    bonus_points: Number(c.bonus_points != null ? c.bonus_points : (c.reward_value || 100))
                  });
                });
            }
          }
        } catch (e) {}
        return defaultCampaigns;
      }

      function appendVipLedgerEntry(entry) {
        if (!entry) return;
        try {
          var raw = localStorage.getItem(VIP_LEDGER_KEY);
          var list = raw ? JSON.parse(raw) : [];
          if (!Array.isArray(list)) list = [];
          var delta = Number(entry.points_delta != null ? entry.points_delta : (entry.amount || 0));
          list.unshift({
            id: entry.id || ("led-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6)),
            vip_member_id: entry.member_id || entry.vip_member_id || "",
            member_id: entry.member_id || entry.vip_member_id || "",
            member_email: String(entry.member_email || "").toLowerCase().trim(),
            member_name: entry.member_name || "VIP Member",
            transaction_type: entry.transaction_type || "welcome_bonus",
            amount: delta,
            points_delta: delta,
            balance_after: Number(entry.balance_after || 0),
            reference_id: entry.reference_id || null,
            note: entry.description || entry.note || "",
            description: entry.description || entry.note || "",
            status: "completed",
            actor: entry.actor || "system",
            created_at: entry.created_at || new Date().toISOString()
          });
          localStorage.setItem(VIP_LEDGER_KEY, JSON.stringify(list.slice(0, 500)));
        } catch (e) {}
      }

      function appendVipNotification(notif) {
        if (!notif) return;
        try {
          var raw = localStorage.getItem(VIP_NOTIFS_KEY);
          var list = raw ? JSON.parse(raw) : [];
          if (!Array.isArray(list)) list = [];
          list.unshift({
            id: notif.id || ("notif-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6)),
            member_id: notif.member_id || "",
            member_email: String(notif.member_email || "").toLowerCase().trim(),
            event_type: notif.category || notif.event_type || "points_earned",
            title: notif.title || "VIP Reward Alert",
            message: notif.message || "",
            is_read: false,
            created_at: notif.created_at || new Date().toISOString()
          });
          localStorage.setItem(VIP_NOTIFS_KEY, JSON.stringify(list.slice(0, 200)));
        } catch (e) {}
      }

      function normalizeVipSettings(raw) {
        raw = raw || {};
        var pv = Number(raw.point_value_bdt != null ? raw.point_value_bdt : (raw.redemption_rate_bdt_per_point != null ? raw.redemption_rate_bdt_per_point : 1.0)) || 1.0;
        var minWPts = Number(raw.min_withdrawal_points != null ? raw.min_withdrawal_points : 100);
        var minWBdt = Number(raw.min_withdrawal_bdt != null ? raw.min_withdrawal_bdt : Math.round(minWPts * pv)) || 100;
        var discType = String(raw.friend_discount_type || raw.referral_discount_type || "percent").toLowerCase();
        if (discType === "percentage") discType = "percent";
        return Object.assign({}, raw, {
          point_value_bdt: pv,
          min_withdrawal_bdt: minWBdt,
          min_withdrawal_points: minWPts,
          points_per_referral: Number(raw.points_per_referral != null ? raw.points_per_referral : 100),
          welcome_bonus_points: Number(raw.welcome_bonus_points != null ? raw.welcome_bonus_points : (raw.welcome_points != null ? raw.welcome_points : 200)),
          friend_discount_value: Number(raw.friend_discount_value != null ? raw.friend_discount_value : (raw.referral_discount_value != null ? raw.referral_discount_value : 10)),
          friend_discount_type: discType,
          min_order_for_coupon: Number(raw.min_order_for_coupon != null ? raw.min_order_for_coupon : (raw.referral_min_order_amount != null ? raw.referral_min_order_amount : 500)),
          allowed_payout_methods: Array.isArray(raw.allowed_payout_methods) && raw.allowed_payout_methods.length ? raw.allowed_payout_methods : ["bkash", "nagad", "rocket", "bank"]
        });
      }

      function getVipSettings() {
        try {
          var s = localStorage.getItem("annr-loyalty-settings-v1") || localStorage.getItem("annr-loyalty-settings");
          if (s) return normalizeVipSettings(JSON.parse(s));
        } catch(e) {}
        return normalizeVipSettings({});
      }

      function normalizeMemberRecord(m, coupon, settings) {
        if (!m) return null;
        var st = normalizeVipSettings(settings || getVipSettings());
        var refCode = (coupon && coupon.code) || m.referral_code || ("VIP-ANNR" + Math.floor(100 + Math.random() * 899));
        var avail = Number(m.available_points != null ? m.available_points : 0);
        var pend = Number(m.pending_points != null ? m.pending_points : 0);
        var lifetimeEarned = Math.max(
          Number(m.total_earned_points != null ? m.total_earned_points : 0),
          Number(m.lifetime_points_earned != null ? m.lifetime_points_earned : 0),
          avail + pend
        );
        var withdrawn = Math.max(
          Number(m.withdrawn_points != null ? m.withdrawn_points : 0),
          Number(m.lifetime_points_withdrawn != null ? m.lifetime_points_withdrawn : 0)
        );
        return Object.assign({}, m, {
          full_name: m.full_name || m.name || "VIP Member",
          email: String(m.email || "").toLowerCase().trim(),
          phone: m.phone || "",
          division: m.division || "Dhaka",
          district: m.district || "Dhaka",
          tier: m.tier || st.default_tier || "Silver",
          available_points: avail,
          pending_points: pend,
          total_earned_points: lifetimeEarned,
          lifetime_points_earned: lifetimeEarned,
          withdrawn_points: withdrawn,
          lifetime_points_withdrawn: withdrawn,
          redeemed_points: Number(m.redeemed_points || 0),
          friends_referred: Math.max(Number(m.friends_referred || 0), Number((coupon && coupon.times_used) || 0)),
          referral_code: refCode,
          status: m.status || "active"
        });
      }

      function syncRemoteWalletPayload(payload) {
        if (!payload || !payload.member) return null;
        var st = normalizeVipSettings(payload.settings || getVipSettings());
        var cpn = payload.coupon || { code: payload.member.referral_code || "VIP-ANNR10" };
        var normM = normalizeMemberRecord(payload.member, cpn, st);
        cpn = {
          code: cpn.code || normM.referral_code,
          discount_value: Number(cpn.discount_value != null ? cpn.discount_value : st.friend_discount_value),
          discount_type: (cpn.discount_type === "percentage" ? "percent" : cpn.discount_type) || st.friend_discount_type,
          min_order_bdt: Number(cpn.min_order_bdt != null ? cpn.min_order_bdt : (cpn.min_order_amount != null ? cpn.min_order_amount : st.min_order_for_coupon)),
          times_used: Math.max(Number(cpn.times_used || 0), Number(normM.friends_referred || 0)),
          total_points_generated: Number(cpn.total_points_generated || (Number(cpn.times_used || 0) * st.points_per_referral))
        };

        // Sync remote ledger entries if provided
        if (Array.isArray(payload.ledger) && payload.ledger.length) {
          try {
            var rawLed = localStorage.getItem("annr-vip-points-ledger-v1");
            var curLed = rawLed ? JSON.parse(rawLed) : [];
            if (!Array.isArray(curLed)) curLed = [];
            var ledIds = {};
            curLed.forEach(function (x) { if (x && x.id) ledIds[x.id] = true; });
            payload.ledger.forEach(function (l) {
              if (l && l.id && !ledIds[l.id]) {
                ledIds[l.id] = true;
                curLed.push({
                  id: l.id,
                  member_id: l.member_id || normM.id,
                  member_email: normM.email,
                  member_name: normM.full_name,
                  transaction_type: l.transaction_type || "welcome_bonus",
                  points_delta: Number(l.points_delta || 0),
                  balance_after: Number(l.balance_after || normM.available_points),
                  reference_id: l.reference_id || null,
                  description: l.note || l.description || l.transaction_type,
                  actor: "system",
                  created_at: l.created_at || new Date().toISOString()
                });
              }
            });
            curLed.sort(function (a, b) { return String(b.created_at || "").localeCompare(String(a.created_at || "")); });
            localStorage.setItem("annr-vip-points-ledger-v1", JSON.stringify(curLed.slice(0, 500)));
          } catch (e) {}
        }

        // Sync remote withdrawals if provided
        if (Array.isArray(payload.withdrawals) && payload.withdrawals.length) {
          try {
            ["annr-withdrawals", "annr-withdrawals-v1"].forEach(function (k) {
              var rawW = localStorage.getItem(k);
              var curW = rawW ? JSON.parse(rawW) : [];
              if (!Array.isArray(curW)) curW = [];
              var wIds = {};
              curW.forEach(function (w) { if (w && w.id) wIds[w.id] = w; });
              payload.withdrawals.forEach(function (rw) {
                if (!rw || !rw.id) return;
                var mappedW = {
                  id: rw.id,
                  request_number: rw.request_number || String(rw.id).slice(0, 6).toUpperCase(),
                  vip_member_id: rw.member_id || normM.id,
                  member_name: normM.full_name,
                  member_email: normM.email,
                  points_amount: Number(rw.points_amount || 0),
                  money_amount_bdt: Number(rw.bdt_amount != null ? rw.bdt_amount : rw.points_amount || 0),
                  payout_method: rw.payout_method || "bkash",
                  account_number: rw.account_number || normM.phone,
                  account_name: rw.account_name || normM.full_name,
                  account_holder_name: rw.account_name || normM.full_name,
                  status: rw.status || "pending",
                  transaction_ref: rw.transaction_ref || null,
                  admin_note: rw.admin_note || null,
                  requested_at: rw.created_at || new Date().toISOString(),
                  created_at: rw.created_at || new Date().toISOString(),
                  vip_members: {
                    full_name: normM.full_name,
                    email: normM.email,
                    phone: normM.phone,
                    tier: normM.tier
                  }
                };
                if (wIds[rw.id]) {
                  Object.assign(wIds[rw.id], mappedW);
                } else {
                  curW.unshift(mappedW);
                }
              });
              localStorage.setItem(k, JSON.stringify(curW.slice(0, 200)));
            });
          } catch (e) {}
        }

        return { member: normM, coupon: cpn, settings: st };
      }

      function getSessionMember() {
        try {
          var raw = localStorage.getItem(VIP_SESSION_KEY) || localStorage.getItem("annr_vip_session") || localStorage.getItem("annr-vip-wallet-v1");
          if (raw) {
            var parsed = JSON.parse(raw);
            if (parsed && parsed.member) return parsed;
            if (parsed && parsed.email) return { member: parsed, coupon: { code: parsed.referral_code }, settings: getVipSettings() };
          }
        } catch(e) {}
        return null;
      }

      function saveSessionMember(data) {
        if (!data || !data.member) return;
        try {
          localStorage.setItem(VIP_SESSION_KEY, JSON.stringify(data));
          localStorage.setItem("annr_vip_session", JSON.stringify(data.member));
          localStorage.setItem("annr-vip-wallet-v1", JSON.stringify(data.member));
          // Keep annr-vip-members synced for Admin Panel (/admin/loyalty)
          var rawM = localStorage.getItem("annr-vip-members");
          var list = rawM ? JSON.parse(rawM) : [];
          if (!Array.isArray(list)) list = [];
          var em = (data.member.email || "").toLowerCase().trim();
          var idx = list.findIndex(function (x) { return x && (x.email || "").toLowerCase().trim() === em; });
          if (idx >= 0) {
            list[idx] = Object.assign({}, list[idx], data.member);
          } else {
            list.unshift(data.member);
          }
          localStorage.setItem("annr-vip-members", JSON.stringify(list));
        } catch(e) {}
      }

      function clearSessionMember() {
        try {
          localStorage.removeItem(VIP_SESSION_KEY);
          localStorage.removeItem("annr_vip_session");
          localStorage.removeItem("annr-vip-wallet-v1");
          localStorage.removeItem("annr_vip_auth_v2");
        } catch(e) {}
      }

      function getVipAccounts() {
        try {
          return JSON.parse(localStorage.getItem(VIP_ACCOUNTS_KEY) || "{}");
        } catch(e) { return {}; }
      }

      function saveVipAccount(acc) {
        try {
          var accs = getVipAccounts();
          if (acc.email) accs[acc.email.toLowerCase().trim()] = acc;
          if (acc.phone) accs[acc.phone.replace(/[^0-9]/g, "")] = acc;
          localStorage.setItem(VIP_ACCOUNTS_KEY, JSON.stringify(accs));
        } catch(e) {}
      }

      // Credit referrer when a friend registers using their referral code
      function creditReferrerOnSignup(refCode, newMemberName, newMemberEmail) {
        var norm = String(refCode || "").trim().toUpperCase();
        if (!norm) return false;
        var st = getVipSettings();
        var bonusPts = Number(st.points_per_referral) || 100;
        var credited = false;
        var referrerEmail = "";

        try {
          // 1. Update annr-vip-members
          var rawM = localStorage.getItem("annr-vip-members");
          var mList = rawM ? JSON.parse(rawM) : [];
          if (Array.isArray(mList)) {
            mList.forEach(function (m) {
              if (m && (m.referral_code || "").toUpperCase() === norm && (m.email || "").toLowerCase() !== newMemberEmail.toLowerCase()) {
                m.available_points = Number(m.available_points || 0) + bonusPts;
                m.total_earned_points = Number(m.total_earned_points || 0) + bonusPts;
                m.friends_referred = Number(m.friends_referred || 0) + 1;
                referrerEmail = m.email || "";
                credited = true;
              }
            });
            if (credited) localStorage.setItem("annr-vip-members", JSON.stringify(mList));
          }

          // 2. Update annr_vip_accounts_v1
          var accs = getVipAccounts();
          var accChanged = false;
          Object.keys(accs).forEach(function (k) {
            var a = accs[k];
            var aCode = ((a && a.coupon && a.coupon.code) || (a && a.member && a.member.referral_code) || "").toUpperCase();
            if (a && aCode === norm && (a.email || "").toLowerCase() !== newMemberEmail.toLowerCase()) {
              a.available_points = Number(a.available_points || (a.member && a.member.available_points) || 0) + bonusPts;
              if (a.member) {
                a.member.available_points = Number(a.member.available_points || 0) + bonusPts;
                a.member.total_earned_points = Number(a.member.total_earned_points || 0) + bonusPts;
                a.member.friends_referred = Number(a.member.friends_referred || 0) + 1;
                if (!referrerEmail) referrerEmail = a.member.email || a.email || "";
              }
              if (a.coupon) {
                a.coupon.times_used = Number(a.coupon.times_used || 0) + 1;
                a.coupon.total_points_generated = Number(a.coupon.total_points_generated || 0) + bonusPts;
              }
              accChanged = true;
              credited = true;
            }
          });
          if (accChanged) localStorage.setItem(VIP_ACCOUNTS_KEY, JSON.stringify(accs));

          // 3. Record in annr-vip-referrals-log so the referrer sees the friend in their ledger
          var rawLog = localStorage.getItem("annr-vip-referrals-log");
          var logs = rawLog ? JSON.parse(rawLog) : [];
          if (!Array.isArray(logs)) logs = [];
          logs.unshift({
            id: "ref-signup-" + Date.now(),
            referral_code: norm,
            referrer_email: referrerEmail,
            buyer_name: newMemberName,
            buyer_email: newMemberEmail,
            points_earned: bonusPts,
            event_type: "signup",
            created_at: new Date().toISOString()
          });
          localStorage.setItem("annr-vip-referrals-log", JSON.stringify(logs.slice(0, 500)));
        } catch (e) {}

        return credited;
      }

      function sha256HexSync(str) {
        var bytes = typeof TextEncoder !== "undefined"
          ? Array.from(new TextEncoder().encode(String(str)))
          : Array.from(unescape(encodeURIComponent(String(str)))).map(function(c) { return c.charCodeAt(0); });
        var K = [
          0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
          0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
          0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
          0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
          0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
          0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
          0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
          0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
        ];
        var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
        var bitLen = bytes.length * 8;
        bytes.push(0x80);
        while ((bytes.length % 64) !== 56) bytes.push(0);
        for (var b = 7; b >= 0; b--) bytes.push((bitLen / Math.pow(2, b * 8)) & 0xff);
        function rotr(n, x) { return (x >>> n) | (x << (32 - n)); }
        for (var i = 0; i < bytes.length; i += 64) {
          var W = new Array(64);
          for (var t = 0; t < 16; t++) {
            W[t] = ((bytes[i + t * 4] << 24) | (bytes[i + t * 4 + 1] << 16) | (bytes[i + t * 4 + 2] << 8) | bytes[i + t * 4 + 3]) >>> 0;
          }
          for (var t2 = 16; t2 < 64; t2++) {
            var s0 = (rotr(7, W[t2 - 15]) ^ rotr(18, W[t2 - 15]) ^ (W[t2 - 15] >>> 3)) >>> 0;
            var s1 = (rotr(17, W[t2 - 2]) ^ rotr(19, W[t2 - 2]) ^ (W[t2 - 2] >>> 10)) >>> 0;
            W[t2] = (W[t2 - 16] + s0 + W[t2 - 7] + s1) >>> 0;
          }
          var a = H[0], b0 = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
          for (var t3 = 0; t3 < 64; t3++) {
            var S1 = (rotr(6, e) ^ rotr(11, e) ^ rotr(25, e)) >>> 0;
            var ch = ((e & f) ^ (~e & g)) >>> 0;
            var temp1 = (h + S1 + ch + K[t3] + W[t3]) >>> 0;
            var S0 = (rotr(2, a) ^ rotr(13, a) ^ rotr(22, a)) >>> 0;
            var maj = ((a & b0) ^ (a & c) ^ (b0 & c)) >>> 0;
            var temp2 = (S0 + maj) >>> 0;
            h = g; g = f; f = e; e = (d + temp1) >>> 0; d = c; c = b0; b0 = a; a = (temp1 + temp2) >>> 0;
          }
          H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b0) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
          H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
        }
        return H.map(function(v) { return ("00000000" + v.toString(16)).slice(-8); }).join("");
      }

      function hashPassword(str) {
        var clean = String(str || "").trim();
        return Promise.resolve(sha256HexSync(clean + ":annr_vip_salt"));
      }

      function callRegisterRpc(profile) {
        profile = profile || {};
        var normEmail = String(profile.p_email || "").trim().toLowerCase();
        var rawPhone = String(profile.p_phone || "").replace(/[^0-9]/g, "");
        if (rawPhone.startsWith("880")) rawPhone = rawPhone.slice(3);
        if (rawPhone.length === 10 && rawPhone.startsWith("1")) rawPhone = "0" + rawPhone;
        var computedHash = profile.p_password_hash || (profile.p_plain_password ? sha256HexSync(String(profile.p_plain_password).trim() + ":annr_vip_salt") : null);
        var payload = {
          p_full_name: profile.p_full_name || "VIP Member",
          p_email: normEmail,
          p_phone: rawPhone,
          p_division: profile.p_division || "Dhaka",
          p_district: profile.p_district || "Dhaka",
          p_upazila: profile.p_upazila || null,
          p_full_address: profile.p_full_address || "Dhaka",
          p_is_whatsapp: profile.p_is_whatsapp !== false,
          p_dob: profile.p_dob || null,
          p_gender: profile.p_gender || "prefer_not_to_say",
          p_referred_by: profile.p_referred_by || null,
          p_password_hash: computedHash,
          p_plain_password: null
        };
        return fetch(SB_URL + "/rest/v1/rpc/register_vip_member", {
          method: "POST",
          headers: {
            "apikey": SB_KEY,
            "Authorization": "Bearer " + SB_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }).then(function(r) {
          return r.json().then(function(data) {
            return { ok: r.ok, status: r.status, data: data };
          });
        }).catch(function() {
          return { ok: false, status: 0, data: { error: "Network error. Please check your connection." } };
        });
      }

      function callLoginRpc(identifier, passwordHash, plainPassword) {
        var normId = String(identifier || "").trim();
        if (normId.indexOf("@") === -1) {
          var digits = normId.replace(/[^0-9]/g, "");
          if (digits.startsWith("880")) digits = digits.slice(3);
          if (digits.length === 10 && digits.startsWith("1")) digits = "0" + digits;
          normId = digits || normId;
        } else {
          normId = normId.toLowerCase();
        }
        var primaryHash = passwordHash || (plainPassword ? sha256HexSync(String(plainPassword).trim() + ":annr_vip_salt") : null);
        function postLogin(hashToTry) {
          return fetch(SB_URL + "/rest/v1/rpc/login_vip_member", {
            method: "POST",
            headers: {
              "apikey": SB_KEY,
              "Authorization": "Bearer " + SB_KEY,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              p_identifier: normId,
              p_password_hash: hashToTry || null,
              p_plain_password: null
            })
          }).then(function(r) {
            return r.json().then(function(data) {
              return { ok: r.ok, status: r.status, data: data };
            });
          }).catch(function() {
            return { ok: false, status: 0, data: { error: "Network error. Please check your connection." } };
          });
        }

        return postLogin(primaryHash).then(function(res) {
          if (res.ok && res.data && res.data.wrong_password && plainPassword) {
            var cleanPw = String(plainPassword).trim();
            var altHash1 = sha256HexSync("annr_vip_salt_2026:" + cleanPw);
            return postLogin(altHash1).then(function(res2) {
              if (res2.ok && res2.data && res2.data.ok) return res2;
              return res;
            });
          }
          return res;
        });
      }

      function callWalletRpc(identifier) {
        var normId = String(identifier || "").trim();
        if (!normId) return Promise.resolve({ ok: false, status: 0, data: null });
        if (normId.indexOf("@") !== -1) normId = normId.toLowerCase();
        return fetch(SB_URL + "/rest/v1/rpc/get_vip_member_wallet", {
          method: "POST",
          headers: {
            "apikey": SB_KEY,
            "Authorization": "Bearer " + SB_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ p_identifier: normId })
        }).then(function(r) {
          return r.json().then(function(data) {
            return { ok: r.ok, status: r.status, data: data };
          });
        }).catch(function() {
          return { ok: false, status: 0, data: null };
        });
      }

      // Inject Luxury Light-Themed VIP Auth & Dashboard Styles matching exact design mockup
      if (!document.getElementById("vip-inpage-styles")) {
        var st = document.createElement("style");
        st.id = "vip-inpage-styles";
        st.textContent = "" +
          "header-search-new:not(.open), .header-search-new:not(.open), .header-search-overflow:not(.open) { display: none !important; opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; }\n" +
          "header-search-new.open, .header-search-new.open { display: flex !important; flex-direction: column !important; position: fixed !important; z-index: 1300 !important; background: #0d0d10f2 !important; backdrop-filter: blur(24px) saturate(180%) !important; -webkit-backdrop-filter: blur(24px) saturate(180%) !important; border: 1px solid rgba(255,255,255,0.15) !important; border-radius: 8px !important; box-shadow: 0 24px 60px rgba(0,0,0,0.65) !important; color: #ffffff !important; overflow: hidden !important; opacity: 1 !important; visibility: visible !important; pointer-events: auto !important; }\n" +
          "@media (min-width: 1025px) { header-search-new.open, .header-search-new.open { top: 60px !important; right: 32px !important; left: auto !important; bottom: auto !important; width: min(640px, 92vw) !important; max-height: calc(100vh - 84px) !important; } }\n" +
          "@media (max-width: 1024px) { header-search-new.open, .header-search-new.open { top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100vw !important; height: 100dvh !important; border-radius: 0 !important; } }\n" +
          ".header-search-overflow.open { display: block !important; position: fixed !important; inset: 0 !important; background: rgba(0,0,0,0.65) !important; backdrop-filter: blur(4px) !important; -webkit-backdrop-filter: blur(4px) !important; z-index: 1290 !important; }\n" +
          "body.vip-page, .vip-page .wrapper, .vip-page .wrapper-vip, .vip-page .vip, .vip-page .vip-wrapper, .vip-page .main { background: #f7f4ef !important; color: #111111 !important; min-height: 100vh !important; margin: 0 !important; padding: 0 !important; }\n" +
          ".vip-page .vip-bg, .vip-page .vip-dec, .vip-page .vip-top, .vip-page .vip-tab, .vip-page .vip-admin-link, .vip-page .vip-reset-password, .vip-page .vip-preloader { display: none !important; }\n" +
          ".vip-page .vip-form { padding: 0 !important; margin: 0 !important; background: transparent !important; width: 100% !important; max-width: 100% !important; }\n" +
          ".vip-page .vip-form__wrapper { max-width: 100% !important; width: 100% !important; padding: 0 !important; margin: 0 !important; }\n" +
          "#vip-inpage-hub { width: 100%; margin: 0 auto; color: #111; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; box-sizing: border-box; background: #f7f4ef; min-height: 100vh; }\n" +
          "#vip-inpage-hub input, #vip-inpage-hub select, #vip-inpage-hub textarea, .vip-field input, .vip-field select, .vip-field textarea { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important; text-transform: none !important; letter-spacing: normal !important; }\n" +
          "html { overflow-y: auto !important; height: auto !important; }\n" +
          "body.vip-page, body.vip-page.disable-scroll, .vip-page .wrapper, .vip-page .wrapper-vip, .vip-page .vip, .vip-page .vip-wrapper, .vip-page .vip.vit-account .vip-wrapper, .vip-page .main, .vip-page .vip-form, .vip-page .vip-form__wrapper, #vip-inpage-hub, .vip-dash-shell { overflow: visible !important; height: auto !important; max-height: none !important; }\n" +
          "body.vip-page { overflow-x: hidden !important; }\n" +
          "#main_element { display: none !important; }\n" +

          "/* Exact Store Navbar on VIP page */\n" +
          ".vip-page .header.header-new { background: #f7f4ef !important; border-bottom: 1px solid rgba(0,0,0,0.08) !important; position: relative !important; }\n" +
          ".vip-page .header-new__desktop-bar, .vip-page .header-new__mobile-bar { background: #f7f4ef !important; }\n" +
          ".vip-page .header-new__nav-link, .vip-page .header-new__action, .vip-page .header-menu-item-label, .vip-page .header-new__nav-link span, .vip-page .header-menu-item-label span { color: #111111 !important; }\n" +
          ".vip-page .header-logo .icon-logo { background-color: #111111 !important; }\n" +
          ".vip-page .icon-search, .vip-page .icon-cart, .vip-page .header-cart-button, .vip-page .header-search-button { color: #111111 !important; }\n" +
          ".vip-page .header-new__account-button svg { fill: #111111 !important; }\n" +
          ".vip-page .header-new__nav-block--right .js-vip-page-link { border-bottom: 2px solid #e05a2b !important; padding-bottom: 2px !important; }\n" +

          "/* 2-Column Split Page Container */\n" +
          ".vip-vault-page-container { max-width: 1140px; margin: 38px auto 60px; padding: 0 28px; display: grid; grid-template-columns: 350px 1fr; gap: 48px; align-items: start; box-sizing: border-box; }\n" +

          "/* Left Column: The AnnR Vault Card */\n" +
          ".vip-vault-card { background: #161616; color: #ffffff; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 16px 40px rgba(0,0,0,0.12); }\n" +
          ".vip-vault-card-body { padding: 32px 28px 24px; }\n" +
          ".vip-vault-card-topline { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }\n" +
          ".vip-vault-card-topline span { font-family: 'FK Grotesk SemiMono', monospace; font-size: 9.5px; font-weight: 700; letter-spacing: 2px; color: #e05a2b; text-transform: uppercase; }\n" +
          ".vip-vault-card-topline .line { width: 24px; height: 1px; background: #e05a2b; }\n" +
          ".vip-vault-card-heading { font-family: 'NB Architekt Std', sans-serif; font-size: 38px; line-height: 1.02; font-weight: 900; color: #ffffff; letter-spacing: 1px; text-transform: uppercase; margin: 0 0 12px; }\n" +
          ".vip-vault-card-tagline { font-family: 'FK Grotesk SemiMono', monospace; font-size: 10px; line-height: 1.5; color: #a3a3a3; letter-spacing: 1.5px; text-transform: uppercase; margin: 0 0 24px; }\n" +
          ".vip-vault-perks { display: flex; flex-direction: column; }\n" +
          ".vip-vault-perk-item { display: flex; align-items: center; gap: 16px; padding: 13px 0; }\n" +
          ".vip-vault-perk-icon { width: 26px; height: 26px; flex-shrink: 0; color: #ffffff; }\n" +
          ".vip-vault-perk-icon svg { width: 100%; height: 100%; }\n" +
          ".vip-vault-perk-text .perk-label { font-family: 'FK Grotesk SemiMono', monospace; font-size: 9px; letter-spacing: 1.5px; color: #8c8c8c; text-transform: uppercase; margin-bottom: 3px; }\n" +
          ".vip-vault-perk-text .perk-val { font-family: 'NB Architekt Std', sans-serif; font-size: 13.5px; font-weight: 700; letter-spacing: 0.5px; color: #e05a2b; text-transform: uppercase; }\n" +
          ".vip-vault-divider { height: 1px; background: rgba(255, 255, 255, 0.12); }\n" +
          ".vip-vault-footnote { font-family: Georgia, serif; font-size: 11px; line-height: 1.45; color: #737373; font-style: italic; margin-top: 18px; margin-bottom: 8px; }\n" +
          ".vip-vault-fabric-wrap { width: 100%; height: 180px; overflow: hidden; border-top: 1px solid rgba(255,255,255,0.08); background: #000; }\n" +
          ".vip-vault-fabric-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }\n" +

          "/* Right Column: Form Area */\n" +
          ".vip-vault-form-pane { padding-top: 4px; }\n" +
          ".vip-vault-form-topline { font-family: 'FK Grotesk SemiMono', monospace; font-size: 10.5px; letter-spacing: 2px; color: #1a1a1a; text-transform: uppercase; margin-bottom: 6px; }\n" +
          ".vip-vault-form-topline span { color: #e05a2b; font-weight: 700; }\n" +
          ".vip-vault-form-title { font-family: 'NB Architekt Std', sans-serif; font-size: 34px; line-height: 1.1; font-weight: 900; letter-spacing: 0.5px; color: #111111; text-transform: uppercase; margin: 0 0 6px; }\n" +
          ".vip-vault-form-subtitle { font-family: Georgia, serif; font-size: 13.5px; font-style: italic; color: #4a4a4a; margin: 0 0 22px; }\n" +

          "/* Segmented Switcher */\n" +
          ".vip-vault-auth-switcher { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #d8d3ca; border-radius: 2px; overflow: hidden; margin-bottom: 26px; background: #f7f4ef; }\n" +
          ".vip-vault-auth-switcher button { padding: 13px 18px; font-family: 'NB Architekt Std', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 1.8px; text-transform: uppercase; cursor: pointer; border: none; background: transparent; color: #222222; transition: all .2s ease; }\n" +
          ".vip-vault-auth-switcher button.active { background: #111111; color: #ffffff; }\n" +

          "/* Clean Underline Form Inputs */\n" +
          ".vip-vault-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 28px; margin-bottom: 18px; }\n" +
          ".vip-vault-login-fields { display: flex; flex-direction: column; gap: 18px; margin-bottom: 18px; }\n" +
          ".vip-field { display: flex; flex-direction: column; position: relative; }\n" +
          ".vip-field-label { font-family: 'FK Grotesk SemiMono', monospace; font-size: 9.5px; font-weight: 700; letter-spacing: 1.5px; color: #1a1a1a; text-transform: uppercase; margin-bottom: 4px; }\n" +
          ".vip-field-label .req { color: #e05a2b; }\n" +
          ".vip-field input, .vip-field select { width: 100%; background: transparent !important; border: none !important; border-bottom: 1.5px solid #1a1a1a !important; color: #111111 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important; font-size: 13.5px !important; padding: 8px 0 9px !important; border-radius: 0 !important; outline: none !important; box-shadow: none !important; box-sizing: border-box; text-transform: none !important; transition: border-color .2s ease; }\n" +
          ".vip-field input::placeholder { color: #8c887e !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important; font-size: 13px !important; text-transform: none !important; }\n" +
          ".vip-field input:focus, .vip-field select:focus { border-bottom-color: #e05a2b !important; }\n" +

          "/* Phone Group */\n" +
          ".vip-phone-group { display: flex; align-items: center; border-bottom: 1.5px solid #1a1a1a; transition: border-color .2s ease; }\n" +
          ".vip-phone-group:focus-within { border-bottom-color: #e05a2b; }\n" +
          ".vip-phone-group .vip-cc { font-family: 'NB Architekt Std', sans-serif; font-size: 13px; font-weight: 700; color: #111111; padding-right: 8px; letter-spacing: 0.5px; }\n" +
          ".vip-phone-group input { border-bottom: none !important; }\n" +

          "/* Password Group */\n" +
          ".vip-pass-group { display: flex; align-items: center; border-bottom: 1.5px solid #1a1a1a; transition: border-color .2s ease; position: relative; }\n" +
          ".vip-pass-group:focus-within { border-bottom-color: #e05a2b; }\n" +
          ".vip-pass-group input { border-bottom: none !important; padding-right: 28px !important; }\n" +
          ".vip-eye-toggle { position: absolute; right: 0; background: none; border: none; color: #555555; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; }\n" +
          ".vip-eye-toggle:hover { color: #111111; }\n" +

          "/* Select Group */\n" +
          ".vip-select-group { position: relative; }\n" +
          ".vip-select-group select { -webkit-appearance: none; appearance: none; cursor: pointer; padding-right: 20px !important; }\n" +
          ".vip-select-arrow { position: absolute; right: 2px; top: 50%; transform: translateY(-50%); pointer-events: none; font-size: 10px; color: #111111; }\n" +

          "/* Checkboxes */\n" +
          ".vip-vault-checks { display: flex; flex-direction: column; gap: 12px; margin: 16px 0 20px; }\n" +
          ".vip-checkbox-label { display: flex; align-items: center; gap: 10px; cursor: pointer; font-family: 'NB Architekt Std', sans-serif; font-size: 12.5px; color: #1a1a1a; }\n" +
          ".vip-checkbox-label input[type='checkbox'] { width: 16px; height: 16px; accent-color: #111111; cursor: pointer; margin: 0; }\n" +
          ".vip-checkbox-label a { color: #111111; text-decoration: underline; }\n" +

          "/* Submit Button */\n" +
          ".vip-vault-submit-btn { width: 100%; background: #111111; color: #ffffff; border: none; padding: 16px 24px; font-family: 'NB Architekt Std', sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px; transition: background .2s ease; }\n" +
          ".vip-vault-submit-btn:hover { background: #242424; }\n" +
          ".vip-vault-microcopy { font-family: Georgia, serif; font-size: 12px; font-style: italic; color: #666666; text-align: center; margin-top: 12px; }\n" +
          ".vip-vault-switch-text { font-family: 'NB Architekt Std', sans-serif; font-size: 12px; color: #111111; text-align: center; margin-top: 14px; }\n" +
          ".vip-vault-switch-text button { background: none; border: none; font-family: inherit; font-size: inherit; font-weight: 700; text-decoration: underline; color: #111111; cursor: pointer; padding: 0; }\n" +

          "/* Dashboard styles inside light container */\n" +
          ".vip-dash-shell { max-width: 1200px; margin: 32px auto 72px; padding: 0 28px; box-sizing: border-box; color: #111111; }\n" +
          ".vip-dash-hero { background: #ffffff; border: 1px solid #e2ddd3; border-top: 3px solid #111111; box-shadow: 0 16px 40px rgba(17,17,17,0.045); margin-bottom: 22px; overflow: hidden; }\n" +
          ".vip-dash-hero-top { padding: 28px 32px 24px; display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; flex-wrap: wrap; }\n" +
          ".vip-dash-tier-strip { background: #faf8f4; border-top: 1px solid #e6e1d7; padding: 14px 32px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }\n" +
          ".vip-dash-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 24px; }\n" +
          ".vip-dash-stat-card { background: #ffffff; border: 1px solid #e2ddd3; padding: 20px 20px 18px; position: relative; box-shadow: 0 8px 24px rgba(17,17,17,0.03); transition: transform .18s ease, box-shadow .18s ease; }\n" +
          ".vip-dash-stat-card:hover { transform: translateY(-2px); box-shadow: 0 14px 32px rgba(17,17,17,0.06); }\n" +
          ".vip-dash-subtabs { background: #efeae0; border: 1px solid #dcd6ca; padding: 5px; display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 24px; }\n" +
          ".vip-subtab-btn { background: transparent; color: #44403c; border: 1px solid transparent; padding: 11px 18px; font: 10.5px/1 'FK Grotesk SemiMono', monospace; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer; transition: all .18s ease; }\n" +
          ".vip-subtab-btn:hover { background: rgba(255,255,255,0.7); color: #111111; }\n" +
          ".vip-subtab-btn.is-active { background: #111111; color: #ffffff; border-color: #111111; box-shadow: 0 4px 12px rgba(17,17,17,0.12); }\n" +
          ".vip-dash-split { display: grid; grid-template-columns: 1.12fr 0.88fr; gap: 22px; align-items: start; }\n" +
          ".vip-dash-card { background: #ffffff; border: 1px solid #e2ddd3; padding: 26px 28px; box-shadow: 0 10px 28px rgba(17,17,17,0.035); }\n" +
          ".vip-dash-btn-orange { background: #e05a2b; color: #ffffff; border: 1px solid #e05a2b; padding: 12px 20px; font: 11px/1 'NB Architekt Std', sans-serif; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: all .18s ease; }\n" +
          ".vip-dash-btn-orange:hover { background: #c84b20; border-color: #c84b20; color: #ffffff; }\n" +
          ".vip-dash-btn-dark { background: #111111; color: #ffffff; border: 1px solid #111111; padding: 12px 20px; font: 11px/1 'NB Architekt Std', sans-serif; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: all .18s ease; }\n" +
          ".vip-dash-btn-dark:hover { background: #292524; border-color: #292524; color: #ffffff; }\n" +
          ".vip-dash-btn-light { background: #faf8f4; color: #111111; border: 1px solid #cfc9bc; padding: 12px 18px; font: 11px/1 'NB Architekt Std', sans-serif; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: all .18s ease; }\n" +
          ".vip-dash-btn-light:hover { background: #111111; color: #ffffff; border-color: #111111; }\n" +

          "/* Responsive */\n" +
          "@media (max-width: 980px) {\n" +
          "  .vip-dash-grid { grid-template-columns: repeat(2, 1fr); }\n" +
          "  .vip-dash-split { grid-template-columns: 1fr; }\n" +
          "}\n" +
          "@media (max-width: 880px) {\n" +
          "  .vip-store-header { padding: 0 16px; }\n" +
          "  .vip-header-left { display: none; }\n" +
          "  .vip-vault-page-container { grid-template-columns: 1fr; gap: 32px; margin: 20px auto 40px; padding: 0 16px; }\n" +
          "  .vip-vault-form-grid { grid-template-columns: 1fr; gap: 14px; }\n" +
          "  .vip-dash-shell { padding: 0 16px; margin: 18px auto 48px; }\n" +
          "  .vip-dash-hero-top, .vip-dash-tier-strip, .vip-dash-card { padding: 20px 18px; }\n" +
          "}\n" +
          "@media (max-width: 540px) {\n" +
          "  .vip-dash-grid { grid-template-columns: 1fr; }\n" +
          "}";
        document.head.appendChild(st);
      }

      function archInput(idx, label, inputHtml) {
        return "<div class='vip-field'>" +
          "<label class='vip-field-label'><span>" + label + "</span> <span style='opacity:0.45;float:right'>[" + idx + "]</span></label>" +
          inputHtml +
        "</div>";
      }

      function archSelect(idx, label, selectHtml) {
        return "<div class='vip-field'>" +
          "<label class='vip-field-label'><span>" + label + "</span> <span style='opacity:0.45;float:right'>[" + idx + "]</span></label>" +
          "<div class='vip-select-group'>" + selectHtml + "<span class='vip-select-arrow'>∨</span></div>" +
        "</div>";
      }

      function noticeHtml() {
        var n = window.__annrVipNotice; window.__annrVipNotice = null;
        if (!n) return "";
        var isOk = n.type === "ok";
        var isInfo = n.type === "info";
        var borderCol = isOk ? "#16a34a" : isInfo ? "#e05a2b" : "#dc2626";
        var bgCol = isOk ? "#f0fdf4" : isInfo ? "#fff7ed" : "#fef2f2";
        var txtCol = isOk ? "#14532d" : isInfo ? "#9a3412" : "#991b1b";
        return "<div role='status' style='border:1px solid " + borderCol + ";border-left:4px solid " + borderCol + ";background:" + bgCol + ";color:" + txtCol + ";padding:14px 18px;font-family:\"FK Grotesk SemiMono\",monospace;font-size:12px;font-weight:600;line-height:1.5;margin-bottom:20px;box-shadow:0 6px 18px rgba(0,0,0,0.04)'>" + esc(n.text) + "</div>";
      }

      function setBusy(form, busy, label) {
        var b = form && form.querySelector("button[type=submit]");
        if (!b) return;
        var textSpan = b.querySelector("span:first-child") || b.querySelector(".text") || b;
        if (busy) {
          b.__label = textSpan.textContent;
          textSpan.textContent = label || "PLEASE WAIT…";
          b.disabled = true;
          b.style.opacity = ".6";
        } else {
          textSpan.textContent = b.__label || textSpan.textContent;
          b.disabled = false;
          b.style.opacity = "1";
        }
      }

      function showErr(form, text) {
        if (!form) return;
        var box = form.querySelector(".vip-err");
        if (!box) {
          box = document.createElement("div"); box.className = "vip-err"; box.setAttribute("role", "alert");
          box.style.cssText = "color:#b91c1c;background:#fef2f2;border:1px solid #f87171;border-left:3px solid #dc2626;padding:12px 14px;font-family:'FK Grotesk SemiMono',monospace;font-size:11.5px;line-height:1.5;margin-bottom:16px;border-radius:2px";
          form.insertBefore(box, form.firstChild);
        }
        var bottomBox = form.querySelector(".vip-err-bottom");
        if (!bottomBox) {
          var submitBtn = form.querySelector("button[type=submit]");
          if (submitBtn) {
            bottomBox = document.createElement("div");
            bottomBox.className = "vip-err-bottom";
            bottomBox.setAttribute("role", "alert");
            bottomBox.style.cssText = "color:#b91c1c;background:#fef2f2;border:1px solid #f87171;border-left:3px solid #dc2626;padding:12px 14px;font-family:'FK Grotesk SemiMono',monospace;font-size:11.5px;line-height:1.5;margin-bottom:14px;margin-top:6px;border-radius:2px";
            submitBtn.parentNode.insertBefore(bottomBox, submitBtn);
          }
        }
        box.textContent = text;
        box.style.display = text ? "block" : "none";
        if (bottomBox) {
          bottomBox.textContent = text;
          bottomBox.style.display = text ? "block" : "none";
        }
        if (text) {
          try {
            (bottomBox || box).scrollIntoView({ behavior: "smooth", block: "center" });
          } catch(e) {}
        }
      }

      function vipContainer() {
        return document.querySelector(".vip-login .vip-form__wrapper") ||
               document.querySelector(".vip-signing .vip-form__wrapper") ||
               document.querySelector(".customer-register-form-wrapper") ||
               document.querySelector(".vip-form__wrapper");
      }

      function wireGeo(root) {
        var dv = root.querySelector("#vip-reg-division"), ds = root.querySelector("#vip-reg-district");
        if (!dv || !ds) return;
        var upd = function () {
          var val = dv.value;
          var list = BD_GEO[val] || [];
          if (!val || !list.length) {
            ds.innerHTML = "<option value='' disabled selected>Select district</option>";
          } else {
            ds.innerHTML = "<option value='' disabled>Select district</option>" + list.map(function (d, i) {
              return "<option value='" + esc(d) + "'" + (i === 0 ? " selected" : "") + ">" + esc(d) + "</option>";
            }).join("");
          }
        };
        dv.onchange = upd;
        if (dv.value) upd();
        var ref = root.querySelector("#vip-reg-refcode");
        var urlRef = new URLSearchParams(location.search).get("ref") || "";
        if (!urlRef) {
          try { urlRef = localStorage.getItem("annr_active_ref_code") || ""; } catch (e) {}
        }
        if (ref && urlRef && /^[A-Za-z0-9_-]{3,24}$/.test(urlRef)) {
          ref.value = urlRef.toUpperCase();
        }
      }

      var ADMIN_OWNER_EMAIL = "arahimratul2004@gmail.com";
      var ADMIN_OWNER_OFFLINE_HASH = "460e6ab9ee0bc8b560fff79423e933fb6a5873f77da9be0489273c0f4a3454cd";
      var ADMIN_ROLE_PRIORITY = {
        super_admin: 8,
        admin: 7,
        content_manager: 6,
        product_manager: 5,
        order_manager: 4,
        marketing_manager: 3,
        analytics_viewer: 2,
        support_agent: 1
      };

      function isValidAdminRole(role) {
        return typeof role === "string" && Object.prototype.hasOwnProperty.call(ADMIN_ROLE_PRIORITY, role);
      }

      function pickHighestRole(roles) {
        var best = null;
        if (!Array.isArray(roles)) return null;
        for (var i = 0; i < roles.length; i++) {
          var r = roles[i];
          if (isValidAdminRole(r) && (!best || ADMIN_ROLE_PRIORITY[r] > ADMIN_ROLE_PRIORITY[best])) {
            best = r;
          }
        }
        return best;
      }

      function getLocalStaffEntry(email) {
        try {
          var em = String(email || "").toLowerCase().trim();
          if (!em) return null;
          var rawAdminStore = localStorage.getItem("shihiko-admin-v1");
          if (!rawAdminStore) return null;
          var parsed = JSON.parse(rawAdminStore);
          if (!parsed || !Array.isArray(parsed.admins)) return null;
          return parsed.admins.find(function (a) {
            return a && typeof a.email === "string" && a.email.toLowerCase().trim() === em;
          }) || null;
        } catch (e) {
          return null;
        }
      }

      function hasValidAdminSession() {
        try {
          var raw = sessionStorage.getItem("shihiko-admin-session") || localStorage.getItem("shihiko-admin-session");
          if (!raw) return false;
          var p = JSON.parse(raw);
          var now = Date.now();
          var em = String((p && (p.email || (p.user && p.user.email))) || "").toLowerCase().trim();
          var role = String((p && (p.role || (p.user && p.user.role))) || "").trim();
          var started = typeof p.startedAt === "number" ? p.startedAt : (typeof p.timestamp === "number" ? p.timestamp : 0);
          var seen = typeof p.lastSeen === "number" ? p.lastSeen : (typeof p.timestamp === "number" ? p.timestamp : 0);
          if (p && em && isValidAdminRole(role) && started > 0 && seen > 0 && (now - seen < 1800000) && (now - started < 28800000)) {
            return true;
          }
          sessionStorage.removeItem("shihiko-admin-session");
          localStorage.removeItem("shihiko-admin-session");
        } catch (e) {
          try {
            sessionStorage.removeItem("shihiko-admin-session");
            localStorage.removeItem("shihiko-admin-session");
          } catch (e2) {}
        }
        return false;
      }

      function isMemberAdmin(emailOrMember) {
        try {
          var em = "";
          if (typeof emailOrMember === "string") em = emailOrMember.toLowerCase().trim();
          else if (emailOrMember && typeof emailOrMember === "object") em = String(emailOrMember.email || "").toLowerCase().trim();
          if (!em) return false;
          if (em === ADMIN_OWNER_EMAIL) return true;
          return !!getLocalStaffEntry(em);
        } catch (e) {}
        return false;
      }

      function ensureAdminSessionAndRedirect(emailOrMember, explicitRole) {
        try {
          var em = "";
          var id = "";
          if (typeof emailOrMember === "string") {
            em = emailOrMember.toLowerCase().trim();
          } else if (emailOrMember && typeof emailOrMember === "object") {
            em = String(emailOrMember.email || "").toLowerCase().trim();
            id = String(emailOrMember.id || "");
          }
          if (!em) return false;

          var role = isValidAdminRole(explicitRole) ? explicitRole : null;
          if (!role && em === ADMIN_OWNER_EMAIL) {
            role = "super_admin";
          } else if (!role) {
            var staff = getLocalStaffEntry(em);
            if (staff && isValidAdminRole(staff.role)) role = staff.role;
          }
          if (!role) return false;

          var now = Date.now();
          var resolvedId = id || (em === ADMIN_OWNER_EMAIL ? "admin-arahim" : ("admin-" + em.replace(/[^a-z0-9]/g, "_")));
          var admSess = {
            email: em,
            role: role,
            startedAt: now,
            lastSeen: now,
            reauthAt: now,
            id: resolvedId
          };
          var serialized = JSON.stringify(admSess);
          localStorage.setItem("shihiko-admin-session", serialized);
          sessionStorage.setItem("shihiko-admin-session", serialized);
          window.location.replace("/admin");
          return true;
        } catch (e) {}
        return false;
      }

      function renderInPageVipHub() {
        var c = vipContainer();
        if (!c) return;

        // Only redirect to /admin when an authenticated, non-expired staff session already exists
        if (hasValidAdminSession()) {
          window.location.replace("/admin");
          return;
        }

        var sessionData = getSessionMember();
        if (sessionData && sessionData.member) {
          // Hide static login/signup tab bar when logged in; dashboard renders its own .vip-nav
          try {
            document.querySelectorAll(".vip-tab").forEach(function(el) { el.style.display = "none"; });
          } catch(e) {}

          // Merge latest local member & coupon referral stats before rendering
          try {
            var emKey = (sessionData.member.email || "").toLowerCase().trim();
            var rawMembers = localStorage.getItem("annr-vip-members");
            if (rawMembers) {
              var mList = JSON.parse(rawMembers);
              var localM = Array.isArray(mList) && mList.find(function (x) { return x && (x.email || "").toLowerCase().trim() === emKey; });
              if (localM) {
                sessionData.member.available_points = Math.max(Number(sessionData.member.available_points || 0), Number(localM.available_points || 0));
                sessionData.member.total_earned_points = Math.max(Number(sessionData.member.total_earned_points || 0), Number(localM.total_earned_points || 0));
                sessionData.member.friends_referred = Math.max(Number(sessionData.member.friends_referred || 0), Number(localM.friends_referred || 0));
                sessionData.member.status = localM.status || sessionData.member.status || "active";
                sessionData.member.tier = localM.tier || sessionData.member.tier || "Silver";
              }
            }
          } catch (e) {}

          c.__annrAuthWired = false;
          renderDashboard(c, sessionData);

          // Silently sync live wallet from Supabase using get_vip_member_wallet
          if (sessionData.member.email || sessionData.member.id) {
            callWalletRpc(sessionData.member.email || sessionData.member.id).then(function(res) {
              if (res.ok && res.data && res.data.ok && res.data.member) {
                var synced = syncRemoteWalletPayload(res.data);
                if (!synced) return;
                var curSess = getSessionMember() || sessionData;
                var curM = curSess.member || {};
                var prevPts = Number(curM.available_points || 0);
                var prevPend = Number(curM.pending_points || 0);
                var prevRefs = Number(curM.friends_referred || 0);

                synced.member.available_points = Math.max(prevPts, Number(synced.member.available_points || 0));
                synced.member.total_earned_points = Math.max(Number(curM.total_earned_points || 0), Number(synced.member.total_earned_points || 0));
                synced.member.withdrawn_points = Math.max(Number(curM.withdrawn_points || 0), Number(synced.member.withdrawn_points || 0));
                synced.member.friends_referred = Math.max(prevRefs, Number(synced.member.friends_referred || 0));

                if (curSess.coupon) {
                  synced.coupon.times_used = Math.max(Number(curSess.coupon.times_used || 0), Number(synced.coupon.times_used || 0));
                  synced.coupon.total_points_generated = Math.max(Number(curSess.coupon.total_points_generated || 0), Number(synced.coupon.total_points_generated || 0));
                }

                saveSessionMember(synced);
                if (
                  synced.member.available_points !== prevPts ||
                  Number(synced.member.pending_points || 0) !== prevPend ||
                  synced.member.friends_referred !== prevRefs
                ) {
                  renderDashboard(c, synced);
                }
              }
            });
          }
          return;
        }

        // Ensure legacy cyberpunk elements are removed from DOM
        try {
          document.querySelectorAll(".vip-tab, .vip-bg, .vip-dec, .vip-top, .vip-admin-link, .vip-reset-password, .vip-preloader").forEach(function(el) {
            el.remove();
          });
        } catch(e) {}

        renderAuthForms(c);
      }

      function renderAuthForms(c) {
        try { document.documentElement.classList.remove("vip-has-session"); } catch (e) {}
        var st = getVipSettings();
        var discLabel = st.friend_discount_type === "fixed" ? ("৳" + Number(st.friend_discount_value || 100) + " OFF") : (Number(st.friend_discount_value || 10) + "% OFF");
        var refPts = Number(st.points_per_referral || 100);
        var welcomePts = Number(st.welcome_bonus_points != null ? st.welcome_bonus_points : 100);
        var isLoginPage = /\/account\/login/i.test(location.pathname);
        var isRegisterPage = /\/account\/register/i.test(location.pathname);
        var hasRefParam = /[?&]ref=[^&]+/i.test(location.search);
        var openLoginInitially = (
          isLoginPage &&
          !hasRefParam &&
          location.hash !== "#register" &&
          location.search.indexOf("mode=register") === -1
        ) || location.hash === "#login" || location.search.indexOf("mode=login") !== -1;

        var eyeOpenSvg = "<svg width='17' height='17' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'/><circle cx='12' cy='12' r='3'/></svg>";
        var eyeClosedSvg = "<svg width='17' height='17' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24'/><line x1='1' y1='1' x2='23' y2='23'/></svg>";

        var hasPreRenderedHub = !!(c.querySelector("#vip-signup-form") && c.querySelector("#vip-login-form"));
        if (!hasPreRenderedHub) {
          c.innerHTML =
            "<div id='vip-inpage-hub'>" +
              noticeHtml() +

            // 2-Column Split Page Container
            "<div class='vip-vault-page-container'>" +
              // Left Column: The AnnR Vault Card
              "<div class='vip-vault-card'>" +
                "<div class='vip-vault-card-body'>" +
                  "<div class='vip-vault-card-topline'>" +
                    "<span>ANNR VIP MEMBERSHIP</span>" +
                    "<div class='line'></div>" +
                  "</div>" +
                  "<h1 class='vip-vault-card-heading'>THE ANNR<br>VAULT</h1>" +
                  "<p class='vip-vault-card-tagline'>A PRIVATE SPACE FOR THOSE WHO DEFINE THEIR STYLE.</p>" +

                  "<div class='vip-vault-perks'>" +
                    "<div class='vip-vault-perk-item'>" +
                      "<div class='vip-vault-perk-icon'>" +
                        "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><path d='M20 12v10H4V12'/><path d='M2 7h20v5H2z'/><path d='M12 22V7'/><path d='M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z'/><path d='M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z'/></svg>" +
                      "</div>" +
                      "<div class='vip-vault-perk-text'>" +
                        "<div class='perk-label'>WELCOME REWARD</div>" +
                        "<div class='perk-val'>+৳" + welcomePts + " CASH POINTS</div>" +
                      "</div>" +
                    "</div>" +
                    "<div class='vip-vault-divider'></div>" +

                    "<div class='vip-vault-perk-item'>" +
                      "<div class='vip-vault-perk-icon'>" +
                        "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><path d='M2 9a3 3 0 0 1 0 6v3a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3a3 3 0 0 1 0-6V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z'/><line x1='9' y1='9' x2='15' y2='15'/><circle cx='9.5' cy='9.5' r='.75' fill='currentColor'/><circle cx='14.5' cy='14.5' r='.75' fill='currentColor'/></svg>" +
                      "</div>" +
                      "<div class='vip-vault-perk-text'>" +
                        "<div class='perk-label'>FRIEND COUPON</div>" +
                        "<div class='perk-val'>" + esc(discLabel) + "</div>" +
                      "</div>" +
                    "</div>" +
                    "<div class='vip-vault-divider'></div>" +

                    "<div class='vip-vault-perk-item'>" +
                      "<div class='vip-vault-perk-icon'>" +
                        "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'/><circle cx='9' cy='7' r='4'/><path d='M23 21v-2a4 4 0 0 0-3-3.87'/><path d='M16 3.13a4 4 0 0 1 0 7.75'/></svg>" +
                      "</div>" +
                      "<div class='vip-vault-perk-text'>" +
                        "<div class='perk-label'>REFERRAL REWARD</div>" +
                        "<div class='perk-val'>+৳" + refPts + " / SUCCESSFUL REFERRAL</div>" +
                      "</div>" +
                    "</div>" +
                    "<div class='vip-vault-divider'></div>" +
                  "</div>" +

                  "<p class='vip-vault-footnote'>ANNR Points are redeemable on eligible orders, according to the VIP programme rules.</p>" +
                "</div>" +
                "<div class='vip-vault-fabric-wrap'>" +
                  "<img src='/_ext/annr-vault-fabric.jpg' alt='AnnR Craftsmanship'>" +
                "</div>" +
              "</div>" +

              // Right Column: Form Area
              "<div class='vip-vault-form-pane'>" +
                "<div class='vip-vault-form-topline'>ANNR VIP MEMBERSHIP / <span>01</span></div>" +
                "<h2 class='vip-vault-form-title' id='vip-form-title'>CREATE YOUR ACCOUNT</h2>" +
                "<div class='vip-vault-form-subtitle' id='vip-form-sub'>Join the Vault. Earn rewards. Share the experience.</div>" +

                // Segmented Switcher
                "<div class='vip-vault-auth-switcher'>" +
                  "<button type='button' id='vip-tab-signup-btn' class='active'>CREATE ACCOUNT</button>" +
                  "<button type='button' id='vip-tab-signin-btn'>SIGN IN</button>" +
                "</div>" +

                // SIGNUP FORM
                "<form id='vip-signup-form' novalidate>" +
                  "<div class='vip-vault-form-grid'>" +
                    "<div class='vip-field'>" +
                      "<label class='vip-field-label'>FULL NAME <span class='req'>*</span></label>" +
                      "<input type='text' id='vip-reg-name' required maxlength='120' autocomplete='name' autocapitalize='words' autocorrect='off' spellcheck='false' placeholder='Enter your full name'>" +
                    "</div>" +
                    "<div class='vip-field'>" +
                      "<label class='vip-field-label'>EMAIL ADDRESS <span class='req'>*</span></label>" +
                      "<input type='email' id='vip-reg-email' required autocomplete='email' autocapitalize='none' autocorrect='off' spellcheck='false' inputmode='email' placeholder='Enter your email address'>" +
                    "</div>" +

                    "<div class='vip-field'>" +
                      "<label class='vip-field-label'>MOBILE NUMBER <span class='req'>*</span></label>" +
                      "<div class='vip-phone-group'>" +
                        "<span class='vip-cc'>+880</span>" +
                        "<input type='tel' id='vip-reg-phone' required inputmode='numeric' autocomplete='tel' placeholder='Enter 11-digit mobile number' pattern='^01[3-9][0-9]{8}$'>" +
                      "</div>" +
                    "</div>" +
                    "<div class='vip-field'>" +
                      "<label class='vip-field-label'>PASSWORD <span class='req'>*</span></label>" +
                      "<div class='vip-pass-group'>" +
                        "<input type='password' id='vip-reg-pass' required minlength='6' autocomplete='new-password' autocapitalize='none' autocorrect='off' spellcheck='false' placeholder='Create a password (min 6 characters)'>" +
                        "<button type='button' class='vip-eye-toggle' id='vip-reg-eye' aria-label='Toggle password visibility'>" + eyeOpenSvg + "</button>" +
                      "</div>" +
                    "</div>" +

                    "<div class='vip-field'>" +
                      "<label class='vip-field-label'>DIVISION (OPTIONAL)</label>" +
                      "<div class='vip-select-group'>" +
                        "<select id='vip-reg-division'>" +
                          "<option value='' selected>Select division (Default: Dhaka)</option>" +
                          Object.keys(BD_GEO).map(function (d) { return "<option value='" + esc(d) + "'>" + esc(d) + "</option>"; }).join("") +
                        "</select>" +
                        "<span class='vip-select-arrow'>∨</span>" +
                      "</div>" +
                    "</div>" +
                    "<div class='vip-field'>" +
                      "<label class='vip-field-label'>DISTRICT (OPTIONAL)</label>" +
                      "<div class='vip-select-group'>" +
                        "<select id='vip-reg-district'>" +
                          "<option value='' selected>Select district (Default: Dhaka)</option>" +
                        "</select>" +
                        "<span class='vip-select-arrow'>∨</span>" +
                      "</div>" +
                    "</div>" +

                    "<div class='vip-field'>" +
                      "<label class='vip-field-label'>DELIVERY ADDRESS (OPTIONAL)</label>" +
                      "<input type='text' id='vip-reg-addr' maxlength='300' autocomplete='street-address' autocapitalize='sentences' autocorrect='off' placeholder='Thana, Road, House (Optional)'>" +
                    "</div>" +
                    "<div class='vip-field'>" +
                      "<label class='vip-field-label'>FRIEND'S REFERRAL CODE (OPTIONAL)</label>" +
                      "<input type='text' id='vip-reg-refcode' maxlength='24' autocapitalize='characters' placeholder='Enter referral code (e.g. VIP-ANNR10)'>" +
                    "</div>" +
                  "</div>" +
                  "<input type='hidden' id='vip-reg-thana' value=''>" +

                  "<div class='vip-vault-checks'>" +
                    "<label class='vip-checkbox-label'>" +
                      "<input type='checkbox' id='vip-reg-wa' checked>" +
                      "<span>Get updates and exclusive offers on WhatsApp.</span>" +
                    "</label>" +
                    "<label class='vip-checkbox-label'>" +
                      "<input type='checkbox' id='vip-reg-terms' checked>" +
                      "<span>I agree to the <a href='/pages/terms' target='_blank'>Terms of Service</a> and <a href='/pages/privacy' target='_blank'>Privacy Policy</a>.</span>" +
                    "</label>" +
                  "</div>" +

                  "<button type='submit' class='vip-vault-submit-btn'>" +
                    "<span class='text'>CREATE VIP ACCOUNT</span> <span style='font-size:14px'>→</span>" +
                  "</button>" +
                  "<div class='vip-vault-microcopy'>Your welcome reward is credited after successful activation.</div>" +
                  "<div class='vip-vault-switch-text'>Already a member? <button type='button' id='vip-switch-to-login'>Sign in</button></div>" +
                "</form>" +

                // SIGN IN FORM
                "<form id='vip-login-form' novalidate style='display:none'>" +
                  "<div class='vip-vault-login-fields'>" +
                    "<div class='vip-field'>" +
                      "<label class='vip-field-label'>EMAIL OR MOBILE NUMBER <span class='req'>*</span></label>" +
                      "<input type='text' id='vip-login-id' required autocomplete='username' autocapitalize='none' autocorrect='off' spellcheck='false' placeholder='Enter your registered email or phone'>" +
                    "</div>" +
                    "<div class='vip-field'>" +
                      "<label class='vip-field-label'>PASSWORD <span class='req'>*</span></label>" +
                      "<div class='vip-pass-group'>" +
                        "<input type='password' id='vip-login-pass' required autocomplete='current-password' autocapitalize='none' autocorrect='off' spellcheck='false' placeholder='Enter your password'>" +
                        "<button type='button' class='vip-eye-toggle' id='vip-login-eye' aria-label='Toggle password visibility'>" + eyeOpenSvg + "</button>" +
                      "</div>" +
                    "</div>" +
                  "</div>" +

                  "<button type='submit' class='vip-vault-submit-btn'>" +
                    "<span class='text'>SIGN IN TO VIP ACCOUNT</span> <span style='font-size:14px'>→</span>" +
                  "</button>" +
                  "<div class='vip-vault-microcopy'>Secure encrypted access to your ANNR VIP vault.</div>" +
                  "<div class='vip-vault-switch-text'>New to AnnR? <button type='button' id='vip-switch-to-signup'>Create an account</button></div>" +
                "</form>" +
              "</div>" +
            "</div>" +
          "</div>";
        } else {
          // Keep pre-rendered Vault card perk numbers synced with live loyalty settings
          try {
            var perkVals = c.querySelectorAll(".vip-vault-perk-text .perk-val");
            if (perkVals.length >= 3) {
              perkVals[0].textContent = "+৳" + welcomePts + " CASH POINTS";
              perkVals[1].textContent = discLabel;
              perkVals[2].textContent = "+৳" + refPts + " / SUCCESSFUL REFERRAL";
            }
          } catch (e) {}
          var nHtml = noticeHtml();
          if (nHtml) {
            var existingNotice = c.querySelector(".vip-notice-banner");
            if (!existingNotice) {
              var hubEl = c.querySelector("#vip-inpage-hub") || c;
              var dNotice = document.createElement("div");
              dNotice.innerHTML = nHtml;
              if (dNotice.firstChild) hubEl.insertBefore(dNotice.firstChild, hubEl.firstChild);
            }
          }
          if (c.__annrAuthWired && c.querySelector("#vip-signup-form") && c.querySelector("#vip-login-form")) {
            return;
          }
        }

        c.__annrAuthWired = true;
        var fl = c.querySelector("#vip-login-form"), fs = c.querySelector("#vip-signup-form");
        if (fl) { fl.setAttribute("action", "javascript:void(0);"); fl.onsubmit = function(e) { e.preventDefault(); }; }
        if (fs) { fs.setAttribute("action", "javascript:void(0);"); fs.onsubmit = function(e) { e.preventDefault(); }; }
        var tabSignup = c.querySelector("#vip-tab-signup-btn"), tabSignin = c.querySelector("#vip-tab-signin-btn");
        var formTitle = c.querySelector("#vip-form-title"), formSub = c.querySelector("#vip-form-sub");
        var switchToLogin = c.querySelector("#vip-switch-to-login"), switchToSignup = c.querySelector("#vip-switch-to-signup");

        function showSignin(openSignin, updateHash) {
          fl.style.display = openSignin ? "block" : "none";
          fs.style.display = openSignin ? "none" : "block";
          if (tabSignup) tabSignup.classList.toggle("active", !openSignin);
          if (tabSignin) tabSignin.classList.toggle("active", !!openSignin);
          if (formTitle) formTitle.textContent = openSignin ? "SIGN IN TO YOUR ACCOUNT" : "CREATE YOUR ACCOUNT";
          if (formSub) formSub.textContent = openSignin ? "Welcome back to the Vault. Track your rewards and referrals." : "Join the Vault. Earn rewards. Share the experience.";
          showErr(fl, "");
          showErr(fs, "");
          if (updateHash && window.history && window.history.replaceState) {
            var newHash = openSignin ? "#login" : "#register";
            window.history.replaceState(null, "", location.pathname + location.search + newHash);
          }
        }

        if (tabSignup) tabSignup.onclick = function(e) { e.preventDefault(); showSignin(false, true); };
        if (tabSignin) tabSignin.onclick = function(e) { e.preventDefault(); showSignin(true, true); };
        if (switchToLogin) switchToLogin.onclick = function(e) { e.preventDefault(); showSignin(true, true); };
        if (switchToSignup) switchToSignup.onclick = function(e) { e.preventDefault(); showSignin(false, true); };

        function wireEye(btn, inp) {
          if (!btn || !inp) return;
          btn.onclick = function(e) {
            e.preventDefault();
            var isPass = inp.type === "password";
            inp.type = isPass ? "text" : "password";
            btn.innerHTML = isPass ? eyeClosedSvg : eyeOpenSvg;
          };
        }

        wireEye(c.querySelector("#vip-reg-eye"), c.querySelector("#vip-reg-pass"));
        wireEye(c.querySelector("#vip-login-eye"), c.querySelector("#vip-login-pass"));

        showSignin(openLoginInitially);
        wireGeo(fs);

        // Sign In Form Handler (Authenticated Staff/Super Admin + VIP Customer Login)
        fl.onsubmit = function (e) {
          e.preventDefault();
          var idInput = String(c.querySelector("#vip-login-id").value || "").trim();
          var pw = String(c.querySelector("#vip-login-pass").value || "").trim();

          if (!idInput || !pw) {
            showErr(fl, "Please enter your email or mobile number and password.");
            return;
          }

          showErr(fl, "");
          setBusy(fl, true, "AUTHENTICATING…");

          var email = "";
          var phone = "";
          var accounts = getVipAccounts();
          var cleanId = idInput.toLowerCase().trim();

          // Only exact owner username 'arahim' maps to the owner email; never allow wildcard/demo shortcuts.
          if (cleanId === "arahim") {
            email = ADMIN_OWNER_EMAIL;
          } else if (idInput.indexOf("@") !== -1) {
            email = cleanId;
          } else {
            phone = idInput.replace(/[^0-9]/g, "");
            if (phone.startsWith("880")) phone = phone.slice(3);
            if (phone.length === 10 && /^1[3-9]/.test(phone)) phone = "0" + phone;
          }

          var targetId = email || phone || idInput;
          var acc = (email ? accounts[email] : null) || (phone ? accounts[phone] : null);

          // Look up existing VIP wallet by exact email, phone, or referral code only (never display name)
          if (!acc) {
            try {
              var rawMembers = localStorage.getItem("annr-vip-members");
              if (rawMembers) {
                var mList = JSON.parse(rawMembers);
                if (Array.isArray(mList)) {
                  var found = mList.find(function(m) {
                    if (!m) return false;
                    var mEmail = (m.email || "").toLowerCase().trim();
                    var mPhone = (m.phone || "").replace(/[^0-9]/g, "");
                    var mCode = (m.referral_code || "").toUpperCase().trim();
                    if (email && mEmail === email) return true;
                    if (phone && mPhone === phone) return true;
                    if (cleanId && (mCode === cleanId.toUpperCase() || mEmail === cleanId)) return true;
                    return false;
                  });
                  if (found) {
                    email = (found.email || email).toLowerCase().trim();
                    phone = found.phone || phone;
                    acc = {
                      email: email,
                      phone: phone,
                      name: found.full_name || "VIP Member",
                      passHash: found.passHash || found.password_hash || "",
                      available_points: found.available_points != null ? found.available_points : 100,
                      member: found,
                      coupon: { code: found.referral_code || "VIP-ANNR10" }
                    };
                  }
                }
              }
            } catch(e) {}
          }

          function attemptSupabaseStaffLogin() {
            if (!email) return Promise.resolve({ handled: false, networkOffline: false, rejected: false });
            return fetch(SB_URL + "/auth/v1/token?grant_type=password", {
              method: "POST",
              headers: {
                "apikey": SB_KEY,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ email: email, password: pw.slice(0, 200) })
            }).then(function (r) {
              return r.json().catch(function () { return {}; }).then(function (authData) {
                if (r.ok && authData && authData.access_token && authData.user) {
                  // Persist Supabase session so /admin routes execute authenticated RLS queries immediately
                  try {
                    var expiresIn = Number(authData.expires_in) || 3600;
                    var expiresAt = authData.expires_at || (Math.floor(Date.now() / 1000) + expiresIn);
                    localStorage.setItem("sb-aooydxydkyjtulhduexa-auth-token", JSON.stringify({
                      access_token: authData.access_token,
                      refresh_token: authData.refresh_token || "",
                      token_type: authData.token_type || "bearer",
                      expires_in: expiresIn,
                      expires_at: expiresAt,
                      user: authData.user
                    }));
                  } catch (e) {}

                  var isExactOwner = email === ADMIN_OWNER_EMAIL;
                  return fetch(SB_URL + "/rest/v1/user_roles?user_id=eq." + encodeURIComponent(authData.user.id) + "&select=role", {
                    headers: {
                      "apikey": SB_KEY,
                      "Authorization": "Bearer " + authData.access_token
                    }
                  }).then(function (rr) {
                    return rr.json().catch(function () { return null; }).then(function (roleRows) {
                      var resolvedRole = isExactOwner ? "super_admin" : null;
                      if (rr.ok && Array.isArray(roleRows) && roleRows.length > 0) {
                        var dbRole = pickHighestRole(roleRows.map(function (x) { return x && x.role; }));
                        if (dbRole) {
                          resolvedRole = isExactOwner && ADMIN_ROLE_PRIORITY[dbRole] < ADMIN_ROLE_PRIORITY.super_admin ? "super_admin" : dbRole;
                        }
                      } else if (!rr.ok) {
                        var localStaff = getLocalStaffEntry(email);
                        if (localStaff && isValidAdminRole(localStaff.role)) resolvedRole = localStaff.role;
                      }

                      if (isExactOwner && (!Array.isArray(roleRows) || !roleRows.some(function (x) { return x && x.role === "super_admin"; }))) {
                        fetch(SB_URL + "/rest/v1/user_roles?on_conflict=user_id,role", {
                          method: "POST",
                          headers: {
                            "apikey": SB_KEY,
                            "Authorization": "Bearer " + authData.access_token,
                            "Content-Type": "application/json",
                            "Prefer": "resolution=ignore-duplicates"
                          },
                          body: JSON.stringify({
                            user_id: authData.user.id,
                            role: "super_admin",
                            granted_at: new Date().toISOString()
                          })
                        }).catch(function () {});
                      }

                      if (resolvedRole) {
                        setBusy(fl, false);
                        ensureAdminSessionAndRedirect({ email: email, id: authData.user.id }, resolvedRole);
                        return { handled: true };
                      }
                      // Regular authenticated customer without staff role continues to VIP login
                      return { handled: false, networkOffline: false, rejected: false };
                    });
                  }).catch(function () {
                    var fallbackRole = isExactOwner ? "super_admin" : null;
                    if (!fallbackRole) {
                      var ls = getLocalStaffEntry(email);
                      if (ls && isValidAdminRole(ls.role)) fallbackRole = ls.role;
                    }
                    if (fallbackRole) {
                      setBusy(fl, false);
                      ensureAdminSessionAndRedirect({ email: email, id: authData.user.id }, fallbackRole);
                      return { handled: true };
                    }
                    return { handled: false, networkOffline: false, rejected: false };
                  });
                }

                // 4xx from Supabase Auth means explicit credential rejection (never fall back offline)
                if (r.status >= 400 && r.status < 500) {
                  return { handled: false, networkOffline: false, rejected: true };
                }
                return { handled: false, networkOffline: true, rejected: false };
              });
            }).catch(function () {
              return { handled: false, networkOffline: true, rejected: false };
            });
          }

          attemptSupabaseStaffLogin().then(function (staffRes) {
            if (staffRes.handled) return;

            // Offline-only cryptographic SHA-256 verification for admin/staff when Supabase Auth is unreachable
            if (staffRes.networkOffline && email) {
              var adminHash = sha256HexSync(email + ":" + pw.slice(0, 200));
              var staffEntry = getLocalStaffEntry(email);
              var isOwnerMatch = email === ADMIN_OWNER_EMAIL && adminHash === ADMIN_OWNER_OFFLINE_HASH;
              var isStaffHashMatch = Boolean(staffEntry && staffEntry.passwordHash && adminHash === staffEntry.passwordHash);
              if (isOwnerMatch || isStaffHashMatch) {
                var offRole = isOwnerMatch ? "super_admin" : (isValidAdminRole(staffEntry.role) ? staffEntry.role : null);
                if (offRole) {
                  setBusy(fl, false);
                  ensureAdminSessionAndRedirect({ email: email, id: staffEntry ? staffEntry.id : "admin-arahim" }, offRole);
                  return;
                }
              }
            }

            // If user explicitly tried to sign into the owner admin account and Supabase rejected password
            if (staffRes.rejected && email === ADMIN_OWNER_EMAIL) {
              setBusy(fl, false);
              showErr(fl, "Wrong email or password.");
              return;
            }

            hashPassword(pw).then(function(inputHash) {
              var legacySaltHash = sha256HexSync("annr_vip_salt_2026:" + pw);

              function passMatches(storedHash) {
                if (!storedHash) return false;
                return storedHash === inputHash || storedHash === legacySaltHash;
              }

              function useLocalAccount() {
                var member = acc.member || {
                  full_name: acc.name || "VIP Member",
                  email: acc.email || email,
                  phone: acc.phone || phone,
                  tier: "Silver",
                  available_points: acc.available_points != null ? acc.available_points : 100,
                  total_earned_points: acc.available_points != null ? acc.available_points : 100,
                  referral_code: (acc.coupon && acc.coupon.code) || "VIP-ANNR" + Math.floor(100 + Math.random() * 899),
                  status: "active"
                };

                var coupon = acc.coupon || {
                  code: member.referral_code || "VIP-ANNR10",
                  discount_value: 10,
                  discount_type: "percent",
                  times_used: 0,
                  total_points_generated: 0
                };

                saveSessionMember({
                  member: member,
                  coupon: coupon,
                  settings: getVipSettings()
                });
                saveVipAccount(acc);
                setBusy(fl, false);
                renderInPageVipHub();
                try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch(e) {}
              }

              // Attempt VIP member login via Supabase RPC with salted SHA-256 hash
              callLoginRpc(targetId, inputHash, pw).then(function(res) {
                if (res.ok && res.data && res.data.ok) {
                  var synced = syncRemoteWalletPayload(res.data) || {
                    member: res.data.member,
                    coupon: res.data.coupon || { code: res.data.member.referral_code },
                    settings: res.data.settings || getVipSettings()
                  };
                  var m = synced.member;
                  var cpn = synced.coupon;
                  var sets = synced.settings;
                  saveSessionMember({ member: m, coupon: cpn, settings: sets });
                  saveVipAccount({
                    email: (m.email || email).toLowerCase().trim(),
                    phone: m.phone || phone,
                    name: m.full_name,
                    passHash: inputHash,
                    available_points: m.available_points,
                    member: m,
                    coupon: cpn
                  });
                  setBusy(fl, false);
                  renderInPageVipHub();
                  try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch(e) {}
                  return;
                }

                // Explicit credentials error returned by Supabase (e.g. wrong password)
                if (res.ok && res.data && res.data.ok === false && res.data.error) {
                  if (acc && passMatches(acc.passHash)) {
                    useLocalAccount();
                    return;
                  }
                  setBusy(fl, false);
                  showErr(fl, res.data.error);
                  return;
                }

                // Fallback to local account ONLY when verified against stored hash
                if (acc) {
                  if (!passMatches(acc.passHash)) {
                    setBusy(fl, false);
                    showErr(fl, "Incorrect password. Please verify your password and try again.");
                    return;
                  }
                  useLocalAccount();
                  return;
                }

                setBusy(fl, false);
                showErr(fl, "Wrong email/phone or password, or no VIP account exists yet.");
              }).catch(function() {
                if (acc) {
                  if (!passMatches(acc.passHash)) {
                    setBusy(fl, false);
                    showErr(fl, "Incorrect password. Please verify your password and try again.");
                    return;
                  }
                  useLocalAccount();
                  return;
                }
                setBusy(fl, false);
                showErr(fl, "Wrong email/phone or password, or no VIP account exists yet.");
              });
            }).catch(function(err) {
              setBusy(fl, false);
              showErr(fl, (err && err.message) || "Could not complete authentication. Please try again.");
            });
          });
        };

        // Create VIP Account Handler
        fs.onsubmit = function (e) {
          e.preventDefault();
          var em = String(c.querySelector("#vip-reg-email").value || "").trim().toLowerCase();
          var pw = String(c.querySelector("#vip-reg-pass").value || "").trim();
          var nm = String(c.querySelector("#vip-reg-name").value || "").trim();
          var phRaw = String(c.querySelector("#vip-reg-phone").value || "").replace(/[^0-9]/g, "");
          if (phRaw.startsWith("880")) phRaw = phRaw.slice(3);
          if (phRaw.length === 10 && /^1[3-9]/.test(phRaw)) phRaw = "0" + phRaw;
          var ph = phRaw;
          var isWa = !!(c.querySelector("#vip-reg-wa") || {}).checked;
          var termsAgreed = !!(c.querySelector("#vip-reg-terms") || {}).checked;
          var div = String(c.querySelector("#vip-reg-division").value || "").trim();
          var dist = String(c.querySelector("#vip-reg-district").value || "").trim();
          var thana = String((c.querySelector("#vip-reg-thana") || {}).value || "").trim();
          var addr = String(c.querySelector("#vip-reg-addr").value || "").trim();
          var ref = String(c.querySelector("#vip-reg-refcode").value || "").trim().toUpperCase();

          if (nm.length < 2) {
            showErr(fs, "Please enter your full name."); return;
          }
          if (!/^[^@\s]{1,64}@[^@\s]{1,190}\.[a-z]{2,}$/i.test(em)) {
            showErr(fs, "Enter a valid email address."); return;
          }
          if (ph.length < 8 || ph.length > 15) {
            showErr(fs, "Please enter a valid mobile number (8 to 15 digits)."); return;
          }
          if (pw.length < 6) {
            showErr(fs, "Password must be at least 6 characters."); return;
          }
          if (!div) {
            div = "Dhaka";
          }
          if (!dist) {
            dist = (BD_GEO[div] && BD_GEO[div][0]) || "Dhaka";
          }
          if (!addr || addr.length < 2) {
            addr = "Dhaka";
          }

          showErr(fs, "");
          setBusy(fs, true, "CREATING VIP ACCOUNT…");

          hashPassword(pw).then(function(hash) {
            callRegisterRpc({
              p_full_name: nm,
              p_email: em,
              p_phone: ph,
              p_division: div,
              p_district: dist,
              p_upazila: thana || null,
              p_full_address: addr,
              p_is_whatsapp: isWa,
              p_referred_by: ref || null,
              p_password_hash: hash,
              p_plain_password: null
            }).then(function(res) {
              setBusy(fs, false);

              // Explicit failure from backend (e.g. existing email or legacy phone collision)
              if (res.ok && res.data && res.data.ok === false) {
                if (res.data.existing) {
                  // Check if the EMAIL exists by trying to log in with email first
                  callLoginRpc(em, hash, pw).then(function(loginRes) {
                    if (loginRes.ok && loginRes.data && loginRes.data.ok) {
                      var synced = syncRemoteWalletPayload(loginRes.data) || {
                        member: loginRes.data.member,
                        coupon: loginRes.data.coupon || { code: loginRes.data.member.referral_code },
                        settings: loginRes.data.settings || getVipSettings()
                      };
                      var m = synced.member;
                      var cpn = synced.coupon;
                      saveSessionMember({ member: m, coupon: cpn, settings: synced.settings });
                      saveVipAccount({
                        email: (m.email || em).toLowerCase().trim(),
                        phone: m.phone || ph,
                        name: m.full_name,
                        passHash: hash,
                        available_points: m.available_points,
                        member: m,
                        coupon: cpn
                      });
                      window.__annrVipNotice = {
                        type: "ok",
                        text: "Welcome back, " + (m.full_name || "VIP Member") + "! You are signed into your VIP account."
                      };
                      renderInPageVipHub();
                      try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch(err) {}
                      return;
                    }
                    // If email actually exists in DB (wrong_password: true), switch to Sign In for that email
                    if (loginRes.ok && loginRes.data && loginRes.data.wrong_password) {
                      var idField = c.querySelector("#vip-login-id");
                      if (idField) idField.value = em;
                      showSignin(true, true);
                      var loginForm = c.querySelector("#vip-login-form");
                      if (loginForm) {
                        showErr(loginForm, "An account with " + em + " already exists. Please enter your password to sign in.");
                      }
                      return;
                    }
                    // Otherwise (not_found on email = only a phone number collision on an old test row!), complete registration seamlessly!
                    completeRegistrationWithMember(null, null, getVipSettings(), false);
                  }).catch(function() {
                    completeRegistrationWithMember(null, null, getVipSettings(), false);
                  });
                  return;
                }
                showErr(fs, res.data.error || "Could not complete registration. Please check your credentials.");
                return;
              }

              var syncedPayload = (res.ok && res.data && res.data.ok && res.data.member)
                ? syncRemoteWalletPayload(res.data)
                : null;
              var member = syncedPayload ? syncedPayload.member : null;
              var coupon = syncedPayload ? syncedPayload.coupon : null;
              var settings = syncedPayload ? syncedPayload.settings : getVipSettings();
              completeRegistrationWithMember(member, coupon, settings, !!(res.data && res.data.existing));
            }).catch(function() {
              setBusy(fs, false);
              completeRegistrationWithMember(null, null, getVipSettings(), false);
            });

            function completeRegistrationWithMember(member, coupon, settings, isExisting) {
              settings = normalizeVipSettings(settings || getVipSettings());
              var welcomePts = Number(settings.welcome_bonus_points != null && Number(settings.welcome_bonus_points) > 0 ? settings.welcome_bonus_points : 200);
              if (!member) {
                var prefix = String(settings.referral_code_prefix || "VIP").toUpperCase();
                var fallbackCode = prefix + "-" + nm.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase() + Math.floor(100 + Math.random() * 899);
                member = {
                  id: "vip-" + Date.now().toString(36),
                  full_name: nm,
                  email: em,
                  phone: ph,
                  division: div,
                  district: dist,
                  upazila: thana,
                  full_address: addr,
                  is_whatsapp: isWa,
                  tier: settings.default_tier || "Silver",
                  available_points: welcomePts,
                  pending_points: 0,
                  withdrawn_points: 0,
                  redeemed_points: 0,
                  expired_points: 0,
                  total_earned_points: welcomePts,
                  lifetime_points_earned: welcomePts,
                  lifetime_spend_bdt: 0,
                  orders_count: 0,
                  friends_referred: 0,
                  referral_code: fallbackCode,
                  referred_by_code: ref || null,
                  status: "active",
                  created_at: new Date().toISOString()
                };
                coupon = {
                  code: fallbackCode,
                  discount_value: Number(settings.friend_discount_value || 10),
                  discount_type: settings.friend_discount_type || "percent",
                  min_order_bdt: Number(settings.min_order_for_coupon || 500),
                  times_used: 0,
                  total_points_generated: 0
                };
              } else {
                member = normalizeMemberRecord(member, coupon, settings);
              }

              if (!isExisting && (member.available_points == null || member.available_points < welcomePts)) {
                member.available_points = welcomePts;
                member.total_earned_points = Math.max(welcomePts, Number(member.total_earned_points || welcomePts));
              }

              // Record initial Welcome Bonus in points ledger & member notifications
              if (welcomePts > 0 && !isExisting) {
                appendVipLedgerEntry({
                  member_id: member.id,
                  member_email: em,
                  member_name: nm,
                  transaction_type: "welcome_bonus",
                  points_delta: welcomePts,
                  balance_after: member.available_points,
                  description: "VIP Programme Welcome Registration Bonus (+" + welcomePts + " ANNR Points)",
                  actor: "system"
                });
                appendVipNotification({
                  member_id: member.id,
                  member_email: em,
                  title: "Welcome to ANNR VIP Loyalty!",
                  message: "Your VIP vault is active with +" + welcomePts + " ANNR Points. Share your personal referral coupon " + (coupon ? coupon.code : member.referral_code) + " to earn more rewards.",
                  category: "points_earned"
                });
              }

              // If user registered with a Friend's Referral Code, credit the referrer immediately
              var refBonusNote = "";
              if (ref && ref !== member.referral_code && !isExisting) {
                creditReferrerOnSignup(ref, nm, em);
                try {
                  localStorage.setItem("annr_cart_coupon", ref);
                  localStorage.setItem("annr_active_ref_code", ref);
                } catch (err) {}
                refBonusNote = " Friend referral code " + ref + " linked (" + (settings.friend_discount_type === "fixed" ? "৳" + settings.friend_discount_value : (settings.friend_discount_value || 10) + "%") + " OFF queued for your next order).";
              }

              saveVipAccount({
                email: em,
                phone: ph,
                name: nm,
                passHash: hash,
                available_points: member.available_points,
                member: member,
                coupon: coupon
              });

              saveSessionMember({
                member: member,
                coupon: coupon || { code: member.referral_code, discount_value: 10, discount_type: "percent", times_used: 0, total_points_generated: 0 },
                settings: settings
              });

              if (isExisting) {
                window.__annrVipNotice = {
                  type: "ok",
                  text: "Welcome back, " + (member.full_name || "VIP Member") + "! You are signed into your VIP account (" + member.available_points + " points available)."
                };
              } else {
                window.__annrVipNotice = {
                  type: "ok",
                  text: "Welcome to AnnR VIP! +" + member.available_points + " Welcome Points credited to your vault. Your personal referral coupon is " + (coupon ? coupon.code : member.referral_code) + "." + refBonusNote
                };
              }

              renderInPageVipHub();
              try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch(e) {}
            }
          }).catch(function(err) {
            setBusy(fs, false);
            showErr(fs, (err && err.message) || "Could not complete account creation. Please try again.");
          });
        };
      }

      function renderDashboard(c, d) {
        var m = d.member || {};
        var s = d.settings || getVipSettings();
        var coupon = d.coupon || { code: m.referral_code || "VIP-ANNR10", times_used: 0, total_points_generated: 0 };
        var pv = Number(s.point_value_bdt) || 1.0;
        var tk = function (pts) { return "৳" + Math.round(Number(pts || 0) * pv).toLocaleString(); };
        var minPts = Math.ceil((Number(s.min_withdrawal_bdt) || 100) / pv);
        var avail = Number(m.available_points != null ? m.available_points : 100);
        var redeemedPts = Number(m.redeemed_points || 0);
        var lifetimePts = Math.max(avail + redeemedPts + Number(m.withdrawn_points || 0), Number(m.total_earned_points || 100));
        var disc = s.friend_discount_type === "fixed" ? "৳" + Number(s.friend_discount_value || 100) + " OFF" : Number(s.friend_discount_value || 10) + "% OFF";
        var methods = (s.allowed_payout_methods && s.allowed_payout_methods.length ? s.allowed_payout_methods : ["bkash", "nagad", "rocket", "bank"]);
        var mLabel = { bkash: "bKash (Personal)", nagad: "Nagad (Personal)", rocket: "Rocket", bank: "Bank Transfer" };

        var myCode = String(coupon.code || m.referral_code || "VIP-ANNR").toUpperCase();

        // Retrieve VIP Tiers & evaluate current/next tier
        var allTiers = getVipTiers();
        var currentTierName = m.tier || "Silver";
        var currentTierIdx = 0;
        allTiers.forEach(function (t, idx) {
          if (String(t.name).toLowerCase() === String(currentTierName).toLowerCase()) currentTierIdx = idx;
        });
        var currentTierObj = allTiers[currentTierIdx] || allTiers[0];
        var nextTierObj = allTiers[currentTierIdx + 1] || null;

        // Retrieve Active Campaigns & Member Notifications
        var activeCampaigns = getActiveVipCampaigns();
        var myNotifications = [];
        try {
          var rawNotifs = localStorage.getItem(VIP_NOTIFS_KEY);
          var parsedNotifs = rawNotifs ? JSON.parse(rawNotifs) : [];
          if (Array.isArray(parsedNotifs)) {
            myNotifications = parsedNotifs.filter(function (n) {
              return n && (!n.member_email || (m.email && String(n.member_email).toLowerCase() === m.email.toLowerCase()));
            });
          }
        } catch (e) {}

        // Retrieve Points Transaction Ledger for this member
        var myLedger = [];
        try {
          var rawLed = localStorage.getItem(VIP_LEDGER_KEY);
          var parsedLed = rawLed ? JSON.parse(rawLed) : [];
          if (Array.isArray(parsedLed)) {
            myLedger = parsedLed.filter(function (entry) {
              return entry && (
                (m.email && String(entry.member_email || "").toLowerCase() === m.email.toLowerCase()) ||
                (m.id && entry.member_id === m.id)
              );
            });
          }
        } catch (e) {}

        // Retrieve referral events (both friend signups & checkout orders) for this member's coupon
        var myRefLogs = [];
        try {
          var rawLogs = localStorage.getItem("annr-vip-referrals-log");
          var allLogs = rawLogs ? JSON.parse(rawLogs) : [];
          if (Array.isArray(allLogs)) {
            myRefLogs = allLogs.filter(function (item) {
              return item && (String(item.referral_code || "").toUpperCase() === myCode || (m.email && String(item.referrer_email || "").toLowerCase() === m.email.toLowerCase()));
            });
          }
        } catch (e) {}

        var timesUsed = Math.max(Number(coupon.times_used || 0), Number(m.friends_referred || 0), myRefLogs.length);
        var logEarnedPts = myRefLogs.reduce(function (sum, item) { return sum + (Number(item.points_earned) || 0); }, 0);
        var couponIncomePts = Math.max(
          Number(coupon.total_points_generated || 0),
          logEarnedPts,
          timesUsed * (Number(s.points_per_referral) || 100)
        );
        var welcomeBonusPts = Math.max(
          Number(s.welcome_bonus_points != null ? s.welcome_bonus_points : 200),
          avail >= 200 && timesUsed === 0 ? 200 : 100
        );

        // Ensure Points History & Alerts always include at least the member's Welcome Grant
        if (myLedger.length === 0 && welcomeBonusPts > 0) {
          myLedger = [{
            id: "led-welcome",
            member_id: m.id,
            member_email: m.email,
            member_name: m.full_name,
            transaction_type: "welcome_bonus",
            points_delta: welcomeBonusPts,
            balance_after: avail || welcomeBonusPts,
            description: "VIP Programme Welcome Registration Grant (+" + welcomeBonusPts + " ANNR Points)",
            created_at: m.created_at || new Date().toISOString()
          }];
        }
        if (myNotifications.length === 0) {
          myNotifications = [{
            id: "notif-welcome",
            title: "Welcome to The AnnR VIP Vault",
            message: "Your VIP membership is active with +" + welcomeBonusPts + " ANNR Points (" + tk(welcomeBonusPts) + "). Share your personal referral code " + myCode + " to earn +" + (Number(s.points_per_referral) || 100) + " PTS on every friend signup & order.",
            created_at: m.created_at || new Date().toISOString()
          }];
        }

        // Retrieve past withdrawals for this member across both storage keys
        var myWithdrawals = [];
        try {
          var wMap = {};
          ["annr-withdrawals", "annr-withdrawals-v1"].forEach(function (k) {
            var rawW = localStorage.getItem(k);
            var arr = rawW ? JSON.parse(rawW) : [];
            if (Array.isArray(arr)) {
              arr.forEach(function (w) {
                if (w && (w.member_email === m.email || w.vip_member_id === m.id || (w.vip_members && w.vip_members.email === m.email))) {
                  wMap[w.id || w.request_number] = w;
                }
              });
            }
          });
          myWithdrawals = Object.keys(wMap).map(function (k) { return wMap[k]; });
        } catch (e) {}

        var paidWithdrawnBdt = myWithdrawals
          .filter(function (w) { return w.status === "paid" || w.status === "approved" || w.status === "pending"; })
          .reduce(function (sum, w) { return sum + Number(w.money_amount_bdt || w.points_amount || 0); }, 0);

        var statBox = function (idx, label, value, sub, accent, badgeBg) {
          return "<div class='vip-dash-stat-card' style='border-top:3px solid " + (accent || "#111111") + "'>" +
            "<div style='display:flex;justify-content:space-between;align-items:center;font:9.5px/1 \"FK Grotesk SemiMono\",monospace;text-transform:uppercase;letter-spacing:1.5px;color:#6b665e;margin-bottom:10px'>" +
              "<span>" + label + "</span>" +
              "<span style='background:" + (badgeBg || "#f5f2eb") + ";color:" + (accent || "#111111") + ";padding:3px 6px;font-weight:700;border-radius:2px'>[" + idx + "]</span>" +
            "</div>" +
            "<div style='font:24px/1.1 \"Druk Wide\",\"NB Architekt Std\",sans-serif;font-weight:900;color:" + (accent || "#111111") + ";margin-bottom:8px;word-break:break-word'>" + value + "</div>" +
            "<div style='font:10px/1.35 \"FK Grotesk SemiMono\",monospace;color:#78716c;text-transform:uppercase;letter-spacing:0.6px'>" + sub + "</div>" +
          "</div>";
        };

        var badge = function (st) {
          var isPaid = st === "paid" || st === "completed";
          var isApp = st === "approved";
          var isRej = st === "rejected" || st === "reversed";
          var col = isPaid ? "#15803d" : isApp ? "#1d4ed8" : isRej ? "#b91c1c" : "#b45309";
          var bg = isPaid ? "#f0fdf4" : isApp ? "#eff6ff" : isRej ? "#fef2f2" : "#fffbeb";
          var brd = isPaid ? "#86efac" : isApp ? "#93c5fd" : isRej ? "#fca5a5" : "#fde68a";
          return "<span style='color:" + col + ";background:" + bg + ";border:1px solid " + brd + ";text-transform:uppercase;font:9.5px/1 \"FK Grotesk SemiMono\",monospace;font-weight:700;letter-spacing:1.4px;padding:5px 10px'>" + esc(st) + "</span>";
        };

        // Compute Tier Progress Bar
        var tierProgressPct = 100;
        var tierProgressNote = "HIGHEST VIP TIER UNLOCKED";
        if (nextTierObj) {
          var reqPts = Number(nextTierObj.min_earned_points || 500);
          tierProgressPct = Math.min(100, Math.round((lifetimePts / Math.max(1, reqPts)) * 100));
          var ptsNeeded = Math.max(0, reqPts - lifetimePts);
          tierProgressNote = ptsNeeded > 0
            ? (ptsNeeded + " MORE PTS TO UNLOCK " + String(nextTierObj.name).toUpperCase() + " TIER (" + nextTierObj.point_multiplier + "× MULTIPLIER)")
            : ("QUALIFIED FOR " + String(nextTierObj.name).toUpperCase() + " TIER");
        }

        var payoutProgressPct = Math.min(100, Math.round((avail / Math.max(1, minPts)) * 100));

        c.innerHTML =
          "<div id='vip-inpage-hub'>" +
            "<div class='vip-dash-shell'>" +
              "<div id='vip-dash-notice-slot'>" + noticeHtml() + "</div>" +
              (m.status && m.status !== "active" ? "<div style='border:1px solid #f87171;border-left:4px solid #dc2626;background:#fef2f2;color:#991b1b;padding:14px 18px;font-size:12px;margin-bottom:20px'>Your VIP account status is " + esc(m.status) + ". Please contact AnnR support.</div>" : "") +

              // Luxury Light Hero Identity Banner
              "<div class='vip-dash-hero'>" +
                "<div class='vip-dash-hero-top'>" +
                  "<div>" +
                    "<div style='display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap'>" +
                      "<span style='font:10px/1 \"FK Grotesk SemiMono\",monospace;font-weight:700;letter-spacing:1.8px;color:#c2410c;text-transform:uppercase;border:1px solid #fed7aa;padding:6px 11px;background:#fff7ed'>★ " + esc((m.tier || "SILVER").toUpperCase()) + " TIER (" + (currentTierObj.point_multiplier || 1) + "× PTS)</span>" +
                      "<span style='font:10px/1 \"FK Grotesk SemiMono\",monospace;letter-spacing:1.6px;color:#44403c;text-transform:uppercase;background:#f5f2eb;border:1px solid #dcd6ca;padding:6px 11px'>REF CODE: <strong style='color:#111111'>" + esc(myCode) + "</strong></span>" +
                      "<span style='font:9.5px/1 \"FK Grotesk SemiMono\",monospace;font-weight:700;letter-spacing:1.4px;color:#15803d;text-transform:uppercase;background:#f0fdf4;border:1px solid #bbf7d0;padding:6px 10px'>● VERIFIED VAULT MEMBER</span>" +
                    "</div>" +
                    "<h1 style='font:34px/1.05 \"NB Architekt Std\",sans-serif;font-weight:900;color:#111111;letter-spacing:1.2px;text-transform:uppercase;margin:0 0 6px'>" + esc(m.full_name) + "</h1>" +
                    "<div style='font-family:Georgia,serif;font-size:13.5px;font-style:italic;color:#57534e;margin-bottom:8px'>Private AnnR Vault Member Studio — earn points on every order &amp; friend referral.</div>" +
                    "<div style='font:11px/1.4 \"FK Grotesk SemiMono\",monospace;color:#6b665e'>" + esc(m.phone || "") + " &nbsp;·&nbsp; " + esc(m.email || "") + " &nbsp;·&nbsp; " + esc(m.district || "Dhaka") + ", " + esc(m.division || "Dhaka") + "</div>" +
                  "</div>" +
                  "<div style='display:flex;gap:10px;align-items:center;flex-wrap:wrap'>" +
                    (hasValidAdminSession()
                      ? "<a href='/admin' class='vip-dash-btn-dark' style='background:#111111;border:1.5px solid #111111;color:#ffffff;display:inline-flex;align-items:center;gap:6px'>⚙ ADMIN PANEL</a>"
                      : "") +
                    "<button type='button' id='vip-redeem-checkout-btn' class='vip-dash-btn-orange'>⚡ REDEEM PTS AT CHECKOUT</button>" +
                    "<a href='/collections/unique-campaign/index.html' class='vip-dash-btn-dark'>SHOP UNIQUE ARCHIVE →</a>" +
                    "<button type='button' id='vip-signout-btn' class='vip-dash-btn-light'>SIGN OUT</button>" +
                  "</div>" +
                "</div>" +

                // Tier Progression Bar inside Hero Footer
                "<div class='vip-dash-tier-strip'>" +
                  "<div style='font:10.5px/1.3 \"FK Grotesk SemiMono\",monospace;color:#44403c;letter-spacing:1.2px;text-transform:uppercase'>" +
                    "TIER PROGRESSION &nbsp;·&nbsp; <strong style='color:#e05a2b'>" + lifetimePts.toLocaleString() + " LIFETIME PTS EARNED</strong> &nbsp;·&nbsp; <span style='color:#6b665e'>" + esc(tierProgressNote) + "</span>" +
                  "</div>" +
                  "<div style='display:flex;align-items:center;gap:12px'>" +
                    "<span style='font:10px/1 \"FK Grotesk SemiMono\",monospace;font-weight:700;color:#111111'>" + tierProgressPct + "%</span>" +
                    "<div style='width:240px;max-width:65vw;height:8px;background:#e6e1d7;border-radius:999px;overflow:hidden'>" +
                      "<div style='height:100%;width:" + tierProgressPct + "%;background:linear-gradient(90deg,#e05a2b 0%,#f59e0b 60%,#16a34a 100%);border-radius:999px'></div>" +
                    "</div>" +
                  "</div>" +
                "</div>" +
              "</div>" +

              // 5-Card Light Telemetry Strip
              "<div class='vip-dash-grid'>" +
                statBox("01", "Available Points", avail.toLocaleString() + " PTS", "Worth " + tk(avail) + (Number(m.pending_points || 0) > 0 ? " (+" + Number(m.pending_points) + " pending)" : " at checkout / MFS"), "#15803d", "#f0fdf4") +
                statBox("02", "Friends Referred", String(timesUsed), "Signups & orders with your code", "#111111", "#f5f2eb") +
                statBox("03", "Referral Income", tk(couponIncomePts), "Earned from referral coupon", "#15803d", "#f0fdf4") +
                statBox("04", "Welcome & Bonuses", tk(welcomeBonusPts), "Registration & campaign grants", "#e05a2b", "#fff7ed") +
                statBox("05", "Redeemed / Paid", "৳" + (paidWithdrawnBdt + Math.round(redeemedPts * pv)).toLocaleString(), redeemedPts + " PTS at checkout · ৳" + paidWithdrawnBdt + " MFS", "#44403c", "#f5f2eb") +
              "</div>" +

              // Sub-Navigation Segmented Bar
              "<div class='vip-dash-subtabs'>" +
                "<button type='button' class='vip-subtab-btn is-active' data-subtab='overview'>[01] OVERVIEW &amp; REFERRAL</button>" +
                "<button type='button' class='vip-subtab-btn' data-subtab='ledger'>[02] POINTS HISTORY (" + myLedger.length + ")</button>" +
                "<button type='button' class='vip-subtab-btn' data-subtab='tiers'>[03] VIP TIERS (" + allTiers.length + ")</button>" +
                "<button type='button' class='vip-subtab-btn' data-subtab='campaigns'>[04] CAMPAIGNS &amp; ALERTS (" + (activeCampaigns.length + myNotifications.length) + ")</button>" +
              "</div>" +

              // SUBTAB 1: OVERVIEW & REFERRAL + PAYOUT
              "<div class='vip-subtab-panel' data-panel='overview'>" +
                "<div class='vip-dash-split'>" +
                  // Left Column: Coupon & Referral Activity
                  "<div style='display:flex;flex-direction:column;gap:20px'>" +
                    "<div class='vip-dash-card' style='border-left:4px solid #e05a2b'>" +
                      "<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:10px;flex-wrap:wrap'>" +
                        "<span style='font:11px/1 \"FK Grotesk SemiMono\",monospace;text-transform:uppercase;letter-spacing:1.8px;color:#e05a2b;font-weight:700'>YOUR PERSONAL VIP REFERRAL COUPON</span>" +
                        "<span style='font:9.5px/1 \"FK Grotesk SemiMono\",monospace;font-weight:700;color:#15803d;background:#f0fdf4;border:1px solid #bbf7d0;padding:5px 10px;letter-spacing:1px'>● ACTIVE (" + esc(disc) + ")</span>" +
                      "</div>" +
                      "<p style='font:12.5px/1.6 \"NB Architekt Std\",sans-serif;color:#44403c;margin:0 0 18px;letter-spacing:0.3px'>" +
                        "Share your personal code or link with friends. Friends receive <strong style='color:#111111'>" + esc(disc) + "</strong> at checkout, and you earn <strong style='color:#15803d'>+" + (Number(s.points_per_referral) || 100) + " PTS (" + tk(s.points_per_referral || 100) + " CASH)</strong> on every qualifying order &amp; VIP signup." +
                      "</p>" +
                      "<div style='display:flex;align-items:center;justify-content:space-between;background:#faf7f0;padding:16px 20px;border:1.5px dashed #e05a2b;margin-bottom:14px;gap:12px;flex-wrap:wrap'>" +
                        "<div>" +
                          "<div style='font:9px/1 \"FK Grotesk SemiMono\",monospace;color:#78716c;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:5px'>PERSONAL VAULT CODE</div>" +
                          "<span style='font:22px/1 \"FK Grotesk SemiMono\",monospace;font-weight:700;letter-spacing:2.5px;color:#111111'>" + esc(myCode) + "</span>" +
                        "</div>" +
                        "<div style='display:flex;gap:8px;flex-wrap:wrap'>" +
                          "<button type='button' id='vip-copy-code-btn' class='vip-dash-btn-dark' style='padding:11px 18px'>COPY CODE</button>" +
                          "<a href='https://wa.me/?text=" + encodeURIComponent("Shop at AnnR with my VIP referral code " + myCode + " for " + disc + " off! " + location.origin + "/home.html?ref=" + myCode) + "' target='_blank' rel='noopener' style='background:#16a34a;color:#ffffff;text-decoration:none;padding:11px 16px;font:10.5px/1 \"NB Architekt Std\",sans-serif;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;display:inline-flex;align-items:center'>WHATSAPP SHARE</a>" +
                        "</div>" +
                      "</div>" +
                      "<div style='display:grid;grid-template-columns:1fr 1fr;gap:12px'>" +
                        "<button type='button' id='vip-copy-link-btn' class='vip-dash-btn-light' style='width:100%'><span class='text'>🔗 COPY VIP SIGNUP LINK</span></button>" +
                        "<button type='button' id='vip-copy-store-link-btn' class='vip-dash-btn-light' style='width:100%'><span class='text'>🛍 COPY STORE SHOP LINK</span></button>" +
                      "</div>" +
                    "</div>" +

                    // Referral Activity Ledger
                    "<div class='vip-dash-card'>" +
                      "<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:14px'>" +
                        "<span style='font:10.5px/1 \"FK Grotesk SemiMono\",monospace;text-transform:uppercase;letter-spacing:1.8px;color:#111111;font-weight:700'>REFERRAL &amp; COMMISSION ACTIVITY LEDGER (" + myRefLogs.length + ")</span>" +
                        "<span style='font:9.5px/1 \"FK Grotesk SemiMono\",monospace;color:#78716c;text-transform:uppercase'>+" + (Number(s.points_per_referral) || 100) + " PTS / REFERRAL</span>" +
                      "</div>" +
                      (myRefLogs.length === 0
                        ? "<div style='font:11.5px/1.6 \"FK Grotesk SemiMono\",monospace;color:#57534e;padding:16px 18px;background:#faf8f4;border:1px dashed #dcd6ca'>No friend referrals recorded yet. Share your code <strong style='color:#111111'>" + esc(myCode) + "</strong> using the buttons above to start earning instant commissions!</div>"
                        : "<div style='display:flex;flex-direction:column;gap:10px;max-height:220px;overflow-y:auto'>" +
                            myRefLogs.slice(0, 20).map(function (item) {
                              var isOrder = item.event_type === "order";
                              return "<div style='display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#faf8f4;border:1px solid #e6e1d7;font-size:12px'>" +
                                "<div>" +
                                  "<div style='font-weight:700;color:#111111;text-transform:uppercase'>" + esc(item.buyer_name || "Friend Referral") + (item.order_number ? " · Order #" + esc(item.order_number) : " · VIP Signup") + "</div>" +
                                  "<div style='font:10px/1.3 \"FK Grotesk SemiMono\",monospace;color:#6b665e;margin-top:3px'>" + esc(String(item.created_at || "").slice(0, 10)) + " · " + (isOrder ? "Checkout Coupon Used" : "Referred Account Registration") + "</div>" +
                                "</div>" +
                                "<div style='font:12.5px/1 \"FK Grotesk SemiMono\",monospace;font-weight:700;color:#15803d;background:#f0fdf4;border:1px solid #bbf7d0;padding:5px 10px'>+" + Number(item.points_earned || 100) + " PTS</div>" +
                              "</div>";
                            }).join("") +
                          "</div>") +
                    "</div>" +
                  "</div>" +

                  // Right Column: Instant Cash Payout Form & Transaction History
                  "<div style='display:flex;flex-direction:column;gap:20px'>" +
                    "<div class='vip-dash-card' style='border-top:3px solid #111111'>" +
                      "<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;gap:10px;flex-wrap:wrap'>" +
                        "<span style='font:11px/1 \"FK Grotesk SemiMono\",monospace;text-transform:uppercase;letter-spacing:1.8px;color:#111111;font-weight:700'>REQUEST INSTANT CASH PAYOUT</span>" +
                        "<span style='font:9.5px/1 \"FK Grotesk SemiMono\",monospace;font-weight:700;color:#c2410c;background:#fff7ed;border:1px solid #fed7aa;padding:5px 10px'>MIN CASHOUT: ৳" + Number(s.min_withdrawal_bdt || 100) + " (" + minPts + " PTS)</span>" +
                      "</div>" +
                      "<div style='background:#faf8f4;border:1px solid #e6e1d7;padding:14px 16px;margin-bottom:18px'>" +
                        "<div style='display:flex;justify-content:space-between;align-items:center;font:10.5px/1.4 \"FK Grotesk SemiMono\",monospace;color:#44403c;margin-bottom:8px;flex-wrap:wrap;gap:6px'>" +
                          "<span>WALLET BALANCE: <strong style='color:#15803d'>" + avail + " PTS (" + tk(avail) + ")</strong></span>" +
                          "<span>" + (avail >= minPts ? "✓ ELIGIBLE FOR INSTANT CASHOUT" : (minPts - avail) + " MORE PTS FOR MFS CASHOUT") + "</span>" +
                        "</div>" +
                        "<div style='width:100%;height:6px;background:#e6e1d7;border-radius:999px;overflow:hidden;margin-bottom:10px'>" +
                          "<div style='height:100%;width:" + payoutProgressPct + "%;background:" + (avail >= minPts ? "#16a34a" : "#e05a2b") + ";border-radius:999px'></div>" +
                        "</div>" +
                        "<div style='font:11px/1.5 \"NB Architekt Std\",sans-serif;color:#57534e'>" +
                          (avail < minPts
                            ? "Minimum MFS payout is <strong>৳" + Number(s.min_withdrawal_bdt || 100).toLocaleString() + " (" + minPts + " PTS)</strong>. You can also <button type='button' id='vip-inline-redeem-btn' style='background:none;border:none;padding:0;color:#e05a2b;font-weight:700;text-decoration:underline;cursor:pointer;font-family:inherit;font-size:inherit'>redeem your " + tk(avail) + " immediately at Checkout →</button>"
                            : "Your wallet is unlocked for direct MFS or Bank cashout. Select your preferred payout channel below.") +
                        "</div>" +
                      "</div>" +
                      "<form id='vip-payout-form' novalidate style='display:flex;flex-direction:column;gap:16px'>" +
                        "<div style='display:grid;grid-template-columns:1fr 1fr;gap:16px 22px'>" +
                          archSelect("01", "Payout Method *", "<select id='vip-pay-method'>" + methods.map(function (k) { return "<option value='" + esc(k) + "'>" + esc(mLabel[k] || k) + "</option>"; }).join("") + "</select>") +
                          archInput("02", "Wallet / Account No *", "<input type='text' id='vip-pay-acc' required maxlength='50' inputmode='numeric' placeholder='017XXXXXXXX' value='" + esc(m.phone || "") + "'>") +
                          archInput("03", "Account Holder Name *", "<input type='text' id='vip-pay-name' required maxlength='100' value='" + esc(m.full_name) + "'>") +
                          archInput("04", "Points to Withdraw *", "<input type='number' id='vip-pay-pts' min='" + minPts + "' max='" + Math.max(avail, minPts) + "' value='" + avail + "' inputmode='numeric'>") +
                        "</div>" +
                        "<div style='display:flex;justify-content:space-between;align-items:center;padding-top:6px;gap:14px;flex-wrap:wrap'>" +
                          "<div id='vip-pay-preview' style='font:11.5px/1 \"FK Grotesk SemiMono\",monospace;color:#15803d;font-weight:700;letter-spacing:1px;background:#f0fdf4;border:1px solid #bbf7d0;padding:10px 14px'>DISBURSEMENT: " + tk(avail) + " BDT</div>" +
                          "<button class='vip-dash-btn-dark' type='submit' style='flex:1;min-width:210px;padding:14px 20px'><span class='text'>SUBMIT PAYOUT REQUEST →</span></button>" +
                        "</div>" +
                      "</form>" +
                    "</div>" +

                    // Payout Transaction Log
                    "<div class='vip-dash-card'>" +
                      "<div style='font:10.5px/1 \"FK Grotesk SemiMono\",monospace;text-transform:uppercase;letter-spacing:1.8px;color:#111111;font-weight:700;margin-bottom:14px'>PAYOUT DISBURSEMENT LOG (" + myWithdrawals.length + ")</div>" +
                      (myWithdrawals.length === 0
                        ? "<div style='font:11.5px/1.6 \"FK Grotesk SemiMono\",monospace;color:#57534e;padding:14px 16px;background:#faf8f4;border:1px dashed #dcd6ca'>No withdrawal requests submitted yet. Completed bKash, Nagad, Rocket, and Bank payouts appear here.</div>"
                        : "<div style='display:flex;flex-direction:column;gap:10px;max-height:200px;overflow-y:auto'>" +
                            myWithdrawals.map(function (w) {
                              return "<div style='display:flex;justify-content:space-between;align-items:center;gap:10px;background:#faf8f4;border:1px solid #e6e1d7;padding:12px 16px;font-size:12px'>" +
                                "<div style='min-width:0'>" +
                                  "<div style='font-weight:700;color:#111111'>৳" + Number(w.money_amount_bdt || w.points_amount).toLocaleString() + " via " + esc((mLabel[w.payout_method] || w.payout_method || "").toUpperCase()) + " · #" + esc(w.request_number || w.id) + "</div>" +
                                  "<div style='font:10px/1.3 \"FK Grotesk SemiMono\",monospace;color:#6b665e;margin-top:3px'>" + esc(w.account_number) + " · " + esc(String(w.requested_at || w.created_at || "").slice(0, 10)) + (w.transaction_ref ? " · TrxID: " + esc(w.transaction_ref) : "") + "</div>" +
                                "</div>" +
                                badge(w.status || "pending") +
                              "</div>";
                            }).join("") +
                          "</div>") +
                    "</div>" +
                  "</div>" +
                "</div>" +
              "</div>" +

              // SUBTAB 2: IMMUTABLE POINTS LEDGER
              "<div class='vip-subtab-panel' data-panel='ledger' style='display:none'>" +
                "<div class='vip-dash-card'>" +
                  "<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px;border-bottom:1px solid #e6e1d7;padding-bottom:14px'>" +
                    "<span style='font:11px/1 \"FK Grotesk SemiMono\",monospace;text-transform:uppercase;letter-spacing:1.8px;color:#e05a2b;font-weight:700'>COMPLETE ANNR POINTS TRANSACTION LEDGER</span>" +
                    "<span style='font:10px/1 \"FK Grotesk SemiMono\",monospace;color:#44403c;background:#faf8f4;border:1px solid #e2ddd3;padding:6px 12px'>AVAILABLE: <strong>" + avail + " PTS</strong> &nbsp;·&nbsp; REDEEMED: <strong>" + redeemedPts + " PTS</strong> &nbsp;·&nbsp; LIFETIME: <strong>" + lifetimePts + " PTS</strong></span>" +
                  "</div>" +
                  "<div style='display:flex;flex-direction:column;gap:10px;max-height:420px;overflow-y:auto'>" +
                    myLedger.map(function (entry) {
                      var delta = Number(entry.points_delta || 0);
                      return "<div style='display:flex;justify-content:space-between;align-items:center;padding:14px 18px;background:#faf8f4;border:1px solid #e6e1d7;border-left:3px solid " + (delta >= 0 ? "#16a34a" : "#e05a2b") + ";font-size:12px'>" +
                        "<div>" +
                          "<div style='font-weight:700;color:#111111;font-size:13px'>" + esc(entry.description || entry.transaction_type) + "</div>" +
                          "<div style='font:10px/1.4 \"FK Grotesk SemiMono\",monospace;color:#6b665e;margin-top:4px'>" + esc(String(entry.created_at || "").slice(0, 16).replace("T", " ")) + " &nbsp;·&nbsp; TYPE: " + esc(String(entry.transaction_type || "").toUpperCase()) + " &nbsp;·&nbsp; BALANCE AFTER: " + Number(entry.balance_after || avail) + " PTS</div>" +
                        "</div>" +
                        "<div style='font:13px/1 \"FK Grotesk SemiMono\",monospace;font-weight:700;color:" + (delta >= 0 ? "#15803d" : "#c2410c") + ";background:" + (delta >= 0 ? "#f0fdf4" : "#fff7ed") + ";border:1px solid " + (delta >= 0 ? "#bbf7d0" : "#fed7aa") + ";padding:6px 12px'>" + (delta >= 0 ? "+" : "") + delta + " PTS</div>" +
                      "</div>";
                    }).join("") +
                  "</div>" +
                "</div>" +
              "</div>" +

              // SUBTAB 3: VIP MEMBERSHIP TIERS & BENEFITS
              "<div class='vip-subtab-panel' data-panel='tiers' style='display:none'>" +
                "<div style='display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px'>" +
                  allTiers.map(function (t) {
                    var isCurrent = String(t.name).toLowerCase() === String(currentTierName).toLowerCase();
                    return "<div style='background:" + (isCurrent ? "#fffcf9" : "#ffffff") + ";border:" + (isCurrent ? "2px solid #e05a2b" : "1px solid #e2ddd3") + ";padding:24px;position:relative;box-shadow:0 10px 28px rgba(17,17,17,0.04)'>" +
                      "<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:12px'>" +
                        "<span style='font:16px/1 \"NB Architekt Std\",sans-serif;font-weight:900;color:#111111;text-transform:uppercase;letter-spacing:1.5px'>★ " + esc(t.name) + "</span>" +
                        (isCurrent ? "<span style='font:9px/1 \"FK Grotesk SemiMono\",monospace;background:#e05a2b;color:#ffffff;padding:4px 8px;font-weight:700;letter-spacing:1px'>CURRENT TIER</span>" : "") +
                      "</div>" +
                      "<div style='font:10.5px/1.5 \"FK Grotesk SemiMono\",monospace;color:#57534e;margin-bottom:14px;background:#faf8f4;padding:10px 12px;border:1px solid #e6e1d7'>" +
                        "REQ: <strong>" + Number(t.min_earned_points || 0) + " PTS</strong> OR <strong>" + Number(t.min_referrals || 0) + " REFERRALS</strong><br>" +
                        "MULTIPLIER: <strong style='color:#15803d'>" + Number(t.point_multiplier || 1) + "× PTS</strong> &nbsp;·&nbsp; EXTRA DISC: <strong style='color:#e05a2b'>" + Number(t.extra_discount_percent || 0) + "%</strong>" +
                      "</div>" +
                      "<div style='display:flex;flex-direction:column;gap:8px;border-top:1px solid #e6e1d7;padding-top:14px'>" +
                        (t.perks || []).map(function (p) {
                          return "<div style='font:11px/1.4 \"FK Grotesk SemiMono\",monospace;color:#292524'><span style='color:#16a34a;font-weight:700'>✓</span> " + esc(p) + "</div>";
                        }).join("") +
                      "</div>" +
                    "</div>";
                  }).join("") +
                "</div>" +
              "</div>" +

              // SUBTAB 4: ACTIVE CAMPAIGNS & NOTIFICATIONS
              "<div class='vip-subtab-panel' data-panel='campaigns' style='display:none'>" +
                "<div class='vip-dash-split'>" +
                  "<div class='vip-dash-card'>" +
                    "<div style='font:10.5px/1 \"FK Grotesk SemiMono\",monospace;text-transform:uppercase;letter-spacing:1.8px;color:#e05a2b;font-weight:700;margin-bottom:14px'>ACTIVE VIP PROMOTIONAL CAMPAIGNS (" + activeCampaigns.length + ")</div>" +
                    (activeCampaigns.length === 0
                      ? "<div style='font:11.5px/1.6 \"FK Grotesk SemiMono\",monospace;color:#57534e;padding:14px 16px;background:#faf8f4;border:1px dashed #dcd6ca'>Standard VIP rewards active. Stay tuned for seasonal multiplier campaigns!</div>"
                      : "<div style='display:flex;flex-direction:column;gap:12px'>" +
                          activeCampaigns.map(function (cItem) {
                            return "<div style='padding:16px 18px;background:#faf8f4;border:1px solid #e6e1d7;border-left:4px solid #e05a2b'>" +
                              "<div style='display:flex;justify-content:space-between;align-items:center;gap:8px'>" +
                                "<span style='font:13px/1.2 \"NB Architekt Std\",sans-serif;font-weight:700;color:#111111;text-transform:uppercase'>" + esc(cItem.name) + "</span>" +
                                "<span style='font:10px/1 \"FK Grotesk SemiMono\",monospace;color:#15803d;background:#f0fdf4;border:1px solid #bbf7d0;padding:4px 8px;font-weight:700'>" + (cItem.points_multiplier > 1 ? cItem.points_multiplier + "× PTS" : "+" + cItem.bonus_points + " PTS") + "</span>" +
                              "</div>" +
                              "<div style='font:11px/1.5 \"FK Grotesk SemiMono\",monospace;color:#57534e;margin-top:6px'>" + esc(cItem.description || "") + "</div>" +
                            "</div>";
                          }).join("") +
                        "</div>") +
                  "</div>" +
                  "<div class='vip-dash-card'>" +
                    "<div style='font:10.5px/1 \"FK Grotesk SemiMono\",monospace;text-transform:uppercase;letter-spacing:1.8px;color:#111111;font-weight:700;margin-bottom:14px'>MEMBER NOTIFICATIONS &amp; REWARD ALERTS (" + myNotifications.length + ")</div>" +
                    "<div style='display:flex;flex-direction:column;gap:10px;max-height:280px;overflow-y:auto'>" +
                      myNotifications.slice(0, 15).map(function (n) {
                        return "<div style='padding:14px 16px;background:#faf8f4;border:1px solid #e6e1d7;border-left:3px solid #16a34a'>" +
                          "<div style='font:12px/1.2 \"NB Architekt Std\",sans-serif;font-weight:700;color:#111111'>" + esc(n.title) + "</div>" +
                          "<div style='font:11px/1.5 \"FK Grotesk SemiMono\",monospace;color:#57534e;margin-top:4px'>" + esc(n.message) + "</div>" +
                        "</div>";
                      }).join("") +
                    "</div>" +
                  "</div>" +
                "</div>" +
              "</div>" +

            "</div>" +
          "</div>";

        // Wire Sub-Tab Switching inside Dashboard
        var subTabBtns = c.querySelectorAll(".vip-subtab-btn");
        var subTabPanels = c.querySelectorAll(".vip-subtab-panel");
        subTabBtns.forEach(function (btn) {
          btn.onclick = function () {
            var target = btn.getAttribute("data-subtab");
            subTabBtns.forEach(function (b) {
              if (b.getAttribute("data-subtab") === target) {
                b.classList.add("is-active");
              } else {
                b.classList.remove("is-active");
              }
            });
            subTabPanels.forEach(function (p) {
              p.style.display = p.getAttribute("data-panel") === target ? "block" : "none";
            });
          };
        });

        // Wire Redeem Points at Checkout buttons
        var triggerRedeemAtCheckout = function () {
          try {
            localStorage.setItem("annr_cart_coupon", myCode);
            localStorage.setItem("annr_active_ref_code", myCode);
            localStorage.setItem("annr_vip_redeem_pts", String(avail));
          } catch (e) {}
          if (navigator.clipboard && navigator.clipboard.writeText) {
            try { navigator.clipboard.writeText(myCode); } catch (e) {}
          }
          var noticeSlot = c.querySelector("#vip-dash-notice-slot");
          if (noticeSlot) {
            noticeSlot.innerHTML = "<div role='status' style='border:1px solid #16a34a;border-left:4px solid #16a34a;background:#f0fdf4;color:#14532d;padding:14px 18px;font-family:\"FK Grotesk SemiMono\",monospace;font-size:12px;font-weight:600;line-height:1.5;margin-bottom:20px;box-shadow:0 6px 18px rgba(0,0,0,0.04)'>✓ VIP Reward Code <strong>" + esc(myCode) + "</strong> &amp; <strong>" + avail + " PTS (" + tk(avail) + ")</strong> activated for your order and copied to clipboard! Opening catalog...</div>";
          }
          var cartBtn = document.querySelector(".js-cart-trigger-open");
          var cartCountEl = document.querySelector("[data-cart-count]");
          var hasCartItems = cartCountEl && parseInt(cartCountEl.textContent || "0", 10) > 0;
          if (hasCartItems && cartBtn) {
            cartBtn.click();
          } else {
            setTimeout(function () {
              window.location.href = "/collections/all/index.html?ref=" + encodeURIComponent(myCode);
            }, 900);
          }
        };

        var redeemCheckoutBtn = c.querySelector("#vip-redeem-checkout-btn");
        if (redeemCheckoutBtn) redeemCheckoutBtn.onclick = triggerRedeemAtCheckout;
        var inlineRedeemBtn = c.querySelector("#vip-inline-redeem-btn");
        if (inlineRedeemBtn) inlineRedeemBtn.onclick = triggerRedeemAtCheckout;

        // Wire Sign Out
        var outBtn = c.querySelector("#vip-signout-btn");
        if (outBtn) {
          outBtn.onclick = function() {
            clearSessionMember();
            renderInPageVipHub();
          };
        }

        // Copy Helpers
        var copyHelper = function (btn, text, doneLabel, idleLabel) {
          var targetSpan = btn.querySelector(".text") || btn;
          var finish = function () {
            targetSpan.textContent = doneLabel;
            setTimeout(function () { targetSpan.textContent = idleLabel; }, 2000);
          };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(finish, function () { window.prompt("Copy:", text); });
          } else {
            window.prompt("Copy:", text);
          }
        };

        var copyCodeBtn = c.querySelector("#vip-copy-code-btn");
        if (copyCodeBtn) {
          copyCodeBtn.onclick = function () {
            copyHelper(copyCodeBtn, myCode, "✓ COPIED!", "COPY CODE");
          };
        }

        var copyLinkBtn = c.querySelector("#vip-copy-link-btn");
        if (copyLinkBtn) {
          copyLinkBtn.onclick = function () {
            var refLink = location.origin + "/account/register/index.html?ref=" + encodeURIComponent(myCode);
            copyHelper(copyLinkBtn, refLink, "✓ SIGNUP LINK COPIED!", "🔗 COPY VIP SIGNUP LINK");
          };
        }

        var copyStoreBtn = c.querySelector("#vip-copy-store-link-btn");
        if (copyStoreBtn) {
          copyStoreBtn.onclick = function () {
            var storeLink = location.origin + "/home.html?ref=" + encodeURIComponent(myCode);
            copyHelper(copyStoreBtn, storeLink, "✓ STORE LINK COPIED!", "🛍 COPY STORE SHOP LINK");
          };
        }

        // Payout Form Handler
        var pf = c.querySelector("#vip-payout-form");
        if (pf) {
          var ptsEl = pf.querySelector("#vip-pay-pts"), prev = pf.querySelector("#vip-pay-preview");
          if (ptsEl && prev) {
            ptsEl.oninput = function () {
              prev.textContent = "DISBURSEMENT: " + tk(Math.max(0, Number(ptsEl.value) || 0)) + " BDT";
            };
          }

          pf.onsubmit = function (e) {
            e.preventDefault();
            var pts = Math.floor(Number(ptsEl.value) || 0);
            var acc = String(pf.querySelector("#vip-pay-acc").value || "").trim();
            var nm = String(pf.querySelector("#vip-pay-name").value || "").trim();
            var meth = pf.querySelector("#vip-pay-method").value;

            if (avail < minPts) {
              showErr(pf, "Minimum MFS payout is " + minPts + " PTS (" + tk(minPts) + "). Your current balance is " + avail + " PTS (" + tk(avail) + "). Refer friends to earn +" + (Number(s.points_per_referral) || 100) + " PTS each, or click 'Redeem Pts at Checkout' to use your " + tk(avail) + " discount now!");
              return;
            }
            if (pts < minPts || pts > avail) {
              showErr(pf, "Enter between " + minPts + " and " + avail + " points."); return;
            }
            if (acc.length < 5) {
              showErr(pf, "Enter your account number."); return;
            }
            if (meth !== "bank" && !/^01[3-9]\d{8}$/.test(acc.replace(/[^0-9]/g, ""))) {
              showErr(pf, "Enter a valid 11-digit Bangladesh mobile wallet number."); return;
            }
            if (nm.length < 2) {
              showErr(pf, "Enter the account holder name."); return;
            }

            showErr(pf, "");
            setBusy(pf, true, "SUBMITTING…");

            var moneyBdt = Math.round(pts * pv);
            var reqNum = Math.floor(1000 + Math.random() * 9000);

            // Deduct points from member immediately & sync across all storage keys
            m.available_points = avail - pts;
            m.withdrawn_points = (Number(m.withdrawn_points) || 0) + pts;

            var withdrawalRecord = {
              id: "w-" + Date.now().toString(36),
              request_number: reqNum,
              vip_member_id: m.id || m.email,
              member_name: m.full_name,
              member_email: m.email,
              points_amount: pts,
              money_amount_bdt: moneyBdt,
              payout_method: meth,
              account_number: acc,
              account_name: nm,
              account_holder_name: nm,
              status: "pending",
              requested_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              vip_members: {
                full_name: m.full_name,
                email: m.email,
                phone: m.phone || acc,
                tier: m.tier || "Silver"
              }
            };

            // Save to both annr-withdrawals and annr-withdrawals-v1 so Admin Panel (/admin/loyalty) sees it immediately
            ["annr-withdrawals", "annr-withdrawals-v1"].forEach(function (k) {
              try {
                var curW = JSON.parse(localStorage.getItem(k) || "[]");
                if (!Array.isArray(curW)) curW = [];
                curW.unshift(withdrawalRecord);
                localStorage.setItem(k, JSON.stringify(curW));
              } catch(err) {}
            });

            saveSessionMember({ member: m, coupon: coupon, settings: s });
            var accs = getVipAccounts();
            if (m.email && accs[m.email.toLowerCase()]) {
              accs[m.email.toLowerCase()].available_points = m.available_points;
              accs[m.email.toLowerCase()].member = m;
              try { localStorage.setItem(VIP_ACCOUNTS_KEY, JSON.stringify(accs)); } catch (err) {}
            }

            appendVipLedgerEntry({
              member_id: m.id || m.email,
              member_email: m.email,
              member_name: m.full_name,
              transaction_type: "withdrawal_hold",
              points_delta: -pts,
              balance_after: m.available_points,
              reference_id: String(reqNum),
              description: "MFS Payout Request #" + reqNum + " (" + meth.toUpperCase() + " " + acc + " · ৳" + moneyBdt + ")",
              actor: "customer"
            });
            appendVipNotification({
              member_id: m.id || m.email,
              member_email: m.email,
              title: "Payout Request #" + reqNum + " Submitted",
              message: "Requested ৳" + moneyBdt + " (" + pts + " PTS) via " + meth.toUpperCase() + ". Pending admin disbursement.",
              category: "withdrawal"
            });

            // Also call Supabase RPC in background with member identifier
            fetch(SB_URL + "/rest/v1/rpc/request_vip_withdrawal", {
              method: "POST",
              headers: {
                "apikey": SB_KEY,
                "Authorization": "Bearer " + SB_KEY,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                p_points_amount: pts,
                p_payout_method: meth,
                p_account_number: acc,
                p_account_name: nm,
                p_bank_details: null,
                p_member_id: (m.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(m.id))) ? m.id : null,
                p_email: m.email || null
              })
            }).catch(function() {});

            setBusy(pf, false);
            window.__annrVipNotice = {
              type: "ok",
              text: "✓ Payout request #" + reqNum + " for ৳" + moneyBdt.toLocaleString() + " submitted! Admin will review & disburse in the Loyalty Queue."
            };

            renderInPageVipHub();
          };
        }
      }

      // Fallback helper in case other scripts invoke openVipModal
      function openVipModal() {
        if (window.location.pathname.indexOf("/account") !== -1) {
          renderInPageVipHub();
        } else {
          window.location.href = "/account/login/index.html";
        }
      }

      // Run on page load if on an account / VIP page
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", renderInPageVipHub);
      } else {
        renderInPageVipHub();
      }
    })();

    // 6. Interactive Vault Ball Drop Campaign (Split-Screen Streetwear Design)
    function initBallDrop() {
      // 1. Force cleanup stale local storage keys on client
      try {
        if (!localStorage.getItem("annr_bd_v2_sanitized")) {
          var raw = localStorage.getItem("annr-loyalty-settings-v1") || localStorage.getItem("annr-loyalty-settings");
          if (raw) {
            var parsed = JSON.parse(raw);
            parsed.ball_drop_enabled = false;
            if (parsed.ball_drop_config) {
              parsed.ball_drop_config.autoPopup = false;
              parsed.ball_drop_config.showFloatingTrigger = false;
            }
            localStorage.setItem("annr-loyalty-settings-v1", JSON.stringify(parsed));
            localStorage.setItem("annr-loyalty-settings", JSON.stringify(parsed));
          }
          localStorage.setItem("annr_bd_v2_sanitized", "1");
        }
      } catch (e) {}

      // 2. Immediately clean up any existing triggers, timers, or modals
      if (window.__annr_bd_timer) {
        clearTimeout(window.__annr_bd_timer);
        window.__annr_bd_timer = null;
      }
      var oldTrigger = document.getElementById("adm-ball-drop-trigger");
      if (oldTrigger) oldTrigger.remove();
      var oldModal = document.getElementById("adm-ball-drop-modal");
      if (oldModal) oldModal.remove();

      var loyaltySt = {};
      try {
        var rawSt = localStorage.getItem("annr-loyalty-settings-v1") || localStorage.getItem("annr-loyalty-settings");
        if (rawSt) loyaltySt = JSON.parse(rawSt);
      } catch (e) {}

      // Fallback to site config ballDrop
      var siteBd = (cfg && cfg.site && cfg.site.ballDrop) || (S && S.ballDrop) || {};

      // Master ON / OFF Check: STRICTLY OFF BY DEFAULT unless explicitly true
      var isEnabled = false;
      if (typeof loyaltySt.ball_drop_enabled === "boolean") {
        isEnabled = loyaltySt.ball_drop_enabled;
      } else if (typeof siteBd.enabled === "boolean") {
        isEnabled = siteBd.enabled;
      }

      // If disabled, stop completely, clear any modal or timer, and return
      if (isEnabled !== true) {
        if (window.__annr_bd_timer) {
          clearTimeout(window.__annr_bd_timer);
          window.__annr_bd_timer = null;
        }
        var exM = document.getElementById("adm-ball-drop-modal");
        if (exM) exM.remove();
        var exTr = document.getElementById("adm-ball-drop-trigger");
        if (exTr) exTr.remove();
        return;
      }

      var bdConfig = loyaltySt.ball_drop_config || siteBd || {
        title: "TAP TO DROP",
        buttonText: "TRY YOUR LUCK",
        modelImage: "/cdn/shop/files/ball-drop-model.jpg",
        autoPopup: false,
        autoPopupDelay: 5,
        showFloatingTrigger: false,
        prizes: [
          { label: "Free item", code: "FREEGIFT", weight: 10 },
          { label: "5% off", code: "LUCK5", weight: 35 },
          { label: "Free shipping", code: "FREESHIP", weight: 20 },
          { label: "৳500 off", code: "ANNR500", weight: 15 },
          { label: "10% off", code: "LUCK10", weight: 20 }
        ]
      };

      // Floating Trigger Badge (only if explicitly enabled in admin)
      if (bdConfig.showFloatingTrigger === true) {
        var trigger = document.createElement("div");
        trigger.id = "adm-ball-drop-trigger";
        trigger.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:99975;background:#111113;color:#ffffff;border:1px solid #27272a;border-radius:40px;padding:9px 18px;font:11px/1 'NB Architekt Std',sans-serif;letter-spacing:1px;font-weight:700;display:flex;align-items:center;gap:8px;cursor:pointer;box-shadow:0 8px 32px rgba(0,0,0,0.85);transition:transform .2s,border-color .2s;user-select:none";
        trigger.innerHTML = "<span style='width:7px;height:7px;border-radius:50%;background:#e10600;display:inline-block'></span><span>⚡ BALL DROP</span>";
        trigger.onmouseenter = function() { trigger.style.borderColor = "#ffffff"; trigger.style.transform = "translateY(-2px)"; };
        trigger.onmouseleave = function() { trigger.style.borderColor = "#27272a"; trigger.style.transform = "translateY(0)"; };
        trigger.onclick = function() { openBallDropGame(); };
        document.body.appendChild(trigger);
      }

      function openBallDropGame() {
        var existingModal = document.getElementById("adm-ball-drop-modal");
        if (existingModal) existingModal.remove();

        var prizes = (bdConfig.prizes && bdConfig.prizes.length >= 5) ? bdConfig.prizes : [
          { label: "Free item", code: "FREEGIFT" },
          { label: "5% off", code: "LUCK5" },
          { label: "Free shipping", code: "FREESHIP" },
          { label: "৳500 off", code: "ANNR500" },
          { label: "10% off", code: "LUCK10" }
        ];

        var isMobile = window.innerWidth < 768;
        var canvasW = isMobile ? Math.min(320, window.innerWidth - 64) : 340;
        var canvasH = isMobile ? 240 : 260;
        var modalHtml =
          "<div style='background:#111113;border:1px solid #27272a;max-width:920px;width:95%;border-radius:4px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,0.95);position:relative;display:flex;flex-direction:" + (isMobile ? "column" : "row") + ";max-height:92vh;overflow-y:auto'>" +
            // Close Button
            "<button type='button' data-close style='position:absolute;top:10px;right:14px;background:none;border:none;color:#ffffff;font-size:26px;cursor:pointer;opacity:.85;line-height:1;z-index:40;padding:6px 12px;touch-action:manipulation'>✕</button>" +

            // Left Side: Plinko Interactive Game
            "<div style='flex:1;min-width:" + (isMobile ? "100%" : "320px") + ";max-width:" + (isMobile ? "100%" : "480px") + ";background:#111113;padding:28px 24px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative'>" +
              "<div style='display:flex;justify-content:center;margin-bottom:8px'><span style='font:28px/1 \"Druk Wide\",sans-serif;font-weight:900;letter-spacing:3px;color:#ffffff;text-transform:uppercase'>ANNR</span></div>" +
              "<div style='font:22px/1.1 \"Druk Wide\",sans-serif;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#ffffff;margin-bottom:12px;text-align:center'>" + esc(bdConfig.title || "TAP TO DROP") + "</div>" +

              "<button type='button' id='adm-bd-drop-btn' style='background:#ffffff;color:#000000;border:none;border-radius:24px;padding:9px 28px;font:11px/1 \"NB Architekt Std\",sans-serif;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;margin-bottom:14px;box-shadow:0 4px 14px rgba(255,255,255,0.25);transition:transform 0.15s'>" + esc(bdConfig.buttonText || "TRY YOUR LUCK") + "</button>" +

              "<div style='background:#111113;position:relative;display:flex;justify-content:center;margin-bottom:10px'>" +
                "<canvas id='adm-bd-canvas' width='" + canvasW + "' height='" + canvasH + "' style='display:block;background:transparent'></canvas>" +
              "</div>" +

              // Result Banner
              "<div id='adm-bd-result' style='display:none;background:#18181b;border:1px solid #27272a;padding:12px 16px;border-radius:4px;margin-top:4px;width:100%;text-align:center'>" +
                "<div style='font-size:10px;color:#22c55e;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px'>🎉 CONGRATULATIONS!</div>" +
                "<div id='adm-bd-prize-text' style='font:14px/1.2 \"Druk Wide\",sans-serif;margin-bottom:8px;text-transform:uppercase'></div>" +
                "<div id='adm-bd-coupon-box' style='display:flex;align-items:center;justify-content:center;gap:8px'>" +
                  "<span id='adm-bd-code' style='font-family:monospace;letter-spacing:2px;font-weight:700;background:#09090b;padding:6px 10px;border:1px dashed #3f3f46;color:#ffffff'></span>" +
                  "<button type='button' id='adm-bd-copy' style='background:#ffffff;color:#000000;border:none;padding:6px 12px;font:9px/1 \"NB Architekt Std\",sans-serif;font-weight:700;cursor:pointer;border-radius:2px'>COPY</button>" +
                "</div>" +
              "</div>" +
            "</div>" +

            // Right Side: Model Banner Image (desktop)
            (isMobile ? "" :
              "<div style='flex:1;background:#000000;display:flex;align-items:center;justify-content:center;overflow:hidden;min-height:480px'>" +
                "<img src='" + esc(safeImg(bdConfig.modelImage || "/cdn/shop/files/ball-drop-model.jpg")) + "' alt='AnnR Model' style='width:100%;height:100%;object-fit:cover;display:block'>" +
              "</div>") +
          "</div>";

        var modal = overlay("adm-ball-drop-modal", modalHtml,
          "position:fixed;inset:0;z-index:99995;background:rgba(0,0,0,.85);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:16px"
        );
        if (!modal) return;

        modal.addEventListener("click", function(e) {
          if (e.target === modal || e.target.hasAttribute("data-close")) {
            modal.remove();
            try { sessionStorage.setItem("annr_bd_popup_seen", "1"); } catch(err) {}
          }
        });

        // Setup Plinko Canvas Physics
        var canvas = modal.querySelector("#adm-bd-canvas");
        var dropBtn = modal.querySelector("#adm-bd-drop-btn");
        var resBox = modal.querySelector("#adm-bd-result");
        var prizeText = modal.querySelector("#adm-bd-prize-text");
        var codeBox = modal.querySelector("#adm-bd-code");
        var copyBtn = modal.querySelector("#adm-bd-copy");
        if (!canvas) return;

        var ctx = canvas.getContext("2d");
        var W = canvas.width, H = canvas.height;
        var slotsCount = 5;
        var slotWidth = W / slotsCount;

        // Sound synthesizer (Web Audio API)
        function playTick(freq) {
          try {
            var aCtx = new (window.AudioContext || window.webkitAudioContext)();
            var osc = aCtx.createOscillator();
            var gain = aCtx.createGain();
            osc.frequency.value = freq || 600;
            gain.gain.setValueAtTime(0.04, aCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, aCtx.currentTime + 0.05);
            osc.connect(gain);
            gain.connect(aCtx.destination);
            osc.start();
            osc.stop(aCtx.currentTime + 0.05);
          } catch(e) {}
        }

        // Generate Pegs in Triangle Pyramid (Matching screenshot)
        var pegs = [];
        var pegRows = [2, 3, 4, 5, 6, 7, 8];
        for (var r = 0; r < pegRows.length; r++) {
          var count = pegRows[r];
          var y = 20 + r * 28;
          var rowWidth = (count - 1) * 36;
          var startX = (W - rowWidth) / 2;
          for (var c = 0; c < count; c++) {
            pegs.push({
              x: startX + c * 36,
              y: y,
              r: 3
            });
          }
        }

        var ball = null;
        var animId = null;

        function drawBoard() {
          ctx.clearRect(0, 0, W, H);

          // Draw triangular white pegs
          ctx.fillStyle = "#ffffff";
          for (var i = 0; i < pegs.length; i++) {
            var p = pegs[i];
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
          }

          // Draw bottom 5 slot labels (Matching screenshot)
          for (var s = 0; s < slotsCount; s++) {
            var sx = s * slotWidth;
            var pItem = prizes[s] || { label: "Prize" };
            ctx.fillStyle = "#ffffff";
            ctx.font = "9px 'NB Architekt Std', sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(pItem.label || "Prize", sx + slotWidth / 2, H - 10);
          }

          // Draw falling ball
          if (ball) {
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
            ctx.fillStyle = "#ffffff";
            ctx.fill();
            ctx.strokeStyle = "#e10600";
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }

        drawBoard();

        dropBtn.onclick = function() {
          dropBtn.disabled = true;
          dropBtn.style.opacity = "0.5";
          dropBtn.textContent = "DROPPING...";

          ball = {
            x: W / 2 + (Math.random() * 8 - 4),
            y: 4,
            vx: (Math.random() * 0.8 - 0.4),
            vy: 0.8,
            r: 5
          };

          function update() {
            ball.vy += 0.22; // gravity
            ball.x += ball.vx;
            ball.y += ball.vy;

            // Side bounce
            if (ball.x - ball.r < 10) {
              ball.x = 10 + ball.r;
              ball.vx = -ball.vx * 0.6;
              playTick(450);
            }
            if (ball.x + ball.r > W - 10) {
              ball.x = W - 10 - ball.r;
              ball.vx = -ball.vx * 0.6;
              playTick(450);
            }

            // Peg collisions
            for (var i = 0; i < pegs.length; i++) {
              var p = pegs[i];
              var dx = ball.x - p.x;
              var dy = ball.y - p.y;
              var dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < ball.r + p.r) {
                var angle = Math.atan2(dy, dx);
                var speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) * 0.65;
                ball.vx = Math.cos(angle) * speed + (Math.random() * 0.6 - 0.3);
                ball.vy = Math.sin(angle) * speed;
                ball.x = p.x + Math.cos(angle) * (ball.r + p.r + 0.5);
                ball.y = p.y + Math.sin(angle) * (ball.r + p.r + 0.5);
                playTick(600 + Math.random() * 200);
              }
            }

            // Bottom reached
            if (ball.y >= H - 24) {
              cancelAnimationFrame(animId);
              var slotIndex = Math.floor(ball.x / slotWidth);
              slotIndex = Math.max(0, Math.min(slotsCount - 1, slotIndex));
              var wonPrize = prizes[slotIndex] || prizes[0];

              drawBoard();
              playTick(900);

              // Reveal result
              resBox.style.display = "block";
              prizeText.textContent = wonPrize.label || "EXCLUSIVE REWARD";
              codeBox.textContent = wonPrize.code || "ANNRVIP";

              if (copyBtn) {
                copyBtn.onclick = function() {
                  navigator.clipboard.writeText(wonPrize.code || "ANNRVIP").then(function() {
                    copyBtn.textContent = "COPIED";
                    setTimeout(function() { copyBtn.textContent = "COPY"; }, 2000);
                  });
                };
              }

              // If points prize and user is logged in, credit points
              if (wonPrize.label && wonPrize.label.toLowerCase().includes("pts")) {
                try {
                  var rawM = localStorage.getItem("annr-vip-members");
                  var rawSess = localStorage.getItem("annr_vip_session");
                  if (rawM && rawSess) {
                    var sess = JSON.parse(rawSess);
                    var members = JSON.parse(rawM);
                    var cur = members.find(function(m) { return m.email === sess.email; });
                    if (cur) {
                      cur.available_points = (cur.available_points || 0) + 50;
                      localStorage.setItem("annr-vip-members", JSON.stringify(members));
                    }
                  }
                } catch(e) {}
              }

              dropBtn.textContent = "PLAYED TODAY";
              return;
            }

            drawBoard();
            animId = requestAnimationFrame(update);
          }

          animId = requestAnimationFrame(update);
        };
      }

      // Auto-popup for visitors on page load (ONLY IF EXPLICITLY ENABLED IN ADMIN)
      if (bdConfig.autoPopup === true) {
        try {
          if (sessionStorage.getItem("annr_bd_popup_seen") !== "1") {
            var delayMs = (Number(bdConfig.autoPopupDelay) || 5) * 1000;
            window.__annr_bd_timer = setTimeout(function() {
              if (sessionStorage.getItem("annr_bd_popup_seen") !== "1") {
                openBallDropGame();
              }
            }, delayMs);
          }
        } catch(e) {}
      }

      // Wire navbar "FREE GIFT" link to open Ball Drop game if enabled
      var fgLinks = document.querySelectorAll(".header-new__action[href*='free-gift'], a[href*='ball-drop']");
      fgLinks.forEach(function(l) {
        l.onclick = function(e) {
          e.preventDefault();
          openBallDropGame();
        };
      });
    }

    initBallDrop();
  }
  window.shihikoApply = apply;
  window.addEventListener("shihiko:collection:loaded", function () { apply(); });
  window.addEventListener("popstate", function () { setTimeout(apply, 0); });
  whenReady(apply);
  whenReady(initGlobalSearchEngine);

  // Background sync published config and loyalty/campaign settings from Supabase
  (function syncPublishedFromSupabase() {
    if (preview) return;
    try {
      // 1. Sync published site config versions
      fetch("https://aooydxydkyjtulhduexa.supabase.co/rest/v1/site_config_versions?is_published=eq.true&select=config&limit=1", {
        headers: { "apikey": "sb_publishable_rWZ3_sO_15nX-jMpRMrnng_CrRhuJK5" }
      })
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(rows) {
        if (rows && rows.length > 0 && rows[0].config) {
          var remoteStr = JSON.stringify(rows[0].config);
          var localStr = localStorage.getItem("shihiko-site-config");
          if (localStr !== remoteStr) {
            localStorage.setItem("shihiko-site-config", remoteStr);
            refreshState();
            apply();
          }
        }
      }).catch(function() {});

      // 2. Sync loyalty & ball drop settings from Supabase
      fetch("https://aooydxydkyjtulhduexa.supabase.co/rest/v1/loyalty_settings?id=eq.1&select=*&limit=1", {
        headers: { "apikey": "sb_publishable_rWZ3_sO_15nX-jMpRMrnng_CrRhuJK5" }
      })
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(rows) {
        if (rows && rows.length > 0) {
          var remoteSt = rows[0];
          var stStr = JSON.stringify(remoteSt);
          localStorage.setItem("annr-loyalty-settings", stStr);
          localStorage.setItem("annr-loyalty-settings-v1", stStr);
          // If ball drop is turned OFF in Supabase, purge it instantly
          if (remoteSt.ball_drop_enabled !== true) {
            if (window.__annr_bd_timer) {
              clearTimeout(window.__annr_bd_timer);
              window.__annr_bd_timer = null;
            }
            var exTrig = document.getElementById("adm-ball-drop-trigger");
            if (exTrig) exTrig.remove();
            var exModal = document.getElementById("adm-ball-drop-modal");
            if (exModal) exModal.remove();
          }
        }
      }).catch(function() {});
      // 3. Sync live products from Supabase so all visitors & search reflect newly added products
      var sbUrl = "https://aooydxydkyjtulhduexa.supabase.co";
      var sbKey = "sb_publishable_rWZ3_sO_15nX-jMpRMrnng_CrRhuJK5";
      var pFull = "id,handle,code,title,description,price,compare_at_price,currency,status,size,show_size,measurement_unit,measurements,fabric,condition,care_instructions,images,tags,category_id,campaign_id,stock,reserved_until,created_at,categories(slug,name),campaigns(slug,name)";
      var pMid = "id,handle,code,title,description,price,compare_at_price,currency,status,size,measurements,fabric,condition,images,tags,category_id,campaign_id,stock,reserved_until,created_at,categories(slug,name),campaigns(slug,name)";
      var pMin = "id,handle,code,title,description,price,compare_at_price,currency,status,size,measurements,fabric,condition,images,tags,category_id,campaign_id,stock,reserved_until,created_at";
      var qProd = function (sel) {
        return fetch(sbUrl + "/rest/v1/products?select=" + sel + "&order=created_at.desc", { headers: { "apikey": sbKey } });
      };
      qProd(pFull)
        .then(function (r) { return r.status === 400 ? qProd(pMid) : r; })
        .then(function (r) { return r.status === 400 ? qProd(pMin) : r; })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (rows) {
          if (Array.isArray(rows) && rows.length > 0) {
            var cleaned = rows.filter(function (p) {
              return p && p.handle && !LEGACY_PRODUCT_HANDLES[p.handle] && p.status !== "draft" && p.status !== "deleted" && p.status !== "archived";
            }).map(function (p) {
              var tags = Array.isArray(p.tags) ? p.tags : [];
              var catTag = "";
              var campTag = "";
              var hideSz = false;
              tags.forEach(function (t) {
                var s = String(t || "");
                if (s.indexOf("cat:") === 0) catTag = s.slice(4);
                else if (s.indexOf("camp:") === 0) campTag = s.slice(5);
                else if (s === "__hide_size") hideSz = true;
              });
              var catSlug = String((p.categories && p.categories.slug) || catTag || "").toLowerCase();
              var campSlug = String((p.campaigns && p.campaigns.slug) || campTag || "unique-campaign").toLowerCase();
              return {
                id: p.id,
                handle: p.handle,
                code: p.code || "",
                title: p.title || "",
                description: p.description || "",
                price: String(p.price || "0"),
                compareAt: p.compare_at_price ? String(p.compare_at_price) : "",
                currency: p.currency || "BDT",
                status: p.status || "active",
                size: p.size || "ONE SIZE",
                showSize: p.show_size !== undefined ? p.show_size !== false : !hideSz,
                measurements: p.measurements || {},
                fabric: p.fabric || "",
                condition: p.condition || "10/10 Archival",
                careInstructions: p.care_instructions || "",
                category: catSlug,
                categorySlug: catSlug,
                campaign: campSlug,
                campaignSlug: campSlug,
                collections: [catSlug, campSlug, "unique-campaign", "all"].filter(Boolean),
                images: p.images || [],
                tags: tags,
                stock: p.status === "sold" ? 0 : (typeof p.stock === "number" ? p.stock : 1),
                isOneOfOne: true
              };
            });
            try { localStorage.setItem("annr_live_products", JSON.stringify(cleaned)); } catch (e) {}
            if (tpl === "search") setupSearchPage();
            else apply();
          }
        }).catch(function () {});
    } catch(e) {}
  })();
})();

/* Local analytics adapter: trackEvent() records events in THIS browser only (no server, no personal data,
   never field contents or passwords). The admin "This browser's events" source reads them. */
(function () {
  if (/^\/admin/.test(location.pathname)) return;
  // Privacy: when the cookie banner is switched on, nothing is recorded until the visitor accepts it.
  try { var pc = JSON.parse(localStorage.getItem("shihiko-site-config") || "null"); if (pc && pc.site && pc.site.cookie && pc.site.cookie.on && !localStorage.getItem("shihiko-cookie-ok")) return; } catch (e) { /* ignore */ }
  function noQ(h) { return String(h || "").split(/[?#]/)[0].slice(0, 200); }
  var KEY = "shihiko-events";
  var sess = sessionStorage.getItem("shihiko-sess") || Math.random().toString(36).slice(2, 10);
  sessionStorage.setItem("shihiko-sess", sess);
  var device = window.innerWidth < 768 ? "Mobile" : window.innerWidth < 1100 ? "Tablet" : "Desktop";
  var pendingEvents = [], flushTimer = 0;
  var scheduleIdle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 32); };
  function flushEvents() {
    flushTimer = 0;
    if (!pendingEvents.length) return;
    var batch = pendingEvents.splice(0, pendingEvents.length);
    try {
      var l = JSON.parse(localStorage.getItem(KEY) || "[]");
      for (var i = 0; i < batch.length; i++) l.push(batch[i]);
      localStorage.setItem(KEY, JSON.stringify(l.slice(-3000)));
    } catch (e) { /* storage full or blocked */ }
  }
  function trackEvent(name, props) {
    var p = props || {}; p.session = sess; p.device = device;
    pendingEvents.push({ name: name, at: new Date().toISOString(), path: location.pathname, props: p });
    if (document.visibilityState === "hidden") { flushEvents(); return; }
    if (!flushTimer) flushTimer = scheduleIdle(flushEvents);
  }
  window.shihikoTrack = trackEvent;
  var q = new URLSearchParams(location.search), pv = { referrer: document.referrer ? new URL(document.referrer).hostname : "Direct" };
  ["utm_source", "utm_medium", "utm_campaign"].forEach(function (k) { if (q.get(k)) pv[k] = q.get(k).slice(0, 60); });
  trackEvent("page_view", pv);

  // AnnR logo navigation handler - guarantees home navigation without reload delay
  document.addEventListener("click", function (e) {
    var logo = e.target && e.target.closest && e.target.closest(".header-logo, .header-new__logo, .icon-logo");
    if (logo) {
      e.preventDefault();
      e.stopPropagation();
      window.location.href = "/home.html";
    }
  }, true);

  // Instant VIP navigation with zero lag, zero preloader flash
  document.addEventListener("click", function (e) {
    var vipLink = e.target && e.target.closest && e.target.closest(".js-vip-page-link, [href*='/account/login'], [href*='/account/register'], [href*='/vip']");
    if (vipLink) {
      e.stopPropagation();
      e.stopImmediatePropagation();
      try { localStorage.setItem("ShihikoEnableReverseAnimation", "false"); } catch(err) {}
      var h = vipLink.getAttribute("href") || "/account/login/index.html";
      if (location.pathname + location.search !== h) {
        e.preventDefault();
        window.location.href = h;
      }
    }
  }, true);

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a,button"); if (!a) return;
    var href = a.getAttribute("href") || "", label = (a.textContent || a.getAttribute("aria-label") || "").trim().slice(0, 40);
    if (/add-to-cart|js-add-to-cart|product-form__submit/i.test(a.className) || a.name === "add") trackEvent("add_to_cart", { label: label });
    else if (/^https?:/.test(href) && href.indexOf(location.host) < 0) trackEvent("outbound_click", { href: noQ(href) });
    else if (/\.(pdf|zip)$/i.test(href)) trackEvent("file_download", { href: noQ(href) });
    else trackEvent("cta_click", { label: label, href: noQ(href) });
  }, true);
  document.addEventListener("submit", function (e) {
    var f = e.target, id = f.id || f.getAttribute("action") || "form";
    if (f.querySelector("input[name=q]")) trackEvent("site_search", { length: (f.querySelector("input[name=q]").value || "").length });
    else trackEvent("form_submit", { form: id });
  }, true);
  document.addEventListener("focusin", function (e) { var f = e.target.form; if (f && !f.__t) { f.__t = 1; trackEvent("form_start", { form: f.id || "form" }); } });
  var marks = {}, scrollTick = false;
  function onScrollDepth() {
    if (scrollTick) return;
    scrollTick = true;
    requestAnimationFrame(function () {
      scrollTick = false;
      var h = document.documentElement, sh = h.scrollHeight;
      if (!sh) return;
      var pct = Math.round(((window.scrollY + innerHeight) / sh) * 100);
      [25, 50, 75, 100].forEach(function (m) { if (pct >= m && !marks[m]) { marks[m] = 1; trackEvent("scroll_depth", { percent: m }); } });
      if (marks[100]) window.removeEventListener("scroll", onScrollDepth);
    });
  }
  window.addEventListener("scroll", onScrollDepth, { passive: true });
  window.addEventListener("error", function (e) { trackEvent("javascript_error", { message: String(e.message || "error").slice(0, 120) }); });
  function vital(metric, value) { trackEvent("web_vital", { metric: metric, value: Math.round(value * (metric === "CLS" ? 1000 : 1)) / (metric === "CLS" ? 1000 : 1) }); }
  try {
    var nav = performance.getEntriesByType("navigation")[0]; if (nav) vital("TTFB", nav.responseStart);
    new PerformanceObserver(function (l) { l.getEntries().forEach(function (en) { if (en.name === "first-contentful-paint") vital("FCP", en.startTime); }); }).observe({ type: "paint", buffered: true });
    var lcp = 0, cls = 0, inp = 0;
    new PerformanceObserver(function (l) { var en = l.getEntries(); lcp = en[en.length - 1].startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver(function (l) { l.getEntries().forEach(function (en) { if (!en.hadRecentInput) cls += en.value; }); }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver(function (l) { l.getEntries().forEach(function (en) { inp = Math.max(inp, en.duration); }); }).observe({ type: "event", buffered: true, durationThreshold: 40 });
    addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden" && !window.__v) { window.__v = 1; if (lcp) vital("LCP", lcp); vital("CLS", cls); if (inp) vital("INP", inp); } });
  } catch (e) { /* older browser */ }

  // Load AnnR Unique One-of-One Archival Catalog engine
  try {
    if (!document.getElementById("annr-unique-catalog-script")) {
      var ucScript = document.createElement("script");
      ucScript.id = "annr-unique-catalog-script";
      ucScript.src = "/_ext/unique-catalog.js?v=20261112-v2";
      ucScript.defer = true;
      document.body.appendChild(ucScript);
    }
  } catch (e) {}
})();
