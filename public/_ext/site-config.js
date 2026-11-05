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
  function safeImg(u) {
    var s = String(u == null ? "" : u).trim();
    if (/^data:image\/(png|jpe?g|webp|gif|avif);base64,[a-z0-9+\/=]+$/i.test(s)) return s;
    var r = safeUrl(s); return r.charAt(0) === "#" || /^(mailto|tel):/i.test(r) ? "" : r;
  }

  function renderProductCardHtml(p, o) {
    o = o || (P && P[p.handle]) || {};
    var title = o.title != null ? o.title : p.title || "";
    var price = o.price != null ? o.price : p.price || "0";
    var pr = String(price).replace(/\.00$/, "");
    var compareAt = o.compareAt != null ? o.compareAt : p.compareAt;
    var img = (o.images && o.images[0]) || p.image || "";
    var img2 = (o.images && o.images[1]) || p.image2 || img;
    var badge = o.badge != null ? o.badge : p.badge;
    var badgeHtml = badge ? "<div class='product-card-labels' style='background:#000;color:#fff'>" + esc(badge) + "</div>" : "";
    var cmpHtml = compareAt ? "<span class='old-price money' style='opacity:.55;margin-left:6px;text-decoration:line-through;font-size:.9em'>Tk " + esc(String(compareAt).replace(/\.00$/, "")) + "<span class='money-currency-code'>BDT</span></span>" : "";

    return "<div class='lazy-item product-card' data-handle='" + esc(p.handle) + "'>" +
      "<div class='product-card-image'>" + badgeHtml +
        "<a href='/products/" + esc(p.handle) + "/index.html' class='product-card-image-wrapper' aria-label='" + esc(title) + "'>" +
          "<img src='" + esc(safeImg(img)) + "' alt='" + esc(title) + "' width='1200' height='1200' loading='lazy'>" +
          (img2 && img2 !== img ? "<img src='" + esc(safeImg(img2)) + "' alt='" + esc(title) + "' width='1200' height='1200' loading='lazy'>" : "") +
        "</a>" +
      "</div>" +
      "<a href='/products/" + esc(p.handle) + "/index.html' class='product-card-title'>" + esc(title) + "</a>" +
      "<div class='product-card-price'>" +
        "<span class='money'>Tk " + esc(pr) + "<span class='money-currency-code'>BDT</span></span>" +
        cmpHtml +
      "</div>" +
    "</div>";
  }

  // Search Engine & Catalog
  // Search Engine & Dynamic Catalog
  var baseCatalog = [];
  try {
    var cachedCat = sessionStorage.getItem("annr_base_catalog_cache");
    if (cachedCat) baseCatalog = JSON.parse(cachedCat);
  } catch (e) {}

  function loadBaseCatalog() {
    try {
      fetch("/_ext/catalog.json").then(function (r) {
        return r.ok ? r.json() : null;
      }).then(function (data) {
        if (Array.isArray(data)) {
          baseCatalog = data;
          try { sessionStorage.setItem("annr_base_catalog_cache", JSON.stringify(data)); } catch (err) {}
          if (tpl === "search") setupSearchPage();
        }
      }).catch(function () {});
    } catch (e) {}
  }
  loadBaseCatalog();

  function getFullCatalog() {
    var map = {};
    var list = [];
    (baseCatalog || []).forEach(function (p) {
      if (p && p.handle) {
        map[p.handle] = p;
        list.push(p);
      }
    });

    // Merge live admin products so any newly created/edited product appears immediately without republish
    try {
      var rawAdm = localStorage.getItem("shihiko-admin-v1");
      if (rawAdm) {
        var admParsed = JSON.parse(rawAdm);
        if (admParsed && Array.isArray(admParsed.products)) {
          admParsed.products.forEach(function (p) {
            if (p && p.handle) {
              if (!map[p.handle]) list.push(p);
              map[p.handle] = Object.assign({}, map[p.handle] || {}, p);
            }
          });
        }
      }
    } catch (e) {}

    if (cfg && Array.isArray(cfg.catalog)) {
      cfg.catalog.forEach(function (p) {
        if (p && p.handle) {
          if (!map[p.handle]) list.push(p);
          map[p.handle] = Object.assign({}, map[p.handle] || {}, p);
        }
      });
    }
    var delSet = {};
    if (cfg && Array.isArray(cfg.deletedProducts)) {
      cfg.deletedProducts.forEach(function (h) { delSet[h] = true; });
    }
    return list.filter(function (p) {
      if (delSet[p.handle]) return false;
      var o = P && P[p.handle];
      if (o && (o.deleted || o.status === "deleted")) return false;
      return true;
    }).map(function (p) {
      return Object.assign({}, map[p.handle] || p, (P && P[p.handle]) || {});
    });
  }

  var SEARCH_SYNONYMS = {
    "tshirt": "tee",
    "t-shirt": "tee",
    "shirt": "tee",
    "sweatshirt": "hoodie",
    "hoody": "hoodie",
    "sweater": "hoodie",
    "jacket": "jacket",
    "coat": "jacket",
    "pant": "jeans",
    "pants": "jeans",
    "trouser": "jeans",
    "trousers": "jeans",
    "jogger": "joggers",
    "bottom": "jeans",
    "bottoms": "jeans",
    "cap": "hat",
    "beanie": "hat",
    "sock": "socks"
  };

  function searchProducts(query) {
    var q = String(query || "").trim().toLowerCase();
    var rawTerms = q.split(/\s+/).filter(Boolean);
    var all = getFullCatalog();
    if (!rawTerms.length) return all.filter(function (p) { return !p.status || p.status === "active"; });

    var terms = rawTerms.map(function (t) { return SEARCH_SYNONYMS[t] || t; });

    var scored = [];
    for (var i = 0; i < all.length; i++) {
      var p = all[i];
      if (p.status && p.status !== "active") continue;
      var o = (P && P[p.handle]) || {};
      if (o.status && o.status !== "active") continue;

      var title = (o.title || p.title || "").toLowerCase();
      var desc = (o.description || p.description || "").toLowerCase();
      var handle = (p.handle || "").toLowerCase();
      var tags = (p.tags || "").toLowerCase();
      var type = (p.type || "").toLowerCase();

      var matchedAll = true;
      var score = 0;

      for (var j = 0; j < terms.length; j++) {
        var t = terms[j];
        var rawT = rawTerms[j];
        var termMatched = false;

        if (title.indexOf(t) >= 0 || title.indexOf(rawT) >= 0) {
          score += 100;
          if (title.indexOf(t) === 0 || title.indexOf(rawT) === 0) score += 50; // starts with
          termMatched = true;
        }
        if (handle.indexOf(t) >= 0 || handle.indexOf(rawT) >= 0) {
          score += 60;
          termMatched = true;
        }
        if (tags.indexOf(t) >= 0 || tags.indexOf(rawT) >= 0) {
          score += 40;
          termMatched = true;
        }
        if (type.indexOf(t) >= 0 || type.indexOf(rawT) >= 0) {
          score += 30;
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
            "<div style='font-size:10px;opacity:.7'>Popular collections: " +
              "<a href='/collections/all/index.html' style='color:#fff;margin:0 4px;text-decoration:underline'>All</a> · " +
              "<a href='/search/index.html?q=hoodie' style='color:#fff;margin:0 4px;text-decoration:underline'>Hoodies</a> · " +
              "<a href='/search/index.html?q=jacket' style='color:#fff;margin:0 4px;text-decoration:underline'>Jackets</a> · " +
              "<a href='/search/index.html?q=tee' style='color:#fff;margin:0 4px;text-decoration:underline'>Tees</a>" +
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
          "<p style='font-size:11px;opacity:.6'>Try checking your spelling or use general keywords like “hoodie”, “jacket”, “tee”, “jeans”.</p>" +
        "</div>";
      }
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
        if (info.visible === false) {
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
        if (info.visible === false) {
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
        if (info.visible === false) {
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
      var isDel = (cfg && Array.isArray(cfg.deletedProducts) && cfg.deletedProducts.indexOf(h) !== -1) ||
                  (o && (o.deleted || o.status === "deleted"));
      var isInactive = o && o.status && o.status !== "active";
      var card = a.closest(".product-card, li, .grid__item") || a.parentElement;
      if (isDel || isInactive) {
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
      var isDel = (cfg && Array.isArray(cfg.deletedProducts) && cfg.deletedProducts.indexOf(ph) !== -1) ||
                  (P && P[ph] && (P[ph].deleted || P[ph].status === "deleted"));
      var isInactive = P && P[ph] && P[ph].status && P[ph].status !== "active";
      if ((isDel || isInactive) && !preview) {
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
      // Universal Interactive Size Guide Popup (#sizes-popup) + Admin Panel Sync
      (function setupUniversalSizeGuide(handle, productObj) {
        var DEFAULT_PRESETS = {
          tee: {
            fitType: "oversized fit",
            headers: ["SIZE", "CHEST", "LENGTH", "SLEEVE"],
            rows: [
              { size: "S", col1: "57", col2: "70", col3: "21" },
              { size: "M", col1: "60", col2: "72", col3: "22" },
              { size: "L", col1: "63", col2: "75", col3: "23" },
              { size: "XL", col1: "66", col2: "77", col3: "24" },
              { size: "XXL", col1: "69", col2: "79", col3: "25" }
            ],
            notes: "Heavyweight 280 GSM combed cotton. Drop-shoulder oversized streetwear silhouette."
          },
          hoodie: {
            fitType: "oversized fit",
            headers: ["SIZE", "CHEST", "LENGTH", "SLEEVE"],
            rows: [
              { size: "S", col1: "62", col2: "68", col3: "59" },
              { size: "M", col1: "65", col2: "71", col3: "61" },
              { size: "L", col1: "68", col2: "74", col3: "62" },
              { size: "XL", col1: "71", col2: "76", col3: "63" },
              { size: "XXL", col1: "74", col2: "79", col3: "64" }
            ],
            notes: "480 GSM heavyweight French terry fleece. Boxy drop-shoulder fit."
          },
          longsleeve: {
            fitType: "relaxed fit",
            headers: ["SIZE", "CHEST", "LENGTH", "SLEEVE"],
            rows: [
              { size: "S", col1: "58", col2: "69", col3: "60" },
              { size: "M", col1: "61", col2: "72", col3: "62" },
              { size: "L", col1: "64", col2: "74", col3: "63" },
              { size: "XL", col1: "67", col2: "77", col3: "65" },
              { size: "XXL", col1: "70", col2: "79", col3: "66" }
            ],
            notes: "Relaxed silhouette with ribbed cuffs."
          },
          jacket: {
            fitType: "boxy fit",
            headers: ["SIZE", "CHEST", "LENGTH", "SLEEVE"],
            rows: [
              { size: "S", col1: "63", col2: "66", col3: "61" },
              { size: "M", col1: "66", col2: "68", col3: "62" },
              { size: "L", col1: "69", col2: "71", col3: "64" },
              { size: "XL", col1: "72", col2: "73", col3: "65" },
              { size: "XXL", col1: "75", col2: "75", col3: "67" }
            ],
            notes: "Cropped boxy outerwear cut. Size up for extra layering room."
          },
          pants: {
            fitType: "relaxed fit",
            headers: ["SIZE", "WAIST", "LENGTH", "INSEAM"],
            rows: [
              { size: "S (30)", col1: "76", col2: "104", col3: "74" },
              { size: "M (32)", col1: "81", col2: "106", col3: "75" },
              { size: "L (34)", col1: "86", col2: "108", col3: "77" },
              { size: "XL (36)", col1: "91", col2: "110", col3: "78" },
              { size: "XXL (38)", col1: "96", col2: "112", col3: "79" }
            ],
            notes: "Wide-leg architectural cut. Waist measured flat × 2."
          },
          shorts: {
            fitType: "relaxed fit",
            headers: ["SIZE", "WAIST", "LENGTH", "OPENING"],
            rows: [
              { size: "S", col1: "74", col2: "48", col3: "31" },
              { size: "M", col1: "79", col2: "50", col3: "32" },
              { size: "L", col1: "84", col2: "52", col3: "34" },
              { size: "XL", col1: "89", col2: "54", col3: "35" },
              { size: "XXL", col1: "94", col2: "56", col3: "36" }
            ],
            notes: "Elasticated drawstring waist with relaxed knee-length cut."
          }
        };

        var titleText = (productObj.title || (document.querySelector(".product-info-title") || {}).textContent || handle || "").toLowerCase();
        var combinedKey = (handle + " " + titleText).toLowerCase();
        var isBottoms = /jean|pant|trouser|cargo|jogger|sweatpant|short/.test(combinedKey);
        var defaultPreset = /short/.test(combinedKey)
          ? DEFAULT_PRESETS.shorts
          : isBottoms
          ? DEFAULT_PRESETS.pants
          : /jacket|coat|bomber|vest|workwear|windbreaker/.test(combinedKey)
          ? DEFAULT_PRESETS.jacket
          : /hoodie|zip|sweatshirt|fleece/.test(combinedKey)
          ? DEFAULT_PRESETS.hoodie
          : /longsleeve|long-sleeve|knit|sweater|crewneck|thermal/.test(combinedKey)
          ? DEFAULT_PRESETS.longsleeve
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
              wrapDiv.innerHTML = "<button type='button' class='sizes-popup-trigger js-sizes-trigger' style='background:none;border:none;text-decoration:underline;font:11px/1 \"NB Architekt Std\",sans-serif;text-transform:uppercase;letter-spacing:1px;cursor:pointer;color:inherit'>Size Guide</button>";
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
          var toIn = function (cmVal) {
            var n = parseFloat(String(cmVal).replace(/[^0-9.]/g, ""));
            return isFinite(n) ? (Math.round((n / 2.54) * 10) / 10) : cmVal;
          };
          var headRow = "<thead><tr><th>" + esc(hdrs[0]) + "</th><th>" + esc(hdrs[1]) + "<span>[1]</span></th><th>" + esc(hdrs[2]) + "<span>[2]</span></th><th>" + esc(hdrs[3]) + "<span>[3]</span></th></tr></thead>";
          var cmBody = "<tbody>" + rows.map(function (r) {
            return "<tr><td>" + esc(r.size) + "</td><td>" + esc(r.col1) + "</td><td>" + esc(r.col2) + "</td><td>" + esc(r.col3) + "</td></tr>";
          }).join("") + "</tbody>";
          var inBody = "<tbody>" + rows.map(function (r) {
            return "<tr><td>" + esc(r.size) + "</td><td>" + esc(toIn(r.col1)) + "</td><td>" + esc(toIn(r.col2)) + "</td><td>" + esc(toIn(r.col3)) + "</td></tr>";
          }).join("") + "</tbody>";

          return "<div class='sizes-popup-table' data-size-unit='cm'><table>" + headRow + cmBody + "</table></div>" +
                 "<div class='sizes-popup-table hide' data-size-unit='in'><table>" + headRow + inBody + "</table></div>" +
                 (guide.notes ? "<div class='adm-size-notes' style='margin-top:14px;padding:10px 12px;background:rgba(0,0,0,0.04);border-left:2px solid #111;font:11px/1.5 \"NB Architekt Std\",sans-serif;text-transform:uppercase;letter-spacing:0.5px;color:#222'>" + esc(guide.notes) + "</div>" : "");
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
                    "<input type='radio' name='unit' value='in' id='unit-in' class='js-size-switcher'>" +
                    "<label for='unit-in' class='sizes-popup-switcher-label'>IN</label>" +
                    "<input type='radio' name='unit' value='cm' id='unit-cm' checked class='js-size-switcher'>" +
                    "<label for='unit-cm' class='sizes-popup-switcher-label'>CM</label>" +
                  "</div>" +
                "</div>" +
                "<div class='adm-sizes-tables-wrap'>" + buildTablesHtml(activeGuide) + "</div>" +
              "</div>" +
            "</div>";
          document.body.appendChild(popupEl);
        } else {
          // Popup already exists in static HTML: fix broken external shihiko.com image & apply any Admin Panel override
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
              // Sync radio state
              var checkedUnit = popupEl.querySelector(".js-size-switcher:checked");
              var uVal = checkedUnit ? checkedUnit.value : "cm";
              contentBox.querySelectorAll(".sizes-popup-table").forEach(function (t) {
                t.classList.toggle("hide", t.getAttribute("data-size-unit") !== uVal);
              });
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
            var unit = sw.value;
            var pop = document.getElementById("sizes-popup");
            if (!pop) return;
            pop.querySelectorAll(".sizes-popup-table").forEach(function (tbl) {
              tbl.classList.toggle("hide", tbl.getAttribute("data-size-unit") !== unit);
            });
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
      if (Array.isArray(prod.variants) && prod.variants.length) {
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
        if (totalStock <= 0) {
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
      if (o && o.image && safeImg(o.image)) {
        var cHero = document.querySelector('[id$="__collection_hero"]');
        if (cHero && !cHero.querySelector(".adm-col-hero")) {
          cHero.innerHTML = "<img class='adm-col-hero' src='" + esc(safeImg(o.image)) + "' alt='" + esc(o.title || "") + "' style='width:100%;max-height:360px;object-fit:cover;display:block'>";
        }
      }
      var grid = document.querySelector(".collection-product-grid");
      if (grid) {
        // Collect existing product handles in the grid
        var existingInGrid = {};
        grid.querySelectorAll(".product-card").forEach(function (card) {
          var link = card.querySelector("a.product-card-title");
          var h = link && handleOf(link.getAttribute("href"), "products");
          if (h) {
            existingInGrid[h] = true;
            var isProductDeleted = (cfg && Array.isArray(cfg.deletedProducts) && cfg.deletedProducts.indexOf(h) !== -1) ||
                                   (P && P[h] && (P[h].deleted || P[h].status === "deleted" || (P[h].status && P[h].status !== "active")));
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

        // Dynamically append any active product belonging to this collection that isn't in DOM
        var allProds = getFullCatalog();
        allProds.forEach(function (p) {
          if (!p || !p.handle || existingInGrid[p.handle]) return;
          if (p.status && p.status !== "active") return;
          var inCol = ch === "all" ||
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
        el.innerHTML = "<div style='padding:48px 20px;max-width:1440px;margin:0 auto'>" + img + (a.heading ? "<h2 style='font-family:\"Druk Wide\",sans-serif;text-transform:uppercase;font-size:24px;margin:0 0 12px'>" + esc(a.heading) + "</h2>" : "") + (a.text ? "<p style='font-family:\"NB Architekt Std\",sans-serif;font-size:12px;line-height:1.6;white-space:pre-line;margin:0'>" + esc(a.text) + "</p>" : "") + extraHtml + btn + "</div>";
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

      function getVipSettings() {
        try {
          var s = localStorage.getItem("annr-loyalty-settings-v1") || localStorage.getItem("annr-loyalty-settings");
          if (s) return JSON.parse(s);
        } catch(e) {}
        return {
          point_value_bdt: 1.0,
          min_withdrawal_bdt: 100,
          points_per_referral: 100,
          friend_discount_value: 10,
          friend_discount_type: "percent",
          min_order_for_coupon: 1000,
          allowed_payout_methods: ["bkash", "nagad", "rocket", "bank"]
        };
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

      function hashPassword(str) {
        if (window.crypto && window.crypto.subtle && window.crypto.subtle.digest) {
          var buf = new TextEncoder().encode(str + ":annr_vip_salt");
          return window.crypto.subtle.digest("SHA-256", buf).then(function(hash) {
            return Array.from(new Uint8Array(hash)).map(function(b) { return b.toString(16).padStart(2, "0"); }).join("");
          }).catch(function() { return "plain:" + str; });
        }
        return Promise.resolve("plain:" + str);
      }

      function callRegisterRpc(profile) {
        return fetch(SB_URL + "/rest/v1/rpc/register_vip_member", {
          method: "POST",
          headers: {
            "apikey": SB_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(profile)
        }).then(function(r) {
          return r.json().then(function(data) {
            return { ok: r.ok, status: r.status, data: data };
          });
        }).catch(function() {
          return { ok: false, status: 0, data: { error: "Network error. Please check your connection." } };
        });
      }

      // Inject Luxury Light-Themed VIP Auth & Dashboard Styles matching exact design mockup
      if (!document.getElementById("vip-inpage-styles")) {
        var st = document.createElement("style");
        st.id = "vip-inpage-styles";
        st.textContent = "" +
          ".header-search-new { position: fixed !important; top: 12px !important; right: 12px !important; bottom: 12px !important; left: 12px !important; z-index: 1300 !important; display: block !important; height: auto !important; max-height: none !important; padding: 0 !important; opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; overflow: hidden !important; }\n" +
          ".header-search-new.open { opacity: 1 !important; visibility: visible !important; pointer-events: auto !important; }\n" +
          ".header-search-overflow { display: none !important; }\n" +
          ".header-search-overflow.open { display: block !important; position: fixed !important; inset: 0 !important; background: rgba(0,0,0,0.6) !important; z-index: 1290 !important; }\n" +
          "body.vip-page, .vip-page .wrapper, .vip-page .wrapper-vip, .vip-page .vip, .vip-page .vip-wrapper, .vip-page .main { background: #f7f4ef !important; color: #111111 !important; min-height: 100vh !important; margin: 0 !important; padding: 0 !important; }\n" +
          ".vip-page .vip-bg, .vip-page .vip-dec, .vip-page .vip-top, .vip-page .vip-tab, .vip-page .vip-admin-link, .vip-page .vip-reset-password, .vip-page .vip-preloader { display: none !important; }\n" +
          ".vip-page .vip-form { padding: 0 !important; margin: 0 !important; background: transparent !important; width: 100% !important; max-width: 100% !important; }\n" +
          ".vip-page .vip-form__wrapper { max-width: 100% !important; width: 100% !important; padding: 0 !important; margin: 0 !important; }\n" +
          "#vip-inpage-hub { width: 100%; margin: 0 auto; color: #111; font-family: 'NB Architekt Std', sans-serif; box-sizing: border-box; background: #f7f4ef; min-height: 100vh; }\n" +

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
          ".vip-field input, .vip-field select { width: 100%; background: transparent !important; border: none !important; border-bottom: 1.5px solid #1a1a1a !important; color: #111111 !important; font-family: 'NB Architekt Std', sans-serif !important; font-size: 13px !important; padding: 8px 0 9px !important; border-radius: 0 !important; outline: none !important; box-shadow: none !important; box-sizing: border-box; transition: border-color .2s ease; }\n" +
          ".vip-field input::placeholder { color: #8c887e !important; font-family: 'NB Architekt Std', sans-serif !important; font-size: 12.5px !important; text-transform: none; }\n" +
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
          ".vip-dash-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 22px; }\n" +
          ".vip-dash-split { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 22px; align-items: start; }\n" +

          "/* Responsive */\n" +
          "@media (max-width: 880px) {\n" +
          "  .vip-store-header { padding: 0 16px; }\n" +
          "  .vip-header-left { display: none; }\n" +
          "  .vip-vault-page-container { grid-template-columns: 1fr; gap: 32px; margin: 20px auto 40px; padding: 0 16px; }\n" +
          "  .vip-vault-form-grid { grid-template-columns: 1fr; gap: 14px; }\n" +
          "  .vip-dash-grid { grid-template-columns: repeat(2, 1fr); }\n" +
          "  .vip-dash-split { grid-template-columns: 1fr; }\n" +
          "}";
        document.head.appendChild(st);
      }

      function archInput(idx, label, inputHtml) {
        return "<div class='vip-arch-field'>" +
          "<div class='vip-field-tag'><span>" + label + "</span><span style='opacity:0.45'>[" + idx + "]</span></div>" +
          "<div class='input-group white-input-group'>" + inputHtml + "</div>" +
        "</div>";
      }

      function archSelect(idx, label, selectHtml) {
        return "<div class='vip-arch-field'>" +
          "<div class='vip-field-tag'><span>" + label + "</span><span style='opacity:0.45'>[" + idx + "]</span></div>" +
          "<div class='select-group'>" + selectHtml + "</div>" +
        "</div>";
      }

      function noticeHtml() {
        var n = window.__annrVipNotice; window.__annrVipNotice = null;
        if (!n) return "";
        var c = n.type === "ok" ? "#22c55e" : n.type === "info" ? "#fa9442" : "#ef4444";
        return "<div role='status' style='border:1px solid " + c + ";border-left:3px solid " + c + ";background:rgba(12,14,20,0.92);color:#f4f4f5;padding:12px 16px;font-family:\"FK Grotesk SemiMono\",monospace;font-size:11.5px;line-height:1.5;margin-bottom:16px'>" + esc(n.text) + "</div>";
      }

      function setBusy(form, busy, label) {
        var b = form && form.querySelector("button[type=submit]");
        if (!b) return;
        var textSpan = b.querySelector(".text") || b;
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
        var box = form.querySelector(".vip-err");
        if (!box) {
          box = document.createElement("div"); box.className = "vip-err"; box.setAttribute("role", "alert");
          box.style.cssText = "color:#b91c1c;background:#fef2f2;border:1px solid #f87171;border-left:3px solid #dc2626;padding:12px 14px;font-family:'FK Grotesk SemiMono',monospace;font-size:11.5px;line-height:1.5;margin-bottom:16px;border-radius:2px";
          form.insertBefore(box, form.firstChild);
        }
        box.textContent = text; box.style.display = text ? "" : "none";
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
            ds.innerHTML = "<option value='' disabled selected>Select district</option>" + list.map(function (d) { return "<option value='" + esc(d) + "'>" + esc(d) + "</option>"; }).join("");
          }
        };
        dv.onchange = upd;
        var ref = root.querySelector("#vip-reg-refcode");
        var urlRef = new URLSearchParams(location.search).get("ref") || "";
        if (!urlRef) {
          try { urlRef = localStorage.getItem("annr_active_ref_code") || ""; } catch (e) {}
        }
        if (ref && urlRef && /^[A-Za-z0-9_-]{3,24}$/.test(urlRef)) {
          ref.value = urlRef.toUpperCase();
        }
      }

      function renderInPageVipHub() {
        var c = vipContainer();
        if (!c) return;

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

          renderDashboard(c, sessionData);

          // Silently sync from Supabase without overwriting higher local points/referrals
          if (sessionData.member.email) {
            callRegisterRpc({
              p_full_name: sessionData.member.full_name || "VIP Member",
              p_email: sessionData.member.email,
              p_phone: sessionData.member.phone || "01700000000",
              p_division: sessionData.member.division || "Dhaka",
              p_district: sessionData.member.district || "Dhaka"
            }).then(function(res) {
              if (res.ok && res.data && res.data.member) {
                var remoteMember = res.data.member;
                var curSess = getSessionMember() || sessionData;
                var curM = curSess.member || {};
                remoteMember.available_points = Math.max(Number(curM.available_points || 0), Number(remoteMember.available_points || 0));
                remoteMember.total_earned_points = Math.max(Number(curM.total_earned_points || 0), Number(remoteMember.total_earned_points || 0));
                remoteMember.withdrawn_points = Math.max(Number(curM.withdrawn_points || 0), Number(remoteMember.withdrawn_points || 0));
                remoteMember.friends_referred = Math.max(Number(curM.friends_referred || 0), Number(remoteMember.friends_referred || 0));

                var remoteCoupon = res.data.coupon || curSess.coupon || { code: remoteMember.referral_code };
                if (curSess.coupon) {
                  remoteCoupon.times_used = Math.max(Number(curSess.coupon.times_used || 0), Number(remoteCoupon.times_used || 0));
                  remoteCoupon.total_points_generated = Math.max(Number(curSess.coupon.total_points_generated || 0), Number(remoteCoupon.total_points_generated || 0));
                }

                saveSessionMember({
                  member: remoteMember,
                  coupon: remoteCoupon,
                  settings: res.data.settings || curSess.settings || getVipSettings()
                });
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
        var st = getVipSettings();
        var discLabel = st.friend_discount_type === "fixed" ? ("৳" + Number(st.friend_discount_value || 100) + " OFF") : (Number(st.friend_discount_value || 10) + "% OFF");
        var refPts = Number(st.points_per_referral || 100);
        var welcomePts = Number(st.welcome_bonus_points != null ? st.welcome_bonus_points : 100);
        var isLoginPage = /\/account\/login/i.test(location.pathname);
        var isRegisterPage = /\/account\/register/i.test(location.pathname);
        var openLoginInitially = (isLoginPage && location.hash !== "#register" && location.search.indexOf("mode=register") === -1) ||
                                 location.hash === "#login" ||
                                 location.search.indexOf("mode=login") !== -1;

        var eyeOpenSvg = "<svg width='17' height='17' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'/><circle cx='12' cy='12' r='3'/></svg>";
        var eyeClosedSvg = "<svg width='17' height='17' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24'/><line x1='1' y1='1' x2='23' y2='23'/></svg>";

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
                      "<input type='text' id='vip-reg-name' required maxlength='120' autocomplete='name' placeholder='Enter your full name'>" +
                    "</div>" +
                    "<div class='vip-field'>" +
                      "<label class='vip-field-label'>EMAIL ADDRESS <span class='req'>*</span></label>" +
                      "<input type='email' id='vip-reg-email' required autocomplete='email' autocapitalize='off' inputmode='email' placeholder='Enter your email address'>" +
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
                        "<input type='password' id='vip-reg-pass' required minlength='6' autocomplete='new-password' placeholder='Create a password (min 6 characters)'>" +
                        "<button type='button' class='vip-eye-toggle' id='vip-reg-eye' aria-label='Toggle password visibility'>" + eyeOpenSvg + "</button>" +
                      "</div>" +
                    "</div>" +

                    "<div class='vip-field'>" +
                      "<label class='vip-field-label'>DIVISION <span class='req'>*</span></label>" +
                      "<div class='vip-select-group'>" +
                        "<select id='vip-reg-division'>" +
                          "<option value='' disabled selected>Select division</option>" +
                          Object.keys(BD_GEO).map(function (d) { return "<option value='" + esc(d) + "'>" + esc(d) + "</option>"; }).join("") +
                        "</select>" +
                        "<span class='vip-select-arrow'>∨</span>" +
                      "</div>" +
                    "</div>" +
                    "<div class='vip-field'>" +
                      "<label class='vip-field-label'>DISTRICT <span class='req'>*</span></label>" +
                      "<div class='vip-select-group'>" +
                        "<select id='vip-reg-district'>" +
                          "<option value='' disabled selected>Select district</option>" +
                        "</select>" +
                        "<span class='vip-select-arrow'>∨</span>" +
                      "</div>" +
                    "</div>" +

                    "<div class='vip-field'>" +
                      "<label class='vip-field-label'>DELIVERY ADDRESS (THANA, ROAD, HOUSE) <span class='req'>*</span></label>" +
                      "<input type='text' id='vip-reg-addr' required maxlength='300' autocomplete='street-address' placeholder='Enter your complete delivery address'>" +
                    "</div>" +
                    "<div class='vip-field'>" +
                      "<label class='vip-field-label'>FRIEND'S REFERRAL CODE (OPTIONAL)</label>" +
                      "<input type='text' id='vip-reg-refcode' maxlength='24' autocapitalize='characters' placeholder='Enter referral code (e.g. VIP-RATUL88)'>" +
                    "</div>" +
                  "</div>" +
                  "<input type='hidden' id='vip-reg-thana' value=''>" +

                  "<div class='vip-vault-checks'>" +
                    "<label class='vip-checkbox-label'>" +
                      "<input type='checkbox' id='vip-reg-wa' checked>" +
                      "<span>Get updates and exclusive offers on WhatsApp.</span>" +
                    "</label>" +
                    "<label class='vip-checkbox-label'>" +
                      "<input type='checkbox' id='vip-reg-terms' checked required>" +
                      "<span>I agree to the <a href='/pages/terms' target='_blank'>Terms of Service</a> and <a href='/pages/privacy' target='_blank'>Privacy Policy</a>. <span class='req'>*</span></span>" +
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
                      "<input type='text' id='vip-login-id' required autocomplete='username' autocapitalize='off' placeholder='Enter your registered email or phone'>" +
                    "</div>" +
                    "<div class='vip-field'>" +
                      "<label class='vip-field-label'>PASSWORD <span class='req'>*</span></label>" +
                      "<div class='vip-pass-group'>" +
                        "<input type='password' id='vip-login-pass' required autocomplete='current-password' placeholder='Enter your password'>" +
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

        var fl = c.querySelector("#vip-login-form"), fs = c.querySelector("#vip-signup-form");
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

        // Sign In Form Handler
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

          if (idInput.indexOf("@") !== -1) {
            email = idInput.toLowerCase().trim();
          } else {
            phone = idInput.replace(/[^0-9]/g, "");
            if (phone.startsWith("880")) phone = phone.slice(3);
            if (phone.length === 10 && /^1[3-9]/.test(phone)) phone = "0" + phone;
          }

          var acc = (email ? accounts[email] : null) || (phone ? accounts[phone] : null);

          // If not directly in accounts, search annr-vip-members list
          if (!acc) {
            try {
              var rawMembers = localStorage.getItem("annr-vip-members");
              if (rawMembers) {
                var mList = JSON.parse(rawMembers);
                if (Array.isArray(mList)) {
                  var found = mList.find(function(m) {
                    if (!m) return false;
                    if (email && m.email && m.email.toLowerCase().trim() === email) return true;
                    if (phone && m.phone) {
                      var normP = m.phone.replace(/[^0-9]/g, "");
                      if (normP.startsWith("880")) normP = normP.slice(3);
                      if (normP.length === 10 && /^1[3-9]/.test(normP)) normP = "0" + normP;
                      if (normP === phone) return true;
                    }
                    return false;
                  });
                  if (found) {
                    email = (found.email || email).toLowerCase().trim();
                    phone = found.phone || phone;
                    acc = {
                      email: email,
                      phone: phone,
                      name: found.full_name || "VIP Member",
                      available_points: found.available_points != null ? found.available_points : 100,
                      member: found,
                      coupon: { code: found.referral_code || "VIP-ANNR10" }
                    };
                  }
                }
              }
            } catch(e) {}
          }

          hashPassword(pw).then(function(inputHash) {
            if (acc) {
              if (acc.passHash && acc.passHash !== inputHash && acc.passHash !== "plain:" + pw) {
                setBusy(fl, false);
                showErr(fl, "Incorrect password. Please verify your password and try again.");
                return;
              }

              // Password verified or newly set
              if (!acc.passHash) acc.passHash = inputHash;

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
              return;
            }

            // Fallback: Check if Supabase has this user without registering them
            if (email) {
              callRegisterRpc({
                p_full_name: "VIP Member",
                p_email: email,
                p_phone: phone || "01700000000",
                p_division: "Dhaka",
                p_district: "Dhaka"
              }).then(function(res) {
                setBusy(fl, false);
                if (res.ok && res.data && res.data.member && res.data.existing) {
                  var m = res.data.member;
                  var cpn = res.data.coupon || { code: m.referral_code };
                  saveSessionMember({ member: m, coupon: cpn, settings: res.data.settings || getVipSettings() });
                  saveVipAccount({
                    email: email,
                    phone: m.phone || phone,
                    name: m.full_name,
                    passHash: inputHash,
                    available_points: m.available_points,
                    member: m,
                    coupon: cpn
                  });
                  renderInPageVipHub();
                } else {
                  showErr(fl, "No VIP account found with this email. Please check your credentials or click 'Create Account' to join.");
                }
              }).catch(function() {
                setBusy(fl, false);
                showErr(fl, "No VIP account found with this email. Please check your credentials or click 'Create Account' to join.");
              });
            } else {
              setBusy(fl, false);
              showErr(fl, "No VIP account found for mobile number " + idInput + ". Please sign in with your registered email or create an account.");
            }
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
          if (!/^01[3-9][0-9]{8}$/.test(ph)) {
            showErr(fs, "Enter a valid 11-digit mobile number (e.g. 017XXXXXXXX)."); return;
          }
          if (pw.length < 6) {
            showErr(fs, "Password must be at least 6 characters."); return;
          }
          if (!div) {
            showErr(fs, "Please select your division."); return;
          }
          if (!dist) {
            showErr(fs, "Please select your district."); return;
          }
          if (addr.length < 3) {
            showErr(fs, "Please enter your delivery address."); return;
          }
          if (!termsAgreed) {
            showErr(fs, "Please agree to the Terms of Service and Privacy Policy."); return;
          }

          showErr(fs, "");
          setBusy(fs, true, "CREATING VIP VAULT…");

          callRegisterRpc({
            p_full_name: nm,
            p_email: em,
            p_phone: ph,
            p_division: div,
            p_district: dist,
            p_upazila: thana || null,
            p_full_address: addr,
            p_is_whatsapp: isWa,
            p_referred_by: ref || null
          }).then(function(res) {
            setBusy(fs, false);
            var member = (res.ok && res.data && res.data.member) ? res.data.member : null;
            var coupon = (res.ok && res.data && res.data.coupon) ? res.data.coupon : null;
            var settings = (res.ok && res.data && res.data.settings) ? res.data.settings : getVipSettings();

            var welcomePts = Number(settings.welcome_bonus_points != null ? settings.welcome_bonus_points : 100);
            if (!member) {
              var prefix = String(settings.referral_code_prefix || "ANNR").toUpperCase();
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
                min_order_bdt: Number(settings.min_order_for_coupon || 1000),
                times_used: 0,
                total_points_generated: 0
              };
            }

            if (member.available_points == null || member.available_points < welcomePts) {
              member.available_points = welcomePts;
              member.total_earned_points = Math.max(welcomePts, Number(member.total_earned_points || welcomePts));
            }

            // Record initial Welcome Bonus in points ledger & member notifications
            if (welcomePts > 0) {
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
            if (ref && ref !== member.referral_code) {
              creditReferrerOnSignup(ref, nm, em);
              try {
                localStorage.setItem("annr_cart_coupon", ref);
                localStorage.setItem("annr_active_ref_code", ref);
              } catch (err) {}
              refBonusNote = " Friend referral code " + ref + " linked (" + (settings.friend_discount_type === "fixed" ? "৳" + settings.friend_discount_value : (settings.friend_discount_value || 10) + "%") + " OFF queued for your next order).";
            }

            hashPassword(pw).then(function(hash) {
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

              window.__annrVipNotice = {
                type: "ok",
                text: "Welcome to AnnR VIP! +" + welcomePts + " Welcome Points credited to your vault. Your personal referral coupon is " + (coupon ? coupon.code : member.referral_code) + "." + refBonusNote
              };

              renderInPageVipHub();
            });
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
        var welcomeBonusPts = Number(s.welcome_bonus_points != null ? s.welcome_bonus_points : 100);

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

        var statBox = function (idx, label, value, sub, accent) {
          return "<div style='background:rgba(12,14,22,0.82);border:1px solid rgba(255,255,255,0.14);" + (accent ? "border-top:2px solid " + accent + ";" : "") + "padding:14px 16px;position:relative'>" +
            "<div style='display:flex;justify-content:space-between;font:9px/1 \"FK Grotesk SemiMono\",monospace;text-transform:uppercase;letter-spacing:1.4px;color:#8e92a8;margin-bottom:8px'><span>" + label + "</span><span style='opacity:.45'>[" + idx + "]</span></div>" +
            "<div style='font:20px/1.1 \"Druk Wide\",\"NB Architekt Std\",sans-serif;color:" + (accent || "#f3e7d6") + ";margin-bottom:6px;word-break:break-word'>" + value + "</div>" +
            "<div style='font:9.5px/1.3 \"FK Grotesk SemiMono\",monospace;color:#7e8299;text-transform:uppercase'>" + sub + "</div></div>";
        };

        var badge = function (st) {
          var col = st === "paid" || st === "completed" ? "#22c55e" : st === "approved" ? "#3b82f6" : st === "rejected" || st === "reversed" ? "#ef4444" : "#f59e0b";
          return "<span style='color:" + col + ";text-transform:uppercase;font:9px/1 \"FK Grotesk SemiMono\",monospace;font-weight:700;letter-spacing:1.5px;border:1px solid " + col + ";padding:4px 8px'>" + esc(st) + "</span>";
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

        c.innerHTML =
          "<div id='vip-inpage-hub'>" +
            noticeHtml() +
            (m.status && m.status !== "active" ? "<div style='border:1px solid #ef4444;border-left:3px solid #ef4444;background:rgba(239,68,68,0.12);color:#fca5a5;padding:12px 16px;font-size:12px;margin-bottom:16px'>Your VIP account status is " + esc(m.status) + ". Please contact AnnR support.</div>" : "") +

            "<div style='background:rgba(7,8,12,0.78);border:1px solid rgba(255,255,255,0.15);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);padding:26px 30px;position:relative'>" +
              // Top Profile Header
              "<div style='border-bottom:1px solid rgba(255,255,255,0.12);padding-bottom:16px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap'>" +
                "<div>" +
                  "<div style='display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap'>" +
                    "<span style='font:10px/1 \"FK Grotesk SemiMono\",monospace;letter-spacing:2.2px;color:" + esc(currentTierObj.badge_color || "#fa9442") + ";text-transform:uppercase;border:1px solid " + esc(currentTierObj.badge_color || "#fa9442") + ";padding:4px 8px;background:rgba(250,148,66,0.08)'>★ " + esc((m.tier || "SILVER").toUpperCase()) + " TIER (" + (currentTierObj.point_multiplier || 1) + "× PTS)</span>" +
                    "<span style='font:10px/1 \"FK Grotesk SemiMono\",monospace;letter-spacing:1.8px;color:#a0a3b8;text-transform:uppercase'>REF CODE: <strong style='color:#f3e7d6'>" + esc(myCode) + "</strong></span>" +
                  "</div>" +
                  "<div style='font:24px/1.1 \"NB Architekt Std\",sans-serif;color:#f3e7d6;text-shadow:0 0 10px rgba(243,121,91,.65);letter-spacing:2px;text-transform:uppercase'>" + esc(m.full_name) + "</div>" +
                  "<div style='font:10.5px/1.3 \"FK Grotesk SemiMono\",monospace;color:#8e92a8;margin-top:4px'>" + esc(m.phone || "") + " · " + esc(m.email || "") + " · " + esc(m.district || "Dhaka") + ", " + esc(m.division || "Dhaka") + "</div>" +
                "</div>" +
                "<div style='display:flex;gap:10px;align-items:center;flex-wrap:wrap'>" +
                  "<a href='/checkout' class='btn btn-vip-orange' style='width:auto;min-height:42px;text-decoration:none'>" +
                    "<span class='content' style='min-height:42px;padding:11px 16px;display:flex;align-items:center'>" +
                      "<span><span class='text' style='font:10.5px/1 \"NB Architekt Std\",sans-serif;font-weight:700;letter-spacing:1.5px;text-transform:uppercase'>⚡ REDEEM PTS AT CHECKOUT</span></span>" +
                    "</span>" +
                    "<span class='corners'></span>" +
                  "</a>" +
                  "<a href='/collections/all/index.html' class='btn vip-alt-btn' style='width:auto;min-height:42px;text-decoration:none'>" +
                    "<span class='content' style='background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.25);color:#fff;min-height:42px;padding:11px 16px;display:flex;align-items:center'>" +
                      "<span><span class='text' style='font:10.5px/1 \"NB Architekt Std\",sans-serif;font-weight:700;letter-spacing:1.5px;text-transform:uppercase'>SHOP CATALOG →</span></span>" +
                    "</span>" +
                    "<span class='corners'></span>" +
                  "</a>" +
                  "<button type='button' id='vip-signout-btn' class='btn vip-alt-btn' style='width:auto;min-height:42px;cursor:pointer'>" +
                    "<span class='content' style='background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.2);color:#fff;min-height:42px;padding:11px 16px;display:flex;align-items:center'>" +
                      "<span><span class='text' style='font:10.5px/1 \"NB Architekt Std\",sans-serif;font-weight:700;letter-spacing:1.5px;text-transform:uppercase'>SIGN OUT</span></span>" +
                    "</span>" +
                    "<span class='corners'></span>" +
                  "</button>" +
                "</div>" +
              "</div>" +

              // Tier Progression Bar
              "<div style='background:rgba(12,14,22,0.75);border:1px solid rgba(255,255,255,0.1);padding:10px 14px;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap'>" +
                "<div style='font:9.5px/1.2 \"FK Grotesk SemiMono\",monospace;color:#c4c7d4;letter-spacing:1.2px;text-transform:uppercase'>" +
                  "TIER PROGRESSION · <strong style='color:#fa9442'>" + lifetimePts.toLocaleString() + " LIFETIME PTS EARNED</strong> · " + esc(tierProgressNote) +
                "</div>" +
                "<div style='width:220px;max-width:100%;height:6px;background:rgba(255,255,255,0.1);overflow:hidden'>" +
                  "<div style='height:100%;width:" + tierProgressPct + "%;background:linear-gradient(90deg,#fa9442,#22c55e)'></div>" +
                "</div>" +
              "</div>" +

              // 5-Card Telemetry Strip
              "<div class='vip-dash-grid'>" +
                statBox("01", "Available Points", avail.toLocaleString() + " PTS", "Worth " + tk(avail) + " at checkout / MFS", "#22c55e") +
                statBox("02", "Friends Referred", String(timesUsed), "Signups & orders with your code", "#ffffff") +
                statBox("03", "Referral Income", tk(couponIncomePts), "Earned from referral coupon", "#22c55e") +
                statBox("04", "Welcome & Bonuses", tk(welcomeBonusPts), "Registration & campaign grants", "#fa9442") +
                statBox("05", "Redeemed / Paid", "৳" + (paidWithdrawnBdt + Math.round(redeemedPts * pv)).toLocaleString(), redeemedPts + " PTS at checkout · ৳" + paidWithdrawnBdt + " MFS", "#a0a3b8") +
              "</div>" +

              // Sub-Navigation Tabs inside Dashboard
              "<div style='display:flex;gap:8px;border-bottom:1px solid rgba(255,255,255,0.12);padding-bottom:12px;margin-bottom:20px;flex-wrap:wrap'>" +
                "<button type='button' class='vip-subtab-btn' data-subtab='overview' style='background:#fa9442;color:#000;border:1px solid #fa9442;padding:8px 14px;font:10px/1 \"FK Grotesk SemiMono\",monospace;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer'>[01] OVERVIEW &amp; REFERRAL</button>" +
                "<button type='button' class='vip-subtab-btn' data-subtab='ledger' style='background:rgba(255,255,255,0.04);color:#c4c7d4;border:1px solid rgba(255,255,255,0.16);padding:8px 14px;font:10px/1 \"FK Grotesk SemiMono\",monospace;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer'>[02] POINTS HISTORY (" + myLedger.length + ")</button>" +
                "<button type='button' class='vip-subtab-btn' data-subtab='tiers' style='background:rgba(255,255,255,0.04);color:#c4c7d4;border:1px solid rgba(255,255,255,0.16);padding:8px 14px;font:10px/1 \"FK Grotesk SemiMono\",monospace;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer'>[03] VIP TIERS (" + allTiers.length + ")</button>" +
                "<button type='button' class='vip-subtab-btn' data-subtab='campaigns' style='background:rgba(255,255,255,0.04);color:#c4c7d4;border:1px solid rgba(255,255,255,0.16);padding:8px 14px;font:10px/1 \"FK Grotesk SemiMono\",monospace;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer'>[04] CAMPAIGNS &amp; ALERTS (" + activeCampaigns.length + ")</button>" +
              "</div>" +

              // SUBTAB 1: OVERVIEW & REFERRAL + PAYOUT
              "<div class='vip-subtab-panel' data-panel='overview'>" +
                "<div class='vip-dash-split'>" +
                  // Left Column: Coupon & Referral Activity
                  "<div style='display:flex;flex-direction:column;gap:18px'>" +
                    "<div style='background:rgba(12,14,22,0.85);border:1px solid rgba(255,255,255,0.14);border-left:3px solid #fa9442;padding:20px'>" +
                      "<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:8px'>" +
                        "<span style='font:10.5px/1 \"FK Grotesk SemiMono\",monospace;text-transform:uppercase;letter-spacing:1.8px;color:#fa9442;font-weight:700'>YOUR PERSONAL VIP REFERRAL COUPON</span>" +
                        "<span style='font:9.5px/1 \"FK Grotesk SemiMono\",monospace;color:#22c55e;letter-spacing:1px'>● ACTIVE (" + esc(disc) + ")</span>" +
                      "</div>" +
                      "<p style='font:11.5px/1.55 \"NB Architekt Std\",sans-serif;color:#c4c7d4;margin:0 0 14px;text-transform:uppercase;letter-spacing:0.5px'>" +
                        "Share your code or referral link with friends. Friends get <strong>" + esc(disc) + "</strong> at checkout, and you earn <strong>+" + (Number(s.points_per_referral) || 100) + " PTS (" + tk(s.points_per_referral || 100) + " CASH)</strong> on every qualifying order &amp; signup!" +
                      "</p>" +
                      "<div style='display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.65);padding:12px 16px;border:1px dashed rgba(250,148,66,0.55);margin-bottom:12px;gap:10px;flex-wrap:wrap'>" +
                        "<span style='font:20px/1 \"FK Grotesk SemiMono\",monospace;font-weight:700;letter-spacing:2.5px;color:#f3e7d6'>" + esc(myCode) + "</span>" +
                        "<div style='display:flex;gap:8px'>" +
                          "<button type='button' id='vip-copy-code-btn' style='background:#f3e7d6;color:#000;border:none;padding:10px 18px;font:10.5px/1 \"NB Architekt Std\",sans-serif;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer'>COPY CODE</button>" +
                          "<a href='https://wa.me/?text=" + encodeURIComponent("Shop at AnnR with my VIP referral code " + myCode + " for " + disc + " off! " + location.origin + "/home.html?ref=" + myCode) + "' target='_blank' rel='noopener' style='background:#22c55e;color:#000;text-decoration:none;padding:10px 14px;font:10.5px/1 \"NB Architekt Std\",sans-serif;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;display:inline-flex;align-items:center'>WHATSAPP</a>" +
                        "</div>" +
                      "</div>" +
                      "<div style='display:grid;grid-template-columns:1fr 1fr;gap:10px'>" +
                        "<button type='button' id='vip-copy-link-btn' class='btn vip-alt-btn' style='width:100%;min-height:44px;cursor:pointer'>" +
                          "<span class='content' style='background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.22);color:#fff;min-height:44px;padding:12px 12px;display:flex;align-items:center;justify-content:center'>" +
                            "<span><span class='text' style='font:10px/1 \"NB Architekt Std\",sans-serif;font-weight:700;letter-spacing:1.2px;text-transform:uppercase'>🔗 COPY VIP SIGNUP LINK</span></span>" +
                          "</span>" +
                          "<span class='corners'></span>" +
                        "</button>" +
                        "<button type='button' id='vip-copy-store-link-btn' class='btn vip-alt-btn' style='width:100%;min-height:44px;cursor:pointer'>" +
                          "<span class='content' style='background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.22);color:#fff;min-height:44px;padding:12px 12px;display:flex;align-items:center;justify-content:center'>" +
                            "<span><span class='text' style='font:10px/1 \"NB Architekt Std\",sans-serif;font-weight:700;letter-spacing:1.2px;text-transform:uppercase'>🛍 COPY STORE SHOP LINK</span></span>" +
                          "</span>" +
                          "<span class='corners'></span>" +
                        "</button>" +
                      "</div>" +
                    "</div>" +

                    // Referral Activity Ledger
                    "<div style='background:rgba(12,14,22,0.85);border:1px solid rgba(255,255,255,0.14);padding:18px 20px'>" +
                      "<div style='font:10px/1 \"FK Grotesk SemiMono\",monospace;text-transform:uppercase;letter-spacing:1.8px;color:#9ea1b8;margin-bottom:12px'>REFERRAL &amp; COMMISSION ACTIVITY LEDGER (" + myRefLogs.length + ")</div>" +
                      (myRefLogs.length === 0
                        ? "<div style='font:11px/1.5 \"FK Grotesk SemiMono\",monospace;color:#71717a;padding:12px 0'>No friend referrals recorded yet. Share your code <strong>" + esc(myCode) + "</strong> to start earning instant commissions!</div>"
                        : "<div style='display:flex;flex-direction:column;gap:8px;max-height:190px;overflow-y:auto'>" +
                            myRefLogs.slice(0, 20).map(function (item) {
                              var isOrder = item.event_type === "order";
                              return "<div style='display:flex;justify-content:space-between;align-items:center;padding:9px 12px;background:rgba(0,0,0,0.45);border:1px solid rgba(255,255,255,0.08);font-size:11px'>" +
                                "<div>" +
                                  "<div style='font-weight:700;color:#fff;text-transform:uppercase'>" + esc(item.buyer_name || "Friend Referral") + (item.order_number ? " · Order #" + esc(item.order_number) : " · VIP Signup") + "</div>" +
                                  "<div style='font:9.5px/1.3 \"FK Grotesk SemiMono\",monospace;color:#8e92a8;margin-top:2px'>" + esc(String(item.created_at || "").slice(0, 10)) + " · " + (isOrder ? "Checkout Coupon Used" : "Referred Account Registration") + "</div>" +
                                "</div>" +
                                "<div style='font:12px/1 \"FK Grotesk SemiMono\",monospace;font-weight:700;color:#22c55e'>+" + Number(item.points_earned || 100) + " PTS</div>" +
                              "</div>";
                            }).join("") +
                          "</div>") +
                    "</div>" +
                  "</div>" +

                  // Right Column: Instant Cash Payout Form & Transaction History
                  "<div style='display:flex;flex-direction:column;gap:18px'>" +
                    "<div style='background:rgba(12,14,22,0.85);border:1px solid rgba(255,255,255,0.14);padding:20px'>" +
                      "<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:14px'>" +
                        "<span style='font:10.5px/1 \"FK Grotesk SemiMono\",monospace;text-transform:uppercase;letter-spacing:1.8px;color:#f3e7d6;font-weight:700'>REQUEST INSTANT CASH PAYOUT</span>" +
                        "<span style='font:9.5px/1 \"FK Grotesk SemiMono\",monospace;color:#22c55e'>MIN: ৳" + Number(s.min_withdrawal_bdt || 100) + "</span>" +
                      "</div>" +
                      (avail < minPts
                        ? "<div style='font:11px/1.6 \"FK Grotesk SemiMono\",monospace;color:#a1a1aa;padding:12px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.08)'>Minimum MFS payout is ৳" + Number(s.min_withdrawal_bdt || 100).toLocaleString() + " (" + minPts + " PTS). Your current balance is <strong>" + avail + " PTS (" + tk(avail) + ")</strong>. You can also redeem points directly at <a href='/checkout' style='color:#fa9442;text-decoration:underline'>Checkout</a>!</div>"
                        : "<form id='vip-payout-form' novalidate style='display:flex;flex-direction:column;gap:14px'>" +
                            "<div style='display:grid;grid-template-columns:1fr 1fr;gap:14px 20px'>" +
                              archSelect("01", "Payout Method *", "<select id='vip-pay-method'>" + methods.map(function (k) { return "<option value='" + esc(k) + "'>" + esc(mLabel[k] || k) + "</option>"; }).join("") + "</select>") +
                              archInput("02", "Wallet / Account No *", "<input type='text' id='vip-pay-acc' required maxlength='50' inputmode='numeric' placeholder='017XXXXXXXX' value='" + esc(m.phone || "") + "'>") +
                              archInput("03", "Account Holder Name *", "<input type='text' id='vip-pay-name' required maxlength='100' value='" + esc(m.full_name) + "'>") +
                              archInput("04", "Points to Withdraw *", "<input type='number' id='vip-pay-pts' min='" + minPts + "' max='" + avail + "' value='" + avail + "' inputmode='numeric'>") +
                            "</div>" +
                            "<div style='display:flex;justify-content:space-between;align-items:center;padding-top:4px;gap:12px;flex-wrap:wrap'>" +
                              "<div id='vip-pay-preview' style='font:11.5px/1 \"FK Grotesk SemiMono\",monospace;color:#22c55e;font-weight:700;letter-spacing:1px'>DISBURSEMENT: " + tk(avail) + " BDT</div>" +
                              "<button class='btn btn-vip-orange' type='submit' style='min-width:210px;min-height:46px;cursor:pointer;flex:1'>" +
                                "<span class='content' style='min-height:46px;padding:13px 18px;display:flex;align-items:center;justify-content:center'>" +
                                  "<span><span class='text' style='font:11px/1 \"NB Architekt Std\",sans-serif;font-weight:700;letter-spacing:2px;text-transform:uppercase'>SUBMIT PAYOUT REQUEST →</span></span>" +
                                "</span>" +
                                "<span class='corners'></span>" +
                              "</button>" +
                            "</div>" +
                          "</form>") +
                    "</div>" +

                    // Payout Transaction Log
                    "<div style='background:rgba(12,14,22,0.85);border:1px solid rgba(255,255,255,0.14);padding:18px 20px'>" +
                      "<div style='font:10px/1 \"FK Grotesk SemiMono\",monospace;text-transform:uppercase;letter-spacing:1.8px;color:#9ea1b8;margin-bottom:12px'>PAYOUT DISBURSEMENT LOG (" + myWithdrawals.length + ")</div>" +
                      (myWithdrawals.length === 0
                        ? "<div style='font:11px/1.5 \"FK Grotesk SemiMono\",monospace;color:#71717a;padding:8px 0'>No withdrawal requests submitted yet.</div>"
                        : "<div style='display:flex;flex-direction:column;gap:8px;max-height:170px;overflow-y:auto'>" +
                            myWithdrawals.map(function (w) {
                              return "<div style='display:flex;justify-content:space-between;align-items:center;gap:10px;background:rgba(0,0,0,0.45);border:1px solid rgba(255,255,255,0.08);padding:10px 12px;font-size:11.5px'>" +
                                "<div style='min-width:0'>" +
                                  "<div style='font-weight:700;color:#fff'>৳" + Number(w.money_amount_bdt || w.points_amount).toLocaleString() + " via " + esc((mLabel[w.payout_method] || w.payout_method || "").toUpperCase()) + " · #" + esc(w.request_number || w.id) + "</div>" +
                                  "<div style='font:9.5px/1.3 \"FK Grotesk SemiMono\",monospace;color:#8e92a8;margin-top:2px'>" + esc(w.account_number) + " · " + esc(String(w.requested_at || w.created_at || "").slice(0, 10)) + (w.transaction_ref ? " · TrxID: " + esc(w.transaction_ref) : "") + "</div>" +
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
                "<div style='background:rgba(12,14,22,0.85);border:1px solid rgba(255,255,255,0.14);padding:20px'>" +
                  "<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px'>" +
                    "<span style='font:10.5px/1 \"FK Grotesk SemiMono\",monospace;text-transform:uppercase;letter-spacing:1.8px;color:#fa9442;font-weight:700'>COMPLETE ANNR POINTS TRANSACTION LEDGER</span>" +
                    "<span style='font:9.5px/1 \"FK Grotesk SemiMono\",monospace;color:#9ea1b8'>AVAILABLE: " + avail + " PTS · REDEEMED: " + redeemedPts + " PTS · LIFETIME: " + lifetimePts + " PTS</span>" +
                  "</div>" +
                  (myLedger.length === 0
                    ? "<div style='font:11px/1.5 \"FK Grotesk SemiMono\",monospace;color:#71717a;padding:14px 0'>Initial Welcome Grant (+100 PTS) active in your wallet. Future checkout redemptions, referral rewards, and campaign bonuses will appear here.</div>"
                    : "<div style='display:flex;flex-direction:column;gap:8px;max-height:360px;overflow-y:auto'>" +
                        myLedger.map(function (entry) {
                          var delta = Number(entry.points_delta || 0);
                          return "<div style='display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.08);font-size:11.5px'>" +
                            "<div>" +
                              "<div style='font-weight:700;color:#fff'>" + esc(entry.description || entry.transaction_type) + "</div>" +
                              "<div style='font:9.5px/1.3 \"FK Grotesk SemiMono\",monospace;color:#8e92a8;margin-top:3px'>" + esc(String(entry.created_at || "").slice(0, 16).replace("T", " ")) + " · TYPE: " + esc(String(entry.transaction_type || "").toUpperCase()) + " · BAL AFTER: " + Number(entry.balance_after || 0) + " PTS</div>" +
                            "</div>" +
                            "<div style='font:13px/1 \"FK Grotesk SemiMono\",monospace;font-weight:700;color:" + (delta >= 0 ? "#22c55e" : "#f59e0b") + "'>" + (delta >= 0 ? "+" : "") + delta + " PTS</div>" +
                          "</div>";
                        }).join("") +
                      "</div>") +
                "</div>" +
              "</div>" +

              // SUBTAB 3: VIP MEMBERSHIP TIERS & BENEFITS
              "<div class='vip-subtab-panel' data-panel='tiers' style='display:none'>" +
                "<div style='display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px'>" +
                  allTiers.map(function (t) {
                    var isCurrent = String(t.name).toLowerCase() === String(currentTierName).toLowerCase();
                    return "<div style='background:rgba(12,14,22,0.88);border:1px solid " + (isCurrent ? (t.badge_color || "#fa9442") : "rgba(255,255,255,0.12)") + ";padding:18px;position:relative'>" +
                      "<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:8px'>" +
                        "<span style='font:14px/1 \"NB Architekt Std\",sans-serif;font-weight:700;color:" + esc(t.badge_color || "#fff") + ";text-transform:uppercase;letter-spacing:1.5px'>★ " + esc(t.name) + "</span>" +
                        (isCurrent ? "<span style='font:8.5px/1 \"FK Grotesk SemiMono\",monospace;background:#fa9442;color:#000;padding:3px 7px;font-weight:700'>CURRENT TIER</span>" : "") +
                      "</div>" +
                      "<div style='font:10px/1.4 \"FK Grotesk SemiMono\",monospace;color:#9ea1b8;margin-bottom:10px'>" +
                        "REQ: " + Number(t.min_earned_points || 0) + " PTS OR " + Number(t.min_referrals || 0) + " REFERRALS<br>" +
                        "MULTIPLIER: <strong style='color:#22c55e'>" + Number(t.point_multiplier || 1) + "× PTS</strong> · EXTRA DISC: <strong style='color:#fa9442'>" + Number(t.extra_discount_percent || 0) + "%</strong>" +
                      "</div>" +
                      "<div style='display:flex;flex-direction:column;gap:5px;border-top:1px solid rgba(255,255,255,0.08);padding-top:10px'>" +
                        (t.perks || []).map(function (p) {
                          return "<div style='font:10px/1.3 \"FK Grotesk SemiMono\",monospace;color:#d4d4d8'>✓ " + esc(p) + "</div>";
                        }).join("") +
                      "</div>" +
                    "</div>";
                  }).join("") +
                "</div>" +
              "</div>" +

              // SUBTAB 4: ACTIVE CAMPAIGNS & NOTIFICATIONS
              "<div class='vip-subtab-panel' data-panel='campaigns' style='display:none'>" +
                "<div class='vip-dash-split'>" +
                  "<div style='background:rgba(12,14,22,0.85);border:1px solid rgba(255,255,255,0.14);padding:18px 20px'>" +
                    "<div style='font:10px/1 \"FK Grotesk SemiMono\",monospace;text-transform:uppercase;letter-spacing:1.8px;color:#fa9442;margin-bottom:12px'>ACTIVE VIP PROMOTIONAL CAMPAIGNS (" + activeCampaigns.length + ")</div>" +
                    (activeCampaigns.length === 0
                      ? "<div style='font:11px/1.5 \"FK Grotesk SemiMono\",monospace;color:#71717a'>Standard VIP rewards active. Stay tuned for seasonal multiplier campaigns!</div>"
                      : "<div style='display:flex;flex-direction:column;gap:10px'>" +
                          activeCampaigns.map(function (cItem) {
                            return "<div style='padding:12px 14px;background:rgba(0,0,0,0.5);border:1px solid rgba(250,148,66,0.3);border-left:3px solid #fa9442'>" +
                              "<div style='display:flex;justify-content:space-between;align-items:center;gap:8px'>" +
                                "<span style='font:12px/1.2 \"NB Architekt Std\",sans-serif;font-weight:700;color:#fff;text-transform:uppercase'>" + esc(cItem.name) + "</span>" +
                                "<span style='font:9.5px/1 \"FK Grotesk SemiMono\",monospace;color:#22c55e;font-weight:700'>" + (cItem.points_multiplier > 1 ? cItem.points_multiplier + "× PTS" : "+" + cItem.bonus_points + " PTS") + "</span>" +
                              "</div>" +
                              "<div style='font:10px/1.4 \"FK Grotesk SemiMono\",monospace;color:#9ea1b8;margin-top:4px'>" + esc(cItem.description || "") + "</div>" +
                            "</div>";
                          }).join("") +
                        "</div>") +
                  "</div>" +
                  "<div style='background:rgba(12,14,22,0.85);border:1px solid rgba(255,255,255,0.14);padding:18px 20px'>" +
                    "<div style='font:10px/1 \"FK Grotesk SemiMono\",monospace;text-transform:uppercase;letter-spacing:1.8px;color:#9ea1b8;margin-bottom:12px'>MEMBER NOTIFICATIONS &amp; REWARD ALERTS (" + myNotifications.length + ")</div>" +
                    (myNotifications.length === 0
                      ? "<div style='font:11px/1.5 \"FK Grotesk SemiMono\",monospace;color:#71717a'>No new alerts.</div>"
                      : "<div style='display:flex;flex-direction:column;gap:8px;max-height:240px;overflow-y:auto'>" +
                          myNotifications.slice(0, 15).map(function (n) {
                            return "<div style='padding:10px 12px;background:rgba(0,0,0,0.45);border:1px solid rgba(255,255,255,0.08)'>" +
                              "<div style='font:11px/1.2 \"NB Architekt Std\",sans-serif;font-weight:700;color:#f3e7d6'>" + esc(n.title) + "</div>" +
                              "<div style='font:10px/1.4 \"FK Grotesk SemiMono\",monospace;color:#9ea1b8;margin-top:3px'>" + esc(n.message) + "</div>" +
                            "</div>";
                          }).join("") +
                        "</div>") +
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
              var active = b.getAttribute("data-subtab") === target;
              b.style.background = active ? "#fa9442" : "rgba(255,255,255,0.04)";
              b.style.color = active ? "#000" : "#c4c7d4";
              b.style.borderColor = active ? "#fa9442" : "rgba(255,255,255,0.16)";
            });
            subTabPanels.forEach(function (p) {
              p.style.display = p.getAttribute("data-panel") === target ? "block" : "none";
            });
          };
        });

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
            var refLink = location.origin + "/account/login/index.html?ref=" + encodeURIComponent(myCode);
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

            // Also call Supabase RPC in background
            fetch(SB_URL + "/rest/v1/rpc/request_vip_withdrawal", {
              method: "POST",
              headers: { "apikey": SB_KEY, "Content-Type": "application/json" },
              body: JSON.stringify({
                p_points_amount: pts,
                p_payout_method: meth,
                p_account_number: acc,
                p_account_name: nm
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

  // AnnR logo navigation handler
  document.addEventListener("click", function (e) {
    var logo = e.target && e.target.closest && e.target.closest(".header-logo, .header-new__logo, .icon-logo");
    if (logo) {
      if (logo.tagName === "A" && logo.getAttribute("href")) return;
      e.preventDefault();
      window.location.href = "/home.html";
    }
  });

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
})();
