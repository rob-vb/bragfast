import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DraftConfig } from "../types";
import { useAutoSave } from "../hooks/useAutoSave";

const mocks = vi.hoisted(() => ({
  createDraft: vi.fn(),
  patchDraft: vi.fn(),
}));

vi.mock("../api", () => ({
  createDraft: mocks.createDraft,
  patchDraft: mocks.patchDraft,
}));

const baseConfig: DraftConfig = {
  output: "image",
  templateId: "standard-browser",
  caption: "Launch copy",
  objectContent: {
    title: { text: "Ship it" },
  },
};

describe("useAutoSave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.createDraft.mockReset();
    mocks.patchDraft.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not create or patch when config is null", async () => {
    renderHook(() => useAutoSave({ draftId: null, config: null }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(mocks.createDraft).not.toHaveBeenCalled();
    expect(mocks.patchDraft).not.toHaveBeenCalled();
  });

  it("creates a draft after 900ms when dirty config has no draft id", async () => {
    mocks.createDraft.mockResolvedValue({ draft_id: "draft_1", created_at: "now" });

    const { result } = renderHook(() => useAutoSave({ draftId: null, config: baseConfig }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(899);
    });
    expect(mocks.createDraft).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(result.current.draftId).toBe("draft_1");
    expect(mocks.createDraft).toHaveBeenCalledOnce();
    expect(mocks.createDraft).toHaveBeenCalledWith(baseConfig);
  });

  it("patches the full config after 900ms when a draft id exists", async () => {
    mocks.patchDraft.mockResolvedValue({ draft_id: "draft_1", created_at: "now" });

    renderHook(() => useAutoSave({ draftId: "draft_1", config: baseConfig }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
    });

    expect(mocks.patchDraft).toHaveBeenCalledOnce();
    expect(mocks.patchDraft).toHaveBeenCalledWith("draft_1", {
      ...baseConfig,
      caption: "Launch copy",
      objectContent: { title: { text: "Ship it" } },
    });
  });

  it("collapses repeated edits into one save call", async () => {
    mocks.patchDraft.mockResolvedValue({ draft_id: "draft_1", created_at: "now" });
    const editedConfig: DraftConfig = {
      ...baseConfig,
      caption: "Updated copy",
      objectContent: { title: { text: "Updated" } },
    };

    const { rerender } = renderHook(
      ({ config }) => useAutoSave({ draftId: "draft_1", config }),
      { initialProps: { config: baseConfig } },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    act(() => {
      rerender({ config: editedConfig });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
    });

    expect(mocks.patchDraft).toHaveBeenCalledOnce();
    expect(mocks.patchDraft).toHaveBeenCalledWith("draft_1", editedConfig);
  });

  it("leaves failure status for the next edit to retry", async () => {
    mocks.patchDraft.mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useAutoSave({ draftId: "draft_1", config: baseConfig }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
    });

    expect(result.current.status).toBe("error");
    expect(result.current.statusLabel).toBe("Save failed - retrying on next edit");
  });
});
