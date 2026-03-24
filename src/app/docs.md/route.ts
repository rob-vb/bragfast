import { API_REFERENCE } from "@/lib/docs/api-reference"
import { apiReferenceToMarkdown } from "@/lib/docs/to-markdown"

export async function GET() {
  const markdown = apiReferenceToMarkdown(API_REFERENCE)
  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  })
}
