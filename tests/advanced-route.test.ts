// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createAdvancedHandler } from "@/server/estimator/advanced";
import { advancedEnergySchema } from "@/contracts/advanced";
import { advancedCatalogFixture as catalog, advancedResultFixture as result } from "./helpers/advanced";

const environment = { NODE_ENV: "test", APP_ENV: "local-demo", ESTIMATOR_BASE_URL: "http://127.0.0.1:8787",
  ESTIMATOR_API_KEY: "test-only-credential-abcdefghijklmnopqrstuvwxyz", ESTIMATOR_TIMEOUT_MS: "100",
  MAX_ESTIMATOR_RESPONSE_BYTES: "2048", MAX_ANALYSIS_TEXT_CHARS: "64", MAX_REQUEST_BODY_BYTES: "1024",
  REQUEST_BODY_TIMEOUT_MS: "30" };
const headers = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" };
const input = { provider: "provider-a", model: "model-a", outputTokens: 500 };
const request = (body: unknown = input) => new Request("http://127.0.0.1/api/advanced/estimate", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});
const upstream = (body: unknown = { schemaVersion: "1.0", ...result }, status = 200) => Response.json(body, { status, headers });

describe("Advanced server boundary", () => {
  it("proxies only strict metadata, authenticates, disables redirects and preserves shape", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(upstream());
    const res = await createAdvancedHandler("estimate", { environment, fetch })(request());
    expect(res.status).toBe(200); expect(await res.json()).toEqual(result);
    expect(res.headers.get("cache-control")).toBe(headers["Cache-Control"]);
    const call = fetch.mock.calls[0]!; expect(String(call[0])).toBe("http://127.0.0.1:8787/internal/v1/advanced/estimate");
    expect(call[1]).toMatchObject({ redirect: "error", cache: "no-store", method: "POST" });
    expect(JSON.parse(call[1]!.body as string)).toEqual({ schemaVersion: "1.0", ...input });
  });
  it("proxies the catalog without calculation", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(upstream({ schemaVersion: "1.0", ...catalog }));
    const res = await createAdvancedHandler("models", { environment, fetch })(new Request("http://localhost/api/advanced/models"));
    expect(res.status).toBe(200); expect(await res.json()).toEqual(catalog);
    expect(fetch.mock.calls[0]![1]).toMatchObject({ method: "GET", body: undefined });
  });
  it.each([{ text: "local only" }, { outputTokens: true }, { outputTokens: 0 }, { outputTokens: 1.5 },
    { outputTokens: "500" }, { outputTokens: 1_000_001 }, { requestLatencySeconds: 0 },
    { requestLatencySeconds: null }, { requestLatencySeconds: 3601 }])("rejects malformed request %#", async change => {
    const fetch = vi.fn(); const res = await createAdvancedHandler("estimate", { environment, fetch })(request({ ...input, ...change }));
    expect(res.status).toBe(400); expect(fetch).not.toHaveBeenCalled();
  });
  it("enforces 4 KiB cap before upstream", async () => {
    const fetch = vi.fn(); const res = await createAdvancedHandler("estimate", { environment, fetch })(request({ ...input, text: "x".repeat(4096) }));
    expect(res.status).toBe(413); expect(fetch).not.toHaveBeenCalled();
  });
  it.each([{ NODE_ENV: "production" }, { APP_ENV: "other" }, { ESTIMATOR_BASE_URL: "https://remote.example" }])("fails closed outside local scope %#", async overrides => {
    const fetch = vi.fn(); const res = await createAdvancedHandler("estimate", { environment: { ...environment, ...overrides }, fetch })(request());
    expect(res.status).toBe(503); expect(await res.json()).toEqual({ error: { code: "GUARD_UNAVAILABLE" } });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    { ...result, energyWh: { kind: "range", low: 2, high: 1 } },
    { ...result, energyWh: { kind: "point", value: 0 } }, { ...result, warnings: ["unknown"] },
    { ...result, extra: 1 }, { ...result, durationSource: "declared" },
  ])("rejects malformed upstream output %#", async body => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(upstream({ schemaVersion: "1.0", ...body }));
    const res = await createAdvancedHandler("estimate", { environment, fetch })(request());
    expect(res.status).toBe(503); expect(await res.json()).toEqual({ error: { code: "ESTIMATOR_UNAVAILABLE" } });
  });
  it("preserves domain error and never retries", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(upstream({ error: { code: "ESTIMATE_OUT_OF_DOMAIN" } }, 422));
    const res = await createAdvancedHandler("estimate", { environment, fetch })(request());
    expect(res.status).toBe(422); expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("cancels oversized upstream response", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response("x".repeat(2049), { headers: { ...headers, "Content-Type": "application/json" } }));
    const res = await createAdvancedHandler("estimate", { environment, fetch })(request());
    expect(res.status).toBe(503); expect(fetch.mock.calls[0]![1]!.signal!.aborted).toBe(true);
  });
  it("rejects nonfinite numeric output at the schema boundary", () => {
    for (const value of [NaN, Infinity, -Infinity]) expect(advancedEnergySchema.safeParse({ kind: "point", value }).success).toBe(false);
  });
});
