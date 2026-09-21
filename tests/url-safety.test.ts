// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isPublicAddress, safeUrl } from "@/server/extraction/url-safety";
import { selectPublicAddress } from "@/server/extraction/dns";
import { createExtractionRequestSchema } from "@/contracts";
import { loadExtractionConfig } from "@/server/extraction/config";
import { extractionEnvironment as env } from "./helpers/extraction";

describe("URL and IP admission", () => {
  it.each([
    "0.0.0.0",
    "10.2.3.4",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.2.3",
    "192.0.0.9",
    "192.0.2.1",
    "192.88.99.1",
    "198.18.0.1",
    "198.51.100.1",
    "203.0.113.1",
    "224.0.0.1",
    "240.1.2.3",
    "255.255.255.255",
    "::",
    "::1",
    "::ffff:127.0.0.1",
    "::ffff:8.8.8.8",
    "fc00::1",
    "fe80::1",
    "ff02::1",
    "64:ff9b::7f00:1",
    "100::1",
    "2001:db8::1",
    "2001:2::1",
    "2002:0808:0808::1",
    "3fff::1",
    "5f00::1",
    "fe80::1%eth0",
    "invalid",
  ])("rejects nonpublic/reserved address %s", (address) => {
    expect(isPublicAddress(address)).toBe(false);
  });
  it.each([
    "8.8.8.8",
    "1.1.1.1",
    "93.184.216.34",
    "2606:4700:4700::1111",
    "2001:4860:4860::8888",
  ])("accepts ordinary public address %s", (address) =>
    expect(isPublicAddress(address)).toBe(true),
  );
  it.each([
    "http://127.1",
    "http://2130706433",
    "http://0x7f000001",
    "http://0177.0.0.1",
    "http://[::1]",
    "http://[::ffff:127.0.0.1]",
    "http://user:pass@example.com",
    "file:///etc/passwd",
    "ftp://example.com",
    "data:text/plain,hello",
    "gopher://example.com",
    "http://localhost",
    "http://service.local",
    "http://host.internal",
    "http://host.test",
    "http://host.invalid",
  ])("blocks unsafe URL %s", (value) =>
    expect(() => safeUrl(value, 1024)).toThrow("URL_BLOCKED"),
  );
  it("normalizes safely and removes fragments without losing query/path", () => {
    expect(safeUrl("https://EXAMPLE.com:443/post?a=b#part", 1024).href).toBe(
      "https://example.com/post?a=b",
    );
  });
  it("rejects a mixed DNS set and absent results", () => {
    expect(() => selectPublicAddress(["93.184.216.34", "10.0.0.1"])).toThrow(
      "URL_BLOCKED",
    );
    expect(() => selectPublicAddress(["2606:4700:4700::1111", "::1"])).toThrow(
      "URL_BLOCKED",
    );
    expect(() => selectPublicAddress([])).toThrow("URL_FETCH_FAILED");
  });
  it("validates the exact request schema, URL syntax and length", () => {
    const schema = createExtractionRequestSchema(30);
    expect(schema.safeParse({ url: "https://example.com" }).success).toBe(true);
    for (const input of [
      { url: "not a url" },
      { url: "https://example.com", locale: "en" },
      { url: "https://example.com/" + "a".repeat(30) },
    ])
      expect(schema.safeParse(input).success).toBe(false);
    expect(() => safeUrl("https://example.com/long", 10)).toThrow(
      "INPUT_TOO_LARGE",
    );
  });
  it.each([
    "MAX_URL_CHARS",
    "MAX_URL_RESPONSE_BYTES",
    "MAX_URL_DECODED_BYTES",
    "MAX_URL_RESPONSE_HEADER_BYTES",
    "URL_CONNECT_TIMEOUT_MS",
    "URL_FETCH_TIMEOUT_MS",
    "URL_MAX_REDIRECTS",
  ])("requires bounded configuration %s", (name) => {
    for (const value of [undefined, "", "0", "-1", "1.5", "NaN", "2147483648"])
      expect(() => loadExtractionConfig({ ...env, [name]: value })).toThrow();
  });
  it("rejects inconsistent budgets and non-positive redirect limits", () => {
    expect(() =>
      loadExtractionConfig({ ...env, URL_CONNECT_TIMEOUT_MS: "3001" }),
    ).toThrow();
    expect(() =>
      loadExtractionConfig({ ...env, MAX_URL_CHARS: "50000" }),
    ).toThrow();
    expect(() =>
      loadExtractionConfig({ ...env, URL_MAX_REDIRECTS: "0" }),
    ).toThrow();
  });
});
