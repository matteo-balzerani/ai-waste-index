import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep verification builds separate from a developer’s running local demo.
  distDir:
    process.env.LOCAL_VERIFICATION_BUILD === "1" ? ".next-check" : ".next",
  devIndicators: false,
  outputFileTracingIncludes: {
    "/api/extract-url": ["./.generated/extraction-parser.cjs"],
  },
  logging: { browserToTerminal: false },
  experimental: {
    // The development debug channel otherwise persists document data in IndexedDB.
    reactDebugChannel: false,
  },
};

export default nextConfig;
