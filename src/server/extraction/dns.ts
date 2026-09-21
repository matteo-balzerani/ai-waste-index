import "server-only";
import { Resolver } from "node:dns/promises";
import { isIP } from "node:net";
import { fetchFailed, blocked } from "./errors";
import { isPublicAddress } from "./url-safety";

export type ResolveAddresses = (
  host: string,
  signal: AbortSignal,
) => Promise<string[]>;

export const resolveAddresses: ResolveAddresses = async (host, signal) => {
  if (signal.aborted) throw fetchFailed();
  if (isIP(host)) return [host];
  const resolver = new Resolver();
  const cancel = () => resolver.cancel();
  signal.addEventListener("abort", cancel, { once: true });
  const absent = (error: NodeJS.ErrnoException): string[] => {
    if (error.code === "ENODATA" || error.code === "ENOTFOUND") return [];
    throw fetchFailed();
  };
  try {
    const records = await Promise.all([
      resolver.resolve4(host).catch(absent),
      resolver.resolve6(host).catch(absent),
    ]);
    if (signal.aborted) throw fetchFailed();
    return records.flat();
  } finally {
    resolver.cancel();
    signal.removeEventListener("abort", cancel);
  }
};

export function selectPublicAddress(addresses: string[]): string {
  if (addresses.length === 0) throw fetchFailed();
  if (addresses.some((address) => !isPublicAddress(address))) throw blocked();
  return addresses.find((address) => isIP(address) === 4) ?? addresses[0]!;
}
