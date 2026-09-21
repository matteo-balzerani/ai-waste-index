import "server-only";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";
import { blocked, tooLarge } from "./errors";

// IANA special-purpose registries (reviewed 2026-09-21). Conservatively exclude
// special-use space, including transition/translation prefixes and documentation.
// https://www.iana.org/assignments/iana-ipv4-special-registry/
// https://www.iana.org/assignments/iana-ipv6-special-registry/
const specialV4 = [
  "0.0.0.0/8",
  "10.0.0.0/8",
  "100.64.0.0/10",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "172.16.0.0/12",
  "192.0.0.0/24",
  "192.0.2.0/24",
  "192.31.196.0/24",
  "192.52.193.0/24",
  "192.88.99.0/24",
  "192.168.0.0/16",
  "192.175.48.0/24",
  "198.18.0.0/15",
  "198.51.100.0/24",
  "203.0.113.0/24",
  "224.0.0.0/4",
  "240.0.0.0/4",
].map((cidr) => ipaddr.parseCIDR(cidr));
const specialV6 = [
  "2001::/23",
  "2001:db8::/32",
  "2002::/16",
  "2620:4f:8000::/48",
  "3fff::/20",
].map((cidr) => ipaddr.parseCIDR(cidr));
const globalV6 = ipaddr.parseCIDR("2000::/3");

export function isPublicAddress(address: string): boolean {
  if (!isIP(address)) return false;
  const parsed = ipaddr.parse(address);
  if (parsed.kind() === "ipv4") {
    return !specialV4.some(([network, prefix]) =>
      parsed.match(network, prefix),
    );
  }
  // IPv4-mapped IPv6 is deliberately rejected, even when its embedded address is public.
  return (
    parsed.match(globalV6[0], globalV6[1]) &&
    !specialV6.some(([network, prefix]) => parsed.match(network, prefix))
  );
}

export function normalizeAddress(address: string): string {
  const parsed = ipaddr.process(address);
  return parsed.toNormalizedString();
}

export function safeUrl(value: string, maximum: number): URL {
  if ([...value].length > maximum) throw tooLarge();
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw blocked();
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw blocked();
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    !host ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".invalid") ||
    host.endsWith(".test") ||
    host.endsWith(".example") ||
    host.endsWith(".onion")
  )
    throw blocked();
  if (isIP(host) && !isPublicAddress(host)) throw blocked();
  url.hash = "";
  return url;
}
