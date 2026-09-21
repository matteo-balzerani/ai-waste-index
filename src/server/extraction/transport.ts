import "server-only";
import * as net from "node:net";
import * as tls from "node:tls";
import * as http from "node:http";
import * as https from "node:https";
import type { ExtractionConfig } from "./config";
import { blocked, extractionFailed, fetchFailed, tooLarge } from "./errors";
import { isPublicAddress, normalizeAddress } from "./url-safety";

export interface SocketConnectors {
  tcp: (options: net.NetConnectOpts) => net.Socket;
  tls: (options: tls.ConnectionOptions) => tls.TLSSocket;
}
const connectors: SocketConnectors = {
  tcp: (options) => net.connect(options),
  tls: (options) => tls.connect(options),
};

export function connectPinned(
  url: URL,
  address: string,
  signal: AbortSignal,
  sockets: SocketConnectors = connectors,
): Promise<net.Socket> {
  if (!isPublicAddress(address)) return Promise.reject(blocked());
  if (signal.aborted) return Promise.reject(fetchFailed());
  return new Promise((resolve, reject) => {
    const host = url.hostname.replace(/^\[|\]$/g, "");
    const secure = url.protocol === "https:";
    const options = {
      host: address,
      port: Number(url.port || (secure ? 443 : 80)),
      family: net.isIP(address),
    };
    const socket = secure
      ? sockets.tls({
          ...options,
          servername: net.isIP(host) ? undefined : host,
          rejectUnauthorized: true,
          ALPNProtocols: ["http/1.1"],
          checkServerIdentity: (_name, certificate) =>
            tls.checkServerIdentity(host, certificate),
        })
      : sockets.tcp(options);
    const fail = () => {
      cleanup();
      socket.destroy();
      reject(fetchFailed());
    };
    const cleanup = () => {
      signal.removeEventListener("abort", fail);
      socket.removeListener("error", fail);
    };
    socket.once("error", fail);
    signal.addEventListener("abort", fail, { once: true });
    socket.once(secure ? "secureConnect" : "connect", () => {
      if (signal.aborted) return fail();
      try {
        if (
          !socket.remoteAddress ||
          normalizeAddress(socket.remoteAddress) !== normalizeAddress(address)
        ) {
          cleanup();
          socket.destroy();
          reject(blocked());
          return;
        }
        cleanup();
        resolve(socket);
      } catch {
        cleanup();
        socket.destroy();
        reject(blocked());
      }
    });
  });
}

export interface TransferBudget {
  received: number;
  decoded: number;
}
export interface PageResponse {
  status: number;
  location?: string;
  contentType: string;
  bytes: Uint8Array;
}

export async function readPage(
  url: URL,
  socket: net.Socket,
  config: ExtractionConfig,
  budget: TransferBudget,
  signal: AbortSignal,
): Promise<PageResponse> {
  const secure = url.protocol === "https:";
  const agent = secure
    ? new https.Agent({ keepAlive: false, maxCachedSessions: 0 })
    : new http.Agent({ keepAlive: false });
  // A fresh agent returns only the already-connected, pinned and verified socket.
  // It cannot resolve the hostname again or reuse an unrelated pooled connection.
  agent.createConnection = () => socket;
  const wireAtStart = budget.received;
  const decodedAtStart = budget.decoded;
  let countWire: ((chunk: Buffer) => void) | undefined;
  try {
    return await new Promise<PageResponse>((resolve, reject) => {
      if (signal.aborted) {
        reject(fetchFailed());
        return;
      }
      const req = (secure ? https : http).request(url, {
        method: "GET",
        agent,
        maxHeaderSize: config.maxHeaderBytes,
        signal,
        headers: {
          Accept: "text/html, text/plain",
          "Accept-Encoding": "identity",
          "User-Agent": "ContentPreview/1.0",
          Connection: "close",
        },
      });
      const fail = (error: Error) => {
        req.destroy();
        reject(error);
      };
      let headerBuffer = Buffer.alloc(0);
      let inHeaders = true;
      let headerBytes = 0;
      countWire = (chunk: Buffer) => {
        // Count actual bytes before Node's HTTP parser trusts Content-Length.
        // Transfer framing/trailers count toward the wire budget, headers have
        // their own bound (including informational response headers).
        let body = chunk;
        if (inHeaders) {
          headerBuffer = Buffer.concat([headerBuffer, chunk]);
          while (inHeaders) {
            const end = headerBuffer.indexOf("\r\n\r\n");
            if (end < 0) {
              if (headerBytes + headerBuffer.length > config.maxHeaderBytes)
                fail(fetchFailed());
              return;
            }
            headerBytes += end + 4;
            if (headerBytes > config.maxHeaderBytes) {
              fail(fetchFailed());
              return;
            }
            const informational = /^HTTP\/1\.[01] 1[0-9]{2} /.test(
              headerBuffer.subarray(0, Math.min(end, 64)).toString("ascii"),
            );
            headerBuffer = headerBuffer.subarray(end + 4);
            if (!informational) inHeaders = false;
          }
          body = headerBuffer;
          headerBuffer = Buffer.alloc(0);
        }
        budget.received += body.length;
        if (budget.received > config.maxResponseBytes) fail(tooLarge());
      };
      socket.prependListener("data", countWire);
      req.once("error", () => reject(fetchFailed()));
      req.once("upgrade", (_res, upgraded) => {
        upgraded.destroy();
        fail(fetchFailed());
      });
      req.once("response", (response) => {
        const encoding = response.headers["content-encoding"];
        if (encoding && encoding.toLowerCase() !== "identity") {
          response.destroy();
          fail(extractionFailed());
          return;
        }
        const declared = response.headers["content-length"];
        if (
          declared !== undefined &&
          (!/^\d+$/.test(declared) ||
            Number(declared) >
              Math.min(
                config.maxResponseBytes - wireAtStart,
                config.maxDecodedBytes - decodedAtStart,
              ))
        ) {
          response.destroy();
          fail(tooLarge());
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          budget.decoded += chunk.length; // Only identity encoding is accepted.
          size += chunk.length;
          if (budget.decoded > config.maxDecodedBytes) {
            response.destroy();
            fail(tooLarge());
            return;
          }
          chunks.push(chunk);
        });
        response.once("error", () => reject(fetchFailed()));
        response.once("end", () => {
          if (
            !response.complete ||
            (declared !== undefined && size !== Number(declared))
          ) {
            fail(fetchFailed());
            return;
          }
          resolve({
            status: response.statusCode ?? 0,
            location: response.headers.location,
            contentType: response.headers["content-type"] ?? "",
            bytes: Buffer.concat(chunks, size),
          });
        });
      });
      req.end();
    });
  } finally {
    if (countWire) socket.removeListener("data", countWire);
    agent.destroy();
    socket.destroy();
  }
}
