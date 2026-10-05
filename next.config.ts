import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/:path*.(js|css|html|json)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, must-revalidate, no-cache, max-age=0",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
