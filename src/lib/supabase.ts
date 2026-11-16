import { createClient } from "@supabase/supabase-js";

const env =
  typeof import.meta !== "undefined" && import.meta.env
    ? (import.meta.env as Record<string, string | undefined>)
    : (process.env as Record<string, string | undefined>);

// A project URL and publishable key must be supplied by the deployment. Do not
// ship a fallback project: missing environment variables must never point the
// admin at somebody else's database.
const configuredUrl = env["VITE_SUPABASE_URL"]?.trim() || "";
const configuredPublishableKey = env["VITE_SUPABASE_PUBLISHABLE_KEY"]?.trim() || "";
const supabaseUrl = configuredUrl || "https://supabase-not-configured.invalid";
const supabasePublishableKey = configuredPublishableKey || "sb_publishable_not_configured";

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export function isSupabaseConfigured(): boolean {
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
