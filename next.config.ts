// next.config.js
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* other config options here */

  // 1) Proxy all /api calls to your backend to avoid CORS in development:
  async rewrites() {
    return [
      {
        source: "/api/:path*",            // match all /api/* requests
        destination: "http://localhost:3333/api/:path*", 
      },
    ];
  },

  // 2) If you still need to serve CORS headers from Next.js itself:
  async headers() {
    return [
      {
        source: "/api/:path*",   // apply these headers to all API routes
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,POST,PUT,DELETE,PATCH" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

export default nextConfig;