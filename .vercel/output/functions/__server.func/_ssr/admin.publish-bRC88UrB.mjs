import { _ as lazyRouteComponent, v as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { L as useAdmin, M as siteConfig, y as getPublished } from "./store-CG_wgU4l.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.publish-bRC88UrB.js
var $$splitComponentImporter = () => import("./admin.publish-DuiprMyd.mjs");
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
