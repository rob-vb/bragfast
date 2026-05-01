import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = { create: mockCreate };
  }
  return { default: MockAnthropic };
});

import { composeCopy, composeCopyByPlatform } from "../compose-copy";

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

describe("composeCopyByPlatform", () => {
  it("returns one Copy per platform requested", async () => {
    mockCreate
      .mockResolvedValueOnce(
        textResponse('{"title":"X title","description":"X desc","confidence":0.8}'),
      )
      .mockResolvedValueOnce(
        textResponse('{"title":"LI title","description":"LI desc","confidence":0.8}'),
      );
    const { copies, primary, primaryPlatform } = await composeCopyByPlatform(
      { type: "mrr", threshold: 1000 },
      ["x", "linkedin"],
    );
    expect(copies.x?.title).toBe("X title");
    expect(copies.linkedin?.title).toBe("LI title");
    expect(primary.title).toBe("X title");
    expect(primaryPlatform).toBe("x");
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("returns empty copies map when no platforms enabled, but still calls Haiku once for primary", async () => {
    mockCreate.mockResolvedValue(
      textResponse('{"title":"t","description":"d","confidence":0.7}'),
    );
    const { copies, primary, primaryPlatform } = await composeCopyByPlatform(
      { type: "mrr", threshold: 1000 },
      [],
    );
    expect(copies).toEqual({});
    expect(primary.title).toBe("t");
    expect(primaryPlatform).toBe(null);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("single-platform request still produces a primary", async () => {
    mockCreate.mockResolvedValue(
      textResponse('{"title":"only","description":"d","confidence":0.6}'),
    );
    const { copies, primary, primaryPlatform } = await composeCopyByPlatform(
      { type: "mrr", threshold: 1000 },
      ["linkedin"],
    );
    expect(copies.linkedin?.title).toBe("only");
    expect(copies.x).toBeUndefined();
    expect(primary.title).toBe("only");
    expect(primaryPlatform).toBe("linkedin");
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
