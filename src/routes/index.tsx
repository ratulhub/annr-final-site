import { createFileRoute, redirect } from "@tanstack/react-router";

// The storefront is the original AnnR site, served as static pages from /public.
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AnnR | Streetwear Clothing & Fashion Online Store" },
      { name: "description", content: "Shop AnnR streetwear: hoodies, tees, jackets, bottoms and accessories." },
      { property: "og:title", content: "AnnR | Streetwear Clothing & Fashion" },
      { property: "og:description", content: "Shop AnnR streetwear: hoodies, tees, jackets, bottoms and accessories." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ href: "/home.html" });
  },
});
