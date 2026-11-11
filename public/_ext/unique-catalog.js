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

  // Inject Luxury Typography & Styles
  function injectStyles() {
    if (document.getElementById("annr-unique-styles")) return;
    var st = document.createElement("style");
    st.id = "annr-unique-styles";
    st.textContent =
      "/* AnnR Unique One-of-One Styling */\n" +
      ".annr-unique-badge-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }\n" +
      ".annr-unique-pill { display: inline-flex; align-items: center; gap: 6px; background: #111111; color: #ffffff; padding: 5px 10px; font-family: 'FK Grotesk SemiMono', monospace; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; border-radius: 2px; }\n" +
      ".annr-unique-pill.sold { background: #555555; color: #f5f5f5; }\n" +
      ".annr-unique-pill.reserved { background: #b45309; color: #ffffff; }\n" +
      ".annr-unique-code { font-family: 'FK Grotesk SemiMono', monospace; font-size: 11px; font-weight: 700; color: #e05a2b; letter-spacing: 1.5px; text-transform: uppercase; }\n" +
      ".annr-exact-size-card { background: #ffffff; border: 1.5px solid #111111; padding: 18px 20px; margin: 16px 0; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; box-shadow: 3px 3px 0 #111111; }\n" +
      ".annr-size-primary { display: flex; align-items: baseline; gap: 12px; }\n" +
      ".annr-size-tag { font-family: 'FK Grotesk SemiMono', monospace; font-size: 10.5px; letter-spacing: 2px; color: #666666; text-transform: uppercase; }\n" +
      ".annr-size-value { font-family: 'NB Architekt Std', sans-serif; font-size: 30px; font-weight: 900; color: #111111; letter-spacing: 1px; line-height: 1; }\n" +
      ".annr-size-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; text-align: right; font-family: 'FK Grotesk SemiMono', monospace; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #444444; }\n" +
      ".annr-measurements-panel { background: #faf8f4; border: 1px solid #e5e0d6; padding: 18px 20px; margin: 18px 0; }\n" +
      ".annr-measurements-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #e5e0d6; padding-bottom: 8px; }\n" +
      ".annr-measurements-head span { font-family: 'FK Grotesk SemiMono', monospace; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; color: #111111; text-transform: uppercase; }\n" +
      ".annr-measurements-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 10px; }\n" +
      ".annr-meas-item { background: #ffffff; border: 1px solid #e8e3d8; padding: 8px 10px; }\n" +
      ".annr-meas-label { font-family: 'FK Grotesk SemiMono', monospace; font-size: 9px; letter-spacing: 1px; color: #777777; text-transform: uppercase; margin-bottom: 2px; }\n" +
      ".annr-meas-val { font-family: 'NB Architekt Std', sans-serif; font-size: 13px; font-weight: 700; color: #111111; }\n" +
      ".annr-meas-note { font-family: Georgia, serif; font-size: 11px; font-style: italic; color: #666666; margin-top: 10px; }\n" +
      ".annr-single-qty-lock { display: inline-flex; align-items: center; gap: 8px; font-family: 'FK Grotesk SemiMono', monospace; font-size: 10.5px; letter-spacing: 1.2px; text-transform: uppercase; color: #444444; background: #efeae0; padding: 8px 14px; border: 1px solid #dcd6ca; margin: 10px 0 16px; }\n" +
      ".annr-single-qty-lock span.dot { width: 6px; height: 6px; border-radius: 50%; background: #e05a2b; display: inline-block; }\n" +
      ".annr-archival-banner { padding: 16px 20px; margin: 16px 0; border: 1.5px solid; font-family: 'NB Architekt Std', sans-serif; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; line-height: 1.4; }\n" +
      ".annr-archival-banner.sold { background: #1a1a1a; color: #ffffff; border-color: #000000; }\n" +
      ".annr-archival-banner.reserved { background: #fffbeb; color: #b45309; border-color: #f59e0b; }\n" +
      "/* Unique Campaign Header & Filter Bar */\n" +
      ".annr-campaign-hero { background: #ffffff; border-bottom: 2px solid #111111; padding: 48px 24px 36px; text-align: center; margin-bottom: 32px; }\n" +
      ".annr-campaign-hero .top-badge { display: inline-block; font-family: 'FK Grotesk SemiMono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 2.5px; color: #e05a2b; text-transform: uppercase; margin-bottom: 12px; }\n" +
      ".annr-campaign-hero h1 { font-family: 'NB Architekt Std', sans-serif; font-size: 38px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; color: #111111; margin: 0 0 12px; line-height: 1.05; }\n" +
      ".annr-campaign-hero p.lead { font-family: Georgia, serif; font-size: 14px; font-style: italic; color: #555555; max-width: 680px; margin: 0 auto 20px; line-height: 1.5; }\n" +
      ".annr-category-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; max-width: 900px; margin: 0 auto; }\n" +
      ".annr-cat-chip { background: #f7f4ef; border: 1px solid #d8d3ca; color: #111111; padding: 9px 16px; font-family: 'FK Grotesk SemiMono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; text-decoration: none; cursor: pointer; transition: all .15s ease; }\n" +
      ".annr-cat-chip:hover, .annr-cat-chip.is-active { background: #111111; color: #ffffff; border-color: #111111; }\n" +
      ".annr-grid-controls { display: flex; justify-content: space-between; align-items: center; padding: 12px 24px; background: #faf8f4; border: 1px solid #e5e0d6; margin: 0 24px 28px; flex-wrap: wrap; gap: 14px; }\n" +
      ".annr-toggle-label { display: flex; align-items: center; gap: 8px; font-family: 'FK Grotesk SemiMono', monospace; font-size: 10px; letter-spacing: 1.2px; text-transform: uppercase; color: #333333; cursor: pointer; user-select: none; }\n" +
      ".annr-toggle-label input { accent-color: #111111; width: 15px; height: 15px; cursor: pointer; }\n" +
      ".annr-sort-select { background: #ffffff; border: 1px solid #d8d3ca; font-family: 'FK Grotesk SemiMono', monospace; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; padding: 6px 12px; outline: none; cursor: pointer; }\n" +
      ".annr-card-one-badge { position: absolute; top: 10px; left: 10px; z-index: 4; background: rgba(17,17,17,0.92); color: #ffffff; padding: 4px 8px; font-family: 'FK Grotesk SemiMono', monospace; font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; pointer-events: none; }\n" +
      ".annr-card-sold-overlay { position: absolute; inset: 0; background: rgba(17,17,17,0.68); display: flex; align-items: center; justify-content: center; z-index: 5; pointer-events: none; }\n" +
      ".annr-card-sold-tag { background: #ffffff; color: #111111; font-family: 'NB Architekt Std', sans-serif; font-size: 13px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; padding: 8px 16px; border: 2px solid #111111; box-shadow: 0 6px 20px rgba(0,0,0,0.3); }\n";
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
      reservedUntil: p.reserved_until || p.reservedUntil || null,
      isOneOfOne: true
    };
  }

  function mergeProductLists(lists) {
    var byHandle = {};
    var order = [];
    lists.forEach(function (arr) {
      if (!Array.isArray(arr)) return;
      arr.forEach(function (raw) {
        var norm = normalizeProduct(raw);
        if (!norm) return;
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
        if (parsed && Array.isArray(parsed.products)) localAdmList = parsed.products;
      }
    } catch (e) {}

    liveProducts = mergeProductLists([remoteCacheList, siteCfgList, localAdmList]);
    if (liveProducts.length > 0 && callback) {
      callback(liveProducts);
    }

    // Fallback seed from static /_ext/catalog.json for clean/incognito browsers before Supabase responds
    fetch("/_ext/catalog.json")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (catData) {
        var seedArr = Array.isArray(catData) ? catData : (catData && Array.isArray(catData.products) ? catData.products : []);
        if (Array.isArray(seedArr) && seedArr.length > 0 && liveProducts.length === 0) {
          baseList = seedArr;
          liveProducts = mergeProductLists([baseList, remoteCacheList, siteCfgList, localAdmList]);
          if (liveProducts.length > 0 && callback) callback(liveProducts);
        }
      })
      .catch(function () {});

    // 2. Fetch live products from Supabase (resilient across schema migrations 14 vs 16)
    var colsFull = "id,handle,code,title,description,price,compare_at_price,currency,status,size,show_size,measurement_unit,measurements,fabric,condition,care_instructions,images,tags,category_id,campaign_id,stock,reserved_until,created_at,categories(slug,name),campaigns(slug,name)";
    var colsMid = "id,handle,code,title,description,price,compare_at_price,currency,status,size,measurements,fabric,condition,images,tags,category_id,campaign_id,stock,reserved_until,created_at,categories(slug,name),campaigns(slug,name)";
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
        if (r.status === 400) return querySb(colsMid);
        return r;
      })
      .then(function (r) {
        if (r.status === 400) return querySb(colsMin);
        return r;
      })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (Array.isArray(data) && data.length > 0) {
          var normalizedRemote = mergeProductLists([data]);
          try {
            localStorage.setItem("annr_live_products", JSON.stringify(normalizedRemote));
          } catch (e) {}
          liveProducts = mergeProductLists([normalizedRemote, localAdmList]);
          if (callback) callback(liveProducts);
        } else if (liveProducts.length === 0) {
          liveProducts = mergeProductLists([baseList, siteCfgList, localAdmList]);
          if (callback) callback(liveProducts);
        }
      })
      .catch(function () {
        if (liveProducts.length === 0) {
          liveProducts = mergeProductLists([baseList, siteCfgList, localAdmList]);
        }
        if (callback) callback(liveProducts);
      });
  }

  function setupHomePage() {
    var path = window.location.pathname;
    if (path !== "/" && path !== "/index.html" && path !== "/home.html") return;

    var showcase = document.querySelector("product-carousel-showcase");
    if (!showcase) return;

    fetchLiveProducts(function (products) {
      if (!products || !products.length) return;
      var featured = products.filter(function (p) { return p.status !== "draft" && p.status !== "deleted"; }).slice(0, 12);
      if (!featured.length) return;

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
                    "<img src='" + esc(img1) + "' alt='" + esc(p.title) + "' width='1200' height='1200' loading='lazy' onerror=\"this.src='/_ext/annr-template-001.png'\">" +
                    (img2 && img2 !== img1 ? "<img src='" + esc(img2) + "' alt='" + esc(p.title) + "' width='1200' height='1200' loading='lazy' onerror=\"this.src='/_ext/annr-template-001.png'\">" : "") +
                  "</a>" +
                "</div>" +
                "<div style='padding-top:8px'>" +
                  "<div style='font-family:\"FK Grotesk SemiMono\",monospace;font-size:9px;color:#e05a2b;letter-spacing:1.4px;font-weight:700'>" + esc(p.code) + "</div>" +
                  "<a href='/products/" + esc(p.handle) + "/index.html' class='product-card-title'>" + esc(p.title) + "</a>" +
                  "<div class='product-card-price'><span class='money'>Tk " + formatMoney(p.price) + "<span class='money-currency-code'>BDT</span></span></div>" +
                "</div>" +
              "</div>" +
            "</div>"
          );
        }).join("");
      }

      if (thumbWrap) {
        thumbWrap.innerHTML = featured.map(function (p, idx) {
          var img1 = safeImg(p.images && p.images[0]);
          return (
            "<div class='swiper-slide product-carousel-showcase__thumb" + (idx === 0 ? " is-active swiper-slide-thumb-active" : "") + "'>" +
              "<div class='product-carousel-showcase__thumb-inner'>" +
                "<img src='" + esc(img1) + "' alt='" + esc(p.title) + "' width='120' height='120' loading='lazy' onerror=\"this.src='/_ext/annr-template-001.png'\">" +
              "</div>" +
            "</div>"
          );
        }).join("");
      }

      if (sliderEl && sliderEl.swiper) {
        try { sliderEl.swiper.update(); } catch (e) {}
      }
      if (thumbsEl && thumbsEl.swiper) {
        try { thumbsEl.swiper.update(); } catch (e) {}
      }
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

      // Update Product Images in Carousel & Thumbnails
      if (prod.images && prod.images.length > 0) {
        var mainWrapper = document.querySelector(".product-gallery-carousel .swiper-wrapper");
        var thumbWrapper = document.querySelector(".product-gallery-thumb-carousel .swiper-wrapper");
        if (mainWrapper) {
          var mainSlides = "";
          var thumbSlides = "";
          prod.images.forEach(function (rawSrc, idx) {
            var imgSrc = safeImg(rawSrc);
            mainSlides +=
              "<div class='swiper-slide' data-media-id='" + idx + "'>" +
                "<div class='carousel-item' style='aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;background:#faf8f4;overflow:hidden;'>" +
                  "<img src='" + esc(imgSrc) + "' alt='" + esc(prod.title) + " - View " + (idx + 1) + "' onerror=\"this.src='/_ext/annr-template-001.png'\" style='width:100%;height:100%;object-fit:cover;' loading='" + (idx === 0 ? "eager" : "lazy") + "'>" +
                "</div>" +
              "</div>";

            thumbSlides +=
              "<div class='swiper-slide prod-thumb-slide " + (idx === 0 ? "swiper-slide-thumb-active" : "") + "'>" +
                "<div class='carousel-thumb-item' style='width:64px;height:64px;overflow:hidden;border:1.5px solid " + (idx === 0 ? "#111" : "#e6e1d7") + ";background:#fff;cursor:pointer;'>" +
                  "<img src='" + esc(imgSrc) + "' alt='Thumbnail " + (idx + 1) + "' onerror=\"this.src='/_ext/annr-template-001.png'\" style='width:100%;height:100%;object-fit:cover;'>" +
                "</div>" +
              "</div>";
          });
          mainWrapper.innerHTML = mainSlides;
          if (thumbWrapper) thumbWrapper.innerHTML = thumbSlides;

          var mainCarouselEl = document.querySelector(".product-gallery-carousel");
          var thumbCarouselEl = document.querySelector(".product-gallery-thumb-carousel");
          if (mainCarouselEl && mainCarouselEl.swiper) {
            try { mainCarouselEl.swiper.update(); mainCarouselEl.swiper.slideTo(0); } catch(e) {}
          }
          if (thumbCarouselEl && thumbCarouselEl.swiper) {
            try { thumbCarouselEl.swiper.update(); thumbCarouselEl.swiper.slideTo(0); } catch(e) {}
          }

          if (thumbWrapper) {
            thumbWrapper.querySelectorAll(".prod-thumb-slide").forEach(function (th, tIdx) {
              th.onclick = function () {
                if (mainCarouselEl && mainCarouselEl.swiper) {
                  try { mainCarouselEl.swiper.slideTo(tIdx); } catch(e) {}
                }
                var allMain = mainWrapper.querySelectorAll(".swiper-slide");
                allMain.forEach(function (ms, mIdx) {
                  ms.style.display = (mIdx === tIdx) ? "block" : "none";
                });
                thumbWrapper.querySelectorAll(".prod-thumb-slide").forEach(function (s) {
                  s.classList.remove("swiper-slide-thumb-active");
                  var cti = s.querySelector(".carousel-thumb-item");
                  if (cti) cti.style.borderColor = "#e6e1d7";
                });
                th.classList.add("swiper-slide-thumb-active");
                var activeCti = th.querySelector(".carousel-thumb-item");
                if (activeCti) activeCti.style.borderColor = "#111";
              };
            });
          }
        }

        var allImgs = document.querySelectorAll(".product-gallery img, .product__media img, .product-media img");
        if (allImgs.length > 0 && prod.images[0]) {
          allImgs.forEach(function (im, i) {
            if (im.closest && im.closest(".product-info-save-button")) return;
            var targetSrc = safeImg(prod.images[i] || prod.images[0]);
            im.src = targetSrc;
            if (im.srcset) im.removeAttribute("srcset");
          });
        }

        var ogImg = document.querySelector("meta[property='og:image']");
        if (ogImg && prod.images[0]) ogImg.setAttribute("content", safeImg(prod.images[0]));
        var twImg = document.querySelector("meta[name='twitter:image']");
        if (twImg && prod.images[0]) twImg.setAttribute("content", safeImg(prod.images[0]));
      }

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

      // Update Add to Cart Button & intercept Shopify AJAX /cart/add with 1-of-1 /checkout flow
      var atcBtn = document.querySelector("[name='add'], [data-product-button], .btn-add-to-cart, .product-info-submit button");
      if (atcBtn) {
        if (prod.status === "sold" || prod.stock < 1) {
          atcBtn.disabled = true;
          atcBtn.style.opacity = "0.5";
          atcBtn.style.cursor = "not-allowed";
          atcBtn.innerHTML = "<span class='content'><span><span class='text'>ARCHIVED / SOLD OUT</span></span></span>";
        } else if (prod.status === "reserved") {
          atcBtn.disabled = true;
          atcBtn.style.opacity = "0.7";
          atcBtn.innerHTML = "<span class='content'><span><span class='text'>RESERVED IN CHECKOUT</span></span></span>";
        } else {
          atcBtn.disabled = false;
          atcBtn.style.opacity = "1";
          atcBtn.innerHTML = "<span class='content'><span><span class='text'>ACQUIRE 1-OF-1 PIECE</span></span></span>";
        }
      }

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
      if (Array.isArray(p.collections) && p.collections.indexOf(cat) !== -1) return true;
      return false;
    }

    function renderGrid() {
      purgeLegacyHeroLogo();
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
            "<div style='padding-top:10px'>" +
              "<div style='font-family:\"FK Grotesk SemiMono\",monospace;font-size:9.5px;color:#e05a2b;letter-spacing:1.5px;margin-bottom:4px;font-weight:700'>" + esc(p.code) + "</div>" +
              "<a href='/products/" + esc(p.handle) + "/index.html' class='product-card-title' style='font-family:\"NB Architekt Std\",sans-serif;font-size:13px;font-weight:700;color:#111;text-decoration:none'>" + esc(p.title) + "</a>" +
              "<div class='product-card-price' style='margin-top:4px'>" +
                "<span class='money' style='font-family:\"NB Architekt Std\",sans-serif;font-size:13px;font-weight:900;color:#111'>Tk " + formatMoney(p.price) + " <span class='money-currency-code'>BDT</span></span>" +
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

      if (isUniqueCampaign && !document.getElementById("annr-campaign-hero-el")) {
        var hero = document.createElement("div");
        hero.id = "annr-campaign-hero-el";
        hero.className = "annr-campaign-hero";

        var chips = liveCats.map(function (c) {
          var isAct = activeCategory === c.slug;
          return "<button type='button' class='annr-cat-chip" + (isAct ? " is-active" : "") + "' data-category='" + esc(c.slug) + "'>" + esc(c.name) + "</button>";
        }).join("");

        hero.innerHTML =
          "<div class='top-badge'>[ ANNR ARCHIVAL DROPS ]</div>" +
          "<h1>UNIQUE CAMPAIGN</h1>" +
          "<p class='lead'>Every garment in the Unique Campaign exists as exactly one singular piece worldwide. When acquired, it is permanently locked in the AnnR collector archive.</p>" +
          "<div class='annr-category-chips'>" +
            "<button type='button' class='annr-cat-chip" + (activeCategory === "all" ? " is-active" : "") + "' data-category='all'>ALL ARCHIVE</button>" +
            chips +
          "</div>";

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
    mobSubs.forEach(function (ms) {
      ms.innerHTML =
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
    if (path === "/" || path === "/index.html" || path === "/home.html") {
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

