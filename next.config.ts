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
  async headers() {
    return [
      {
        source: "/",
        headers: [
          {
            key: "Link",
            value: [
              '</.well-known/api-catalog>; rel="api-catalog"',
              '</docs.md>; rel="service-doc"',
              '</.well-known/mcp/server-card.json>; rel="mcp-server-card"',
            ].join(", "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
