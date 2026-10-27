// Backend connection status. The app stays "Not connected" until a real database is configured.
// No database client is created here on purpose: connect it only after the SQL in database/sql
// has been run and verified (database/README.md). Never read a secret key in browser code.
export type BackendStatus = "not_connected" | "configured_unverified";

export function backendStatus(): BackendStatus {
  const env = import.meta.env as Record<string, string | undefined>;
  const url = env["VITE_SUPABASE_URL"], key = env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key || /REPLACE|YOUR-PROJECT/.test(url + key)) return "not_connected";
  return "configured_unverified";
}

// Guard: a privileged key in browser env is a critical leak.
export function leakedSecretInBrowserEnv(): string[] {
  const env = import.meta.env as Record<string, unknown>;
  return Object.entries(env).filter(([, v]) => typeof v === "string" && (/^sb_secret_/.test(v) || /service_role/.test(v))).map(([k]) => k);
}
