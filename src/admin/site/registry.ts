import type { Block, SectionCfg, AddedSection } from "./types";

// Every store page template and the real sections it contains (found in the saved pages).
// Keys match the end of each section's id on the page, so settings survive across pages.
const sec = (key: string, label: string, type: string): SectionCfg => ({ key, label, type, visible: true, padTop: "", padBottom: "", background: "", align: "", width: "", device: "all" });

export const TEMPLATES: Record<string, { label: string; sample: string; sections: SectionCfg[] }> = {
  home: { label: "Home page", sample: "/home.html", sections: [
    sec("main-header", "Header", "header"),
    sec("home_hero_carousel_Wg4Rrh", "Hero carousel (video)", "hero"),
    sec("product_carousel_showcase_VzeMj3", "Product carousel", "products"),
    sec("parallax_YwdY8c", "Parallax banner 1", "banner"),
    sec("parallax_c4QGdG", "Parallax banner 2", "banner"),
    sec("parallax_WzmhjH", "Parallax banner 3", "banner"),
    sec("parallax_Jdmgiy", "Parallax banner 4", "banner"),
    sec("main-footer", "Footer", "footer"),
  ] },
  product: { label: "Product pages (all 93)", sample: "/products/aka-manto-longsleeve/index.html", sections: [
    sec("main-header", "Header", "header"),
    sec("template-product", "Product details", "product"),
    sec("175338351149468287", "Size / info block", "text"),
    sec("product-reviews", "Reviews", "reviews"),
    sec("product-recommendation", "You may also like", "products"),
    sec("delivery_dynamic_t_new_JqMwnG", "Delivery info", "text"),
    sec("product-recently-viewed", "Recently viewed", "products"),
    sec("main-footer", "Footer", "footer"),
  ] },
  collection: { label: "Collection pages (all 22)", sample: "/collections/all/index.html", sections: [
    sec("main-header", "Header", "header"),
    sec("collection_hero", "Collection hero", "hero"),
    sec("collection_story_cta_bTzknC", "Story / call to action", "cta"),
    sec("template-collection", "Product grid", "products"),
    sec("main-footer", "Footer", "footer"),
  ] },
  page: { label: "Info pages (FAQ, policies)", sample: "/pages/faq/index.html", sections: [
    sec("main-header", "Header", "header"),
    sec("template-faq", "Page content", "text"),
    sec("main-footer", "Footer", "footer"),
  ] },
  search: { label: "Search results page", sample: "/search/index.html", sections: [
    sec("main-header", "Header", "header"),
    sec("search-results", "Search filter & product grid", "products"),
    sec("main-footer", "Footer", "footer"),
  ] },
};

export const SECTION_KINDS: Record<AddedSection["kind"], string> = {
  text: "Text block",
  image: "Image banner",
  cta: "Call to action",
  gift_banner: "Gift & campaign banner",
  countdown: "Launch / event countdown",
  products: "Featured products showcase",
};

// Block types allowed on new pages, with a blank value and validation for each.
/* eslint-disable @typescript-eslint/no-explicit-any */
export const BLOCKS: Record<Block["type"], { label: string; blank: () => Omit<Block, "id">; validate: (b: any) => string | null }> = {
  heading: { label: "Heading", blank: () => ({ type: "heading", text: "New heading", level: "h2", align: "left" }), validate: (b) => (b.text.trim() ? null : "Heading text is required") },
  text: { label: "Paragraph", blank: () => ({ type: "text", text: "", align: "left" }), validate: () => null },
  image: { label: "Image", blank: () => ({ type: "image", url: "", alt: "", caption: "" }), validate: (b) => (!b.url ? "Choose an image" : !b.alt ? "Alt text is required" : null) },
  button: { label: "Button", blank: () => ({ type: "button", label: "Shop now", url: "/collections/all/index.html" }), validate: (b) => (!b.label ? "Button label is required" : !/^(\/|https?:\/\/|mailto:)/.test(b.url) ? "Link must start with /, https:// or mailto:" : null) },
  faq: { label: "FAQ list", blank: () => ({ type: "faq", items: [] }), validate: () => null },
  products: { label: "Product grid", blank: () => ({ type: "products", title: "Featured", handles: "", limit: "4" }), validate: (b) => (Number(b.limit) > 0 && Number(b.limit) <= 24 ? null : "Show 1–24 products") },
  gallery: { label: "Image gallery", blank: () => ({ type: "gallery", images: "", columns: "3" }), validate: () => null },
  spacer: { label: "Spacer", blank: () => ({ type: "spacer", size: "40" }), validate: () => null },
};

export const FONT_OPTIONS = ["", "Druk Wide", "NB Architekt Std", "FK Grotesk SemiMono", "Arial", "Georgia"];
export const SPACING = ["", "0", "16px", "32px", "48px", "64px", "96px", "128px"];
export const SCALE = ["", "90%", "100%", "110%", "120%"];
export const RADIUS = ["", "0", "2px", "4px", "8px", "999px"];
export const WIDTHS = ["", "1200px", "1440px", "1600px", "100%"];
export const SCOPES = ["all", "home", "product", "collection", "page", "search"];
