// @vitest-environment node

import { randomBytes } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AnalyzeRequest } from "@/contracts";
import {
  createEstimatorClient,
  EstimatorClientError,
  type EstimatorClientConfig,
} from "@/server/estimator";

const config: EstimatorClientConfig = {
  baseUrl: "https://estimator.example.test",
  apiKey: "k".repeat(32),
  timeoutMs: 1000,
  maxResponseBytes: 4096,
  maxTextCodePoints: 100,
};

const request: AnalyzeRequest = {
  sourceType: "text",
  text: "Confirmed visible text",
  locale: "en",
};

// Arbitrary wire-shape fixture only; it encodes no methodological relationship.
const estimatorResponse = {
  schemaVersion: "1.0",
  methodologyVersion: "contract-test-v1",
  score: 42,
  class: "C",
  estimates: {
    energyWh: { low: 0, value: 1, high: 2 },
    co2eGrams: { low: 3, value: 3, high: 5 },
    waterMl: { low: 8, value: 13, high: 21 },
  },
} as const;

const requiredHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json",
  Pragma: "no-cache",
} as const;

function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...requiredHeaders, ...headers },
  });
}

function expectClientError(
  code: EstimatorClientError["code"],
  status: EstimatorClientError["status"],
) {
  return expect.objectContaining({ code, status });
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("server-only estimator client", () => {
  it.each(
    [301, 302, 303, 307, 308].flatMap((status) =>
      [false, true].map((crossOrigin) => ({ status, crossOrigin })),
    ),
  )("rejects HTTP $status redirects (cross-origin: $crossOrigin) without a second request", async ({ status, crossOrigin }) => {
    let initialRequests = 0;
    let redirectedRequests = 0;
    const destination = createServer((incoming, response) => {
      redirectedRequests++;
      incoming.resume();
      response.writeHead(500, requiredHeaders).end("{}");
    });
    const listen = async (server: Server) => {
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    };
    const close = async (server: Server) => {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    };
    const destinationUrl = await listen(destination);
    const source = createServer((incoming, response) => {
      incoming.resume();
      if (incoming.url !== "/internal/v1/estimate") {
        redirectedRequests++;
        response.writeHead(500, requiredHeaders).end("{}");
        return;
      }
      initialRequests++;
      response.writeHead(status, {
        Location: crossOrigin ? `${destinationUrl}/redirected` : "/redirected",
      }).end();
    });
    try {
      const baseUrl = await listen(source);
      const client = createEstimatorClient({
        ...config,
        baseUrl,
        apiKey: randomBytes(32).toString("hex"),
      });
      await expect(client.estimate(request)).rejects.toMatchObject(
        expectClientError("ESTIMATOR_UNAVAILABLE", 503),
      );
      expect(initialRequests).toBe(1);
      // Inspect actual HTTP arrivals, not mocked fetch calls: neither text nor
      // credentials may be sent to a redirected destination, even on this origin.
      expect(redirectedRequests).toBe(0);
    } finally {
      await close(source);
      await close(destination);
    }
  });

  it("sends one authenticated no-store request and returns only the public result", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const fetchImplementation: typeof fetch = async (input, init) => {
      calls.push({ input, init });
      return jsonResponse(estimatorResponse);
    };
    const client = createEstimatorClient(config, { fetch: fetchImplementation });

    await expect(client.estimate(request)).resolves.toEqual({
      methodologyVersion: estimatorResponse.methodologyVersion,
      score: estimatorResponse.score,
      class: estimatorResponse.class,
      estimates: estimatorResponse.estimates,
    });

    expect(calls).toHaveLength(1);
    expect(String(calls[0]?.input)).toBe(
      "https://estimator.example.test/internal/v1/estimate",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[0]?.init?.cache).toBe("no-store");
    expect(new Headers(calls[0]?.init?.headers).get("X-Estimator-Key")).toBe(
      config.apiKey,
    );
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      schemaVersion: "1.0",
      ...request,
    });
  });

  it.each([
    [400, "INVALID_REQUEST", "INVALID_INPUT", 400],
    [413, "TEXT_TOO_LARGE", "INPUT_TOO_LARGE", 413],
    [422, "ESTIMATE_OUT_OF_DOMAIN", "ESTIMATE_OUT_OF_DOMAIN", 422],
    [401, "UNAUTHORIZED", "ESTIMATOR_UNAVAILABLE", 503],
    [408, "REQUEST_TIMEOUT", "ESTIMATOR_UNAVAILABLE", 503],
    [500, "INTERNAL_ERROR", "ESTIMATOR_UNAVAILABLE", 503],
    [503, "ESTIMATOR_NOT_READY", "ESTIMATOR_UNAVAILABLE", 503],
  ] as const)(
    "maps estimator %i %s to public %s",
    async (upstreamStatus, upstreamCode, publicCode, publicStatus) => {
      let calls = 0;
      const client = createEstimatorClient(config, {
        fetch: async () => {
          calls += 1;
          return jsonResponse({ error: { code: upstreamCode } }, upstreamStatus);
        },
      });

      await expect(client.estimate(request)).rejects.toMatchObject(
        expectClientError(publicCode, publicStatus),
      );
      expect(calls).toBe(1);
    },
  );

  it("rejects invalid local input before any network call", async () => {
    let calls = 0;
    const client = createEstimatorClient(
      { ...config, maxTextCodePoints: 2 },
      {
        fetch: async () => {
          calls += 1;
          return jsonResponse(estimatorResponse);
        },
      },
    );

    await expect(
      client.estimate({ ...request, text: "ABC" }),
    ).rejects.toMatchObject(expectClientError("INPUT_TOO_LARGE", 413));
    await expect(
      client.estimate({ ...request, text: " " }),
    ).rejects.toMatchObject(expectClientError("INVALID_INPUT", 400));
    expect(calls).toBe(0);
  });

  it.each([
    {
      name: "unordered bounds",
      response: () =>
        jsonResponse({
          ...estimatorResponse,
          estimates: {
            ...estimatorResponse.estimates,
            waterMl: { low: 8, value: 34, high: 21 },
          },
        }),
    },
    {
      name: "unknown response field",
      response: () => jsonResponse({ ...estimatorResponse, fallback: true }),
    },
    {
      name: "unknown schema version",
      response: () => jsonResponse({ ...estimatorResponse, schemaVersion: "2.0" }),
    },
    {
      name: "unknown error code",
      response: () => jsonResponse({ error: { code: "UNKNOWN" } }, 503),
    },
    {
      name: "unknown status",
      response: () => jsonResponse({ error: { code: "INTERNAL_ERROR" } }, 502),
    },
    {
      name: "invalid JSON",
      response: () => new Response("{", { status: 200, headers: requiredHeaders }),
    },
    {
      name: "invalid UTF-8",
      response: () =>
        new Response(Uint8Array.from([0xff]), {
          status: 200,
          headers: requiredHeaders,
        }),
    },
    {
      name: "wrong content type",
      response: () =>
        jsonResponse(estimatorResponse, 200, { "Content-Type": "text/plain" }),
    },
    {
      name: "missing no-store",
      response: () =>
        new Response(JSON.stringify(estimatorResponse), {
          status: 200,
          headers: { "Content-Type": "application/json", Pragma: "no-cache" },
        }),
    },
  ])("maps $name to a safe unavailable error", async ({ response }) => {
    let calls = 0;
    const client = createEstimatorClient(config, {
      fetch: async () => {
        calls += 1;
        return response();
      },
    });

    await expect(client.estimate(request)).rejects.toMatchObject(
      expectClientError("ESTIMATOR_UNAVAILABLE", 503),
    );
    expect(calls).toBe(1);
  });

  it("bounds response bytes before accepting the payload", async () => {
    const oversizedBody = JSON.stringify(estimatorResponse);
    const client = createEstimatorClient(
      { ...config, maxResponseBytes: 10 },
      { fetch: async () => new Response(oversizedBody, { headers: requiredHeaders }) },
    );

    await expect(client.estimate(request)).rejects.toMatchObject(
      expectClientError("ESTIMATOR_UNAVAILABLE", 503),
    );
  });

  it("rejects an excessive declared length before reading the stream", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      pull() {
        throw new Error("body must not be read");
      },
      cancel() {
        cancelled = true;
      },
    });
    const client = createEstimatorClient(
      { ...config, maxResponseBytes: 10 },
      {
        fetch: async () =>
          new Response(body, {
            headers: { ...requiredHeaders, "Content-Length": "11" },
          }),
      },
    );

    await expect(client.estimate(request)).rejects.toMatchObject(
      expectClientError("ESTIMATOR_UNAVAILABLE", 503),
    );
    expect(cancelled).toBe(true);
  });

  it("rejects an invalid declared length and cancels the stream", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true;
      },
    });
    const client = createEstimatorClient(config, {
      fetch: async () =>
        new Response(body, {
          headers: { ...requiredHeaders, "Content-Length": "not-a-number" },
        }),
    });

    await expect(client.estimate(request)).rejects.toMatchObject(
      expectClientError("ESTIMATOR_UNAVAILABLE", 503),
    );
    expect(cancelled).toBe(true);
  });

  it("aborts the fetch when the total timeout expires", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const client = createEstimatorClient(
      { ...config, timeoutMs: 20 },
      {
        fetch: async (_input, init) => {
          calls += 1;
          return await new Promise<Response>((_resolve, reject) => {
            const signal = init?.signal;
            if (signal?.aborted) {
              reject(new Error("aborted"));
              return;
            }
            signal?.addEventListener("abort", () => reject(new Error("aborted")), {
              once: true,
            });
          });
        },
      },
    );

    const pending = client.estimate(request);
    const rejection = expect(pending).rejects.toMatchObject(
      expectClientError("ESTIMATOR_UNAVAILABLE", 503),
    );
    await vi.advanceTimersByTimeAsync(20);

    await rejection;
    expect(calls).toBe(1);
  });

  it("propagates caller cancellation to the downstream fetch", async () => {
    const caller = new AbortController();
    let downstreamWasAborted = false;
    const client = createEstimatorClient(config, {
      fetch: async (_input, init) => {
        const downstreamSignal = init?.signal;
        return await new Promise<Response>((_resolve, reject) => {
          downstreamSignal?.addEventListener(
            "abort",
            () => {
              downstreamWasAborted = true;
              reject(new Error("aborted"));
            },
            { once: true },
          );
        });
      },
    });

    const pending = client.estimate(request, { signal: caller.signal });
    caller.abort();

    await expect(pending).rejects.toMatchObject(
      expectClientError("ESTIMATOR_UNAVAILABLE", 503),
    );
    expect(downstreamWasAborted).toBe(true);
  });

  it("does not log request, response or credential material", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const client = createEstimatorClient(config, {
      fetch: async () => jsonResponse(estimatorResponse),
    });

    await client.estimate(request);

    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
