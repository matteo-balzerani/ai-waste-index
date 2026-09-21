import "server-only";

import { AnalysisHttpError } from "./http";

// Replace this boundary with verified production admission in the deferred milestone.
// No counters or production fallback are implemented by the local demonstration.
export function admitLocalDemo(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): void {
  if (
    environment.APP_ENV !== "local-demo" ||
    (environment.NODE_ENV !== "development" && environment.NODE_ENV !== "test")
  ) {
    throw new AnalysisHttpError("GUARD_UNAVAILABLE", 503);
  }
}
