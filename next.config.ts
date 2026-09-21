import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  logging: { browserToTerminal: false },
  experimental: {
    // The development debug channel otherwise persists document data in IndexedDB.
    reactDebugChannel: false,
  },
};

export default nextConfig;
