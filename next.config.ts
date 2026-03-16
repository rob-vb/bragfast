import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@remotion/lambda",
    "@remotion/bundler",
    "@remotion/renderer",
    "@remotion/lambda-client",
    "@remotion/serverless-client",
    "sharp",
  ],
  outputFileTracingIncludes: {
    "/api/**": ["./src/assets/fonts/**/*"],
  },
};

export default nextConfig;
