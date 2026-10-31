import { _ as lazyRouteComponent, v as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/p._slug-DGuu_Tga.js
var $$splitComponentImporter = () => import("./p._slug-CeI5CBgv.mjs");
var FONTS = [
	"Druk-Wide",
	"NB-Architekt",
	"FKGroteskSemiMono"
].map((f) => ({
	rel: "stylesheet",
	href: `/cdn/shop/t/75/assets/${f}.css`
}));
var Route = createFileRoute("/p/$slug")({
	head: () => ({
		meta: [
			{ title: "AnnR" },
			{
				name: "description",
				content: "AnnR streetwear."
			},
			{
				property: "og:title",
				content: "AnnR"
			},
			{
				property: "og:description",
				content: "AnnR streetwear."
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary"
			}
		],
		links: FONTS
	}),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
