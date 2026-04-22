/**
 * Live API integration tests for POST /api/v1/cook/image and /api/v1/cook/video
 * Runs against the deployed endpoint — validation tests are free (no credits),
 * happy path tests consume credits.
 */
import { describe, test, expect } from "vitest";

const BASE = process.env.TEST_BASE_URL ?? "https://bragfast.vercel.app/api/v1";
const IMAGE_URL = `${BASE}/cook/image`;
const VIDEO_URL = `${BASE}/cook/video`;
const POLL_URL = `${BASE}/cook`;
const API_KEY = process.env.TEST_API_KEY ?? "";
const VERCEL_JWT = process.env.TEST_VERCEL_JWT ?? "";

if (!API_KEY) {
  throw new Error(
    "TEST_API_KEY env var is required for cook-api.test.ts. Set it in .env.test or CI secrets."
  );
}

async function post(
  url: string,
  body: unknown,
  opts?: { headers?: Record<string, string>; rawBody?: string; skipAuth?: boolean }
) {
  const headers: Record<string, string> = {
    ...(opts?.skipAuth ? {} : { Authorization: `Bearer ${API_KEY}` }),
    "Content-Type": "application/json",
    Cookie: `_vercel_jwt=${VERCEL_JWT}`,
    ...opts?.headers,
  };
  return fetch(url, {
    method: "POST",
    headers,
    body: opts?.rawBody ?? JSON.stringify(body),
  });
}

// Image route is the default for shared validation tests — video-specific tests
// explicitly use postVideo below.
async function cookPost(
  body: unknown,
  opts?: { headers?: Record<string, string>; rawBody?: string; skipAuth?: boolean }
) {
  return post(IMAGE_URL, body, opts);
}

async function cookPostVideo(
  body: unknown,
  opts?: { headers?: Record<string, string>; rawBody?: string; skipAuth?: boolean }
) {
  return post(VIDEO_URL, body, opts);
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

  test("invalid visual_frame → 400", async () => {
    const res = await cookPost({
      formats: [
        {
          name: "landscape",
          slides: [slide([{ id: "img1", visual_frame: "tablet" }])],
        },
      ],
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("visual_frame");
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

describe.sequential("Video validation (on /cook/video)", () => {
  test("video: true with too many slides exceeds 60s → 400", async () => {
    const slides = Array.from({ length: 5 }, () => ({}));
    const res = await cookPostVideo({
      video: { duration: 13 },
      formats: [{ name: "landscape", slides }],
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("exceeds 60s");
  });

  test("video duration below minimum (2s) → 400", async () => {
    const res = await cookPostVideo({
      video: { duration: 2 },
      formats: [{ name: "landscape", slides: [{}] }],
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("between 3 and 30");
  });

  test("video duration above maximum (31s) → 400", async () => {
    const res = await cookPostVideo({
      video: { duration: 31 },
      formats: [{ name: "landscape", slides: [{}] }],
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("between 3 and 30");
  });

  test("video total duration exceeds 60s → 400", async () => {
    const slides = Array.from({ length: 5 }, () => ({}));
    const res = await cookPostVideo({
      video: { duration: 15 },
      formats: [{ name: "landscape", slides }],
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("exceeds 60s");
  });

  test("video: invalid type (string) → 400", async () => {
    const res = await cookPostVideo({
      video: "yes",
      formats: [{ name: "landscape", slides: [{}] }],
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("video must be true or");
  });

  test("video: false → 400 (not image fallback)", async () => {
    const res = await cookPostVideo({
      video: false,
      formats: [{ name: "landscape", slides: [{}] }],
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("video must be true or");
  });

  test("video: 0 → 400", async () => {
    const res = await cookPostVideo({
      video: 0,
      formats: [{ name: "landscape", slides: [{}] }],
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("video must be true or");
  });

  test("video: {} → 202 (empty object uses defaults)", async () => {
    const res = await cookPostVideo({
      video: {},
      formats: [{ name: "landscape", slides: [{}] }],
    });
    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.output).toBe("video");
  });

  test("non-existent brand_id on /cook/video → 404", async () => {
    const res = await cookPostVideo({
      brand_id: "brand_doesnotexist99999",
      formats: [{ name: "landscape", slides: [{}] }],
    });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Brand not found");
  });

  test("non-string brand_id → 400 (not 500)", async () => {
    const res = await cookPost({
      brand_id: { $ne: null } as unknown as string,
      formats: [{ name: "landscape", slides: [{}] }],
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("brand_id must be a non-empty string");
  });
});

describe.sequential("Image route rejects video field", () => {
  test("video: true on /cook/image → 400", async () => {
    const res = await cookPost({
      video: true,
      formats: [{ name: "landscape", slides: [{}] }],
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("video field is not allowed");
  });

  test("video: { duration: 5 } on /cook/image → 400", async () => {
    const res = await cookPost({
      video: { duration: 5 },
      formats: [{ name: "landscape", slides: [{}] }],
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("video field is not allowed");
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
                visual_frame: "browser",
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
  test("video omitted, 1 format, 1 slide → 202, output: video, credits: 5", async () => {
    const res = await cookPostVideo({
      formats: [{ name: "landscape", slides: [{}] }],
    });
    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.cook_id).toMatch(/^cook_/);
    expect(data.output).toBe("video");
    expect(data.status).toBe("pending");
    expect(data.credits_used).toBe(5);
  });

  test("video: true → 202, credits: 5", async () => {
    const res = await cookPostVideo({
      video: true,
      formats: [{ name: "landscape", slides: [{}] }],
    });
    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.output).toBe("video");
    expect(data.credits_used).toBe(5);
  });

  test("video with custom duration → 202, credits: 5", async () => {
    const res = await cookPostVideo({
      video: { duration: 3 },
      formats: [{ name: "landscape", slides: [{}] }],
    });
    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.output).toBe("video");
    expect(data.credits_used).toBe(5);
  });

  test("video with split-mobile template, 3 slides → 202, credits = 15", async () => {
    const res = await cookPostVideo({
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
    const res = await cookPostVideo({
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
  test("video: false on /cook/image → 400 (any video field rejected)", async () => {
    const res = await cookPost({
      ...minimalBody(),
      video: false,
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("video field is not allowed");
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

    // Poll status (unified /cook/[id] endpoint)
    const statusRes = await fetch(`${POLL_URL}/${cook_id}`, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        Cookie: `_vercel_jwt=${VERCEL_JWT}`,
      },
    });
    expect(statusRes.status).toBe(200);
    const data = await statusRes.json();
    expect(data.cook_id).toBe(cook_id);
    expect(["pending", "completed", "failed"]).toContain(
      data.status
    );
  });
});
