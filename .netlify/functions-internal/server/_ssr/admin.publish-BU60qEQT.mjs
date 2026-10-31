import { _ as lazyRouteComponent, v as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { L as useAdmin, M as siteConfig, y as getPublished } from "./store-CNEGzpjs.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.publish-BU60qEQT.js
var $$splitComponentImporter = () => import("./admin.publish-D6VX1kl6.mjs");
var Route = createFileRoute("/admin/publish")({ component: lazyRouteComponent($$splitComponentImporter, "component") });
function useDirty() {
	const s = useAdmin();
	const pub = getPublished();
	if (!pub) return true;
	const { publishedAt: _a, ...cur } = siteConfig(s);
	const { publishedAt: _b, ...old } = pub;
	return JSON.stringify(cur) !== JSON.stringify(old);
}
//#endregion
export { useDirty as n, Route as t };
