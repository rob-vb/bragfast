import type { ApiSection } from "./types"

export const API_REFERENCE: ApiSection[] = [
  // ─── Introduction ──────────────────────────────────────────────────
  {
    title: "Introduction",
    anchor: "introduction",
    description:
      "brag.fast is an API that auto-generates branded social media images for your product updates. Set up a brand kit, POST your content, and get back images in landscape, square, portrait, and OG — ready to serve. One API call, a full plate of content.",
    endpoints: [],
  },

  // ─── Authentication ────────────────────────────────────────────────
  {
    title: "Authentication",
    anchor: "authentication",
    description:
      "Every request needs an API key in the Authorization header. Grab one from your admin panel after signing up — it starts with bf_. Keep it secret, keep it safe. All POST and PATCH requests must include Content-Type: application/json (except file uploads, which use multipart/form-data).",
    endpoints: [],
  },

  // ─── Async ─────────────────────────────────────────────────────────
  {
    title: "Async Flow",
    anchor: "async",
    description:
      "Image generation is asynchronous — your request goes in, a 202 comes back immediately, and the images are cooked in the background. Usually done within a few seconds.",
    endpoints: [
      {
        method: "POST",
        path: "/api/v1/cook/image",
        anchor: "async-flow",
        title: "How it works",
        description:
          "Two endpoints, one flow. POST /api/v1/cook/image for static images, POST /api/v1/cook/video for animated MP4s. Both return 202 immediately and render in the background.\n\nTwo ways to get the result:\n\n1. Polling — call GET /api/v1/cook/:id until the status flips from \"pending\" to \"completed\". Polling is on the unified /cook/:id path regardless of whether you POSTed to /cook/image or /cook/video.\n\n2. Webhook — pass a webhook_url when creating the cook. brag.fast will POST the completed cook object (same shape as the GET response) to that URL when rendering finishes.\n\nPolling is simpler for scripts. Webhooks are better for production — no looping, just a callback.",
        requestExample: {
          curl: `# 1. Fire off a cook
curl -X POST https://brag.fast/api/v1/cook/image \\
  -H "Authorization: Bearer bf_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "brand_id": "brand_abc123",
    "formats": [{ "name": "landscape", "slides": [{ "objects": [{ "id": "title", "text": "Shipped v2.0" }] }] }],
    "webhook_url": "https://your-app.com/webhooks/bragfast"
  }'

# 2. Or poll until it's ready
curl https://brag.fast/api/v1/cook/cook_abc123 \\
  -H "Authorization: Bearer bf_your_api_key"`,
          javascript: `// 1. Start a cook (returns immediately)
const cook = await fetch("https://brag.fast/api/v1/cook/image", {
  method: "POST",
  headers: {
    "Authorization": "Bearer bf_your_api_key",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    brand_id: "brand_abc123",
    formats: [{ name: "landscape", slides: [{ objects: [{ id: "title", text: "Shipped v2.0" }] }] }],
    webhook_url: "https://your-app.com/webhooks/bragfast",
  }),
}).then(r => r.json())

// 2. Or poll until status is "completed"
let result
do {
  await new Promise(r => setTimeout(r, 2000))
  result = await fetch(
    \`https://brag.fast/api/v1/cook/\${cook.cook_id}\`,
    { headers: { "Authorization": "Bearer bf_your_api_key" } }
  ).then(r => r.json())
} while (result.status === "pending")`,
          python: `import requests
import time

# 1. Start a cook (returns immediately)
cook = requests.post(
    "https://brag.fast/api/v1/cook/image",
    headers={"Authorization": "Bearer bf_your_api_key"},
    json={
        "brand_id": "brand_abc123",
        "formats": [{"name": "landscape", "slides": [{"objects": [{"id": "title", "text": "Shipped v2.0"}]}]}],
        "webhook_url": "https://your-app.com/webhooks/bragfast",
    },
).json()

# 2. Or poll until it's ready
while True:
    time.sleep(2)
    result = requests.get(
        f"https://brag.fast/api/v1/cook/{cook['cook_id']}",
        headers={"Authorization": "Bearer bf_your_api_key"},
    ).json()
    if result["status"] != "pending":
        break`,
        },
        responseStatus: 202,
        responseExample: `{
  "cook_id": "cook_abc123",
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

  // ─── Rate Limits ─────────────────────────────────────────────────
  {
    title: "Rate Limits",
    anchor: "rate-limits",
    description:
      "Requests are rate-limited per plan on a 1-minute rolling window. If you hit the limit, you'll get a 429 with a Retry-After header telling you how many seconds to wait. Limits per plan: Trial — 10/min, Starter — 30/min, Pro — 60/min, Scale — 120/min.",
    endpoints: [],
  },

  // ─── Credits ─────────────────────────────────────────────────────
  {
    title: "Credits",
    anchor: "credits",
    description:
      "Images: 1 credit per slide per format (e.g. 2 slides in 3 formats = 6 credits). Videos: 5 credits per slide per format (e.g. 2 slides in 3 formats = 30 credits). Credits are reserved upfront and refunded automatically if the render fails. Plans: Trial — 30 credits free (no card), Starter ($12/mo) — 200, Pro ($29/mo) — 800, Scale ($79/mo) — 2,500.",
    endpoints: [],
  },

  // ─── Status Codes ──────────────────────────────────────────────────
  {
    title: "Status Codes",
    anchor: "status-codes",
    description:
      "Standard HTTP status codes. 2xx means your order went through, 4xx means something's off with your request, and 5xx means we burned it on our end. All errors include a JSON body with an error field.",
    endpoints: [],
    statusCodes: [
      { code: 200, label: "OK", description: "Request succeeded. Breakfast is served." },
      { code: 201, label: "Created", description: "Resource created successfully." },
      { code: 202, label: "Accepted", description: "Request accepted — your images are cooking. Poll or use a webhook." },
      { code: 204, label: "No Content", description: "Deleted successfully. Clean plate." },
      { code: 400, label: "Bad Request", description: "Invalid or missing parameters. Check your ingredients." },
      { code: 401, label: "Unauthorized", description: "Missing or invalid API key." },
      { code: 403, label: "Forbidden", description: "Action not allowed. You might be trying to modify a default template." },
      { code: 404, label: "Not Found", description: "Resource doesn't exist or you don't own it." },
      { code: 429, label: "Too Many Requests", description: "Rate limit exceeded or your plate is empty (insufficient credits)." },
      { code: 500, label: "Internal Server Error", description: "Something burned. Try again or reach out." },
    ],
    sampleObject: `// All errors return this shape:
{
  "error": "Description of what went wrong"
}`,
  },

  // ─── Cook ─────────────────────────────────────────────────────────
  {
    title: "Cook",
    anchor: "cook",
    description:
      "Two endpoints, same body shape. POST /api/v1/cook/image for static images (1 credit per slide). POST /api/v1/cook/video for animated MP4s (5 credits per slide). Same template, same objects, same formats — just pick the route. Poll GET /api/v1/cook/:id for completion; the response includes both 'images' and 'videos' fields (only one will be populated).",
    sampleObject: `// Image cook — POST /api/v1/cook/image
{
  "cook_id": "cook_abc123",
  "status": "completed",
  "images": {
    "landscape": { "slides": ["https://cdn.brag.fast/..."], "dimensions": "1200x675" }
  },
  "videos": null,
  "credits_used": 2,
  "credits_remaining": 28
}

// Video cook — POST /api/v1/cook/video
{
  "cook_id": "cook_def456",
  "output": "video",
  "status": "completed",
  "images": null,
  "videos": {
    "landscape": { "url": "https://r2.brag.fast/.../landscape.mp4", "dimensions": "1200x675", "duration": 5 }
  },
  "credits_used": 5,
  "credits_remaining": 23
}`,
    endpoints: [
      {
        method: "POST",
        path: "/api/v1/cook/image",
        anchor: "create-image-cook",
        title: "Create an image cook",
        description:
          "Queues image generation and returns 202 immediately. Costs 1 credit per slide per format (e.g. 2 slides in 3 formats = 6 credits). Credits are reserved upfront and refunded if the render fails.\n\nEvery template exposes named objects — text slots, image slots, and a logo. Pass content via the objects map, keyed by object ID. Default templates use: title (text), description (text), and image (url). Custom templates define their own IDs — discover them with GET /api/v1/templates/:id.\n\nFor video output, use POST /api/v1/cook/video instead. The image endpoint rejects requests that include a 'video' field.",
        params: [
          {
            name: "brand_id",
            type: "string",
            required: false,
            description:
              "ID of a saved brand kit (e.g. \"brand_abc123\"). Uses the brand's colors and logo. Without a brand_id, falls back to inline colors or the dark theme (#1a1a2e, #ffffff, #e94560).",
          },
          {
            name: "colors",
            type: "object",
            required: false,
            description:
              "Inline brand colors. Optional — ignored when brand_id is set, otherwise defaults to dark theme.",
            children: [
              {
                name: "background",
                type: "string",
                required: true,
                description: 'Background hex color, e.g. "#1a1a2e".',
              },
              {
                name: "text",
                type: "string",
                required: true,
                description: 'Text hex color, e.g. "#ffffff".',
              },
              {
                name: "primary",
                type: "string",
                required: true,
                description: 'Accent hex color, e.g. "#e94560".',
              },
            ],
          },
          {
            name: "logo_url",
            type: "string",
            required: false,
            description: "URL to your logo image. Used with inline colors.",
          },
          {
            name: "font_family",
            type: "string",
            required: false,
            description:
              'Google Font applied to all text objects in the cook, e.g. "Inter". Overrides the brand\'s font. Individual objects can override this with their own font_family. See the Fonts endpoint for the full menu.',
          },
          {
            name: "template",
            type: "string",
            required: false,
            description:
              'Template to use: "standard-browser", "standard-mobile", "split-browser", "split-mobile", "hero", or a custom template ID (e.g. "tmpl_abc123"). Defaults to "standard-browser".',
          },
          {
            name: "formats",
            type: "array",
            required: true,
            description: "Array of format entries. Each entry specifies a format and its slides. Image credits = sum of slides across all entries. Video credits = sum of slides × 5.",
            children: [
              {
                name: "name",
                type: "string",
                required: true,
                description:
                  'Format name: "landscape" (1200×675), "square" (1080×1080), or "portrait" (1080×1350).',
              },
              {
                name: "slides",
                type: "array",
                required: true,
                description: "1–5 slides for this format. Each slide becomes one image.",
                children: [
                  {
                    name: "objects",
                    type: "array",
                    required: false,
                    description:
                      "A list of modifications to the template's objects. Each entry targets an object by ID and provides its content, plus optional overrides. Default templates use IDs: title, description, image. Custom templates define their own — get them from GET /api/v1/templates/:id.",
                    children: [
                      {
                        name: "id",
                        type: "string",
                        required: true,
                        description:
                          "The object ID to modify. Find available IDs via GET /api/v1/templates/:id.",
                      },
                      {
                        name: "text",
                        type: "string",
                        required: false,
                        group: "text",
                        description:
                          "Replacement text for text objects. Supports \\n for line breaks.",
                      },
                      {
                        name: "font_family",
                        type: "string",
                        required: false,
                        group: "text",
                        description:
                          "Override the font for this specific text object. Takes precedence over the top-level font_family.",
                      },
                      {
                        name: "font_weight",
                        type: "number",
                        required: false,
                        group: "text",
                        description:
                          "Override the font weight for this text object (100–900). Defaults to the template object's weight.",
                      },
                      {
                        name: "color",
                        type: "string",
                        required: false,
                        group: "text",
                        description:
                          'Override the text color, e.g. "#e94560".',
                      },
                      {
                        name: "image_url",
                        type: "string",
                        required: false,
                        group: "image",
                        description:
                          "Image URL for visual objects. Required for image output. For video output, still required as a fallback when video_url is not set on a given slide.",
                      },
                      {
                        name: "video_url",
                        type: "string",
                        required: false,
                        group: "image",
                        description:
                          "Video URL (MP4/WebM/MOV) for visual objects. Only used when the top-level video field is set — plays in place of image_url in the rendered video.",
                      },
                      {
                        name: "visual_frame",
                        type: "string",
                        required: false,
                        group: "image",
                        description:
                          'Override the visual frame type. One of "browser", "mobile", or "none". Defaults to the template\'s setting — see GET /api/v1/templates/:id.',
                      },
                      {
                        name: "visual_frame_color",
                        type: "string",
                        required: false,
                        group: "image",
                        description:
                          'Hex color for the visual frame, e.g. "#ffffff" for a light frame or "#1a1a2e" for a dark one.',
                      },
                      {
                        name: "anchor_x",
                        type: "string",
                        required: false,
                        group: "image",
                        description:
                          'Horizontal anchor point for the image when cropped by object-fit cover. One of "left", "center", "right". Defaults to template setting (usually "center").',
                      },
                      {
                        name: "anchor_y",
                        type: "string",
                        required: false,
                        group: "image",
                        description:
                          'Vertical anchor point for the image when cropped by object-fit cover. One of "top", "center", "bottom". Defaults to template setting (usually "top").',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            name: "metadata",
            type: "string",
            required: false,
            description:
              "Anything you want to store with the cook, e.g. a record ID from your database.",
          },
          {
            name: "webhook_url",
            type: "string",
            required: false,
            description:
              "URL where brag.fast will POST the completed cook object when rendering finishes.",
          },
        ],
        requestExample: {
          curl: `curl -X POST https://brag.fast/api/v1/cook/image \\
  -H "Authorization: Bearer bf_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "brand_id": "brand_abc123",
    "template": "standard-browser",
    "formats": [
      {
        "name": "landscape",
        "slides": [
          {
            "objects": [
              { "id": "title", "text": "Launched dark mode" },
              { "id": "description", "text": "Your app, your vibe." },
              { "id": "image", "image_url": "https://example.com/screenshot.png" }
            ]
          }
        ]
      }
    ]
  }'`,
          javascript: `const response = await fetch("https://brag.fast/api/v1/cook/image", {
  method: "POST",
  headers: {
    "Authorization": "Bearer bf_your_api_key",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    brand_id: "brand_abc123",
    template: "standard-browser",
    formats: [
      {
        name: "landscape",
        slides: [
          {
            objects: [
              { id: "title", text: "Launched dark mode" },
              { id: "description", text: "Your app, your vibe." },
              { id: "image", image_url: "https://example.com/screenshot.png" },
            ],
          },
        ],
      },
    ],
  }),
});
const cook = await response.json();
// Poll cook.cook_id until status === "completed"`,
          python: `import requests

cook = requests.post(
    "https://brag.fast/api/v1/cook/image",
    headers={"Authorization": "Bearer bf_your_api_key"},
    json={
        "brand_id": "brand_abc123",
        "template": "standard-browser",
        "formats": [
            {
                "name": "landscape",
                "slides": [
                    {
                        "objects": [
                            {"id": "title", "text": "Launched dark mode"},
                            {"id": "description", "text": "Your app, your vibe."},
                            {"id": "image", "image_url": "https://example.com/screenshot.png"},
                        ]
                    }
                ],
            }
        ],
    },
).json()`,
        },
        responseStatus: 202,
        responseExample: `{
  "cook_id": "cook_abc123",
  "output": "image",
  "status": "pending",
  "images": null,
  "credits_used": 1,
  "credits_remaining": 29
}`,
      },
      {
        method: "POST",
        path: "/api/v1/cook/video",
        anchor: "create-video-cook",
        title: "Create a video cook",
        description:
          "Queues video generation (animated MP4) and returns 202 immediately. Costs 5 credits per slide per format (e.g. 2 slides in 3 formats = 30 credits). Text fades in, images get a Ken Burns zoom, and multi-slide cooks crossfade between slides. Max total duration per format is 60 seconds.\n\nAccepts the same body shape as /cook/image, plus an optional 'video' field controlling duration and animation preset.",
        params: [
          {
            name: "video",
            type: 'true | { duration?: number, preset?: "showcase" | "3d-tilt-angles" | "simple-fade" }',
            required: false,
            description:
              'Options container for video rendering. Omit or set to true for defaults (8s per slide, showcase preset). Provide an object with duration (3-30 seconds, default 8) and/or preset — "showcase" (cinematic rise + reveal, default for built-in templates), "3d-tilt-angles" (perspective tilt), or "simple-fade" (clean cross-fade).',
          },
          {
            name: "— all other fields",
            type: "same as /cook/image",
            required: false,
            description:
              "brand_id, colors, name, logo_url, font_family, template, formats, metadata, webhook_url — identical shape and semantics to POST /api/v1/cook/image. See that endpoint for field details.",
          },
        ],
        requestExample: {
          curl: `curl -X POST https://brag.fast/api/v1/cook/video \\
  -H "Authorization: Bearer bf_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "brand_id": "brand_abc123",
    "template": "standard-browser",
    "video": { "duration": 8, "preset": "showcase" },
    "formats": [
      {
        "name": "landscape",
        "slides": [
          {
            "objects": [
              { "id": "title", "text": "Launched dark mode" },
              { "id": "description", "text": "Your app, your vibe." },
              { "id": "image", "image_url": "https://example.com/screenshot.png" }
            ]
          }
        ]
      }
    ]
  }'

# For defaults (8s per slide, showcase preset), omit the "video" field entirely.`,
          javascript: `const response = await fetch("https://brag.fast/api/v1/cook/video", {
  method: "POST",
  headers: {
    "Authorization": "Bearer bf_your_api_key",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    brand_id: "brand_abc123",
    template: "standard-browser",
    video: { duration: 8, preset: "showcase" }, // optional — omit for defaults
    formats: [
      {
        name: "landscape",
        slides: [
          {
            objects: [
              { id: "title", text: "Launched dark mode" },
              { id: "description", text: "Your app, your vibe." },
              { id: "image", image_url: "https://example.com/screenshot.png" },
            ],
          },
        ],
      },
    ],
  }),
});
const cook = await response.json();
// Poll cook.cook_id until status === "completed"`,
          python: `import requests

cook = requests.post(
    "https://brag.fast/api/v1/cook/video",
    headers={"Authorization": "Bearer bf_your_api_key"},
    json={
        "brand_id": "brand_abc123",
        "template": "standard-browser",
        "video": {"duration": 8, "preset": "showcase"},  # optional
        "formats": [
            {
                "name": "landscape",
                "slides": [
                    {
                        "objects": [
                            {"id": "title", "text": "Launched dark mode"},
                            {"id": "description", "text": "Your app, your vibe."},
                            {"id": "image", "image_url": "https://example.com/screenshot.png"},
                        ]
                    }
                ],
            }
        ],
    },
).json()`,
        },
        responseStatus: 202,
        responseExample: `{
  "cook_id": "cook_def456",
  "output": "video",
  "status": "pending",
  "videos": null,
  "credits_used": 5,
  "credits_remaining": 95
}`,
      },
      {
        method: "GET",
        path: "/api/v1/cook/:id",
        anchor: "check-cook",
        title: "Check a cook",
        description:
          'Poll this endpoint to check on your cook. When status flips to "completed", the images object will have CDN URLs for each format. If it\'s "failed", something burned — credits are auto-refunded.',
        params: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "The cook ID returned from the cook endpoint.",
          },
        ],
        requestExample: {
          curl: `curl https://brag.fast/api/v1/cook/cook_abc123 \\
  -H "Authorization: Bearer bf_your_api_key"`,
          javascript: `const response = await fetch(
  "https://brag.fast/api/v1/cook/cook_abc123",
  {
    headers: {
      "Authorization": "Bearer bf_your_api_key",
    },
  }
)
const data = await response.json()`,
          python: `import requests

response = requests.get(
    "https://brag.fast/api/v1/cook/cook_abc123",
    headers={"Authorization": "Bearer bf_your_api_key"},
)
data = response.json()`,
        },
        responseStatus: 200,
        responseExample: `// Image cook — completed
{
  "cook_id": "cook_abc123",
  "status": "completed",
  "images": {
    "landscape": {
      "slides": ["https://cdn.brag.fast/cook_abc123/landscape/slide-1.jpg"],
      "dimensions": "1200x675"
    }
  },
  "credits_used": 1,
  "credits_remaining": 29
}

// Video cook — completed
{
  "cook_id": "cook_def456",
  "output": "video",
  "status": "completed",
  "videos": {
    "landscape": {
      "url": "https://r2.brag.fast/cook_def456/landscape.mp4",
      "dimensions": "1200x675",
      "duration": 5
    }
  },
  "credits_used": 5,
  "credits_remaining": 95
}`,
      },
    ],
  },

  // ─── Brands ────────────────────────────────────────────────────────
  {
    title: "Brands",
    anchor: "brands",
    description:
      "Brand kits are your visual identity — colors, logo, font, and website. Set one up once, then reference it by ID in every cook. Think of it as your signature recipe.",
    sampleObject: `{
  "id": "brand_abc123",
  "name": "Acme Inc",
  "logo_url": "https://example.com/logo.png",
  "website": "https://acme.com",
  "font_family": "Inter",
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
        description: "Creates a new brand kit. The only required fields are name and colors — everything else is optional garnish.",
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
            description: "Your color palette.",
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
                description: "Accent hex color.",
              },
            ],
          },
          {
            name: "logo_url",
            type: "string",
            required: false,
            description: "URL to your logo image. Fetched at render time.",
          },
          {
            name: "website",
            type: "string",
            required: false,
            description: "Your website URL.",
          },
          {
            name: "font_family",
            type: "string",
            required: false,
            description: 'Google Font name, e.g. "Inter". See the Fonts endpoint for options.',
          },
        ],
        requestExample: {
          curl: `curl -X POST https://brag.fast/api/v1/brands \\
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
    "font_family": "Inter"
  }'`,
          javascript: `const response = await fetch("https://brag.fast/api/v1/brands", {
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
    font_family: "Inter",
  }),
})
const data = await response.json()`,
          python: `import requests

response = requests.post(
    "https://brag.fast/api/v1/brands",
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
        "font_family": "Inter",
    },
)
data = response.json()`,
        },
        responseStatus: 201,
        responseExample: `{
  "id": "brand_abc123",
  "name": "Acme Inc",
  "logo_url": "https://example.com/logo.png",
  "website": "https://acme.com",
  "font_family": "Inter",
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
        path: "/api/v1/brands/:id",
        anchor: "retrieve-brand",
        title: "Retrieve a brand",
        description: "Returns a single brand kit by ID.",
        params: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "The brand ID (path parameter).",
          },
        ],
        requestExample: {
          curl: `curl https://brag.fast/api/v1/brands/brand_abc123 \\
  -H "Authorization: Bearer bf_your_api_key"`,
          javascript: `const response = await fetch(
  "https://brag.fast/api/v1/brands/brand_abc123",
  {
    headers: {
      "Authorization": "Bearer bf_your_api_key",
    },
  }
)
const data = await response.json()`,
          python: `import requests

response = requests.get(
    "https://brag.fast/api/v1/brands/brand_abc123",
    headers={"Authorization": "Bearer bf_your_api_key"},
)
data = response.json()`,
        },
        responseStatus: 200,
        responseExample: `{
  "id": "brand_abc123",
  "name": "Acme Inc",
  "logo_url": "https://example.com/logo.png",
  "website": "https://acme.com",
  "font_family": "Inter",
  "colors": {
    "background": "#1a1a2e",
    "text": "#ffffff",
    "primary": "#e94560"
  },
  "created_at": "2026-03-01T10:00:00.000Z",
  "updated_at": "2026-03-01T10:00:00.000Z"
}`,
      },
      {
        method: "GET",
        path: "/api/v1/brands",
        anchor: "list-brands",
        title: "List all brands",
        description: "Returns all brand kits for your account.",
        requestExample: {
          curl: `curl https://brag.fast/api/v1/brands \\
  -H "Authorization: Bearer bf_your_api_key"`,
          javascript: `const response = await fetch("https://brag.fast/api/v1/brands", {
  headers: {
    "Authorization": "Bearer bf_your_api_key",
  },
})
const data = await response.json()`,
          python: `import requests

response = requests.get(
    "https://brag.fast/api/v1/brands",
    headers={"Authorization": "Bearer bf_your_api_key"},
)
data = response.json()`,
        },
        responseStatus: 200,
        responseExample: `[
  {
    "id": "brand_abc123",
    "name": "Acme Inc",
    "logo_url": "https://example.com/logo.png",
    "website": "https://acme.com",
    "font_family": "Inter",
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
          "Updates an existing brand kit. Only include the fields you want to change — partial updates are fine.",
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
              "Partial color update. Only send the colors you want to change.",
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
                description: "Accent hex color.",
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
            name: "font_family",
            type: "string",
            required: false,
            description: "New Google Font name.",
          },
        ],
        requestExample: {
          curl: `curl -X PATCH https://brag.fast/api/v1/brands/brand_abc123 \\
  -H "Authorization: Bearer bf_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "colors": { "primary": "#00ff88" }
  }'`,
          javascript: `const response = await fetch(
  "https://brag.fast/api/v1/brands/brand_abc123",
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
    "https://brag.fast/api/v1/brands/brand_abc123",
    headers={"Authorization": "Bearer bf_your_api_key"},
    json={"colors": {"primary": "#00ff88"}},
)
data = response.json()`,
        },
        responseStatus: 200,
        responseExample: `{
  "id": "brand_abc123",
  "name": "Acme Inc",
  "logo_url": "https://example.com/logo.png",
  "website": "https://acme.com",
  "font_family": "Inter",
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
          curl: `curl -X DELETE https://brag.fast/api/v1/brands/brand_abc123 \\
  -H "Authorization: Bearer bf_your_api_key"`,
          javascript: `const response = await fetch(
  "https://brag.fast/api/v1/brands/brand_abc123",
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
    "https://brag.fast/api/v1/brands/brand_abc123",
    headers={"Authorization": "Bearer bf_your_api_key"},
)
# 204 No Content on success`,
        },
        responseStatus: 204,
        responseExample: `// 204 No Content — empty response body`,
      },
    ],
  },

  // ─── Fonts ──────────────────────────────────────────────────────────
  {
    title: "Fonts",
    anchor: "fonts",
    description:
      "Browse the font menu. All fonts are sourced from Google Fonts and organized by category: Serif, Sans Serif, Display, and International. Use any font name as the font field when creating or updating a brand.",
    sampleObject: `{
  "Serif": ["Abril Fatface", "Lora", "Playfair Display", "..."],
  "Sans Serif": ["Inter", "Montserrat", "Poppins", "..."],
  "Display": ["Caveat", "Permanent Marker", "Press Start 2P", "..."],
  "International": ["Noto Sans SC", "Noto Sans JP", "..."]
}`,
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/fonts",
        anchor: "list-fonts",
        title: "List available fonts",
        description:
          "Returns all available Google Fonts grouped by category. Pick any name and use it as the font field on a brand or cook.",
        requestExample: {
          curl: `curl https://brag.fast/api/v1/fonts \\
  -H "Authorization: Bearer bf_your_api_key"`,
          javascript: `const response = await fetch("https://brag.fast/api/v1/fonts", {
  headers: {
    "Authorization": "Bearer bf_your_api_key",
  },
})
const data = await response.json()`,
          python: `import requests

response = requests.get(
    "https://brag.fast/api/v1/fonts",
    headers={"Authorization": "Bearer bf_your_api_key"},
)
data = response.json()`,
        },
        responseStatus: 200,
        responseExample: `{
  "Serif": [
    "Abril Fatface",
    "Alegreya",
    "Arvo",
    "Cormorant",
    "DM Serif Display",
    "Libre Baskerville",
    "Lora",
    "Merriweather",
    "Playfair Display",
    "..."
  ],
  "Sans Serif": [
    "Archivo",
    "Fira Sans",
    "IBM Plex Sans",
    "Lato",
    "Montserrat",
    "Open Sans",
    "Poppins",
    "Raleway",
    "Roboto",
    "..."
  ],
  "Display": [
    "Caveat",
    "Permanent Marker",
    "Press Start 2P",
    "VT323",
    "..."
  ],
  "International": [
    "Noto Sans SC",
    "Noto Sans TC",
    "Noto Sans JP",
    "Noto Sans KR"
  ]
}`,
      },
    ],
  },

  // ─── Templates ────────────────────────────────────────────────────
  {
    title: "Templates",
    anchor: "templates",
    description:
      "Templates control the layout of your images. brag.fast ships with five defaults — Standard Browser, Standard Mobile, Split Browser, Split Mobile, and Hero. You can also create custom templates or clone a default as a starting point. Reference any template by slug or ID when cooking images.",
    sampleObject: `{
  "id": "standard-browser",
  "name": "Standard Browser",
  "is_default": true,
  "objects": [
    { "id": "title", "type": "text", "data": "text" },
    { "id": "description", "type": "text", "data": "text" },
    { "id": "image", "type": "visual", "data": "url" },
    { "id": "logo", "type": "logo", "data": "auto" }
  ],
  "preview_url": null,
  "created_at": "2026-01-01T00:00:00.000Z",
  "updated_at": "2026-01-01T00:00:00.000Z"
}`,
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/templates",
        anchor: "list-templates",
        title: "List all templates",
        description:
          "Returns the three default templates plus any custom templates you've created.",
        requestExample: {
          curl: `curl https://brag.fast/api/v1/templates \\
  -H "Authorization: Bearer bf_your_api_key"`,
          javascript: `const response = await fetch("https://brag.fast/api/v1/templates", {
  headers: {
    "Authorization": "Bearer bf_your_api_key",
  },
})
const data = await response.json()`,
          python: `import requests

response = requests.get(
    "https://brag.fast/api/v1/templates",
    headers={"Authorization": "Bearer bf_your_api_key"},
)
data = response.json()`,
        },
        responseStatus: 200,
        responseExample: `{
  "templates": [
    {
      "id": "standard-browser",
      "name": "Standard Browser",
      "is_default": true,
      "config": { "..." },
      "preview_url": null,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "tmpl_abc123def456",
      "name": "My Custom Template",
      "is_default": false,
      "config": { "..." },
      "preview_url": "https://cdn.brag.fast/previews/tmpl_abc123.jpg",
      "created_at": "2026-03-01T10:00:00.000Z",
      "updated_at": "2026-03-05T14:30:00.000Z"
    }
  ]
}`,
      },
      {
        method: "GET",
        path: "/api/v1/templates/:id",
        anchor: "retrieve-template",
        title: "Retrieve a template",
        description:
          "Returns a single template by ID, including its configurable objects with their current defaults. Each object shows the properties you can override in your cook's slides.objects array — use the same field names.",
        params: [
          {
            name: "id",
            type: "string",
            required: true,
            description:
              'A default slug ("standard-browser", "standard-mobile", "split-browser", "split-mobile", "hero") or a custom template ID ("tmpl_abc123").',
          },
        ],
        requestExample: {
          curl: `curl https://brag.fast/api/v1/templates/standard-browser \\
  -H "Authorization: Bearer bf_your_api_key"`,
          javascript: `const response = await fetch(
  "https://brag.fast/api/v1/templates/standard-browser",
  {
    headers: {
      "Authorization": "Bearer bf_your_api_key",
    },
  }
)
const data = await response.json()`,
          python: `import requests

response = requests.get(
    "https://brag.fast/api/v1/templates/standard-browser",
    headers={"Authorization": "Bearer bf_your_api_key"},
)
data = response.json()`,
        },
        responseStatus: 200,
        responseExample: `{
  "id": "standard-browser",
  "name": "Standard Browser",
  "is_default": true,
  "objects": [
    { "id": "title", "type": "text", "text": null, "font_family": null, "color": "#EFFBF9" },
    { "id": "description", "type": "text", "text": null, "font_family": null, "color": "#EFFBF9" },
    { "id": "image", "type": "visual", "image_url": null, "video_url": null, "visual_frame": "browser", "visual_frame_color": "#E8E8E8", "anchor_x": "center", "anchor_y": "top" },
    { "id": "logo", "type": "logo" }
  ],
  "preview_url": null,
  "created_at": "2026-01-01T00:00:00.000Z",
  "updated_at": "2026-01-01T00:00:00.000Z"
}`,
      },
      {
        method: "POST",
        path: "/api/v1/templates",
        anchor: "create-template",
        title: "Create a template",
        description:
          "Creates a new custom template. You can use the block-based format or the full v2 canvas config for pixel-perfect control.",
        params: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "Template name.",
          },
          {
            name: "config",
            type: "object",
            required: true,
            description:
              "Template layout config. Use blocks (1\u20138 items) for simple layouts, or a v2 canvas config for full control.",
          },
        ],
        requestExample: {
          curl: `curl -X POST https://brag.fast/api/v1/templates \\
  -H "Authorization: Bearer bf_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My Custom Template",
    "config": {
      "blocks": [
        { "type": "title" },
        { "type": "description" },
        { "type": "visual" },
        { "type": "logo" }
      ]
    }
  }'`,
          javascript: `const response = await fetch("https://brag.fast/api/v1/templates", {
  method: "POST",
  headers: {
    "Authorization": "Bearer bf_your_api_key",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "My Custom Template",
    config: {
      blocks: [
        { type: "title" },
        { type: "description" },
        { type: "visual" },
        { type: "logo" },
      ],
    },
  }),
})
const data = await response.json()`,
          python: `import requests

response = requests.post(
    "https://brag.fast/api/v1/templates",
    headers={"Authorization": "Bearer bf_your_api_key"},
    json={
        "name": "My Custom Template",
        "config": {
            "blocks": [
                {"type": "title"},
                {"type": "description"},
                {"type": "visual"},
                {"type": "logo"},
            ]
        },
    },
)
data = response.json()`,
        },
        responseStatus: 201,
        responseExample: `{
  "id": "tmpl_abc123def456",
  "name": "My Custom Template",
  "is_default": false,
  "config": {
    "blocks": [
      { "type": "title" },
      { "type": "description" },
      { "type": "visual" },
      { "type": "logo" }
    ]
  },
  "created_at": "2026-03-09T12:00:00.000Z"
}`,
      },
      {
        method: "PATCH",
        path: "/api/v1/templates/:id",
        anchor: "update-template",
        title: "Update a template",
        description:
          "Updates a custom template. Default templates can't be modified — clone them first.",
        params: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "The template ID (path parameter). Must be a custom template.",
          },
          {
            name: "name",
            type: "string",
            required: false,
            description: "New template name.",
          },
          {
            name: "config",
            type: "object",
            required: false,
            description: "New layout configuration.",
          },
        ],
        requestExample: {
          curl: `curl -X PATCH https://brag.fast/api/v1/templates/tmpl_abc123def456 \\
  -H "Authorization: Bearer bf_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Updated Template Name"
  }'`,
          javascript: `const response = await fetch(
  "https://brag.fast/api/v1/templates/tmpl_abc123def456",
  {
    method: "PATCH",
    headers: {
      "Authorization": "Bearer bf_your_api_key",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Updated Template Name",
    }),
  }
)
const data = await response.json()`,
          python: `import requests

response = requests.patch(
    "https://brag.fast/api/v1/templates/tmpl_abc123def456",
    headers={"Authorization": "Bearer bf_your_api_key"},
    json={"name": "Updated Template Name"},
)
data = response.json()`,
        },
        responseStatus: 200,
        responseExample: `{
  "id": "tmpl_abc123def456",
  "name": "Updated Template Name",
  "is_default": false,
  "config": { "..." },
  "preview_url": "https://cdn.brag.fast/previews/tmpl_abc123.jpg",
  "created_at": "2026-03-01T10:00:00.000Z",
  "updated_at": "2026-03-09T12:00:00.000Z"
}`,
      },
      {
        method: "DELETE",
        path: "/api/v1/templates/:id",
        anchor: "delete-template",
        title: "Delete a template",
        description:
          "Permanently deletes a custom template. Default templates can't be deleted.",
        params: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "The template ID (path parameter). Must be a custom template.",
          },
        ],
        requestExample: {
          curl: `curl -X DELETE https://brag.fast/api/v1/templates/tmpl_abc123def456 \\
  -H "Authorization: Bearer bf_your_api_key"`,
          javascript: `const response = await fetch(
  "https://brag.fast/api/v1/templates/tmpl_abc123def456",
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
    "https://brag.fast/api/v1/templates/tmpl_abc123def456",
    headers={"Authorization": "Bearer bf_your_api_key"},
)
# 204 No Content on success`,
        },
        responseStatus: 204,
        responseExample: `// 204 No Content — empty response body`,
      },
      {
        method: "POST",
        path: "/api/v1/templates/:id/clone",
        anchor: "clone-template",
        title: "Clone a template",
        description:
          "Creates a copy of any template — including defaults. The clone is a new custom template you can tweak however you like.",
        params: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "The source template ID (path parameter).",
          },
          {
            name: "name",
            type: "string",
            required: false,
            description:
              "Name for the clone. Defaults to the source template's name.",
          },
        ],
        requestExample: {
          curl: `curl -X POST https://brag.fast/api/v1/templates/standard-browser/clone \\
  -H "Authorization: Bearer bf_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My Standard Variant"
  }'`,
          javascript: `const response = await fetch(
  "https://brag.fast/api/v1/templates/standard-browser/clone",
  {
    method: "POST",
    headers: {
      "Authorization": "Bearer bf_your_api_key",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "My Standard Variant",
    }),
  }
)
const data = await response.json()`,
          python: `import requests

response = requests.post(
    "https://brag.fast/api/v1/templates/standard-browser/clone",
    headers={"Authorization": "Bearer bf_your_api_key"},
    json={"name": "My Standard Variant"},
)
data = response.json()`,
        },
        responseStatus: 201,
        responseExample: `{
  "id": "tmpl_def789ghi012",
  "name": "My Standard Variant",
  "is_default": false,
  "config": { "..." },
  "created_at": "2026-03-09T12:00:00.000Z",
  "updated_at": "2026-03-09T12:00:00.000Z"
}`,
      },
      {
        method: "POST",
        path: "/api/v1/templates/:id/preview",
        anchor: "preview-template",
        title: "Preview a template",
        description:
          "Generates a JPEG preview of the template with placeholder content. Returns the image directly (not JSON). Handy for seeing what a template looks like before using it in a cook. Optionally pass a format in the request body to preview a specific aspect ratio.",
        params: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "The template ID (path parameter). Works with defaults and custom templates.",
          },
          {
            name: "format",
            type: "string",
            required: false,
            description:
              'The format to preview: "landscape", "square", or "portrait". Defaults to "landscape".',
          },
        ],
        requestExample: {
          curl: `# Landscape (default)
curl -X POST https://brag.fast/api/v1/templates/standard-browser/preview \\
  -H "Authorization: Bearer bf_your_api_key" \\
  --output preview.jpg

# Square format
curl -X POST https://brag.fast/api/v1/templates/standard-browser/preview \\
  -H "Authorization: Bearer bf_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"format": "square"}' \\
  --output preview-square.jpg`,
          javascript: `// Landscape (default)
const response = await fetch(
  "https://brag.fast/api/v1/templates/standard-browser/preview",
  {
    method: "POST",
    headers: {
      "Authorization": "Bearer bf_your_api_key",
    },
  }
)

// Square format
const response = await fetch(
  "https://brag.fast/api/v1/templates/standard-browser/preview",
  {
    method: "POST",
    headers: {
      "Authorization": "Bearer bf_your_api_key",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ format: "square" }),
  }
)
const blob = await response.blob()
// Save or display the JPEG image`,
          python: `import requests

# Landscape (default)
response = requests.post(
    "https://brag.fast/api/v1/templates/standard-browser/preview",
    headers={"Authorization": "Bearer bf_your_api_key"},
)

# Square format
response = requests.post(
    "https://brag.fast/api/v1/templates/standard-browser/preview",
    headers={"Authorization": "Bearer bf_your_api_key"},
    json={"format": "square"},
)
with open("preview.jpg", "wb") as f:
    f.write(response.content)`,
        },
        responseStatus: 200,
        responseExample: `// Returns a JPEG image (Content-Type: image/jpeg)
// Dimensions depend on format: landscape (1200x675), square (1080x1080), portrait (1080x1350)`,
      },
    ],
  },

]
