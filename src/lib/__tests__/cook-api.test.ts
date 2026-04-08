/**
 * Live API integration tests for POST /api/v1/cook
 * Runs against the deployed endpoint — validation tests are free (no credits),
 * happy path tests consume credits.
 */
import { describe, test, expect } from "vitest";

const BASE_URL = "https://bragfast.vercel.app/api/v1/cook";
const API_KEY = "bf_YuSsx6h30p7w6bW0vOPz2FKn1sxm96y0HZuvuSeB";
const VERCEL_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJicmFnZmFzdC52ZXJjZWwuYXBwIiwic3ViIjoicHJvdGVjdGlvbi1ieXBhc3MtdXJsIiwiZXhwIjoxNzc0MzQ1NjczLCJieXBhc3MiOiJ6NjNHQmNSd0RaTEdSYkFoQTZ5OGVLaDcwT0JET0JZNiIsImlhdCI6MTc3NDI2Mjg3OX0.MQRuzcFt7WCkLsR2FM_Jun3aETQYE_MORzNNiQGKmUY";

async function cookPost(
  body: unknown,
  opts?: { headers?: Record<string, string>; rawBody?: string; skipAuth?: boolean }
) {
  const headers: Record<string, string> = {
    ...(opts?.skipAuth ? {} : { Authorization: `Bearer ${API_KEY}` }),
    "Content-Type": "application/json",
    Cookie: `_vercel_jwt=${VERCEL_JWT}`,
    ...opts?.headers,
  };
  return fetch(BASE_URL, {
    method: "POST",
    headers,
    body: opts?.rawBody ?? JSON.stringify(body),
  });
}

function minimalBody() {
  return {
    formats: [{ name: "landscape", slides: [{}] }],
  };
}

function slide(objects?: Record<string, unknown>[]) {
  return objects ? { objects } : {};
}

// ── 1. Authentication ─────────────────────────────────────────────

describe.sequential("Authentication", () => {
  test("no Authorization header → 401", async () => {
    const res = await cookPost(minimalBody(), { skipAuth: true });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized");
  });

  test("invalid API key → 401", async () => {
    const res = await cookPost(minimalBody(), {
      skipAuth: true,
      headers: { Authorization: "Bearer bf_invalid_key_12345" },
    });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized");
  });
});

// ── 2. Request Body Parsing ───────────────────────────────────────

describe.sequential("Request body parsing", () => {
  test("non-JSON body → 400", async () => {
    const res = await cookPost(null, {
      rawBody: "this is not json",
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid JSON");
  });
});

// ── 3. Color Validation ──────────────────────────────────────────

describe.sequential("Color validation", () => {
  test("valid hex colors proceed past color validation", async () => {
    const res = await cookPost({
      ...minimalBody(),
      colors: { background: "#FFF", text: "#1a1a2e", primary: "#F00" },
    });
    // Should not get a color error — may get 202 or another validation error
    const data = await res.json();
    if (data.error) {
      expect(data.error).not.toContain("colors.");
    }
  });

  test("invalid colors.background → 400", async () => {
    const res = await cookPost({
      ...minimalBody(),
      colors: { background: "red" },
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("colors.background");
  });

  test("invalid colors.text → 400", async () => {
    const res = await cookPost({
      ...minimalBody(),
      colors: { text: "nothex" },
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("colors.text");
  });

  test("invalid colors.primary → 400", async () => {
    const res = await cookPost({
      ...minimalBody(),
      colors: { primary: "#ZZZZZZ" },
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("colors.primary");
  });
});

// ── 4. Brand Resolution ──────────────────────────────────────────

describe.sequential("Brand resolution", () => {
  test("non-existent brand_id → 404", async () => {
    const res = await cookPost({
      ...minimalBody(),
      brand_id: "brand_doesnotexist99999",
    });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Brand not found");
  });
});

// ── 5. Format Validation ─────────────────────────────────────────

describe.sequential("Format validation", () => {
  test("missing formats field → 400", async () => {
    const res = await cookPost({});
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("formats is required");
  });

  test("empty formats array → 400", async () => {
    const res = await cookPost({ formats: [] });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("formats is required");
  });

  test("invalid format name → 400", async () => {
    const res = await cookPost({
      formats: [{ name: "widescreen", slides: [{}] }],
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid format");
  });

  test("duplicate format name → 400", async () => {
    const res = await cookPost({
      formats: [
        { name: "landscape", slides: [{}] },
        { name: "landscape", slides: [{}] },
      ],
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Duplicate format");
  });

  test("format with empty slides array → 400", async () => {
    const res = await cookPost({
      formats: [{ name: "landscape", slides: [] }],
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("at least 1 slide");
  });

  test("format with missing slides field → 400", async () => {
    const res = await cookPost({
      formats: [{ name: "landscape" }],
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("at least 1 slide");
  });

  test("format with 6 slides → 400", async () => {
    const res = await cookPost({
      formats: [
        { name: "landscape", slides: [{}, {}, {}, {}, {}, {}] },
      ],
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("maximum 5 slides");
  });

  test("objects is a string instead of array → 400", async () => {
    const res = await cookPost({
      formats: [
        { name: "landscape", slides: [{ objects: "not-an-array" }] },
      ],
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("objects must be an array");
  });

  test("object without id field → 400", async () => {
    const res = await cookPost({
      formats: [
        { name: "landscape", slides: [slide([{ text: "hello" }])] },
      ],
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("requires a string id");
  });

  test("invalid image_frame → 400", async () => {
    const res = await cookPost({
      formats: [
        {
          name: "landscape",
          slides: [slide([{ id: "img1", image_frame: "tablet" }])],
        },
      ],
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("image_frame");
  });

  test("invalid anchor_x → 400", async () => {
    const res = await cookPost({
      formats: [
        {
          name: "landscape",
          slides: [slide([{ id: "img1", anchor_x: "middle" }])],
        },
      ],
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("anchor_x");
  });
});

// ── 6. Video Validation ──────────────────────────────────────────

describe.sequential("Video validation", () => {
  test("video: true with too many slides exceeds 60s → 400", async () => {
    // 5 slides per format × 5s default = 25s per format, but maxSlides = 5
    // Use duration 15 with 5 slides = 75s > 60s
    const slides = Array.from({ length: 5 }, () => ({}));
    const res = await cookPost({
      video: { duration: 13 },
      formats: [{ name: "landscape", slides }],
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("exceeds 60s");
  });

  test("video duration below minimum (2s) → 400", async () => {
    const res = await cookPost({
      video: { duration: 2 },
      formats: [{ name: "landscape", slides: [{}] }],
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("between 3 and 30");
  });

  test("video duration above maximum (31s) → 400", async () => {
    const res = await cookPost({
      video: { duration: 31 },
      formats: [{ name: "landscape", slides: [{}] }],
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("between 3 and 30");
  });

  test("video total duration exceeds 60s → 400", async () => {
    const slides = Array.from({ length: 5 }, () => ({}));
    const res = await cookPost({
      video: { duration: 15 },
      formats: [{ name: "landscape", slides }],
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("exceeds 60s");
  });

  test("video: invalid type → 400", async () => {
    const res = await cookPost({
      video: "yes",
      formats: [{ name: "landscape", slides: [{}] }],
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("video must be true or");
  });
});

// ── 7. Template Validation ───────────────────────────────────────

describe.sequential("Template validation", () => {
  test("invalid template name → 400", async () => {
    const res = await cookPost({
      ...minimalBody(),
      template: "my-custom-template",
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid template");
  });

  test("valid built-in template 'hero' → no template error", async () => {
    const res = await cookPost({
      ...minimalBody(),
      template: "hero",
    });
    const data = await res.json();
    if (data.error) {
      expect(data.error).not.toContain("Invalid template");
    }
  });

  test("tmpl_ prefix accepted → no template error", async () => {
    const res = await cookPost({
      ...minimalBody(),
      template: "tmpl_test123",
    });
    const data = await res.json();
    if (data.error) {
      expect(data.error).not.toContain("Invalid template");
    }
  });
});

// ── 8. Image Happy Path ──────────────────────────────────────────

describe.sequential("Image happy path", () => {
  test("minimal request → 202 with correct response shape", async () => {
    const res = await cookPost(minimalBody());
    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.cook_id).toMatch(/^cook_/);
    expect(data.output).toBe("image");
    expect(data.status).toBe("pending");
    expect(data.images).toBeNull();
    expect(data.credits_used).toBe(1);
    expect(typeof data.credits_remaining).toBe("number");
    expect(data.created_at).toBeDefined();
  });

  test("with colors + name + template → 202", async () => {
    const res = await cookPost({
      ...minimalBody(),
      name: "Test Brand",
      template: "split-browser",
      colors: { background: "#1a1a2e", text: "#FFFFFF", primary: "#e94560" },
    });
    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.cook_id).toMatch(/^cook_/);
    expect(data.credits_used).toBe(1);
  });

  test("with object overrides → 202", async () => {
    const res = await cookPost({
      formats: [
        {
          name: "landscape",
          slides: [
            slide([
              {
                id: "title",
                text: "Hello World",
                color: "#FF0000",
                font_family: "Inter",
                image_frame: "browser",
                anchor_x: "center",
                anchor_y: "top",
              },
            ]),
          ],
        },
      ],
    });
    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.cook_id).toMatch(/^cook_/);
  });

  test("multiple formats → 202, credits = 2", async () => {
    const res = await cookPost({
      formats: [
        { name: "landscape", slides: [{}] },
        { name: "square", slides: [{}] },
      ],
    });
    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.credits_used).toBe(2);
  });

  test("split-mobile template, multiple slides → 202, credits = 3", async () => {
    const res = await cookPost({
      template: "split-mobile",
      formats: [
        {
          name: "landscape",
          slides: [
            slide([{ id: "title", text: "Slide 1" }]),
            slide([{ id: "title", text: "Slide 2" }]),
            slide([{ id: "title", text: "Slide 3" }]),
          ],
        },
      ],
    });
    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.credits_used).toBe(3);
  });

  test("hero template, 2 formats × 2 slides → 202, credits = 4", async () => {
    const res = await cookPost({
      template: "hero",
      formats: [
        { name: "square", slides: [{}, {}] },
        { name: "portrait", slides: [{}, {}] },
      ],
    });
    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.credits_used).toBe(4);
  });

  test("standard-mobile template, max 5 slides → 202, credits = 5", async () => {
    const res = await cookPost({
      template: "standard-mobile",
      formats: [
        { name: "landscape", slides: [{}, {}, {}, {}, {}] },
      ],
    });
    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.credits_used).toBe(5);
  });
});

// ── 9. Video Happy Path ─────────────────────────────────────────

describe.sequential("Video happy path", () => {
  test("video: true, 1 format, 1 slide → 202, output: video, credits: 5", async () => {
    const res = await cookPost({
      video: true,
      formats: [{ name: "landscape", slides: [{}] }],
    });
    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.cook_id).toMatch(/^cook_/);
    expect(data.output).toBe("video");
    expect(data.status).toBe("pending");
    expect(data.credits_used).toBe(5);
  });

  test("video with custom duration → 202, credits: 5", async () => {
    const res = await cookPost({
      video: { duration: 3 },
      formats: [{ name: "landscape", slides: [{}] }],
    });
    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.output).toBe("video");
    expect(data.credits_used).toBe(5);
  });

  test("video with split-mobile template, 3 slides → 202, credits = 15", async () => {
    const res = await cookPost({
      video: { duration: 4 },
      template: "split-mobile",
      formats: [
        {
          name: "portrait",
          slides: [
            slide([{ id: "title", text: "Intro" }]),
            slide([{ id: "title", text: "Middle" }]),
            slide([{ id: "title", text: "Outro" }]),
          ],
        },
      ],
    });
    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.output).toBe("video");
    expect(data.credits_used).toBe(15);
  });

  test("video with 2 formats, multiple slides → 202, credits = 25", async () => {
    const res = await cookPost({
      video: true,
      template: "hero",
      formats: [
        { name: "landscape", slides: [{}, {}, {}] },
        { name: "square", slides: [{}, {}] },
      ],
    });
    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.credits_used).toBe(25);
  });
});

// ── 10. Metadata & Webhook ───────────────────────────────────────

describe.sequential("Metadata and webhook", () => {
  test("metadata and webhook_url echoed in response", async () => {
    const res = await cookPost({
      ...minimalBody(),
      metadata: "test-run-123",
      webhook_url: "https://example.com/webhook",
    });
    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.metadata).toBe("test-run-123");
    expect(data.webhook_url).toBe("https://example.com/webhook");
  });
});

// ── 11. Edge Cases ───────────────────────────────────────────────

describe.sequential("Edge cases", () => {
  test("video: false → image mode", async () => {
    const res = await cookPost({
      ...minimalBody(),
      video: false,
    });
    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.output).toBe("image");
  });

  test("slide with empty objects array → 202", async () => {
    const res = await cookPost({
      formats: [{ name: "landscape", slides: [{ objects: [] }] }],
    });
    expect(res.status).toBe(202);
  });

  test("all 3 formats, 1 slide each → 202, credits: 3", async () => {
    const res = await cookPost({
      formats: [
        { name: "landscape", slides: [{}] },
        { name: "square", slides: [{}] },
        { name: "portrait", slides: [{}] },
      ],
    });
    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.credits_used).toBe(3);
  });
});

// ── 12. Status Polling ───────────────────────────────────────────

describe.sequential("Status polling", () => {
  test("GET /cook/{id} returns release status", { timeout: 15000 }, async () => {
    // First create a release
    const createRes = await cookPost(minimalBody());
    expect(createRes.status).toBe(202);
    const { cook_id } = await createRes.json();

    // Poll status
    const statusRes = await fetch(`${BASE_URL}/${cook_id}`, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        Cookie: `_vercel_jwt=${VERCEL_JWT}`,
      },
    });
    expect(statusRes.status).toBe(200);
    const data = await statusRes.json();
    expect(data.cook_id).toBe(cook_id);
    expect(["pending", "completed", "failed", "pending_review", "dismissed"]).toContain(
      data.status
    );
  });
});
