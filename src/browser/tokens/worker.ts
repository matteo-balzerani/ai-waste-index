import { countVisibleTokens } from "./count";

self.onmessage = ({ data }: MessageEvent<unknown>) => {
  try {
    if (typeof data !== "string") throw new Error();
    self.postMessage({ count: countVisibleTokens(data) });
  } catch {
    // Never emit user text, library diagnostics or exceptions.
    self.postMessage({ error: "TOKEN_COUNT_UNAVAILABLE" });
  }
};
