/* Applies the PUBLISHED AnnR admin configuration to the static store pages (demo: this browser only).
   Only values that differ from the original defaults are applied, so untouched pages stay identical.
   Add ?preview=1 to any page to preview the unpublished draft instead. */
(function () {
  var qs = new URLSearchParams(location.search);
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
    if (cfg) {
      P = cfg.products || {}; C = cfg.collections || {}; G = cfg.pages || {};
      S = cfg.site || {}; D = cfg.defaults || {};
      allCols = cfg.allCollections || [];
    }
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
  var baseCatalog = [];
  function loadBaseCatalog() {
    try {
      fetch("/_ext/catalog.json").then(function (r) {
        return r.ok ? r.json() : null;
      }).then(function (data) {
        if (Array.isArray(data)) {
          baseCatalog = data;
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

  function searchProducts(query) {
    var q = String(query || "").trim().toLowerCase();
    var terms = q.split(/\s+/).filter(Boolean);
    var all = getFullCatalog();
    if (!terms.length) return all.filter(function (p) { return !p.status || p.status === "active"; });

    return all.filter(function (p) {
      if (p.status && p.status !== "active") return false;
      var o = (P && P[p.handle]) || {};
      if (o.status && o.status !== "active") return false;
      var title = (o.title || p.title || "").toLowerCase();
      var desc = (o.description || p.description || "").toLowerCase();
      var handle = (p.handle || "").toLowerCase();
      var tags = (p.tags || "").toLowerCase();
      var type = (p.type || "").toLowerCase();
      var hay = title + " " + desc + " " + handle + " " + tags + " " + type;
      return terms.every(function (t) { return hay.indexOf(t) >= 0; });
    });
  }

  window.annrSearchProducts = searchProducts;

  window.annrSearchPredictiveHtml = function (query) {
    var q = String(query || "").trim();
    if (!q) return "";
    var matches = searchProducts(q).slice(0, 10);
    if (!matches.length) return "";

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
      inpLive.addEventListener("input", function () {
        var hasVal = !!inpLive.value.trim();
        if (clearBtn) {
          clearBtn.style.display = hasVal ? "" : "none";
          clearBtn.classList.toggle("hide", !hasVal);
        }
      });
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
      if (prod.sizeChart) {
        var detailsWrap = document.querySelector(".product-info-details-header .product-info-detail-content-inner") || document.querySelector(".product-info-details");
        if (detailsWrap && !detailsWrap.querySelector(".adm-size-chart")) {
          var sc = document.createElement("div"); sc.className = "adm-size-chart";
          sc.style.cssText = "margin-top:16px;padding-top:12px;border-top:1px solid rgba(0,0,0,.15);white-space:pre-wrap;font-size:12px";
          sc.innerHTML = "<strong>SIZE &amp; FIT</strong><br>" + esc(prod.sizeChart);
          detailsWrap.appendChild(sc);
        }
      }
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

    // 4. Cart Drawer Checkout Redirection & Cart Sync
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

      // Sync when cart popup opens or item is added
      document.addEventListener("click", function(e) {
        var a = e.target.closest && e.target.closest(".js-cart-trigger, [href*='/cart'], button[name='add'], .js-add-to-cart");
        if (a) setTimeout(syncCartItems, 500);

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

    // 5. Bangladesh VIP Loyalty & Points Hub Modal
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

      function getVipSettings() {
        try {
          var s = localStorage.getItem("annr-loyalty-settings");
          if (s) return JSON.parse(s);
        } catch(e) {}
        return {
          point_value_bdt: 1.0,
          friend_discount_percent: 10,
          points_per_referral_order: 100,
          min_withdrawal_points: 100
        };
      }

      function getSessionMember() {
        try {
          var rawSess = localStorage.getItem("annr_vip_session");
          if (!rawSess) return null;
          var sess = JSON.parse(rawSess);
          var rawMembers = localStorage.getItem("annr-vip-members");
          var members = rawMembers ? JSON.parse(rawMembers) : [];
          return members.find(function(m) { return m.email === sess.email || m.phone === sess.phone; }) || sess;
        } catch(e) { return null; }
      }

      function renderInPageVipHub() {
        var container = document.querySelector(".vip-form__wrapper") || document.querySelector(".customer-register-form-wrapper");
        if (!container) return;

        var member = getSessionMember();
        var st = getVipSettings();
        var pointVal = Number(st.point_value_bdt) || 1.0;
        var isSignupTab = window.location.pathname.indexOf("register") !== -1 || window.location.search.indexOf("tab=signup") !== -1;

        if (!member) {
          // Unauthenticated view: High-converting Sign In / Create VIP Account tabs
          var contentHtml =
            "<div id='vip-inpage-hub' style='color:#ffffff;font-family:\"NB Architekt Std\",sans-serif;width:100%;max-width:520px;margin:0 auto;padding:10px 0'>" +
              // Tabs
              "<div style='display:flex;gap:4px;border-bottom:1px solid #27272a;margin-bottom:20px;padding-bottom:2px'>" +
                "<button type='button' id='vip-tab-signin' style='background:none;border:none;border-bottom:2px solid " + (isSignupTab ? "transparent" : "#fa9442") + ";color:" + (isSignupTab ? "#71717a" : "#ffffff") + ";font:12px/1.4 \"NB Architekt Std\",sans-serif;font-weight:700;letter-spacing:1.5px;padding:8px 16px;cursor:pointer;text-transform:uppercase'>SIGN IN</button>" +
                "<button type='button' id='vip-tab-create' style='background:none;border:none;border-bottom:2px solid " + (isSignupTab ? "#fa9442" : "transparent") + ";color:" + (isSignupTab ? "#ffffff" : "#71717a") + ";font:12px/1.4 \"NB Architekt Std\",sans-serif;font-weight:700;letter-spacing:1.5px;padding:8px 16px;cursor:pointer;text-transform:uppercase'>CREATE VIP ACCOUNT (+৳100)</button>" +
              "</div>" +

              // Sign In Form
              "<form id='vip-inpage-login-form' style='display:" + (isSignupTab ? "none" : "flex") + ";flex-direction:column;gap:14px'>" +
                "<div style='font-size:11px;color:#a1a1aa;margin-bottom:4px;line-height:1.5'>Sign in to your VIP account to check referral count, view coupon earnings in ৳, and request instant cash payouts.</div>" +
                "<div>" +
                  "<label style='display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#a1a1aa;margin-bottom:5px'>Email or Mobile Phone *</label>" +
                  "<input type='text' id='vip-login-ident' required placeholder='017XXXXXXXX or email@example.com' style='width:100%;background:#111113;border:1px solid #27272a;color:#fff;padding:12px 14px;font-size:13px;border-radius:3px;box-sizing:border-box'>" +
                "</div>" +
                "<div>" +
                  "<label style='display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#a1a1aa;margin-bottom:5px'>Password *</label>" +
                  "<input type='password' id='vip-login-pass' required placeholder='••••••••' style='width:100%;background:#111113;border:1px solid #27272a;color:#fff;padding:12px 14px;font-size:13px;border-radius:3px;box-sizing:border-box'>" +
                "</div>" +
                "<button type='submit' style='background:#ffffff;color:#000000;border:none;padding:14px;font:12px/1 \"NB Architekt Std\",sans-serif;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;margin-top:6px;border-radius:3px;transition:opacity .2s'>SIGN IN TO VAULT →</button>" +
                "<div style='display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:11px'>" +
                  "<span style='color:#71717a'>New member?</span>" +
                  "<a href='#' id='vip-switch-signup' style='color:#fa9442;text-decoration:none;font-weight:700'>Create VIP Account (+৳100 Welcome Bonus) →</a>" +
                "</div>" +
              "</form>" +

              // Sign Up Form (Bangladesh Customer Fields)
              "<form id='vip-inpage-signup-form' style='display:" + (isSignupTab ? "flex" : "none") + ";flex-direction:column;gap:12px'>" +
                "<div style='background:#18181b;padding:12px 14px;border:1px solid #27272a;border-left:3px solid #fa9442;border-radius:3px;font-size:11px;color:#d4d4d8;line-height:1.5'>" +
                  "✨ <strong>ANNR VIP PASS</strong> — Activate your membership today: Receive <strong>100 Reward Points (৳100 Welcome Gift)</strong> + your exclusive referral coupon to earn <strong>৳100 cash</strong> every time your friends shop!" +
                "</div>" +
                "<div>" +
                  "<label style='display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#a1a1aa;margin-bottom:4px'>Full Name *</label>" +
                  "<input type='text' id='vip-reg-name' required placeholder='e.g. Ratul Ahmed' style='width:100%;background:#111113;border:1px solid #27272a;color:#fff;padding:10px 12px;font-size:12px;border-radius:3px;box-sizing:border-box'>" +
                "</div>" +
                "<div>" +
                  "<label style='display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#a1a1aa;margin-bottom:4px'>Mobile Phone Number (Bangladesh 11 Digits) *</label>" +
                  "<input type='tel' id='vip-reg-phone' required placeholder='017XXXXXXXX' pattern='^01[3-9][0-9]{8}$' style='width:100%;background:#111113;border:1px solid #27272a;color:#fff;padding:10px 12px;font-size:12px;border-radius:3px;box-sizing:border-box'>" +
                "</div>" +
                "<label style='display:flex;align-items:center;gap:8px;font-size:11px;color:#a1a1aa;cursor:pointer'>" +
                  "<input type='checkbox' id='vip-reg-wa' checked style='accent-color:#22c55e'> This mobile number is active on WhatsApp" +
                "</label>" +
                "<div>" +
                  "<label style='display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#a1a1aa;margin-bottom:4px'>Email Address *</label>" +
                  "<input type='email' id='vip-reg-email' required placeholder='ratul@example.com' style='width:100%;background:#111113;border:1px solid #27272a;color:#fff;padding:10px 12px;font-size:12px;border-radius:3px;box-sizing:border-box'>" +
                "</div>" +
                "<div>" +
                  "<label style='display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#a1a1aa;margin-bottom:4px'>Password (Min 6 Characters) *</label>" +
                  "<input type='password' id='vip-reg-pass' required minlength='6' placeholder='••••••••' style='width:100%;background:#111113;border:1px solid #27272a;color:#fff;padding:10px 12px;font-size:12px;border-radius:3px;box-sizing:border-box'>" +
                "</div>" +
                "<div style='display:grid;grid-template-columns:1fr 1fr;gap:10px'>" +
                  "<div>" +
                    "<label style='display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#a1a1aa;margin-bottom:4px'>Division *</label>" +
                    "<select id='vip-reg-division' style='width:100%;background:#111113;border:1px solid #27272a;color:#fff;padding:10px;font-size:12px;border-radius:3px;box-sizing:border-box'>" +
                      Object.keys(BD_GEO).map(function(d) { return "<option value='" + esc(d) + "'>" + esc(d) + "</option>"; }).join("") +
                    "</select>" +
                  "</div>" +
                  "<div>" +
                    "<label style='display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#a1a1aa;margin-bottom:4px'>District *</label>" +
                    "<select id='vip-reg-district' style='width:100%;background:#111113;border:1px solid #27272a;color:#fff;padding:10px;font-size:12px;border-radius:3px;box-sizing:border-box'></select>" +
                  "</div>" +
                "</div>" +
                "<div>" +
                  "<label style='display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#a1a1aa;margin-bottom:4px'>Thana / Upazila</label>" +
                  "<input type='text' id='vip-reg-thana' placeholder='e.g. Dhanmondi / Gulshan / Mirpur' style='width:100%;background:#111113;border:1px solid #27272a;color:#fff;padding:10px 12px;font-size:12px;border-radius:3px;box-sizing:border-box'>" +
                "</div>" +
                "<div>" +
                  "<label style='display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#a1a1aa;margin-bottom:4px'>Delivery Address *</label>" +
                  "<input type='text' id='vip-reg-addr' required placeholder='House, Road, Area' style='width:100%;background:#111113;border:1px solid #27272a;color:#fff;padding:10px 12px;font-size:12px;border-radius:3px;box-sizing:border-box'>" +
                "</div>" +
                "<div>" +
                  "<label style='display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#a1a1aa;margin-bottom:4px'>Friend's Referral Coupon Code (Optional)</label>" +
                  "<input type='text' id='vip-reg-refcode' placeholder='e.g. VIP-RATUL88' style='width:100%;background:#111113;border:1px solid #27272a;color:#fff;padding:10px 12px;font-size:12px;border-radius:3px;font-family:monospace;letter-spacing:1px;box-sizing:border-box'>" +
                "</div>" +
                "<button type='submit' style='background:#ffffff;color:#000000;border:none;padding:14px;font:12px/1 \"NB Architekt Std\",sans-serif;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;margin-top:6px;border-radius:3px'>ACTIVATE VIP MEMBERSHIP & CLAIM ৳100 →</button>" +
                "<div style='display:flex;justify-content:center;margin-top:6px;font-size:11px'>" +
                  "<a href='#' id='vip-switch-signin' style='color:#71717a;text-decoration:none'>Already a member? <span style='color:#fa9442;font-weight:700'>Sign in →</span></a>" +
                "</div>" +
              "</form>" +
            "</div>";

          container.innerHTML = contentHtml;

          // Wire Tabs Switch
          var tabSignIn = container.querySelector("#vip-tab-signin");
          var tabCreate = container.querySelector("#vip-tab-create");
          var formLogin = container.querySelector("#vip-inpage-login-form");
          var formSignup = container.querySelector("#vip-inpage-signup-form");
          var switchSignup = container.querySelector("#vip-switch-signup");
          var switchSignin = container.querySelector("#vip-switch-signin");

          function showLogin() {
            if (tabSignIn) { tabSignIn.style.color = "#ffffff"; tabSignIn.style.borderBottomColor = "#fa9442"; }
            if (tabCreate) { tabCreate.style.color = "#71717a"; tabCreate.style.borderBottomColor = "transparent"; }
            if (formLogin) formLogin.style.display = "flex";
            if (formSignup) formSignup.style.display = "none";
          }
          function showSignup() {
            if (tabCreate) { tabCreate.style.color = "#ffffff"; tabCreate.style.borderBottomColor = "#fa9442"; }
            if (tabSignIn) { tabSignIn.style.color = "#71717a"; tabSignIn.style.borderBottomColor = "transparent"; }
            if (formSignup) formSignup.style.display = "flex";
            if (formLogin) formLogin.style.display = "none";
          }

          if (tabSignIn) tabSignIn.onclick = showLogin;
          if (tabCreate) tabCreate.onclick = showSignup;
          if (switchSignup) switchSignup.onclick = function(e) { e.preventDefault(); showSignup(); };
          if (switchSignin) switchSignin.onclick = function(e) { e.preventDefault(); showLogin(); };

          // Division / District Dynamic Select
          var divSelect = container.querySelector("#vip-reg-division");
          var distSelect = container.querySelector("#vip-reg-district");
          if (divSelect && distSelect) {
            var updateDistricts = function(dVal) {
              var dists = BD_GEO[dVal] || [];
              distSelect.innerHTML = dists.map(function(d) { return "<option value='" + esc(d) + "'>" + esc(d) + "</option>"; }).join("");
            };
            updateDistricts(divSelect.value);
            divSelect.onchange = function() { updateDistricts(divSelect.value); };
          }

          // Handle Sign In Submit
          if (formLogin) {
            formLogin.onsubmit = function(e) {
              e.preventDefault();
              var ident = (container.querySelector("#vip-login-ident").value || "").trim().toLowerCase();

              var rawM = localStorage.getItem("annr-vip-members");
              var members = rawM ? JSON.parse(rawM) : [];
              var found = members.find(function(m) {
                return (m.email && m.email.toLowerCase() === ident) || (m.phone && m.phone.replace(/[^0-9]/g, "") === ident.replace(/[^0-9]/g, ""));
              });

              if (!found) {
                alert("No VIP account found with that email or phone number. Please check or create an account.");
                return;
              }

              // Set active session
              localStorage.setItem("annr_vip_session", JSON.stringify({ email: found.email, phone: found.phone, name: found.full_name }));
              renderInPageVipHub();
            };
          }

          // Handle Sign Up Submit
          if (formSignup) {
            formSignup.onsubmit = function(e) {
              e.preventDefault();
              var name = (container.querySelector("#vip-reg-name").value || "").trim();
              var phone = (container.querySelector("#vip-reg-phone").value || "").trim();
              var isWa = container.querySelector("#vip-reg-wa").checked;
              var email = (container.querySelector("#vip-reg-email").value || "").trim().toLowerCase();
              var div = container.querySelector("#vip-reg-division").value;
              var dist = container.querySelector("#vip-reg-district").value;
              var thana = (container.querySelector("#vip-reg-thana").value || "").trim();
              var addr = (container.querySelector("#vip-reg-addr").value || "").trim();
              var refInput = (container.querySelector("#vip-reg-refcode").value || "").trim().toUpperCase();

              // Bangladesh phone check
              if (!/^01[3-9]\d{8}$/.test(phone)) {
                alert("Please enter a valid 11-digit Bangladesh mobile number (e.g. 017XXXXXXXX)");
                return;
              }

              var rawM = localStorage.getItem("annr-vip-members");
              var members = rawM ? JSON.parse(rawM) : [];
              var dup = members.find(function(m) { return m.email === email || m.phone === phone; });
              if (dup) {
                alert("An account with this email or phone number already exists. Please sign in.");
                showLogin();
                return;
              }

              var generatedCode = "VIP-" + name.replace(/[^a-zA-Z]/g, "").slice(0, 5).toUpperCase() + Math.floor(10 + Math.random() * 89);
              var newMember = {
                id: "vip-" + Date.now().toString(36),
                email: email,
                full_name: name,
                phone: phone,
                is_whatsapp: isWa,
                division: div,
                district: dist,
                upazila: thana,
                full_address: addr,
                tier: "Silver",
                available_points: 100, // ৳100 Welcome Gift
                pending_points: 0,
                total_earned_points: 100,
                total_referred_orders: 0,
                withdrawn_points: 0,
                referral_code: generatedCode,
                referred_by_code: refInput,
                status: "active",
                created_at: new Date().toISOString()
              };

              members.push(newMember);
              localStorage.setItem("annr-vip-members", JSON.stringify(members));
              localStorage.setItem("annr_vip_session", JSON.stringify({ email: email, phone: phone, name: name }));

              // Register to referral coupons registry
              var rawCoupons = localStorage.getItem("annr-referral-coupons");
              var coupons = rawCoupons ? JSON.parse(rawCoupons) : [];
              coupons.push({
                code: generatedCode,
                owner_email: email,
                owner_name: name,
                discount_type: "percentage",
                discount_value: 10,
                points_reward: 100,
                status: "active"
              });
              localStorage.setItem("annr-referral-coupons", JSON.stringify(coupons));

              alert("🎉 Welcome to AnnR VIP! 100 Reward Points (৳100) have been credited to your wallet.");
              renderInPageVipHub();
            };
          }

        } else {
          // ==========================================
          // LOGGED IN: COMPREHENSIVE VIP MEMBER DASHBOARD
          // ==========================================
          var availPts = Number(member.available_points || 0);
          var earnedPts = Number(member.total_earned_points || 0);
          var referredOrders = Number(member.total_referred_orders || 0);
          var withdrawnPts = Number(member.withdrawn_points || 0);

          var cashAvailable = Math.round(availPts * pointVal);
          var totalIncomeEarned = Math.round(earnedPts * pointVal);
          var totalWithdrawnCash = Math.round(withdrawnPts * pointVal);

          var refCode = member.referral_code || ("VIP-" + (member.full_name || "MEMBER").replace(/[^a-zA-Z]/g, "").slice(0, 5).toUpperCase() + "88");

          // Fetch withdrawals for this member
          var allW = [];
          try {
            var rawW = localStorage.getItem("annr-withdrawals");
            if (rawW) allW = JSON.parse(rawW);
          } catch(e) {}
          var userW = allW.filter(function(w) { return w.member_email === member.email || (w.member_id && w.member_id === member.id); });

          var dashboardHtml =
            "<div id='vip-inpage-hub' style='color:#ffffff;font-family:\"NB Architekt Std\",sans-serif;width:100%;max-width:580px;margin:0 auto;padding:10px 0'>" +
              // Top Member Header
              "<div style='border-bottom:1px solid #27272a;padding-bottom:16px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px'>" +
                "<div>" +
                  "<div style='font:10px/1 \"FK Grotesk SemiMono\",monospace;letter-spacing:2px;color:#fa9442;text-transform:uppercase;margin-bottom:6px'>VIP MEMBER HUB // " + esc(member.tier || "SILVER") + " TIER</div>" +
                  "<div style='font:22px/1.1 \"Druk Wide\",sans-serif;text-transform:uppercase;letter-spacing:1px;color:#ffffff'>" + esc(member.full_name || "VIP MEMBER") + "</div>" +
                  "<div style='font-size:11px;color:#71717a;margin-top:4px'>📱 " + esc(member.phone || "") + " · ✉️ " + esc(member.email || "") + "</div>" +
                "</div>" +
                "<button type='button' id='inpage-signout-btn' style='background:none;border:1px solid #27272a;color:#a1a1aa;padding:7px 14px;font:10px/1 \"NB Architekt Std\",sans-serif;letter-spacing:1px;cursor:pointer;text-transform:uppercase;border-radius:3px;transition:all .2s'>SIGN OUT</button>" +
              "</div>" +

              // 4 PRO METRIC CARDS GRID (Requested by user: how much referred, how much incomed from coupon, wallet, withdrawn)
              "<div style='display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:20px'>" +
                // Card 1: How much referred
                "<div style='background:#111113;border:1px solid #27272a;padding:16px;border-radius:4px'>" +
                  "<div style='font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#a1a1aa;margin-bottom:6px'>FRIENDS REFERRED</div>" +
                  "<div style='font:24px/1 \"Druk Wide\",sans-serif;color:#ffffff;margin-bottom:4px'>" + referredOrders + " <span style='font-size:12px;font-family:sans-serif;color:#a1a1aa'>ORDERS</span></div>" +
                  "<div style='font-size:10px;color:#71717a'>Completed orders using your coupon</div>" +
                "</div>" +

                // Card 2: How much income earned from coupon
                "<div style='background:#111113;border:1px solid #27272a;padding:16px;border-radius:4px;border-left:3px solid #22c55e'>" +
                  "<div style='font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#a1a1aa;margin-bottom:6px'>COUPON CASH INCOME</div>" +
                  "<div style='font:24px/1 \"Druk Wide\",sans-serif;color:#22c55e;margin-bottom:4px'>৳" + totalIncomeEarned.toLocaleString() + "</div>" +
                  "<div style='font-size:10px;color:#71717a'>Total earnings from coupon referrals</div>" +
                "</div>" +

                // Card 3: Available Balance
                "<div style='background:#111113;border:1px solid #27272a;padding:16px;border-radius:4px'>" +
                  "<div style='display:flex;justify-content:space-between;margin-bottom:6px'>" +
                    "<span style='font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#a1a1aa'>AVAILABLE BALANCE</span>" +
                    "<span style='font-size:9px;color:#fa9442'>1 PT = ৳" + pointVal.toFixed(2) + "</span>" +
                  "</div>" +
                  "<div style='font:24px/1 \"Druk Wide\",sans-serif;color:#ffffff;margin-bottom:4px'>" + availPts + " <span style='font-size:12px;font-family:sans-serif;color:#a1a1aa'>PTS</span></div>" +
                  "<div style='font-size:11px;color:#22c55e;font-weight:700'>= ৳" + cashAvailable.toLocaleString() + " BDT CASH</div>" +
                "</div>" +

                // Card 4: Total Withdrawn
                "<div style='background:#111113;border:1px solid #27272a;padding:16px;border-radius:4px'>" +
                  "<div style='font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#a1a1aa;margin-bottom:6px'>TOTAL WITHDRAWN</div>" +
                  "<div style='font:24px/1 \"Druk Wide\",sans-serif;color:#ffffff;margin-bottom:4px'>৳" + totalWithdrawnCash.toLocaleString() + "</div>" +
                  "<div style='font-size:10px;color:#71717a'>Successfully paid to MFS</div>" +
                "</div>" +
              "</div>" +

              // PERSONAL REFERRAL COUPON BOX
              "<div style='background:#18181b;border:1px solid #27272a;padding:20px;border-radius:4px;margin-bottom:20px'>" +
                "<div style='font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#fa9442;margin-bottom:6px;font-weight:700'>YOUR PERSONAL VIP REFERRAL COUPON</div>" +
                "<div style='font-size:11px;color:#d4d4d8;margin-bottom:14px;line-height:1.5'>" +
                  "Share your coupon with friends. When they use your code at checkout, they get <strong>10% OFF</strong>, and you earn <strong>100 Points (= ৳100 Cash)</strong> added to your wallet!" +
                "</div>" +

                "<div style='display:flex;align-items:center;justify-content:space-between;background:#09090b;padding:12px 16px;border:1px dashed #52525b;border-radius:3px;margin-bottom:12px;flex-wrap:wrap;gap:10px'>" +
                  "<span style='font:18px/1 \"FK Grotesk SemiMono\",monospace;font-weight:700;letter-spacing:2px;color:#ffffff'>" + esc(refCode) + "</span>" +
                  "<button type='button' id='inpage-copy-code' style='background:#ffffff;color:#000000;border:none;padding:8px 16px;font:10px/1 \"NB Architekt Std\",sans-serif;font-weight:700;letter-spacing:1px;cursor:pointer;border-radius:2px'>COPY CODE</button>" +
                "</div>" +

                "<button type='button' id='inpage-copy-link' style='background:none;border:1px solid #3f3f46;color:#ffffff;padding:9px 14px;font:11px/1 \"NB Architekt Std\",sans-serif;letter-spacing:1px;cursor:pointer;border-radius:2px;width:100%;transition:background .2s'>🔗 COPY DIRECT STORE REFERRAL LINK</button>" +
              "</div>" +

              // CASH OUT / WITHDRAWAL REQUEST ACCORDION
              "<details style='background:#18181b;border:1px solid #27272a;padding:16px;border-radius:4px;margin-bottom:20px' open>" +
                "<summary style='cursor:pointer;font-weight:700;letter-spacing:1px;text-transform:uppercase;font-size:11px;color:#ffffff;user-select:none'>💸 Request Instant Cash Payout (bKash / Nagad / Rocket / Bank)</summary>" +
                "<form id='inpage-payout-form' style='display:flex;flex-direction:column;gap:12px;margin-top:14px'>" +
                  "<div style='display:grid;grid-template-columns:1fr 1fr;gap:10px'>" +
                    "<div>" +
                      "<label style='display:block;font-size:9px;text-transform:uppercase;color:#a1a1aa;margin-bottom:4px'>Payout Method *</label>" +
                      "<select id='inpage-payout-method' style='width:100%;background:#09090b;border:1px solid #27272a;color:#fff;padding:10px;font-size:12px;border-radius:3px;box-sizing:border-box'>" +
                        "<option value='bKash'>bKash (Personal)</option>" +
                        "<option value='Nagad'>Nagad (Personal)</option>" +
                        "<option value='Rocket'>Rocket</option>" +
                        "<option value='Bank Transfer'>Bank Transfer</option>" +
                      "</select>" +
                    "</div>" +
                    "<div>" +
                      "<label style='display:block;font-size:9px;text-transform:uppercase;color:#a1a1aa;margin-bottom:4px'>Account Number *</label>" +
                      "<input type='text' id='inpage-payout-account' required placeholder='017XXXXXXXX' style='width:100%;background:#09090b;border:1px solid #27272a;color:#fff;padding:10px;font-size:12px;border-radius:3px;box-sizing:border-box'>" +
                    "</div>" +
                  "</div>" +
                  "<div style='display:grid;grid-template-columns:1fr 1fr;gap:10px'>" +
                    "<div>" +
                      "<label style='display:block;font-size:9px;text-transform:uppercase;color:#a1a1aa;margin-bottom:4px'>Account Holder Name *</label>" +
                      "<input type='text' id='inpage-payout-name' required value='" + esc(member.full_name || "") + "' style='width:100%;background:#09090b;border:1px solid #27272a;color:#fff;padding:10px;font-size:12px;border-radius:3px;box-sizing:border-box'>" +
                    "</div>" +
                    "<div>" +
                      "<label style='display:block;font-size:9px;text-transform:uppercase;color:#a1a1aa;margin-bottom:4px'>Points to Cash Out (Min 100) *</label>" +
                      "<input type='number' id='inpage-payout-pts' min='100' max='" + availPts + "' value='" + Math.max(100, Math.min(availPts, 500)) + "' style='width:100%;background:#09090b;border:1px solid #27272a;color:#fff;padding:10px;font-size:12px;border-radius:3px;box-sizing:border-box'>" +
                    "</div>" +
                  "</div>" +
                  "<div id='inpage-payout-preview' style='font-size:11px;color:#22c55e;font-weight:700;margin-top:2px'>You will receive: ৳" + Math.round(Math.max(100, Math.min(availPts, 500)) * pointVal) + " BDT</div>" +
                  "<button type='submit' style='background:#22c55e;color:#000000;border:none;padding:12px;font:11px/1 \"NB Architekt Std\",sans-serif;font-weight:700;letter-spacing:1px;text-transform:uppercase;cursor:pointer;border-radius:3px;margin-top:4px'>SUBMIT WITHDRAWAL REQUEST →</button>" +
                "</form>" +
              "</details>" +

              // PAST WITHDRAWAL REQUESTS TABLE
              (userW.length > 0 ?
                "<div style='margin-bottom:20px'>" +
                  "<div style='font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#a1a1aa;margin-bottom:8px'>RECENT PAYOUT REQUESTS</div>" +
                  userW.map(function(w) {
                    var badgeCol = w.status === "paid" ? "#22c55e" : w.status === "approved" ? "#3b82f6" : w.status === "rejected" ? "#ef4444" : "#f59e0b";
                    return "<div style='display:flex;justify-content:space-between;align-items:center;background:#111113;border:1px solid #27272a;padding:10px 14px;border-radius:3px;margin-bottom:8px;font-size:11px'>" +
                      "<div>" +
                        "<div><strong>৳" + esc(w.money_amount_bdt) + "</strong> via " + esc(w.payout_method) + " (" + esc(w.points_amount) + " PTS)</div>" +
                        "<div style='font-size:10px;color:#71717a;margin-top:2px'>" + esc(w.account_number) + " · " + (w.created_at ? w.created_at.slice(0, 10) : "") + (w.transaction_reference ? " · TrxID: " + esc(w.transaction_reference) : "") + "</div>" +
                      "</div>" +
                      "<span style='color:" + badgeCol + ";text-transform:uppercase;font-size:10px;font-weight:700;letter-spacing:1px;border:1px solid " + badgeCol + ";padding:3px 8px;border-radius:2px'>" + esc(w.status) + "</span>" +
                    "</div>";
                  }).join("") +
                "</div>" : "") +

              // CONTINUE SHOPPING BUTTON
              "<div style='display:flex;gap:10px;margin-top:20px'>" +
                "<a href='/collections/all/index.html' style='flex:1;text-align:center;background:#ffffff;color:#000000;text-decoration:none;padding:12px;font:11px/1 \"NB Architekt Std\",sans-serif;font-weight:700;letter-spacing:1px;text-transform:uppercase;border-radius:3px'>CONTINUE SHOPPING →</a>" +
              "</div>" +
            "</div>";

          container.innerHTML = dashboardHtml;

          // Wire Copy Code
          var copyCodeBtn = container.querySelector("#inpage-copy-code");
          if (copyCodeBtn) {
            copyCodeBtn.onclick = function() {
              navigator.clipboard.writeText(refCode).then(function() {
                copyCodeBtn.textContent = "✓ COPIED";
                setTimeout(function() { copyCodeBtn.textContent = "COPY CODE"; }, 2000);
              });
            };
          }

          // Wire Copy Link
          var copyLinkBtn = container.querySelector("#inpage-copy-link");
          if (copyLinkBtn) {
            copyLinkBtn.onclick = function() {
              var shareUrl = window.location.origin + "/collections/all/index.html?ref=" + encodeURIComponent(refCode);
              navigator.clipboard.writeText(shareUrl).then(function() {
                copyLinkBtn.textContent = "✓ STORE LINK COPIED!";
                setTimeout(function() { copyLinkBtn.textContent = "🔗 COPY DIRECT STORE REFERRAL LINK"; }, 2000);
              });
            };
          }

          // Points to cash live calculation
          var ptsInput = container.querySelector("#inpage-payout-pts");
          var prevEl = container.querySelector("#inpage-payout-preview");
          if (ptsInput && prevEl) {
            ptsInput.oninput = function() {
              var p = Number(ptsInput.value) || 0;
              prevEl.textContent = "You will receive: ৳" + Math.round(p * pointVal) + " BDT";
            };
          }

          // Withdrawal form submission
          var payoutForm = container.querySelector("#inpage-payout-form");
          if (payoutForm) {
            payoutForm.onsubmit = function(e) {
              e.preventDefault();
              var method = container.querySelector("#inpage-payout-method").value;
              var acc = (container.querySelector("#inpage-payout-account").value || "").trim();
              var accName = (container.querySelector("#inpage-payout-name").value || "").trim();
              var pts = Number(container.querySelector("#inpage-payout-pts").value);

              if (pts > availPts) {
                alert("Insufficient points. Available points balance: " + availPts);
                return;
              }
              if (pts < 100) {
                alert("Minimum withdrawal is 100 points (৳" + Math.round(100 * pointVal) + ")");
                return;
              }

              // Deduct points
              var rawM = localStorage.getItem("annr-vip-members");
              var members = rawM ? JSON.parse(rawM) : [];
              var curM = members.find(function(m) { return m.email === member.email; });
              if (curM) {
                curM.available_points = Math.max(0, (curM.available_points || 0) - pts);
                curM.withdrawn_points = (curM.withdrawn_points || 0) + pts;
                localStorage.setItem("annr-vip-members", JSON.stringify(members));
              }

              // Create withdrawal entry
              var rawW = localStorage.getItem("annr-withdrawals");
              var withdrawals = rawW ? JSON.parse(rawW) : [];
              withdrawals.unshift({
                id: "w-" + Date.now().toString(36),
                member_id: member.id,
                member_name: member.full_name,
                member_email: member.email,
                points_amount: pts,
                money_amount_bdt: Math.round(pts * pointVal),
                payout_method: method,
                account_number: acc,
                account_holder_name: accName,
                status: "pending",
                created_at: new Date().toISOString()
              });
              localStorage.setItem("annr-withdrawals", JSON.stringify(withdrawals));

              alert("✓ Withdrawal request for ৳" + Math.round(pts * pointVal) + " submitted successfully! The admin will review and disburse your payment.");
              renderInPageVipHub();
            };
          }

          // Sign out button
          var signoutBtn = container.querySelector("#inpage-signout-btn");
          if (signoutBtn) {
            signoutBtn.onclick = function() {
              localStorage.removeItem("annr_vip_session");
              renderInPageVipHub();
            };
          }
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
      // 1. Immediately clean up any existing triggers, timers, or modals
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
      } catch(e) {}

      // Fallback to site config ballDrop
      var siteBd = (cfg && cfg.site && cfg.site.ballDrop) || (S && S.ballDrop) || {};

      // Master ON / OFF Check: STRICTLY OFF BY DEFAULT unless explicitly true
      var isEnabled = false;
      if (typeof loyaltySt.ball_drop_enabled === "boolean") {
        isEnabled = loyaltySt.ball_drop_enabled;
      } else if (typeof siteBd.enabled === "boolean") {
        isEnabled = siteBd.enabled;
      }

      // If disabled, stop completely and return
      if (isEnabled !== true) {
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
        var modalHtml =
          "<div style='background:#111113;border:1px solid #27272a;max-width:920px;width:95%;border-radius:4px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,0.95);position:relative;display:flex;flex-direction:" + (isMobile ? "column" : "row") + ";max-height:92vh;overflow-y:auto'>" +
            // Close Button
            "<button type='button' data-close style='position:absolute;top:16px;left:16px;background:none;border:none;color:#ffffff;font-size:22px;cursor:pointer;opacity:.75;line-height:1;z-index:20'>✕</button>" +

            // Left Side: Plinko Interactive Game
            "<div style='flex:1;min-width:" + (isMobile ? "100%" : "320px") + ";max-width:" + (isMobile ? "100%" : "480px") + ";background:#111113;padding:28px 24px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative'>" +
              "<div style='display:flex;justify-content:center;margin-bottom:8px'><span style='font:28px/1 \"Druk Wide\",sans-serif;font-weight:900;letter-spacing:3px;color:#ffffff;text-transform:uppercase'>ANNR</span></div>" +
              "<div style='font:22px/1.1 \"Druk Wide\",sans-serif;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#ffffff;margin-bottom:12px;text-align:center'>" + esc(bdConfig.title || "TAP TO DROP") + "</div>" +

              "<button type='button' id='adm-bd-drop-btn' style='background:#ffffff;color:#000000;border:none;border-radius:24px;padding:9px 28px;font:11px/1 \"NB Architekt Std\",sans-serif;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;margin-bottom:14px;box-shadow:0 4px 14px rgba(255,255,255,0.25);transition:transform 0.15s'>" + esc(bdConfig.buttonText || "TRY YOUR LUCK") + "</button>" +

              "<div style='background:#111113;position:relative;display:flex;justify-content:center;margin-bottom:10px'>" +
                "<canvas id='adm-bd-canvas' width='340' height='260' style='display:block;background:transparent'></canvas>" +
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
