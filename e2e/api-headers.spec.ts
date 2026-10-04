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
      if (method !== "POST") {
        expect(response.status(), method).toBe(method === "OPTIONS" ? 204 : 405);
        expect((await response.body()).byteLength, method).toBe(0);
        if (method === "OPTIONS") {
          expect(response.headers().allow?.split(",").map((value) => value.trim()).sort())
            .toEqual(["OPTIONS", "POST"]);
        }
      }
      await response.dispose();
    }
  });
}

for (const [path, supported] of [["/api/advanced/models", "GET"], ["/api/advanced/estimate", "POST"]]) {
  test(`${path}: every method prohibits caching`, async ({ request }) => {
    for (const method of ["GET", "HEAD", "PUT", "PATCH", "DELETE", "OPTIONS", "POST"]) {
      const response = await request.fetch(path!, { method, ...(method === "POST" ? { data: {} } : {}) });
      expect(response.headers()["cache-control"]).toBe("no-store, max-age=0");
      expect(response.headers().pragma).toBe("no-cache");
      if (method !== supported) {
        expect(response.status()).toBe(method === "OPTIONS" ? 204 : 405);
        expect((await response.body()).length).toBe(0);
      }
      if (method === "OPTIONS") expect(response.headers().allow?.split(",").map(v => v.trim()).sort()).toEqual([supported, "OPTIONS"].sort());
      await response.dispose();
    }
  });
}
