// @vitest-environment node

import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "@/proxy";

describe("locale proxy", () => {
  it("redirects the root to the preferred supported locale", () => {
    const request = new NextRequest("https://example.test/", {
      headers: { "accept-language": "it-IT,it;q=0.9,en;q=0.5" },
    });

    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.test/it");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("uses English when no supported preference is available", () => {
    const request = new NextRequest("https://example.test/guide", {
      headers: { "accept-language": "fr-FR,fr;q=0.9" },
    });

    expect(proxy(request).headers.get("location")).toBe(
      "https://example.test/en/guide",
    );
  });

  it.each(["it", "en"])("passes through an existing /%s locale", (locale) => {
    const request = new NextRequest(`https://example.test/${locale}`);

    const response = proxy(request);

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
