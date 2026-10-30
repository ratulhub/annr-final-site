import { createClient } from "@supabase/supabase-js";

const env =
  typeof import.meta !== "undefined" && import.meta.env
    ? (import.meta.env as Record<string, string | undefined>)
    : (process.env as Record<string, string | undefined>);

const supabaseUrl =
  env["VITE_SUPABASE_URL"] || "https://aooydxydkyjtulhduexa.supabase.co";
const supabasePublishableKey =
  env["VITE_SUPABASE_PUBLISHABLE_KEY"] || "sb_publishable_rWZ3_sO_15nX-jMpRMrnng_CrRhuJK5";

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export function isSupabaseConfigured(): boolean {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabasePublishableKey) &&
    !supabaseUrl.includes("REPLACE") &&
    !supabasePublishableKey.includes("REPLACE")
  );
}
