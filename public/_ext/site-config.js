/* Applies the PUBLISHED AnnR admin configuration to the static store pages (demo: this browser only).
   Only values that differ from the original defaults are applied, so untouched pages stay identical.
   Add ?preview=1 to any page to preview the unpublished draft instead. */
(function () {
  var qs = new URLSearchParams(location.search);
  // Inside the admin preview frame the flag lives in window.name so it never leaks to other tabs.
  var framed = window.self !== window.top;
  if (qs.get("preview") === "1") { if (framed) window.name = "shihiko-preview"; else sessionStorage.setItem("shihiko-preview", "1"); }
  if (qs.get("preview") === "0") { window.name = ""; sessionStorage.removeItem("shihiko-preview"); }
  var preview = framed ? window.name === "shihiko-preview" : sessionStorage.getItem("shihiko-preview") === "1";
  var cfg;
  try { cfg = JSON.parse(localStorage.getItem(preview ? "shihiko-site-draft" : "shihiko-site-config") || "null"); } catch (e) { return; }
  if (!cfg) { if (preview) whenReady(previewBar); return; }
  var P = cfg.products || {}, C = cfg.collections || {}, G = cfg.pages || {};
  var S = cfg.site || {}, D = cfg.defaults || {};
  var path = location.pathname;
  var tpl = /\/products\//.test(path) ? "product" : /\/collections\//.test(path) ? "collection" : /\/(pages|policies)\//.test(path) ? "page" : /\/home\.html$|^\/$/.test(path) ? "home" : "other";
  var J = JSON.stringify;
  function changed(k) { return J(S[k]) !== J(D[k]); }
  function diff(k, f) { return S[k] && D[k] && S[k][f] !== D[k][f]; }
  // Security: mirrors src/admin/security/sanitize.ts. Admin content is untrusted (import files, compromised accounts).
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"'`]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;" }[c]; }); }
  function safeUrl(u) {
    var s = String(u == null ? "" : u).trim();
    if (!s || s.length > 2048 || /[\u0000-\u001f\\]/.test(s)) return "#";
    if (s.charAt(0) === "#") return s;
    if (s.charAt(0) === "/") return s.charAt(1) === "/" ? "#" : s;
    return /^(https?:\/\/|mailto:|tel:)/i.test(s) ? s : "#";
  }
  function safeImg(u) {
    var s = String(u == null ? "" : u).trim();
    if (/^data:image\/(png|jpe?g|webp|gif|avif);base64,[a-z0-9+\/=]+$/i.test(s)) return s;
    var r = safeUrl(s); return r.charAt(0) === "#" || /^(mailto|tel):/i.test(r) ? "" : r;
  }
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

  function apply() {
    if (preview) previewBar();
    var gen = S.general || {}, tech = S.technical || {}, seo = S.seo || {};

    // Hidden pages and maintenance
    var hidden = (S.hiddenPages || []).some(function (p) { return path.indexOf(p) === 0; });
    var pg = tpl === "page" && G[pageHandle(path)], col = tpl === "collection" && C[handleOf(path, "collections")];
    if (hidden || (pg && pg.visible === false) || (col && col.visible === false))
      return overlay("adm-404", "<div>" + esc(tech.notFoundTitle || "Page not found") + "<br><small style='font-size:11px'>" + esc(tech.notFoundText) + "<br><a href='/home.html' style='color:#fff'>HOME</a></small></div>", FULL);
    if (tech.maintenance)
      return overlay("adm-maint", "<div>" + esc(tech.maintenanceTitle || gen.siteName) + "<br><small style='font-size:11px;letter-spacing:1px'>" + esc(tech.maintenanceText) + "</small></div>", FULL);

    // Page transition off: the delegated handler needs .reload-overflow, so removing it disables the effect.
    if (tech.pageTransition === false) document.querySelectorAll(".reload-overflow,.loading-bar").forEach(function (e) { e.remove(); });

    // Products everywhere (cards on home, collections, search, recommendations)
    document.querySelectorAll("a.product-card-title").forEach(function (a) {
      var o = P[handleOf(a.getAttribute("href"), "products")]; if (!o) return;
      var card = a.closest(".product-card, li, .grid__item") || a.parentElement;
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
      if (o.status && o.status !== "active" && card) card.style.display = "none";
    });
    var ph = handleOf(path, "products"), ch = handleOf(path, "collections"), gh = pageHandle(path);
    var o = ph ? P[ph] : ch ? C[ch] : gh ? G[gh] : null;
    if (ph && o) {
      var t = document.querySelector(".product-info-title"); if (t && o.title != null) t.textContent = o.title;
      if (o.price != null || o.compareAt != null) setMoney(document.querySelector(".product-info-price"), o.price, o.compareAt);
      if (o.description != null) {
        var descBox = document.querySelector(".product-info-details-header .product-info-detail-content-inner");
        if (descBox) descBox.innerHTML = "<h3 class='hide-mob'>DESCRIPTION</h3><div style='white-space:pre-wrap'>" + esc(o.description) + "</div>";
      }
      if (o.sizeChart) {
        var detailsWrap = document.querySelector(".product-info-details-header .product-info-detail-content-inner") || document.querySelector(".product-info-details");
        if (detailsWrap && !detailsWrap.querySelector(".adm-size-chart")) {
          var sc = document.createElement("div"); sc.className = "adm-size-chart";
          sc.style.cssText = "margin-top:16px;padding-top:12px;border-top:1px solid rgba(0,0,0,.15);white-space:pre-wrap;font-size:12px";
          sc.innerHTML = "<strong>SIZE &amp; FIT</strong><br>" + esc(o.sizeChart);
          detailsWrap.appendChild(sc);
        }
      }
      if (o.images && o.images.length) {
        var validImgs = o.images.map(safeImg).filter(Boolean);
        if (validImgs.length) {
          document.querySelectorAll(".product-gallery-carousel .swiper-slide img").forEach(function (img, idx) {
            var u = validImgs[idx % validImgs.length]; img.src = u; img.removeAttribute("srcset");
          });
          document.querySelectorAll(".product-gallery-thumb-carousel .swiper-slide img").forEach(function (img, idx) {
            var u = validImgs[idx % validImgs.length]; img.src = u; img.removeAttribute("srcset");
          });
        }
      }
      if (Array.isArray(o.variants) && o.trackStock !== false && !o.allowBackorder) {
        var totalStock = o.variants.reduce(function (n, v) { return n + (Number(v && v.stock) || 0); }, 0);
        if (totalStock <= 0) {
          var subBtn = document.querySelector(".product-info-submit button[type=submit]");
          if (subBtn) { subBtn.disabled = true; var sbt = subBtn.querySelector(".text") || subBtn; sbt.textContent = "SOLD OUT"; }
        }
      }
    }
    if (ch && o) {
      var colTitle = document.querySelector(".collection-title"); if (colTitle && o.title != null) colTitle.textContent = o.title;
      if (o.description != null && o.description !== "") {
        var tbLeft = document.querySelector(".collection-display-toolbar__left");
        if (tbLeft && !tbLeft.querySelector(".adm-col-desc")) {
          var cd = document.createElement("div"); cd.className = "adm-col-desc";
          cd.style.cssText = "font:11px/1.5 'NB Architekt Std',sans-serif;margin-top:6px;opacity:.8;max-width:640px";
          cd.textContent = o.description; tbLeft.appendChild(cd);
        }
      }
      if (o.image && safeImg(o.image)) {
        var cHero = document.querySelector('[id$="__collection_hero"]');
        if (cHero && !cHero.querySelector(".adm-col-hero")) {
          cHero.innerHTML = "<img class='adm-col-hero' src='" + esc(safeImg(o.image)) + "' alt='" + esc(o.title || "") + "' style='width:100%;max-height:360px;object-fit:cover;display:block'>";
        }
      }
      var grid = document.querySelector(".collection-product-grid");
      if (grid && Array.isArray(o.products) && o.products.length) {
        var allowed = {}; o.products.forEach(function (h) { allowed[h] = true; });
        grid.querySelectorAll(".product-card").forEach(function (card) {
          var link = card.querySelector("a.product-card-title");
          var h = link && handleOf(link.getAttribute("href"), "products");
          if (h && !allowed[h]) card.style.display = "none";
        });
      }
      if (grid && o.sort && o.sort !== "manual") {
        var cards = Array.prototype.slice.call(grid.querySelectorAll(".product-card"));
        var priceVal = function (c) { var t = (c.querySelector(".product-card-price") || {}).textContent || ""; return parseFloat(t.replace(/[^0-9.]/g, "")) || 0; };
        var titleVal = function (c) { return ((c.querySelector(".product-card-title") || {}).textContent || "").trim().toLowerCase(); };
        if (o.sort === "price low-high") cards.sort(function (a, b) { return priceVal(a) - priceVal(b); });
        else if (o.sort === "price high-low") cards.sort(function (a, b) { return priceVal(b) - priceVal(a); });
        else if (o.sort === "a-z") cards.sort(function (a, b) { return titleVal(a) < titleVal(b) ? -1 : titleVal(a) > titleVal(b) ? 1 : 0; });
        cards.forEach(function (c) { grid.appendChild(c); });
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
    if (gen.favicon) { var fav = document.querySelector("link[rel~='icon']"); if (fav && safeImg(gen.favicon)) fav.href = safeImg(gen.favicon); }

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
        var img = a.kind === "image" && a.image ? "<img src='" + esc(safeUrl(a.image)) + "' alt='" + esc(a.alt) + "' style='width:100%;display:block;margin-bottom:20px'>" : "";
        var btn = a.kind !== "text" && a.button ? "<a href='" + esc(safeUrl(a.url)) + "' style='display:inline-block;margin-top:16px;background:#000;color:#fff;padding:12px 20px;text-decoration:none;text-transform:uppercase;font:10px/1 \"NB Architekt Std\",sans-serif;letter-spacing:1px'>" + esc(a.button) + "</a>" : "";
        el.innerHTML = "<div style='padding:48px 20px;max-width:1440px;margin:0 auto'>" + img + (a.heading ? "<h2 style='font-family:\"Druk Wide\",sans-serif;text-transform:uppercase;font-size:24px;margin:0 0 12px'>" + esc(a.heading) + "</h2>" : "") + (a.text ? "<p style='font-family:\"NB Architekt Std\",sans-serif;font-size:12px;line-height:1.6;white-space:pre-line;margin:0'>" + esc(a.text) + "</p>" : "") + btn + "</div>";
      }
      el.id = "shopify-section-adm__" + s.key;
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(el, anchor); else document.body.appendChild(el);
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
  }
  whenReady(apply);
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
