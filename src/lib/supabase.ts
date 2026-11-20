import { createClient } from "@supabase/supabase-js";

const env =
  typeof import.meta !== "undefined" && import.meta.env
    ? (import.meta.env as Record<string, string | undefined>)
    : (process.env as Record<string, string | undefined>);

// These are public client connection values for AnnR's own project, not a
// service-role secret. They are also used by the static storefront to read
// published catalog data. Cloudflare's build-variable UI can omit Vite values
// from a Git build, so retain this project-scoped public fallback. Writes still
// require a real Supabase Auth session and are enforced by database RLS.
const PUBLIC_PROJECT_URL = "https://aooydxydkyjtulhduexa.supabase.co";
const PUBLIC_PROJECT_KEY = "sb_publishable_rWZ3_sO_15nX-jMpRMrnng_CrRhuJK5";
const configuredUrl = env["VITE_SUPABASE_URL"]?.trim() || PUBLIC_PROJECT_URL;
const configuredPublishableKey =
  env["VITE_SUPABASE_PUBLISHABLE_KEY"]?.trim() || PUBLIC_PROJECT_KEY;
export const supabaseUrl = configuredUrl;
export const supabasePublishableKey = configuredPublishableKey;

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export function isSupabaseConfigured(): boolean {
  const isVitest =
    Boolean(env["VITEST"]) ||
    env["MODE"] === "test" ||
    (typeof process !== "undefined" && Boolean(process.env?.["VITEST"]));
  if (isVitest) return false;
  let validUrl = false;
  try {
    const parsed = new URL(configuredUrl);
    validUrl = parsed.protocol === "https:" && parsed.hostname.endsWith(".supabase.co");
  } catch {
    validUrl = false;
  }
  return (
    validUrl &&
    Boolean(configuredPublishableKey) &&
    !/REPLACE|YOUR-PROJECT/i.test(configuredUrl + configuredPublishableKey) &&
    /^sb_publishable_[A-Za-z0-9_-]+$/.test(configuredPublishableKey)
  );
}
