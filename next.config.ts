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
    middlewareClientMaxBodySize: 524288000, // 500MB in bytes
    // Memory optimizations - prevents dev server freezing
    webpackMemoryOptimizations: true,
    webpackBuildWorker: true,
    // Reduce initial memory footprint
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-select",
      "@radix-ui/react-slider",
    ],
  },
  // Disable source maps to reduce memory
  productionBrowserSourceMaps: false,
  // Webpack configuration for memory optimization
  webpack: (config, { dev }) => {
    if (dev) {
      // Use filesystem cache to reduce memory usage
      config.cache = {
        type: "filesystem",
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
      };

      // Reduce parallel processing to save memory
      config.parallelism = 50;

      // Optimize module resolution
      config.resolve = {
        ...config.resolve,
        symlinks: false,
      };
    }
    return config;
  },
  // Reduce dev server memory by limiting concurrent requests
  onDemandEntries: {
    // Keep pages in memory for 60 seconds
    maxInactiveAge: 60 * 1000,
    // Number of pages to keep in memory
    pagesBufferLength: 5,
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
