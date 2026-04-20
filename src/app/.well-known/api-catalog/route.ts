import { getSiteUrl } from "@/lib/site-url";

export async function GET() {
  const base = getSiteUrl();

  const catalog = {
    linkset: [
      {
        anchor: `${base}/api/v1/`,
        "service-doc": [
          { href: `${base}/docs.md`, type: "text/markdown" },
          { href: `${base}/docs`, type: "text/html" },
        ],
        "service-desc": [{ href: `${base}/docs.md`, type: "text/markdown" }],
        status: [{ href: `${base}/api/v1/account`, type: "application/json" }],
      },
    ],
  };

  return new Response(JSON.stringify(catalog, null, 2), {
    headers: {
      "Content-Type": "application/linkset+json",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
