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

  // Live Products Cache
  var liveProducts = [];

  function fetchLiveProducts(callback) {
    // 1. Try local storage first for instant rendering
    var localAdm = null;
    try {
      var rawAdm = localStorage.getItem("shihiko-admin-v1");
      if (rawAdm) {
        var parsed = JSON.parse(rawAdm);
        if (parsed && Array.isArray(parsed.products) && parsed.products.length > 0) {
          localAdm = parsed.products;
        }
      }
    } catch (e) {}

    if (localAdm && localAdm.length) {
      liveProducts = localAdm;
      if (callback) callback(liveProducts);
    }

    // 2. Fetch live products from Supabase
    var endpoint = SUPABASE_URL + "/rest/v1/products?select=id,handle,code,title,description,price,compare_at_price,currency,status,size,measurements,fabric,condition,stock,reserved_until,images,category_id,campaign_id,created_at&order=created_at.desc";

    fetch(endpoint, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY
      }
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (Array.isArray(data) && data.length > 0) {
          liveProducts = data.map(function (p) {
            return {
              id: p.id,
              handle: p.handle,
              code: p.code || ("ANNR-" + (p.handle ? p.handle.toUpperCase() : "U")),
              title: p.title,
              description: p.description || "",
              price: String(p.price || "0"),
              compareAt: p.compare_at_price ? String(p.compare_at_price) : "",
              currency: p.currency || "BDT",
              status: p.status || "active",
              size: p.size || "ONE SIZE",
              measurements: p.measurements || {},
              fabric: p.fabric || "",
              condition: p.condition || "10/10 Archival",
              careInstructions: p.care_instructions || "",
              categoryId: p.category_id,
              categorySlug: "",
              campaignId: p.campaign_id,
              campaignSlug: "",
              images: p.images && p.images.length ? p.images : ["/cdn/shop/t/75/assets/image_logo.svg"],
              stock: typeof p.stock === "number" ? p.stock : 1,
              reservedUntil: p.reserved_until,
              isOneOfOne: true
            };
          });
          try {
            localStorage.setItem("annr_live_products", JSON.stringify(liveProducts));
          } catch (e) {}
          if (callback) callback(liveProducts);
        } else if (!localAdm && callback) {
          callback(liveProducts);
        }
      })
      .catch(function () {
        if (!localAdm && callback) callback(liveProducts);
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
      var titleEl = document.querySelector(".product-title, .product__title, h1");
      if (titleEl) titleEl.textContent = prod.title;

      var priceEl = document.querySelector(".price-item--regular, .product-price .money, [data-product-price]");
      if (priceEl) priceEl.innerHTML = "Tk " + formatMoney(prod.price) + "<span class='money-currency-code'> BDT</span>";

      // Update Product Images in Carousel & Thumbnails
      if (prod.images && prod.images.length > 0) {
        var mainWrapper = document.querySelector(".product-gallery-carousel .swiper-wrapper");
        var thumbWrapper = document.querySelector(".product-gallery-thumb-carousel .swiper-wrapper");
        if (mainWrapper) {
          var mainSlides = "";
          var thumbSlides = "";
          prod.images.forEach(function (imgSrc, idx) {
            mainSlides +=
              "<div class='swiper-slide' data-media-id='" + idx + "'>" +
                "<div class='carousel-item' style='aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;background:#faf8f4;overflow:hidden;'>" +
                  "<img src='" + esc(imgSrc) + "' alt='" + esc(prod.title) + " - View " + (idx + 1) + "' onerror=\"this.src='/cdn/shop/t/75/assets/image_logo.svg'\" style='width:100%;height:100%;object-fit:cover;' loading='" + (idx === 0 ? "eager" : "lazy") + "'>" +
                "</div>" +
              "</div>";

            thumbSlides +=
              "<div class='swiper-slide prod-thumb-slide " + (idx === 0 ? "swiper-slide-thumb-active" : "") + "'>" +
                "<div class='carousel-thumb-item' style='width:64px;height:64px;overflow:hidden;border:1.5px solid " + (idx === 0 ? "#111" : "#e6e1d7") + ";background:#fff;cursor:pointer;'>" +
                  "<img src='" + esc(imgSrc) + "' alt='Thumbnail " + (idx + 1) + "' onerror=\"this.src='/cdn/shop/t/75/assets/image_logo.svg'\" style='width:100%;height:100%;object-fit:cover;'>" +
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
            var targetSrc = prod.images[i] || prod.images[0];
            im.src = targetSrc;
            if (im.srcset) im.removeAttribute("srcset");
          });
        }

        var ogImg = document.querySelector("meta[property='og:image']");
        if (ogImg && prod.images[0]) ogImg.setAttribute("content", prod.images[0]);
        var twImg = document.querySelector("meta[name='twitter:image']");
        if (twImg && prod.images[0]) twImg.setAttribute("content", prod.images[0]);
      }

      // Replace Size Selector with 1-of-1 Archival Badge & Measurement Table
      var variantArea = document.querySelector("variant-buttons, variant-radios, .product-form__variants, .size-selector, .product-info-size-selector");
      var oldQty = document.querySelector(".product-info-quantity-selector, .product-form__quantity");
      if (oldQty) oldQty.style.display = "none";

      var targetContainer = variantArea || document.querySelector("product-form") || document.querySelector("form[action*='/cart/add']");
      if (targetContainer && !document.getElementById("annr-injected-unique-size")) {
        var sizeBox = document.createElement("div");
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
          if (meas[mk.k]) {
            hasMeas = true;
            measRows +=
              "<div class='annr-meas-item'>" +
                "<div class='annr-meas-label'>" + esc(mk.label) + "</div>" +
                "<div class='annr-meas-val'>" + esc(String(meas[mk.k])) + " cm</div>" +
              "</div>";
          }
        });

        var measHtml = hasMeas ?
          "<div class='annr-measurements-panel'>" +
            "<div class='annr-measurements-head'>" +
              "<span>GARMENT MEASUREMENTS (EXACT)</span>" +
              "<span style='color:#777'>MEASURED FLAT</span>" +
            "</div>" +
            "<div class='annr-measurements-grid'>" + measRows + "</div>" +
            "<div class='annr-meas-note'>* Each AnnR archival piece is individually hand-measured. Compare against your favorite garment before purchase.</div>" +
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

        sizeBox.innerHTML =
          bannerHtml +
          "<div class='annr-unique-badge-row'>" +
            "<div class='" + statusPillClass + "'><span style='color:#e05a2b'>●</span> " + statusLabel + "</div>" +
            "<div class='annr-unique-code'>CODE: " + esc(prod.code) + "</div>" +
          "</div>" +
          "<div class='annr-exact-size-card'>" +
            "<div class='annr-size-primary'>" +
              "<div class='annr-size-tag'>EXACT SIZE</div>" +
              "<div class='annr-size-value'>" + esc(prod.size) + "</div>" +
            "</div>" +
            "<div class='annr-size-meta'>" +
              (prod.condition ? "<span>CONDITION: <strong style='color:#111'>" + esc(prod.condition) + "</strong></span>" : "") +
              (prod.fabric ? "<span>FABRIC: <strong style='color:#111'>" + esc(prod.fabric) + "</strong></span>" : "") +
            "</div>" +
          "</div>" +
          measHtml +
          "<div class='annr-single-qty-lock'>" +
            "<span class='dot'></span> ONLY 1 PIECE AVAILABLE WORLDWIDE · MAXIMUM 1 PER CLIENT" +
          "</div>";

        if (variantArea) {
          variantArea.style.display = "none";
          variantArea.parentNode.insertBefore(sizeBox, variantArea);
        } else {
          targetContainer.parentNode.insertBefore(sizeBox, targetContainer);
        }
      }

      // Update Add to Cart Button
      var atcBtn = document.querySelector("[name='add'], [data-product-button], .btn-add-to-cart");
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
    });
  }

  // Render on Collection Page
  function setupCollectionPage() {
    var path = window.location.pathname;
    var m = path.match(/\/collections\/([a-zA-Z0-9_-]+)/);
    if (!m) return;
    var currentHandle = m[1];

    var grid = document.querySelector("[data-product-grid], .collection-product-grid, .catalog__content");
    if (!grid) return;

    fetchLiveProducts(function (products) {
      // Setup Campaign Hero if on unique-campaign
      var isUniqueCampaign = currentHandle === "unique-campaign";
      var colHeader = document.querySelector(".collection-header, .catalog-header");

      if (isUniqueCampaign && !document.getElementById("annr-campaign-hero-el")) {
        var hero = document.createElement("div");
        hero.id = "annr-campaign-hero-el";
        hero.className = "annr-campaign-hero";

        var chips = CATEGORIES.map(function (c) {
          return "<button type='button' class='annr-cat-chip' data-category='" + esc(c.slug) + "'>" + esc(c.name) + "</button>";
        }).join("");

        hero.innerHTML =
          "<div class='top-badge'>[ ANNR ARCHIVAL DROPS ]</div>" +
          "<h1>UNIQUE CAMPAIGN</h1>" +
          "<p class='lead'>Every garment in the Unique Campaign exists as exactly one singular piece worldwide. When acquired, it is permanently locked in the AnnR collector archive.</p>" +
          "<div class='annr-category-chips'>" +
            "<button type='button' class='annr-cat-chip is-active' data-category='all'>ALL ARCHIVE</button>" +
            chips +
          "</div>";

        if (colHeader) {
          colHeader.parentNode.replaceChild(hero, colHeader);
        } else {
          grid.parentNode.insertBefore(hero, grid);
        }
      }

      // Add Controls Bar (Hide Sold + Sort)
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
              "<option value='price-asc'>PRICE: LOW TO HIGH</option>" +
              "<option value='price-desc'>PRICE: HIGH TO LOW</option>" +
            "</select>" +
          "</div>";
        grid.parentNode.insertBefore(ctrl, grid);
      }

      var activeCategory = "all";
      var hideSold = false;
      var sortBy = "newest";

      function renderGrid() {
        var filtered = products.slice();

        // If on specific collection (e.g. /collections/hoodies/)
        if (!isUniqueCampaign && currentHandle !== "all") {
          filtered = filtered.filter(function (p) {
            return p.categorySlug === currentHandle || p.category === currentHandle;
          });
        } else if (isUniqueCampaign && activeCategory !== "all") {
          filtered = filtered.filter(function (p) {
            return p.categorySlug === activeCategory || p.category === activeCategory;
          });
        }

        if (hideSold) {
          filtered = filtered.filter(function (p) {
            return p.status !== "sold" && p.stock > 0;
          });
        }

        if (sortBy === "price-asc") {
          filtered.sort(function (a, b) { return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0); });
        } else if (sortBy === "price-desc") {
          filtered.sort(function (a, b) { return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0); });
        }

        if (filtered.length === 0) {
          grid.innerHTML =
            "<div style='grid-column: 1 / -1; padding: 60px 20px; text-align: center; background: #faf8f4; border: 1px dashed #dcd6ca; margin: 20px 0;'>" +
              "<div style='font-family:\"FK Grotesk SemiMono\",monospace;font-size:12px;letter-spacing:2px;color:#777;text-transform:uppercase;margin-bottom:8px'>[ ARCHIVE NOTICE ]</div>" +
              "<div style='font-family:\"NB Architekt Std\",sans-serif;font-size:20px;font-weight:900;text-transform:uppercase;color:#111'>NO PIECES CURRENTLY MATCH THIS FILTER</div>" +
              "<p style='font-family:Georgia,serif;font-style:italic;color:#666;margin-top:10px'>New one-of-one pieces are released into the Unique Campaign drops.</p>" +
            "</div>";
          return;
        }

        var html = filtered.map(function (p) {
          var isSold = p.status === "sold" || p.stock < 1;
          var img = (p.images && p.images[0]) || "/cdn/shop/t/75/assets/image_logo.svg";
          var img2 = (p.images && p.images[1]) || img;

          return (
            "<div class='lazy-item product-card' data-handle='" + esc(p.handle) + "'>" +
              "<div class='product-card-image' style='position:relative'>" +
                "<div class='annr-card-one-badge'>1 OF 1 · SIZE " + esc(p.size) + "</div>" +
                (isSold ? "<div class='annr-card-sold-overlay'><div class='annr-card-sold-tag'>SOLD / ARCHIVED</div></div>" : "") +
                "<a href='/products/" + esc(p.handle) + "/index.html' class='product-card-image-wrapper' aria-label='" + esc(p.title) + "'>" +
                  "<img src='" + esc(img) + "' alt='" + esc(p.title) + "' width='1200' height='1200' loading='lazy' onerror=\"this.src='/cdn/shop/t/75/assets/image_logo.svg'\">" +
                  (img2 && img2 !== img ? "<img src='" + esc(img2) + "' alt='" + esc(p.title) + "' width='1200' height='1200' loading='lazy' onerror=\"this.src='/cdn/shop/t/75/assets/image_logo.svg'\">" : "") +
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

      renderGrid();

      // Wire Category Chips
      var chips = document.querySelectorAll(".annr-cat-chip");
      chips.forEach(function (btn) {
        btn.addEventListener("click", function () {
          chips.forEach(function (b) { b.classList.remove("is-active"); });
          btn.classList.add("is-active");
          activeCategory = btn.getAttribute("data-category") || "all";
          renderGrid();
        });
      });

      // Wire Hide Sold
      var hideSoldCheckbox = document.getElementById("annr-hide-sold");
      if (hideSoldCheckbox) {
        hideSoldCheckbox.addEventListener("change", function () {
          hideSold = hideSoldCheckbox.checked;
          renderGrid();
        });
      }

      // Wire Sort
      var sortSelect = document.getElementById("annr-sort-products");
      if (sortSelect) {
        sortSelect.addEventListener("change", function () {
          sortBy = sortSelect.value;
          renderGrid();
        });
      }
    });
  }

  // Update Main Navigation Menu
  function updateNavigation() {
    var menuContainers = document.querySelectorAll(".header-menu, .header-new__menu, .js-header-menu-block, #header-mobile-menu");
    if (!menuContainers.length) return;

    var navItems = [
      { label: "UNIQUE CAMPAIGN", url: "/collections/unique-campaign/index.html", highlight: true },
      { label: "HOODIES", url: "/collections/hoodies/index.html" },
      { label: "SWEATSHIRTS", url: "/collections/sweatshirts/index.html" },
      { label: "TROUSERS", url: "/collections/trousers/index.html" },
      { label: "SWEATERS", url: "/collections/sweaters/index.html" },
      { label: "T-SHIRTS", url: "/collections/t-shirts/index.html" },
      { label: "JACKETS", url: "/collections/jackets/index.html" },
      { label: "KNITWEAR", url: "/collections/knitwear/index.html" },
      { label: "ACCESSORIES", url: "/collections/accessories/index.html" },
      { label: "ALL ARCHIVE", url: "/collections/all/index.html" }
    ];

    // Find main menu lists
    document.querySelectorAll(".header-menu-list, .header-new__nav-list").forEach(function (ul) {
      if (ul.dataset.annrNavUpdated) return;
      ul.dataset.annrNavUpdated = "true";

      var html = navItems.map(function (item) {
        var highlightStyle = item.highlight ? "color:#e05a2b!important;font-weight:900!important" : "";
        return (
          "<li class='header-menu-item'>" +
            "<a href='" + esc(item.url) + "' class='header-menu-item-link' style='" + highlightStyle + "'>" +
              "<span class='header-menu-item-label'>" + esc(item.label) + "</span>" +
            "</a>" +
          "</li>"
        );
      }).join("");

      ul.innerHTML = html;
    });
  }

  // Init
  function init() {
    injectStyles();
    updateNavigation();

    var path = window.location.pathname;
    if (path.indexOf("/products/") >= 0) {
      setupProductPage();
    } else if (path.indexOf("/collections/") >= 0) {
      setupCollectionPage();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

