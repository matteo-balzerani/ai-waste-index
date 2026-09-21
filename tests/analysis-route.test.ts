// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAnalysisHandler } from "@/server/analysis/handler";
import { loadInputLimits } from "@/server/analysis/config";
import { POST } from "@/app/api/analyze/route";

const environment = {
  NODE_ENV: "test",
  APP_ENV: "local-demo",
  ESTIMATOR_BASE_URL: "http://127.0.0.1:8787",
  ESTIMATOR_API_KEY: "test-only-credential-abcdefghijklmnopqrstuvwxyz",
  ESTIMATOR_TIMEOUT_MS: "100",
  MAX_ESTIMATOR_RESPONSE_BYTES: "2048",
  MAX_ANALYSIS_TEXT_CHARS: "64",
  MAX_REQUEST_BODY_BYTES: "1024",
  REQUEST_BODY_TIMEOUT_MS: "30",
};
const input = { sourceType: "text", text: "A sample 👋", locale: "en" };
// Arbitrary wire fixture only; no assertion about scoring relationships.
const result = {
  schemaVersion: "1.0",
  methodologyVersion: "contract-test",
  score: 37,
  class: "B",
  estimates: {
    energyWh: { low: 1, value: 2, high: 3 },
    co2eGrams: { low: 0, value: 0, high: 0 },
    waterMl: { low: 2, value: 3, high: 5 },
  },
};
function upstream(body: unknown = result) {
  return Response.json(body, {
    headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" },
  });
}
function request(
  body = JSON.stringify(input),
  headers: Record<string, string> = {},
) {
  return new Request("http://127.0.0.1/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });
}
async function errorResponse(response: Response, status: number, code: string) {
  expect(response.status).toBe(status);
  expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
  expect(response.headers.get("pragma")).toBe("no-cache");
  expect(await response.json()).toEqual({ error: { code } });
}
afterEach(() => vi.useRealTimers());

describe("local analysis route", () => {
  it.each(["it", "en"])(
    "calls the estimator exactly once with unchanged %s input and no logging",
    async (locale) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(upstream());
      const logs = [
        vi.spyOn(console, "log"),
        vi.spyOn(console, "error"),
        vi.spyOn(console, "warn"),
      ];
      const response = await createAnalysisHandler({ environment, fetch })(
        request(JSON.stringify({ ...input, locale })),
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
      expect(response.headers.get("pragma")).toBe("no-cache");
      const publicResult = {
        score: result.score,
        class: result.class,
        methodologyVersion: result.methodologyVersion,
        estimates: result.estimates,
      };
      expect(await response.json()).toEqual(publicResult);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(JSON.parse(fetch.mock.calls[0]![1]!.body as string)).toEqual({
        ...input,
        locale,
        schemaVersion: "1.0",
      });
      for (const log of logs) expect(log).not.toHaveBeenCalled();
    },
  );

  it.each([
    { NODE_ENV: "production", APP_ENV: "local-demo" },
    { NODE_ENV: "development", APP_ENV: undefined },
    { NODE_ENV: "development", APP_ENV: "production" },
    { NODE_ENV: undefined, APP_ENV: "local-demo" },
    { NODE_ENV: "staging", APP_ENV: "local-demo" },
    { ESTIMATOR_BASE_URL: "https://example.com" },
  ])(
    "blocks downstream work outside explicit local demo: %j",
    async (override) => {
      const fetch = vi.fn<typeof globalThis.fetch>();
      await errorResponse(
        await createAnalysisHandler({
          environment: { ...environment, ...override },
          fetch,
        })(request()),
        503,
        "GUARD_UNAVAILABLE",
      );
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("the exported POST route reads its environment at runtime and blocks production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ENV", "local-demo");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await errorResponse(await POST(request()), 503, "GUARD_UNAVAILABLE");
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ["{", {}, 400, "INVALID_INPUT"],
    [JSON.stringify({ ...input, text: " " }), {}, 400, "INVALID_INPUT"],
    [JSON.stringify({ ...input, text: "\ud800" }), {}, 400, "INVALID_INPUT"],
    [
      JSON.stringify({ ...input, text: "👋".repeat(65) }),
      {},
      413,
      "INPUT_TOO_LARGE",
    ],
    [JSON.stringify({ ...input, extra: "secret" }), {}, 400, "INVALID_INPUT"],
    [
      JSON.stringify(input),
      { "Content-Type": "text/plain" },
      400,
      "INVALID_INPUT",
    ],
    [
      JSON.stringify(input),
      { "Content-Encoding": "gzip" },
      400,
      "INVALID_INPUT",
    ],
    [
      JSON.stringify(input),
      { "Content-Length": "5000" },
      413,
      "INPUT_TOO_LARGE",
    ],
    [JSON.stringify(input), { "Content-Length": "no" }, 400, "INVALID_INPUT"],
    [JSON.stringify(input), { "Content-Length": "1" }, 400, "INVALID_INPUT"],
    ["x".repeat(1025), {}, 413, "INPUT_TOO_LARGE"],
  ] as const)(
    "rejects invalid input safely %#",
    async (body, headers, status, code) => {
      const fetch = vi.fn<typeof globalThis.fetch>();
      await errorResponse(
        await createAnalysisHandler({ environment, fetch })(
          request(body, headers),
        ),
        status,
        code,
      );
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("accepts escaped Unicode at the code-point limit", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(upstream());
    const body =
      '{"text":"' +
      "\\ud83d\\udc4b".repeat(64) +
      '","sourceType":"text","locale":"en"}';
    expect(
      (await createAnalysisHandler({ environment, fetch })(request(body)))
        .status,
    ).toBe(200);
  });

  it("bounds chunked input despite a misleading short Content-Length and cancels the stream", async () => {
    const cancel = vi.fn();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(600));
        controller.enqueue(new Uint8Array(600));
      },
      cancel,
    });
    const req = new Request("http://127.0.0.1/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": "1" },
      body,
      duplex: "half",
    } as RequestInit);
    const fetch = vi.fn<typeof globalThis.fetch>();
    await errorResponse(
      await createAnalysisHandler({ environment, fetch })(req),
      413,
      "INPUT_TOO_LARGE",
    );
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("times out slow bodies and actually cancels receipt", async () => {
    const cancel = vi.fn();
    const req = new Request("http://127.0.0.1/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: new ReadableStream({ cancel }),
      duplex: "half",
    } as RequestInit);
    const fetch = vi.fn<typeof globalThis.fetch>();
    await errorResponse(
      await createAnalysisHandler({ environment, fetch })(req),
      408,
      "REQUEST_TIMEOUT",
    );
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("propagates client disconnect to the estimator without retry", async () => {
    const controller = new AbortController();
    let signal: AbortSignal | undefined;
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async (_url, options) => {
        signal = options!.signal!;
        controller.abort();
        signal.throwIfAborted();
        return upstream();
      });
    const req = new Request(request(), { signal: controller.signal });
    await errorResponse(
      await createAnalysisHandler({ environment, fetch })(req),
      503,
      "ESTIMATOR_UNAVAILABLE",
    );
    expect(signal?.aborted).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("rejects unordered upstream metrics without repair or disclosure", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        upstream({
          ...result,
          estimates: {
            ...result.estimates,
            energyWh: { low: 10, value: 2, high: 3 },
          },
        }),
      );
    await errorResponse(
      await createAnalysisHandler({ environment, fetch })(request()),
      503,
      "ESTIMATOR_UNAVAILABLE",
    );
  });

  it("maps transport failure safely", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValue(new Error("private details"));
    await errorResponse(
      await createAnalysisHandler({ environment, fetch })(request()),
      503,
      "ESTIMATOR_UNAVAILABLE",
    );
  });

  it.each([undefined, "", "0", "-1", "NaN", "1.5", "999999999999999999999999"])(
    "rejects invalid mandatory resource configuration %s",
    (value) => {
      for (const name of [
        "MAX_ANALYSIS_TEXT_CHARS",
        "MAX_REQUEST_BODY_BYTES",
        "REQUEST_BODY_TIMEOUT_MS",
      ]) {
        expect(() =>
          loadInputLimits({ ...environment, [name]: value }),
        ).toThrow("INVALID_INPUT_CONFIGURATION");
      }
    },
  );
  it("rejects inconsistent byte capacity and oversized timers", async () => {
    expect(() =>
      loadInputLimits({ ...environment, MAX_REQUEST_BODY_BYTES: "100" }),
    ).toThrow();
    expect(() =>
      loadInputLimits({
        ...environment,
        REQUEST_BODY_TIMEOUT_MS: "2147483648",
      }),
    ).toThrow();
    const fetch = vi.fn<typeof globalThis.fetch>();
    await errorResponse(
      await createAnalysisHandler({
        environment: { ...environment, MAX_REQUEST_BODY_BYTES: "0" },
        fetch,
      })(request()),
      500,
      "INTERNAL_ERROR",
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
