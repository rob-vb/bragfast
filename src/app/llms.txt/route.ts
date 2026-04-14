import { getSiteUrl } from "@/lib/site-url"

export async function GET() {
  const siteUrl = getSiteUrl()

  const content = `# brag.fast

> API for auto-generating branded social media images and videos for product releases.

## Docs

- [API Reference](${siteUrl}/docs.md): Full API reference with all endpoints, parameters, and code examples in markdown.
`

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  })
}
