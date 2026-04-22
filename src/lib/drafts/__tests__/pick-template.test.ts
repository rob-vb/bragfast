import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = { create: mockCreate };
  }
  return { default: MockAnthropic };
});

import {
  pickTemplateByRules,
  pickTemplate,
  type TemplateId,
} from "../pick-template";

beforeEach(() => {
  mockCreate.mockReset();
});

function textResponse(text: string) {
  return { content: [{ type: "text", text }] };
}

describe("pickTemplateByRules — hero family", () => {
  const heroKeys = [
    "mrr:100",
    "mrr:10000",
    "first_sale",
    "visitors:1000",
    "visitors:1000000",
    "ga:visitors:10000",
    "star:100:rob/brag.fast",
  ];

  it.each(heroKeys)("maps %s → hero", (key) => {
    const result = pickTemplateByRules({ milestoneKey: key });
    expect(result.templateId).toBe("hero");
    expect(result.reason).toBe("rule");
  });
});

describe("pickTemplateByRules — pr_merged", () => {
  it("short body, no keyword → standard-browser", () => {
    const result = pickTemplateByRules({
      milestoneKey: "pr_merged:rob/brag.fast#42",
      prContext: { title: "Add dashboard widget", body: "Small tweak." },
    });
    expect(result.templateId).toBe("standard-browser");
    expect(result.reason).toBe("rule");
  });

  it("long body, no keyword → split-browser", () => {
    const result = pickTemplateByRules({
      milestoneKey: "pr_merged:rob/brag.fast#42",
      prContext: {
        title: "Add dashboard widget",
        body: "A".repeat(200),
      },
    });
    expect(result.templateId).toBe("split-browser");
  });

  it("short body + iPhone keyword → standard-mobile", () => {
    const result = pickTemplateByRules({
      milestoneKey: "pr_merged:rob/app#7",
      prContext: {
        title: "iPhone photo picker",
        body: "Native share sheet.",
      },
    });
    expect(result.templateId).toBe("standard-mobile");
    expect(result.debug?.matchedKeyword?.toLowerCase()).toBe("iphone");
  });

  it("long body + Android keyword → split-mobile", () => {
    const result = pickTemplateByRules({
      milestoneKey: "pr_merged:rob/app#7",
      prContext: {
        title: "New Android flow",
        body: "B".repeat(200) + " android",
      },
    });
    expect(result.templateId).toBe("split-mobile");
  });

  it("mobile + web keywords → ambiguous", () => {
    const result = pickTemplateByRules({
      milestoneKey: "pr_merged:rob/app#1",
      prContext: {
        title: "Share sheet on iOS and web",
        body: "Implements iOS share and browser tab share.",
      },
    });
    expect(result.templateId).toBeNull();
    expect(result.reason).toBe("ambiguous");
  });

  it("throws when prContext missing", () => {
    expect(() =>
      pickTemplateByRules({ milestoneKey: "pr_merged:rob/brag.fast#42" }),
    ).toThrow();
  });

  it("long body threshold is exactly 120", () => {
    const atThreshold = pickTemplateByRules({
      milestoneKey: "pr_merged:r/r#1",
      prContext: { title: "t", body: "x".repeat(120) },
    });
    expect(atThreshold.templateId).toBe("split-browser");

    const belowThreshold = pickTemplateByRules({
      milestoneKey: "pr_merged:r/r#1",
      prContext: { title: "t", body: "x".repeat(119) },
    });
    expect(belowThreshold.templateId).toBe("standard-browser");
  });
});

describe("pickTemplateByRules — unknown keys", () => {
  it("unknown milestone key → ambiguous", () => {
    const result = pickTemplateByRules({ milestoneKey: "weird:thing" });
    expect(result.templateId).toBeNull();
  });
});

describe("pickTemplate (Haiku fallback)", () => {
  it("skips Haiku when rule produces a result", async () => {
    const result = await pickTemplate({ milestoneKey: "mrr:1000" });
    expect(result.templateId).toBe("hero");
    expect(result.reason).toBe("rule");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("calls Haiku on ambiguous and honors a valid pick", async () => {
    mockCreate.mockResolvedValue(
      textResponse('{"templateId":"split-mobile"}'),
    );
    const result = await pickTemplate({
      milestoneKey: "pr_merged:r/r#1",
      prContext: {
        title: "iOS + web share",
        body: "Ships a share sheet across iPhone, iPad, and browser tabs.",
      },
    });
    expect(result.templateId).toBe("split-mobile");
    expect(result.reason).toBe("haiku");
  });

  it("falls back to standard-browser when Haiku returns gibberish", async () => {
    mockCreate.mockResolvedValue(textResponse("no json here"));
    const result = await pickTemplate({
      milestoneKey: "weird:thing",
    });
    expect(result.templateId).toBe("standard-browser");
    expect(result.reason).toBe("haiku-fallback");
  });

  it("falls back when Haiku returns unknown templateId", async () => {
    mockCreate.mockResolvedValue(
      textResponse('{"templateId":"mega-hero-plus"}'),
    );
    const result = await pickTemplate({ milestoneKey: "weird:thing" });
    expect(result.templateId).toBe("standard-browser");
    expect(result.reason).toBe("haiku-fallback");
  });

  it("falls back when Haiku SDK throws", async () => {
    mockCreate.mockRejectedValue(new Error("network"));
    const result = await pickTemplate({ milestoneKey: "weird:thing" });
    expect(result.templateId).toBe("standard-browser");
    expect(result.reason).toBe("haiku-fallback");
  });
});
