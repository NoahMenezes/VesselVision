import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Local dev only: the app calls same-origin /api, and next dev proxies
    // it to the backend. In production the Vercel services rewrite owns /api.
    if (process.env.NODE_ENV === "development") {
      return [{ source: "/api/:path*", destination: "http://localhost:8000/api/:path*" }];
    }
    return [];
  },
};

export default nextConfig;
