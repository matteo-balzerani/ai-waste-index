// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import * as net from "node:net";
import * as tls from "node:tls";
import { loadExtractionConfig } from "@/server/extraction/config";
import { extractText } from "@/server/extraction/extract";
import { createExtractionHandler } from "@/server/extraction/handler";
import { connectPinned } from "@/server/extraction/transport";
import { POST } from "@/app/api/extract-url/route";
import {
  extractionEnvironment as env,
  fixtureServer,
  publicAddress,
  testUrl,
  articleHtml,
  articleText,
} from "./helpers/extraction";

const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanups.splice(0)) await close();
});
async function serve(handler: Parameters<typeof fixtureServer>[0]) {
  const fixture = await fixtureServer(handler);
  cleanups.push(fixture.close);
  return fixture;
}
const signal = () => new AbortController().signal;
const config = (overrides: Partial<typeof env> = {}) =>
  loadExtractionConfig({ ...env, ...overrides });
const request = (
  body: unknown = { url: testUrl },
  headers: Record<string, string> = {},
) =>
  new Request("http://127.0.0.1/api/extract-url", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
async function checkError(response: Response, status: number, code: string) {
  expect(response.status).toBe(status);
  expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
  expect(response.headers.get("pragma")).toBe("no-cache");
  expect(await response.json()).toEqual({ error: { code } });
}

describe("pinned URL extraction with real HTTP fixture sockets", () => {
  it("extracts inert HTML through the route with confirmation, no forwarded secrets and no logs", async () => {
    let received: Record<string, unknown> = {};
    const fixture = await serve((req, res) => {
      received = req.headers;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(articleHtml);
    });
    const logs = [
      vi.spyOn(console, "log"),
      vi.spyOn(console, "warn"),
      vi.spyOn(console, "error"),
    ];
    const resolve = vi.fn().mockResolvedValue([publicAddress]);
    const response = await createExtractionHandler({
      environment: env,
      resolve,
      sockets: fixture.sockets,
    })(
      request(undefined, {
        Cookie: "private-cookie",
        Authorization: "private-authorization",
        "X-Estimator-Key": "private-key",
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(await response.json()).toEqual({
      text: expect.stringContaining(articleText),
      requiresConfirmation: true,
      warnings: ["EXTRACTION_CONFIRMATION_REQUIRED"],
    });
    expect(received.host).toBe("content.example.com");
    expect(received["accept-encoding"]).toBe("identity");
    for (const key of ["cookie", "authorization", "x-estimator-key"])
      expect(received[key]).toBeUndefined();
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(fixture.targets).toEqual([publicAddress]);
    for (const log of logs) expect(log).not.toHaveBeenCalled();
  });

  it("does not repeat DNS during connection: rebinding cannot change the dialed IP", async () => {
    const fixture = await serve((_req, res) => {
      res.setHeader("Content-Type", "text/plain");
      res.end("Public page");
    });
    const resolve = vi
      .fn()
      .mockResolvedValueOnce([publicAddress])
      .mockResolvedValue(["127.0.0.1"]);
    expect(
      await extractText(testUrl, config(), signal(), {
        resolve,
        sockets: fixture.sockets,
      }),
    ).toBe("Public page");
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(fixture.targets).toEqual([publicAddress]);
  });

  it("revalidates and pins every redirect while sharing byte budgets", async () => {
    const fixture = await serve((req, res) => {
      if (req.url === "/article") {
        res.writeHead(302, { Location: "http://other.example.com/final" });
        res.end("redirect-body");
      } else {
        res.setHeader("Content-Type", "text/plain");
        res.end("Final page");
      }
    });
    const resolve = vi
      .fn()
      .mockResolvedValueOnce([publicAddress])
      .mockResolvedValueOnce(["1.1.1.1"])
      .mockResolvedValue(["10.0.0.1"]);
    expect(
      await extractText(testUrl, config(), signal(), {
        resolve,
        sockets: fixture.sockets,
      }),
    ).toBe("Final page");
    expect(resolve.mock.calls.map(([host]) => host)).toEqual([
      "content.example.com",
      "other.example.com",
    ]);
    expect(fixture.targets).toEqual([publicAddress, "1.1.1.1"]);
  });

  it.each([
    "http://127.0.0.1/private",
    "http://[::1]/private",
    "file:///private",
    "http://user:pass@example.com",
  ])(
    "blocks an unsafe redirect %s before a second connection",
    async (location) => {
      const fixture = await serve((_req, res) => {
        res.writeHead(302, { Location: location });
        res.end();
      });
      const parse = vi.fn();
      await expect(
        extractText(testUrl, config(), signal(), {
          resolve: async () => [publicAddress],
          sockets: fixture.sockets,
          parse,
        }),
      ).rejects.toMatchObject({ code: "URL_BLOCKED" });
      expect(fixture.targets).toEqual([publicAddress]);
      expect(parse).not.toHaveBeenCalled();
    },
  );

  it("blocks a redirect hostname that now resolves privately, without connecting", async () => {
    const fixture = await serve((_req, res) => {
      res.writeHead(302, { Location: "/second" });
      res.end();
    });
    const resolve = vi
      .fn()
      .mockResolvedValueOnce([publicAddress])
      .mockResolvedValueOnce(["169.254.169.254"]);
    await expect(
      extractText(testUrl, config(), signal(), {
        resolve,
        sockets: fixture.sockets,
      }),
    ).rejects.toMatchObject({ code: "URL_BLOCKED" });
    expect(fixture.targets).toEqual([publicAddress]);
  });

  it.each([["10.0.0.1"], [publicAddress, "127.0.0.1"], ["::ffff:127.0.0.1"]])(
    "never dials unsafe or mixed DNS answers %j",
    async (...addresses) => {
      const fixture = await serve((_req, res) => res.end());
      await expect(
        extractText(testUrl, config(), signal(), {
          resolve: async () => addresses,
          sockets: fixture.sockets,
        }),
      ).rejects.toMatchObject({ code: "URL_BLOCKED" });
      expect(fixture.targets).toEqual([]);
    },
  );

  it("checks the actual peer before sending HTTP bytes", async () => {
    const received = vi.fn();
    const fixture = await serve(received);
    const socket = net.connect({ host: "127.0.0.1", port: fixture.port });
    await expect(
      connectPinned(new URL(testUrl), publicAddress, signal(), {
        tcp: () => socket,
        tls: (options) => tls.connect(options),
      }),
    ).rejects.toMatchObject({ code: "URL_BLOCKED" });
    expect(socket.destroyed).toBe(true);
    expect(received).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    "rejects oversized body with/without Content-Length (%s)",
    async (declared) => {
      let closed!: () => void;
      const closure = new Promise<void>((resolve) => {
        closed = resolve;
      });
      const fixture = await serve((_req, res) => {
        res.on("close", closed);
        res.setHeader("Content-Type", "text/plain");
        if (declared) res.setHeader("Content-Length", "1000");
        res.write("x".repeat(150));
      });
      await expect(
        extractText(
          testUrl,
          config({ MAX_URL_RESPONSE_BYTES: "100" }),
          signal(),
          { resolve: async () => [publicAddress], sockets: fixture.sockets },
        ),
      ).rejects.toMatchObject({ code: "INPUT_TOO_LARGE" });
      await closure;
    },
  );

  it("counts raw response bytes before a misleading short Content-Length can hide them", async () => {
    const fixture = await serve((_req, res) => {
      res.writeHead(200, {
        "Content-Type": "text/plain",
        "Content-Length": "1",
      });
      res.end("x".repeat(4096));
    });
    await expect(
      extractText(
        testUrl,
        config({ MAX_URL_RESPONSE_BYTES: "100" }),
        signal(),
        { resolve: async () => [publicAddress], sockets: fixture.sockets },
      ),
    ).rejects.toMatchObject({ code: "INPUT_TOO_LARGE" });
  });

  it("enforces decoded-byte limit even for identity responses", async () => {
    const fixture = await serve((_req, res) => {
      res.setHeader("Content-Type", "text/plain");
      res.end("x".repeat(50));
    });
    await expect(
      extractText(testUrl, config({ MAX_URL_DECODED_BYTES: "40" }), signal(), {
        resolve: async () => [publicAddress],
        sockets: fixture.sockets,
      }),
    ).rejects.toMatchObject({ code: "INPUT_TOO_LARGE" });
  });

  it("does not reset byte limits across redirect bodies", async () => {
    const fixture = await serve((req, res) => {
      if (req.url === "/article") res.writeHead(302, { Location: "/final" });
      else res.setHeader("Content-Type", "text/plain");
      res.end("x".repeat(60));
    });
    await expect(
      extractText(
        testUrl,
        config({ MAX_URL_RESPONSE_BYTES: "100" }),
        signal(),
        { resolve: async () => [publicAddress], sockets: fixture.sockets },
      ),
    ).rejects.toMatchObject({ code: "INPUT_TOO_LARGE" });
    expect(fixture.targets).toHaveLength(2);
  });

  it.each(["gzip", "br", "deflate", "unknown"])(
    "rejects encoded responses before decompression (%s)",
    async (encoding) => {
      const fixture = await serve((_req, res) => {
        res.writeHead(200, {
          "Content-Type": "text/html",
          "Content-Encoding": encoding,
        });
        res.end("compressed-body");
      });
      const parse = vi.fn();
      await expect(
        extractText(testUrl, config(), signal(), {
          resolve: async () => [publicAddress],
          sockets: fixture.sockets,
          parse,
        }),
      ).rejects.toMatchObject({ code: "EXTRACTION_FAILED" });
      expect(parse).not.toHaveBeenCalled();
    },
  );

  it("rejects oversized headers", async () => {
    const fixture = await serve((_req, res) => {
      res.writeHead(200, {
        "Content-Type": "text/plain",
        "X-Oversize": "a".repeat(4096),
      });
      res.end("text");
    });
    await expect(
      extractText(testUrl, config(), signal(), {
        resolve: async () => [publicAddress],
        sockets: fixture.sockets,
      }),
    ).rejects.toMatchObject({ code: "URL_FETCH_FAILED" });
  });

  it.each(["loop", "excess"])("bounds redirects (%s)", async (kind) => {
    let count = 0;
    const fixture = await serve((_req, res) => {
      res.writeHead(302, {
        Location: kind === "loop" ? testUrl : `/hop${++count}`,
      });
      res.end();
    });
    await expect(
      extractText(testUrl, config({ URL_MAX_REDIRECTS: "1" }), signal(), {
        resolve: async () => [publicAddress],
        sockets: fixture.sockets,
      }),
    ).rejects.toMatchObject({ code: "URL_FETCH_FAILED" });
    expect(fixture.targets).toHaveLength(kind === "loop" ? 1 : 2);
  });

  it("cancels slow DNS at the connection deadline before any socket", async () => {
    const sockets = { tcp: vi.fn(), tls: vi.fn() };
    let cancelled = false;
    const resolve = (_host: string, abort: AbortSignal) =>
      new Promise<string[]>((_done, reject) =>
        abort.addEventListener(
          "abort",
          () => {
            cancelled = true;
            reject(new Error());
          },
          { once: true },
        ),
      );
    await expect(
      extractText(testUrl, config({ URL_CONNECT_TIMEOUT_MS: "30" }), signal(), {
        resolve,
        sockets,
      }),
    ).rejects.toMatchObject({ code: "URL_FETCH_FAILED" });
    expect(cancelled).toBe(true);
    expect(sockets.tcp).not.toHaveBeenCalled();
  });

  it("destroys a connection that never completes TCP setup", async () => {
    const socket = new net.Socket();
    await expect(
      extractText(testUrl, config({ URL_CONNECT_TIMEOUT_MS: "30" }), signal(), {
        resolve: async () => [publicAddress],
        sockets: { tcp: () => socket, tls: (options) => tls.connect(options) },
      }),
    ).rejects.toMatchObject({ code: "URL_FETCH_FAILED" });
    expect(socket.destroyed).toBe(true);
  });

  it("destroys an actual stalled TLS handshake at the connection deadline", async () => {
    const peers: net.Socket[] = [];
    const server = net.createServer((socket) => {
      peers.push(socket);
    });
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
    cleanups.push(async () => {
      for (const peer of peers) peer.destroy();
      await new Promise<void>((done) => server.close(() => done()));
    });
    const port = (server.address() as net.AddressInfo).port;
    let client!: tls.TLSSocket;
    await expect(
      extractText(
        "https://content.example.com/",
        config({ URL_CONNECT_TIMEOUT_MS: "100" }),
        signal(),
        {
          resolve: async () => [publicAddress],
          sockets: {
            tcp: (options) => net.connect(options),
            tls: (options) => {
              expect(options.host).toBe(publicAddress);
              expect(options.servername).toBe("content.example.com");
              expect(options.rejectUnauthorized).toBe(true);
              client = tls.connect({ ...options, host: "127.0.0.1", port });
              return client;
            },
          },
        },
      ),
    ).rejects.toMatchObject({ code: "URL_FETCH_FAILED" });
    expect(client.destroyed).toBe(true);
  });

  it.each(["deadline", "caller"])(
    "stops an actual trickling response on %s",
    async (reason) => {
      let closed!: () => void;
      const closure = new Promise<void>((resolve) => {
        closed = resolve;
      });
      const controller = new AbortController();
      const fixture = await serve((_req, res) => {
        res.setHeader("Content-Type", "text/plain");
        res.write("part");
        const timer = setInterval(() => res.write("part"), 5);
        res.once("close", () => {
          clearInterval(timer);
          closed();
        });
        if (reason === "caller") setTimeout(() => controller.abort(), 20);
      });
      await expect(
        extractText(
          testUrl,
          config({ URL_CONNECT_TIMEOUT_MS: "80", URL_FETCH_TIMEOUT_MS: "100" }),
          controller.signal,
          { resolve: async () => [publicAddress], sockets: fixture.sockets },
        ),
      ).rejects.toMatchObject({ code: "URL_FETCH_FAILED" });
      await closure;
    },
  );

  it("uses one total deadline across redirects", async () => {
    let count = 0;
    const fixture = await serve((_req, res) => {
      const timer = setTimeout(() => {
        res.writeHead(302, { Location: `/hop${++count}` });
        res.end();
      }, 45);
      res.on("close", () => clearTimeout(timer));
    });
    await expect(
      extractText(
        testUrl,
        config({
          URL_CONNECT_TIMEOUT_MS: "100",
          URL_FETCH_TIMEOUT_MS: "110",
          URL_MAX_REDIRECTS: "20",
        }),
        signal(),
        { resolve: async () => [publicAddress], sockets: fixture.sockets },
      ),
    ).rejects.toMatchObject({ code: "URL_FETCH_FAILED" });
    expect(fixture.targets.length).toBeLessThanOrEqual(3);
  });

  it.each(["production", "staging", "", undefined])(
    "denies %s before DNS/parser/estimator or store work",
    async (nodeEnv) => {
      const resolve = vi.fn();
      const parse = vi.fn();
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      const response = await createExtractionHandler({
        environment: { ...env, NODE_ENV: nodeEnv },
        resolve,
        parse,
      })(request());
      await checkError(response, 503, "GUARD_UNAVAILABLE");
      expect(resolve).not.toHaveBeenCalled();
      expect(parse).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it("requires the explicit demo opt-in and guards the exported route", async () => {
    await checkError(
      await createExtractionHandler({
        environment: { ...env, APP_ENV: undefined },
      })(request()),
      503,
      "GUARD_UNAVAILABLE",
    );
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ENV", "local-demo");
    await checkError(await POST(request()), 503, "GUARD_UNAVAILABLE");
  });
  it.each([
    [{ url: "nonsense" }, 400, "INVALID_INPUT"],
    [{ url: testUrl, locale: "en" }, 400, "INVALID_INPUT"],
    [{ url: "http://127.0.0.1" }, 403, "URL_BLOCKED"],
    [{ url: "ftp://example.com" }, 403, "URL_BLOCKED"],
    [{ url: testUrl + "a".repeat(1024) }, 413, "INPUT_TOO_LARGE"],
  ] as const)("safe route input error %#", async (body, status, code) => {
    const resolve = vi.fn();
    await checkError(
      await createExtractionHandler({ environment: env, resolve })(
        request(body),
      ),
      status,
      code,
    );
    expect(resolve).not.toHaveBeenCalled();
  });
  it("returns safe errors for unsupported request encoding and oversized/slow bodies", async () => {
    const resolve = vi.fn();
    const handle = createExtractionHandler({ environment: env, resolve });
    await checkError(
      await handle(request(undefined, { "Content-Encoding": "gzip" })),
      400,
      "INVALID_INPUT",
    );
    await checkError(
      await handle(request(undefined, { "Content-Length": "999999" })),
      413,
      "INPUT_TOO_LARGE",
    );
    const cancel = vi.fn();
    const slow = new Request("http://127.0.0.1/api/extract-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: new ReadableStream({ cancel }),
      duplex: "half",
    } as RequestInit);
    await checkError(await handle(slow), 408, "REQUEST_TIMEOUT");
    expect(cancel).toHaveBeenCalled();
    expect(resolve).not.toHaveBeenCalled();
  });

  it("does not depend on analysis/estimator configuration and rejects missing extraction config", async () => {
    const resolve = vi.fn();
    await checkError(
      await createExtractionHandler({
        environment: { ...env, MAX_URL_RESPONSE_BYTES: undefined },
        resolve,
      })(request()),
      500,
      "INTERNAL_ERROR",
    );
    expect(resolve).not.toHaveBeenCalled();
  });
});
