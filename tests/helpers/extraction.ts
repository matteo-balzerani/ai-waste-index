import * as http from "node:http";
import * as net from "node:net";
import * as tls from "node:tls";
import type { AddressInfo } from "node:net";
import { vi } from "vitest";
import type { SocketConnectors } from "@/server/extraction/transport";

export const extractionEnvironment = {
  APP_ENV: "local-demo",
  NODE_ENV: "test",
  MAX_ANALYSIS_TEXT_CHARS: "2000",
  MAX_REQUEST_BODY_BYTES: "30000",
  REQUEST_BODY_TIMEOUT_MS: "40",
  MAX_URL_CHARS: "1024",
  MAX_URL_RESPONSE_BYTES: "200000",
  MAX_URL_DECODED_BYTES: "200000",
  MAX_URL_RESPONSE_HEADER_BYTES: "2048",
  URL_CONNECT_TIMEOUT_MS: "500",
  URL_FETCH_TIMEOUT_MS: "3000",
  URL_MAX_REDIRECTS: "3",
};
export const publicAddress = "93.184.216.34";
export const testUrl = "http://content.example.com/article";
export const articleText =
  "A readable public article about a local demonstration. This paragraph contains enough ordinary text to exercise extraction without depending on a live website.";
export const articleHtml = `<html><head><title>Example article</title></head><body><nav>Navigation link</nav><article><h1>Example article</h1><p>${articleText}</p><p>Another paragraph describes the content in plain text for review.</p></article><script>throw new Error('must never run')</script></body></html>`;

// Test-only virtual network: capture the real connector target selected by the
// production policy, then map that public address to a local fixture server.
// Production never receives these dependencies, DNS overrides, or loopback exceptions.
export async function fixtureServer(handler: http.RequestListener) {
  const server = http.createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  const targets: string[] = [];
  const sockets: SocketConnectors = {
    tcp: vi.fn((options: net.NetConnectOpts) => {
      const host = "host" in options ? options.host! : "";
      targets.push(host);
      const socket = net.connect({ host: "127.0.0.1", port });
      Object.defineProperty(socket, "remoteAddress", { get: () => host });
      return socket;
    }),
    tls: vi.fn((options: tls.ConnectionOptions) => tls.connect(options)),
  };
  return {
    server,
    port,
    targets,
    sockets,
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}
