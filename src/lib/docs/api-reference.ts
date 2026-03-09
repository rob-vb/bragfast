import type { ApiSection } from "./types"

export const API_REFERENCE: ApiSection[] = [
  // ─── Introduction ──────────────────────────────────────────────────
  {
    title: "Introduction",
    anchor: "introduction",
    description:
      "Bragfast is an API that auto-generates branded social media images for your product releases. You design a brand kit, POST release details, and receive back images in multiple aspect ratios — ready to share.",
    endpoints: [],
  },

  // ─── Authentication ────────────────────────────────────────────────
  {
    title: "Authentication",
    anchor: "authentication",
    description:
      "Bragfast uses API keys to authenticate requests. Create an API key from your dashboard after signing up. Include it in the Authorization header of every request.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/auth",
        anchor: "auth-verify",
        title: "Verify authentication",
        description:
          "Check that your API key is valid. Returns the associated project info.",
        responseStatus: 200,
        responseExample: `{
  "message": "Authorized"
}`,
      },
    ],
  },

  // ─── Async ─────────────────────────────────────────────────────────
  {
    title: "Async",
    anchor: "async",
    description:
      "Image generation is asynchronous. When you create a release, the API responds immediately with 202 Accepted and a release_id. The images are rendered in the background — usually within a few seconds.",
    endpoints: [
      {
        method: "POST",
        path: "/api/v1/release",
        anchor: "async-flow",
        title: "How it works",
        description:
          "There are two ways to get the finished images:\n\n1. Polling — call GET /api/v1/release/:id until the status changes from \"pending\" to \"completed\".\n\n2. Webhook — pass a webhook_url when creating the release. Bragfast will POST the completed release object (with image URLs) to that URL when rendering finishes.\n\nPolling is simpler for scripts and one-off use. Webhooks are better for production integrations where you don't want to loop.",
        requestExample: {
          curl: `# 1. Create a release
curl -X POST https://bragfast.com/api/v1/release \\
  -H "Authorization: Bearer bf_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "brand_id": "brd_abc123",
    "slides": [{ "title": "Shipped v2.0" }],
    "webhook_url": "https://your-app.com/webhooks/bragfast"
  }'

# 2. Or poll until completed
curl https://bragfast.com/api/v1/release/rel_abc123 \\
  -H "Authorization: Bearer bf_your_api_key"`,
          javascript: `// 1. Create a release (returns immediately)
const release = await fetch("https://bragfast.com/api/v1/release", {
  method: "POST",
  headers: {
    "Authorization": "Bearer bf_your_api_key",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    brand_id: "brd_abc123",
    slides: [{ title: "Shipped v2.0" }],
    webhook_url: "https://your-app.com/webhooks/bragfast",
  }),
}).then(r => r.json())

// 2. Or poll until status is "completed"
let result
do {
  await new Promise(r => setTimeout(r, 2000))
  result = await fetch(
    \`https://bragfast.com/api/v1/release/\${release.release_id}\`,
    { headers: { "Authorization": "Bearer bf_your_api_key" } }
  ).then(r => r.json())
} while (result.status === "pending")`,
          python: `import requests
import time

# 1. Create a release (returns immediately)
release = requests.post(
    "https://bragfast.com/api/v1/release",
    headers={"Authorization": "Bearer bf_your_api_key"},
    json={
        "brand_id": "brd_abc123",
        "slides": [{"title": "Shipped v2.0"}],
        "webhook_url": "https://your-app.com/webhooks/bragfast",
    },
).json()

# 2. Or poll until status is "completed"
while True:
    time.sleep(2)
    result = requests.get(
        f"https://bragfast.com/api/v1/release/{release['release_id']}",
        headers={"Authorization": "Bearer bf_your_api_key"},
    ).json()
    if result["status"] != "pending":
        break`,
        },
        responseStatus: 202,
        responseExample: `{
  "release_id": "rel_abc123",
  "status": "pending",
  "images": null,
  "credits_used": 3,
  "credits_remaining": 27,
  "created_at": "2026-03-09T12:00:00.000Z",
  "webhook_url": "https://your-app.com/webhooks/bragfast"
}`,
      },
    ],
  },

  // ─── Errors ────────────────────────────────────────────────────────
  {
    title: "Errors",
    anchor: "errors",
    description:
      "Bragfast uses standard HTTP status codes. 2xx indicates success, 4xx indicates a client error, and 5xx indicates a server error.",
    endpoints: [
      {
        method: "GET",
        path: "",
        anchor: "error-codes",
        title: "Status codes",
        description:
          "200 OK — 201 Created — 202 Accepted (async processing) — 204 No Content — 400 Bad Request — 401 Unauthorized — 403 Forbidden — 404 Not Found — 429 Too Many Requests (rate limit or insufficient credits) — 500 Internal Server Error",
        responseStatus: 400,
        responseExample: `{
  "error": "At least 1 slide is required"
}`,
      },
    ],
  },

  // ─── Releases ──────────────────────────────────────────────────────
  {
    title: "Releases",
    anchor: "releases",
    description:
      "Releases are the core resource. You create a release with slides (title, description, optional screenshot) and Bragfast generates branded images in your chosen formats and template.",
    sampleObject: `{
  "release_id": "rel_abc123",
  "status": "pending",
  "images": null,
  "credits_used": 9,
  "credits_remaining": 21,
  "created_at": "2026-03-09T12:00:00.000Z",
  "completed_at": null,
  "transparent": false,
  "metadata": null,
  "webhook_url": null
}`,
    endpoints: [
      {
        method: "POST",
        path: "/api/v1/release",
        anchor: "create-release",
        title: "Create a release",
        description:
          "Creates a new release and queues image generation. Returns 202 Accepted immediately. Poll the GET endpoint or use a webhook to receive the final images.",
        params: [
          {
            name: "brand_id",
            type: "string",
            required: false,
            description:
              "ID of a saved brand kit. If omitted, you must provide inline colors.",
          },
          {
            name: "colors",
            type: "object",
            required: false,
            description:
              "Inline brand colors. Required when brand_id is not provided.",
            children: [
              {
                name: "background",
                type: "string",
                required: true,
                description: 'Hex color e.g. "#1a1a2e"',
              },
              {
                name: "text",
                type: "string",
                required: true,
                description: 'Hex color e.g. "#ffffff"',
              },
              {
                name: "primary",
                type: "string",
                required: true,
                description: 'Hex color e.g. "#e94560"',
              },
            ],
          },
          {
            name: "name",
            type: "string",
            required: false,
            description: "Brand name shown on images (used with inline colors).",
          },
          {
            name: "logo_url",
            type: "string",
            required: false,
            description: "URL to your logo (used with inline colors).",
          },
          {
            name: "font",
            type: "string",
            required: false,
            description:
              'Google Font name e.g. "Inter". Defaults to system font.',
          },
          {
            name: "template",
            type: "string",
            required: false,
            description:
              'Template style: "classic", "split", or "hero". Defaults to "classic".',
          },
          {
            name: "slides",
            type: "array",
            required: true,
            description: "1-5 slides to render. Each slide becomes one image.",
            children: [
              {
                name: "title",
                type: "string",
                required: true,
                description: "Slide headline text.",
              },
              {
                name: "description",
                type: "string",
                required: false,
                description: "Subtitle or body text.",
              },
              {
                name: "image_url",
                type: "string",
                required: false,
                description: "URL to a screenshot or product image.",
              },
              {
                name: "device",
                type: "string",
                required: false,
                description:
                  '"browser" or "mobile". Wraps the image in a device frame.',
              },
              {
                name: "align",
                type: "string",
                required: false,
                description:
                  '"left", "center", or "right". Text alignment. Defaults to "left".',
              },
            ],
          },
          {
            name: "formats",
            type: "array",
            required: false,
            description:
              'Output formats: "landscape" (1200x675), "square" (1080x1080), "portrait" (1080x1350). Defaults to all three.',
          },
          {
            name: "transparent",
            type: "boolean",
            required: false,
            description: "Render with transparent background. Default false.",
          },
          {
            name: "metadata",
            type: "string",
            required: false,
            description:
              "Any metadata you need to store, e.g. a record ID in your database.",
          },
          {
            name: "webhook_url",
            type: "string",
            required: false,
            description:
              "URL to POST the completed release object to when rendering finishes.",
          },
        ],
        requestExample: {
          curl: `curl -X POST https://bragfast.com/api/v1/release \\
  -H "Authorization: Bearer bf_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "brand_id": "brd_abc123",
    "template": "classic",
    "slides": [
      {
        "title": "Launched dark mode",
        "description": "Your app, your vibe.",
        "image_url": "https://example.com/screenshot.png",
        "device": "browser"
      }
    ],
    "formats": ["landscape", "square"]
  }'`,
          javascript: `const response = await fetch("https://bragfast.com/api/v1/release", {
  method: "POST",
  headers: {
    "Authorization": "Bearer bf_your_api_key",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    brand_id: "brd_abc123",
    template: "classic",
    slides: [
      {
        title: "Launched dark mode",
        description: "Your app, your vibe.",
        image_url: "https://example.com/screenshot.png",
        device: "browser",
      },
    ],
    formats: ["landscape", "square"],
  }),
})
const data = await response.json()`,
          python: `import requests

response = requests.post(
    "https://bragfast.com/api/v1/release",
    headers={"Authorization": "Bearer bf_your_api_key"},
    json={
        "brand_id": "brd_abc123",
        "template": "classic",
        "slides": [
            {
                "title": "Launched dark mode",
                "description": "Your app, your vibe.",
                "image_url": "https://example.com/screenshot.png",
                "device": "browser",
            }
        ],
        "formats": ["landscape", "square"],
    },
)
data = response.json()`,
        },
        responseStatus: 202,
        responseExample: `{
  "release_id": "rel_abc123",
  "status": "pending",
  "images": null,
  "credits_used": 2,
  "credits_remaining": 28,
  "created_at": "2026-03-09T12:00:00.000Z",
  "transparent": false,
  "metadata": null
}`,
      },
      {
        method: "GET",
        path: "/api/v1/release/:id",
        anchor: "retrieve-release",
        title: "Retrieve a release",
        description:
          'Poll this endpoint to check the status of a release. When status is "completed", the images object will contain CDN URLs for each format.',
        params: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "The release ID returned from the create endpoint.",
          },
        ],
        requestExample: {
          curl: `curl https://bragfast.com/api/v1/release/rel_abc123 \\
  -H "Authorization: Bearer bf_your_api_key"`,
          javascript: `const response = await fetch(
  "https://bragfast.com/api/v1/release/rel_abc123",
  {
    headers: {
      "Authorization": "Bearer bf_your_api_key",
    },
  }
)
const data = await response.json()`,
          python: `import requests

response = requests.get(
    "https://bragfast.com/api/v1/release/rel_abc123",
    headers={"Authorization": "Bearer bf_your_api_key"},
)
data = response.json()`,
        },
        responseStatus: 200,
        responseExample: `{
  "release_id": "rel_abc123",
  "status": "completed",
  "images": {
    "landscape": {
      "slides": [
        "https://cdn.bragfast.com/rel_abc123/landscape/slide-1.png"
      ],
      "dimensions": "1200x675"
    },
    "square": {
      "slides": [
        "https://cdn.bragfast.com/rel_abc123/square/slide-1.png"
      ],
      "dimensions": "1080x1080"
    }
  },
  "credits_used": 2,
  "credits_remaining": 28,
  "created_at": "2026-03-09T12:00:00.000Z",
  "completed_at": "2026-03-09T12:00:05.000Z",
  "transparent": false
}`,
      },
    ],
  },

  // ─── Brands ────────────────────────────────────────────────────────
  {
    title: "Brands",
    anchor: "brands",
    description:
      "Brand kits store your visual identity — colors, logo, font, and website. Create a brand once, then reference it by ID in every release.",
    sampleObject: `{
  "id": "brd_abc123",
  "name": "Acme Inc",
  "logo_url": "https://example.com/logo.png",
  "website": "https://acme.com",
  "font": "Inter",
  "colors": {
    "background": "#1a1a2e",
    "text": "#ffffff",
    "primary": "#e94560"
  },
  "created_at": "2026-03-01T10:00:00.000Z",
  "updated_at": "2026-03-01T10:00:00.000Z"
}`,
    endpoints: [
      {
        method: "POST",
        path: "/api/v1/brands",
        anchor: "create-brand",
        title: "Create a brand",
        description: "Creates a new brand kit.",
        params: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "Brand name displayed on images.",
          },
          {
            name: "colors",
            type: "object",
            required: true,
            description: "Brand color palette.",
            children: [
              {
                name: "background",
                type: "string",
                required: true,
                description: "Background hex color.",
              },
              {
                name: "text",
                type: "string",
                required: true,
                description: "Text hex color.",
              },
              {
                name: "primary",
                type: "string",
                required: true,
                description: "Primary/accent hex color.",
              },
            ],
          },
          {
            name: "logo_url",
            type: "string",
            required: false,
            description: "URL to your logo image.",
          },
          {
            name: "website",
            type: "string",
            required: false,
            description: "Your website URL. Stored for reference.",
          },
          {
            name: "font",
            type: "string",
            required: false,
            description: 'Google Font name e.g. "Inter".',
          },
        ],
        requestExample: {
          curl: `curl -X POST https://bragfast.com/api/v1/brands \\
  -H "Authorization: Bearer bf_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Acme Inc",
    "colors": {
      "background": "#1a1a2e",
      "text": "#ffffff",
      "primary": "#e94560"
    },
    "logo_url": "https://example.com/logo.png",
    "website": "https://acme.com",
    "font": "Inter"
  }'`,
          javascript: `const response = await fetch("https://bragfast.com/api/v1/brands", {
  method: "POST",
  headers: {
    "Authorization": "Bearer bf_your_api_key",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "Acme Inc",
    colors: {
      background: "#1a1a2e",
      text: "#ffffff",
      primary: "#e94560",
    },
    logo_url: "https://example.com/logo.png",
    website: "https://acme.com",
    font: "Inter",
  }),
})
const data = await response.json()`,
          python: `import requests

response = requests.post(
    "https://bragfast.com/api/v1/brands",
    headers={"Authorization": "Bearer bf_your_api_key"},
    json={
        "name": "Acme Inc",
        "colors": {
            "background": "#1a1a2e",
            "text": "#ffffff",
            "primary": "#e94560",
        },
        "logo_url": "https://example.com/logo.png",
        "website": "https://acme.com",
        "font": "Inter",
    },
)
data = response.json()`,
        },
        responseStatus: 201,
        responseExample: `{
  "id": "brd_abc123",
  "name": "Acme Inc",
  "logo_url": "https://example.com/logo.png",
  "website": "https://acme.com",
  "font": "Inter",
  "colors": {
    "background": "#1a1a2e",
    "text": "#ffffff",
    "primary": "#e94560"
  },
  "created_at": "2026-03-09T12:00:00.000Z",
  "updated_at": "2026-03-09T12:00:00.000Z"
}`,
      },
      {
        method: "GET",
        path: "/api/v1/brands",
        anchor: "list-brands",
        title: "List all brands",
        description: "Returns all brand kits for your account.",
        requestExample: {
          curl: `curl https://bragfast.com/api/v1/brands \\
  -H "Authorization: Bearer bf_your_api_key"`,
          javascript: `const response = await fetch("https://bragfast.com/api/v1/brands", {
  headers: {
    "Authorization": "Bearer bf_your_api_key",
  },
})
const data = await response.json()`,
          python: `import requests

response = requests.get(
    "https://bragfast.com/api/v1/brands",
    headers={"Authorization": "Bearer bf_your_api_key"},
)
data = response.json()`,
        },
        responseStatus: 200,
        responseExample: `[
  {
    "id": "brd_abc123",
    "name": "Acme Inc",
    "logo_url": "https://example.com/logo.png",
    "website": "https://acme.com",
    "font": "Inter",
    "colors": {
      "background": "#1a1a2e",
      "text": "#ffffff",
      "primary": "#e94560"
    },
    "created_at": "2026-03-01T10:00:00.000Z",
    "updated_at": "2026-03-01T10:00:00.000Z"
  }
]`,
      },
      {
        method: "PATCH",
        path: "/api/v1/brands/:id",
        anchor: "update-brand",
        title: "Update a brand",
        description:
          "Updates an existing brand kit. Only include the fields you want to change.",
        params: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "The brand ID (path parameter).",
          },
          {
            name: "name",
            type: "string",
            required: false,
            description: "New brand name.",
          },
          {
            name: "colors",
            type: "object",
            required: false,
            description:
              "Partial color update. Only include colors you want to change.",
            children: [
              {
                name: "background",
                type: "string",
                required: false,
                description: "Background hex color.",
              },
              {
                name: "text",
                type: "string",
                required: false,
                description: "Text hex color.",
              },
              {
                name: "primary",
                type: "string",
                required: false,
                description: "Primary hex color.",
              },
            ],
          },
          {
            name: "logo_url",
            type: "string",
            required: false,
            description: "New logo URL.",
          },
          {
            name: "website",
            type: "string",
            required: false,
            description: "New website URL.",
          },
          {
            name: "font",
            type: "string",
            required: false,
            description: "New Google Font name.",
          },
        ],
        requestExample: {
          curl: `curl -X PATCH https://bragfast.com/api/v1/brands/brd_abc123 \\
  -H "Authorization: Bearer bf_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "colors": { "primary": "#00ff88" }
  }'`,
          javascript: `const response = await fetch(
  "https://bragfast.com/api/v1/brands/brd_abc123",
  {
    method: "PATCH",
    headers: {
      "Authorization": "Bearer bf_your_api_key",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      colors: { primary: "#00ff88" },
    }),
  }
)
const data = await response.json()`,
          python: `import requests

response = requests.patch(
    "https://bragfast.com/api/v1/brands/brd_abc123",
    headers={"Authorization": "Bearer bf_your_api_key"},
    json={"colors": {"primary": "#00ff88"}},
)
data = response.json()`,
        },
        responseStatus: 200,
        responseExample: `{
  "id": "brd_abc123",
  "name": "Acme Inc",
  "logo_url": "https://example.com/logo.png",
  "website": "https://acme.com",
  "font": "Inter",
  "colors": {
    "background": "#1a1a2e",
    "text": "#ffffff",
    "primary": "#00ff88"
  },
  "created_at": "2026-03-01T10:00:00.000Z",
  "updated_at": "2026-03-09T12:00:00.000Z"
}`,
      },
      {
        method: "DELETE",
        path: "/api/v1/brands/:id",
        anchor: "delete-brand",
        title: "Delete a brand",
        description:
          "Permanently deletes a brand kit. This cannot be undone.",
        params: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "The brand ID (path parameter).",
          },
        ],
        requestExample: {
          curl: `curl -X DELETE https://bragfast.com/api/v1/brands/brd_abc123 \\
  -H "Authorization: Bearer bf_your_api_key"`,
          javascript: `const response = await fetch(
  "https://bragfast.com/api/v1/brands/brd_abc123",
  {
    method: "DELETE",
    headers: {
      "Authorization": "Bearer bf_your_api_key",
    },
  }
)
// 204 No Content on success`,
          python: `import requests

response = requests.delete(
    "https://bragfast.com/api/v1/brands/brd_abc123",
    headers={"Authorization": "Bearer bf_your_api_key"},
)
# 204 No Content on success`,
        },
        responseStatus: 204,
        responseExample: `// 204 No Content — empty response body`,
      },
    ],
  },
]
