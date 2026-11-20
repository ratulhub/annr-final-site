import { isSupabaseConfigured } from "./supabase";

export type BackendStatus = "not_connected" | "configured";

export function backendStatus(): BackendStatus {
  const url = import.meta.env["VITE_SUPABASE_URL"];
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (typeof url === "string" && url.startsWith("https://") && typeof key === "string" && key.length > 20) {
    return "configured";
  }
  if (url === "" || key === "") return "not_connected";
  return isSupabaseConfigured() ? "configured" : "not_connected";
}

// Guard test: ensures a service-role or secret key was never placed in a VITE_ variable (which ships to browsers).
export function leakedSecretInBrowserEnv(): string[] {
  const bad: string[] = [];
  for (const [k, v] of Object.entries(import.meta.env)) {
    if (/service_role|secret|private|postgres:\/\/|database_url/i.test(k)) bad.push(k);
    if (typeof v === "string" && /^sb_secret_|service_role/i.test(v)) bad.push(k);
  }
  return bad;
}
