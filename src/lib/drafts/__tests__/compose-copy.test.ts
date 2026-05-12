import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = { create: mockCreate };
  }
  return { default: MockAnthropic };
});

import { composeCopy, rewriteCopyForClass } from "../compose-copy";

beforeEach(() => {
  mockCreate.mockReset();
});

function textResponse(text: string) {
  return { content: [{ type: "text", text }] };
}

describe("composeCopy — happy paths", () => {
  it("pr_merged returns typed copy from Haiku", async () => {
    mockCreate.mockResolvedValue(
      textResponse(
        '{"title":"New dashboard widget","description":"Per-repo stats at a glance."}',
      ),
    );
    const copy = await composeCopy({
      type: "pr_merged",
      title: "Add dashboard widget",
      body: "Adds a per-repo stats widget.",
      repoFullName: "rob/brag.fast",
    });
    expect(copy.title).toBe("New dashboard widget");
    expect(copy.description).toBe("Per-repo stats at a glance.");
  });

  it("pr_merged prompt asks Haiku to announce one user-facing feature", async () => {
    mockCreate.mockResolvedValue(
      textResponse(
        '{"title":"Added carousel template","description":"You can now create carousel posts."}',
      ),
    );
    await composeCopy({
      type: "pr_merged",
      title:
        "feat(carousel): consolidate templates, PNG decorations, editor polish",
      body: `Summary
- Collapse 4 carousel templates into a single carousel-slide
- Migrate decorative arcs from inline SVG to PNG assets
- Align carousel-slide palette and font
- Fix preview regression`,
      repoFullName: "rob/brag.fast",
    });

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.system).toContain("Pick the one thing worth announcing");
    expect(callArgs.system).toContain(
      "Ignore implementation details, refactors, polish, tests, dependency bumps, and minor bug fixes",
    );
    expect(callArgs.system).toContain("announce only the feature");
    expect(callArgs.system).toContain("what users can now do");
    expect(callArgs.max_tokens).toBe(250);
  });

  it("mrr returns typed copy", async () => {
    mockCreate.mockResolvedValue(
      textResponse('{"title":"$1k MRR","description":"Thank you to everyone."}'),
    );
    const copy = await composeCopy({ type: "mrr", threshold: 1000 });
    expect(copy.title).toBe("$1k MRR");
  });

  it("first_sale returns typed copy", async () => {
    mockCreate.mockResolvedValue(
      textResponse(
        '{"title":"First customer!","description":"Someone bought this."}',
      ),
    );
    const copy = await composeCopy({ type: "first_sale" });
    expect(copy.title).toBe("First customer!");
  });

  it("visitors returns typed copy with posthog source", async () => {
    mockCreate.mockResolvedValue(
      textResponse(
        '{"title":"10k visitors","description":"In the last 30 days."}',
      ),
    );
    const copy = await composeCopy({
      type: "visitors",
      source: "posthog",
      threshold: 10000,
    });
    expect(copy.title).toBe("10k visitors");
  });

  it("star returns typed copy", async () => {
    mockCreate.mockResolvedValue(
      textResponse(
        '{"title":"100 stars","description":"Thank you, contributors."}',
      ),
    );
    const copy = await composeCopy({
      type: "star",
      repoFullName: "rob/brag.fast",
      threshold: 100,
    });
    expect(copy.title).toBe("100 stars");
  });
});

describe("composeCopy — fallbacks", () => {
  it("pr_merged fallback uses PR title when Haiku returns gibberish", async () => {
    mockCreate.mockResolvedValue(textResponse("no json at all"));
    const copy = await composeCopy({
      type: "pr_merged",
      title: "Fix typo in README",
      body: "",
      repoFullName: "rob/brag.fast",
    });
    expect(copy.title).toBe("Fix typo in README");
    expect(copy.description).toBe("");
  });

  it("mrr fallback uses formatted dollar amount", async () => {
    mockCreate.mockRejectedValue(new Error("down"));
    const copy = await composeCopy({ type: "mrr", threshold: 500 });
    expect(copy.title).toBe("$500 MRR");
  });

  it("first_sale fallback", async () => {
    mockCreate.mockRejectedValue(new Error("down"));
    const copy = await composeCopy({ type: "first_sale" });
    expect(copy.title).toBe("First paying customer");
  });

  it("star fallback uses repo name", async () => {
    mockCreate.mockRejectedValue(new Error("down"));
    const copy = await composeCopy({
      type: "star",
      repoFullName: "rob/brag.fast",
      threshold: 1000,
    });
    expect(copy.title).toBe("1k stars on rob/brag.fast");
  });
});

describe("composeCopy — truncation", () => {
  it("truncates overlong title to 80 chars", async () => {
    const longTitle = "x".repeat(300);
    mockCreate.mockResolvedValue(
      textResponse(
        JSON.stringify({ title: longTitle, description: "desc" }),
      ),
    );
    const copy = await composeCopy({ type: "mrr", threshold: 1000 });
    expect(copy.title.length).toBe(80);
  });

  it("truncates overlong description to 220 chars", async () => {
    const longDesc = "y".repeat(1000);
    mockCreate.mockResolvedValue(
      textResponse(
        JSON.stringify({ title: "Hi", description: longDesc }),
      ),
    );
    const copy = await composeCopy({ type: "mrr", threshold: 1000 });
    expect(copy.description.length).toBe(220);
  });
});

describe("composeCopy — confidence", () => {
  it("parses confidence when Haiku returns it", async () => {
    mockCreate.mockResolvedValue(
      textResponse(
        '{"title":"New widget","description":"d","confidence":0.82}',
      ),
    );
    const copy = await composeCopy({
      type: "pr_merged",
      title: "Add widget",
      body: "Adds widget.",
      repoFullName: "rob/brag.fast",
    });
    expect(copy.confidence).toBe(0.82);
  });

  it("defaults confidence to 0 when omitted", async () => {
    mockCreate.mockResolvedValue(
      textResponse('{"title":"x","description":"y"}'),
    );
    const copy = await composeCopy({ type: "mrr", threshold: 1000 });
    expect(copy.confidence).toBe(0);
  });

  it("clamps confidence into [0,1] via .catch when out of range", async () => {
    mockCreate.mockResolvedValue(
      textResponse('{"title":"x","description":"y","confidence":2.5}'),
    );
    const copy = await composeCopy({ type: "mrr", threshold: 1000 });
    expect(copy.confidence).toBe(0);
  });

  it("fallback returns confidence 0 on SDK failure", async () => {
    mockCreate.mockRejectedValue(new Error("down"));
    const copy = await composeCopy({
      type: "pr_merged",
      title: "Fix",
      body: "",
      repoFullName: "rob/brag.fast",
    });
    expect(copy.confidence).toBe(0);
  });

  it("system prompt includes confidence rubric", async () => {
    mockCreate.mockResolvedValue(
      textResponse('{"title":"x","description":"y","confidence":0.9}'),
    );
    await composeCopy({ type: "mrr", threshold: 1000 });
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.system).toContain("Confidence rubric");
    expect(callArgs.system).toContain("Score conservatively");
  });
});

describe("composeCopy — platform variants", () => {
  it("includes X platform guide when platform=x", async () => {
    mockCreate.mockResolvedValue(
      textResponse('{"title":"x","description":"y"}'),
    );
    await composeCopy({ type: "mrr", threshold: 1000, platform: "x" });
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain("X (Twitter)");
  });

  it("includes LinkedIn platform guide when platform=linkedin", async () => {
    mockCreate.mockResolvedValue(
      textResponse('{"title":"x","description":"y"}'),
    );
    await composeCopy({
      type: "mrr",
      threshold: 1000,
      platform: "linkedin",
    });
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain("LinkedIn");
  });

  it("omits platform line when platform is undefined", async () => {
    mockCreate.mockResolvedValue(
      textResponse('{"title":"x","description":"y"}'),
    );
    await composeCopy({ type: "mrr", threshold: 1000 });
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.messages[0].content).not.toContain("Target platform");
  });
});

describe("rewriteCopyForClass", () => {
  it("returns Instagram-toned copy from Haiku for class=instagram", async () => {
    mockCreate.mockResolvedValue(
      textResponse(
        '{"title":"Carousel slides ✨","description":"Tap through to see the new template in action."}',
      ),
    );
    const out = await rewriteCopyForClass({
      channelClass: "instagram",
      seedTitle: "Carousel template",
      seedDescription: "You can now ship carousel posts.",
    });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.title).toBe("Carousel slides ✨");
      expect(out.description).toBe(
        "Tap through to see the new template in action.",
      );
    }
  });

  it("threads voicePreset into the prompt", async () => {
    mockCreate.mockResolvedValue(
      textResponse('{"title":"t","description":"d"}'),
    );
    await rewriteCopyForClass({
      channelClass: "linkedin",
      seedTitle: "X",
      seedDescription: "Y",
      voicePreset: "deadpan",
    });
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain("deadpan");
  });

  it("threads recent-approval examples into the prompt", async () => {
    mockCreate.mockResolvedValue(
      textResponse('{"title":"t","description":"d"}'),
    );
    await rewriteCopyForClass({
      channelClass: "x",
      seedTitle: "X",
      seedDescription: "Y",
      examples: [
        {
          original: { title: "Agent t", description: "Agent d" },
          edited: { title: "User t", description: "User d" },
        },
      ],
    });
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain("User t");
    expect(callArgs.messages[0].content).toContain("Past approvals");
  });

  it("returns ok:false when Haiku throws", async () => {
    mockCreate.mockRejectedValue(new Error("network down"));
    const out = await rewriteCopyForClass({
      channelClass: "x",
      seedTitle: "X",
      seedDescription: "Y",
    });
    expect(out).toEqual({ ok: false, error: "haiku_unavailable" });
  });

  it("returns ok:false when Haiku returns malformed JSON", async () => {
    mockCreate.mockResolvedValue(textResponse("no json at all"));
    const out = await rewriteCopyForClass({
      channelClass: "x",
      seedTitle: "X",
      seedDescription: "Y",
    });
    expect(out).toEqual({ ok: false, error: "haiku_unavailable" });
  });

  it.each([
    ["x", "X (Twitter)"],
    ["linkedin", "LinkedIn"],
    ["instagram", "Instagram"],
    ["tiktok", "TikTok"],
    ["threads", "Threads"],
    ["facebook", "Facebook"],
    ["youtube", "YouTube"],
  ] as const)(
    "puts the %s platform guide into the prompt",
    async (channelClass, marker) => {
      mockCreate.mockResolvedValue(
        textResponse('{"title":"t","description":"d"}'),
      );
      await rewriteCopyForClass({
        channelClass,
        seedTitle: "X",
        seedDescription: "Y",
      });
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain(marker);
    },
  );
});

describe("composeCopy — voiceProfileMd", () => {
  it("pr_merged includes voiceProfileMd compiled truth in prompt", async () => {
    mockCreate.mockResolvedValue(textResponse('{"title":"T","description":"D"}'));
    await composeCopy({
      type: "pr_merged",
      title: "fix: something",
      body: "small fix",
      repoFullName: "rob/brag.fast",
      voiceProfileMd: `---\nlast_updated: 2026-01-01T00:00:00Z\nlast_reflected: 2026-01-01T00:00:00Z\napproval_count: 10\nskip_count: 0\n---\n\n## Compiled Truth\n\n- Prefers active voice\n- Skips refactor announcements\n\n## Timeline\n\n`,
    });
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain("Prefers active voice");
  });
});

describe("composeCopy — brand voice", () => {
  it("passes brandName and brandVoice into the prompt", async () => {
    mockCreate.mockResolvedValue(
      textResponse('{"title":"ok","description":"ok"}'),
    );
    await composeCopy({
      type: "mrr",
      threshold: 1000,
      brandName: "Acme",
      brandVoice: "dry and nerdy",
    });
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain("Acme");
    expect(callArgs.messages[0].content).toContain("dry and nerdy");
  });
});
