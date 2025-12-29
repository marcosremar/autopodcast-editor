import type { NextConfig } from "next";

const disableCache = process.env.DISABLE_CACHE === "true";

const nextConfig: NextConfig = {
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
  headers: async () => {
    if (disableCache) {
      return [
        {
          source: "/:path*",
          headers: [
            { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
            { key: "Pragma", value: "no-cache" },
            { key: "Expires", value: "0" },
          ],
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
