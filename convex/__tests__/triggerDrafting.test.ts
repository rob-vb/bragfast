import { beforeEach, describe, expect, it, vi } from "vitest";

const composeCopyMock = vi.fn();
const pickTemplateMock = vi.fn();
const captureFromConvexMock = vi.fn();

vi.mock("../../src/lib/drafts/compose-copy", () => ({
  composeCopy: composeCopyMock,
}));

vi.mock("../../src/lib/drafts/pick-template", () => ({
  pickTemplate: pickTemplateMock,
}));

vi.mock("../posthogCapture", () => ({
  captureFromConvex: captureFromConvexMock,
  goalCategoryFromMetric: (metric: string | null) =>
    metric === "stars" ? "users" : "custom",
  daysBetween: () => 4,
}));

describe("createGoalHitDraft", () => {
  beforeEach(() => {
    vi.resetModules();
    composeCopyMock.mockReset();
    pickTemplateMock.mockReset();
    captureFromConvexMock.mockReset();
  });

  it("owns the shared Goal hit -> Draft side effects", async () => {
    pickTemplateMock.mockResolvedValue({ templateId: "hero-card" });
    composeCopyMock.mockResolvedValue({
      title: "100 stars",
      description: "The project hit 100 stars.",
      confidence: 0.9,
    });

    const runQuery = vi
      .fn()
      .mockResolvedValueOnce({ voicePreset: "dry_technical" })
      .mockResolvedValueOnce([
        {
          original: { title: "Old", description: "Draft" },
          edited: { title: "Old", description: "Shipped" },
        },
      ]);
    const runMutation = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        firstHit: true,
        userId: "user_123",
        label: "Stars",
        metric: "stars",
        target: 100,
        scope: "rob/bragfast",
        createdAt: "2026-05-01T00:00:00.000Z",
      });
    const runAfter = vi.fn().mockResolvedValue(undefined);

    const { createGoalHitDraft } = await import("../triggerDrafting");
    await createGoalHitDraft(
      {
        runQuery,
        runMutation,
        scheduler: { runAfter },
      } as never,
      {
        userId: "user_123",
        sourceSystem: "github",
        provider: "github",
        goal: {
          externalId: "goal_123",
          metric: "stars",
          target: 100,
          scope: "rob/bragfast",
        },
        composeInput: {
          type: "star",
          repoFullName: "rob/bragfast",
          threshold: 100,
        },
      },
    );

    expect(pickTemplateMock).toHaveBeenCalledWith({
      milestoneKey: "star:100:rob/bragfast",
    });
    expect(composeCopyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "star",
        repoFullName: "rob/bragfast",
        threshold: 100,
        voicePreset: "dry_technical",
        examples: [
          {
            original: { title: "Old", description: "Draft" },
            edited: { title: "Old", description: "Shipped" },
          },
        ],
      }),
    );
    expect(runMutation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: "user_123",
        idempotencyKey: "user_123:github:goal:goal_123",
        sourceSystem: "github",
        milestoneKey: "star:100:rob/bragfast",
        name: "100 stars",
        createdBy: "sous-chef",
      }),
    );
    const insertCall = runMutation.mock.calls.find(([, args]) => args?.config);
    expect(JSON.parse(insertCall?.[1].config)).toEqual({
      output: "image",
      templateId: "hero-card",
      objectContent: {
        title: { text: "100 stars" },
        description: { text: "The project hit 100 stars." },
      },
      notes: "Sous-Chef: star:100:rob/bragfast",
    });
    expect(runAfter).toHaveBeenCalledWith(
      0,
      expect.anything(),
      expect.objectContaining({
        userId: "user_123",
        label: "Stars",
        metric: "stars",
        target: 100,
        scope: "rob/bragfast",
      }),
    );
    expect(captureFromConvexMock).toHaveBeenCalledWith({
      event: "goal_hit",
      distinctId: "user_123",
      properties: {
        goal_category: "users",
        days_from_goal_set: 4,
      },
    });
  });
});
