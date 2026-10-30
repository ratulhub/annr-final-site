/**
 * Application runtime error reporter.
 * Safely logs boundary-caught errors in development and staging.
 */

function describeThrown(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function reportAppError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  console.error("[AnnR App Error]", describeThrown(error), {
    route: window.location.pathname,
    ...context,
  });
}
