import { test, expect } from "@playwright/test";

for (const path of ["/api/analyze", "/api/extract-url"]) {
  test(`${path}: handler and framework responses prohibit caching`, async ({ request }) => {
    for (const method of ["GET", "HEAD", "PUT", "PATCH", "DELETE", "OPTIONS", "POST"]) {
      // Invalid POST input avoids downstream work in local demo and also allows
      // this HTTP-boundary regression to run against a guarded production build.
      const response = await request.fetch(path, {
        method,
        ...(method === "POST" ? { data: {} } : {}),
        maxRedirects: 0,
      });
      expect(response.headers()["cache-control"], method).toBe("no-store, max-age=0");
      expect(response.headers().pragma, method).toBe("no-cache");
      await response.dispose();
    }
  });
}
