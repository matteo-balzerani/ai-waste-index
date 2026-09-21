import "server-only";
import { AnalysisHttpError } from "@/server/analysis/http";
import type { ExtractionConfig } from "./config";
import {
  resolveAddresses,
  selectPublicAddress,
  type ResolveAddresses,
} from "./dns";
import { fetchFailed, blocked } from "./errors";
import { parsePage, type ParsePage } from "./parser";
import { connectPinned, readPage, type SocketConnectors } from "./transport";
import { safeUrl } from "./url-safety";

export interface ExtractionDependencies {
  resolve?: ResolveAddresses;
  sockets?: SocketConnectors;
  parse?: ParsePage;
}

export async function extractText(
  rawUrl: string,
  config: ExtractionConfig,
  caller: AbortSignal,
  deps: ExtractionDependencies = {},
): Promise<string> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  caller.addEventListener("abort", abort, { once: true });
  if (caller.aborted) abort();
  const deadline = setTimeout(abort, config.fetchTimeoutMs);
  const budget = { received: 0, decoded: 0 };
  const seen = new Set<string>();
  try {
    let url = safeUrl(rawUrl, config.maxUrlChars);
    for (let redirects = 0; ; redirects++) {
      if (controller.signal.aborted) throw fetchFailed();
      if (seen.has(url.href)) throw fetchFailed();
      seen.add(url.href);
      // One connection budget includes DNS, TCP and TLS; total budget never resets.
      const connectionDeadline = setTimeout(abort, config.connectTimeoutMs);
      let socket;
      try {
        const addresses = await (deps.resolve ?? resolveAddresses)(
          url.hostname.replace(/^\[|\]$/g, ""),
          controller.signal,
        );
        const address = selectPublicAddress(addresses);
        socket = await connectPinned(
          url,
          address,
          controller.signal,
          deps.sockets,
        );
      } finally {
        clearTimeout(connectionDeadline);
      }
      const page = await readPage(
        url,
        socket,
        config,
        budget,
        controller.signal,
      );
      if ([301, 302, 303, 307, 308].includes(page.status)) {
        if (redirects >= config.maxRedirects || !page.location)
          throw fetchFailed();
        let target: string;
        try {
          target = new URL(page.location, url).href;
        } catch {
          throw blocked();
        }
        url = safeUrl(target, config.maxUrlChars);
        continue;
      }
      if (page.status < 200 || page.status >= 300) throw fetchFailed();
      return await (deps.parse ?? parsePage)(page, config, controller.signal);
    }
  } catch (error) {
    if (error instanceof AnalysisHttpError) throw error;
    throw fetchFailed();
  } finally {
    clearTimeout(deadline);
    caller.removeEventListener("abort", abort);
    controller.abort();
  }
}
