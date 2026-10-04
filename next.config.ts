import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pages are statically generated at build time from /data; include the files in the
  // serverless bundle too so any on-demand render on Vercel can read them.
  outputFileTracingIncludes: { "/**": ["./data/**/*.json"] },
};

export default nextConfig;
