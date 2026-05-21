import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVideoRender } from "../useVideoRender";

const mocks = vi.hoisted(() => ({
  triggerVideoRender: vi.fn(),
  pollVideoRenderStatus: vi.fn(),
}));

vi.mock("../../api", () => ({
  triggerVideoRender: mocks.triggerVideoRender,
  pollVideoRenderStatus: mocks.pollVideoRenderStatus,
}));

const idleStatus = {
  id: "draft_1",
  phase: "pending" as const,
  framesRendered: 0,
  totalFrames: 0,
  downloadPct: 0,
};

describe("useVideoRender", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.triggerVideoRender.mockReset();
    mocks.pollVideoRenderStatus.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with idle video render state", () => {
    const { result } = renderHook(() =>
      useVideoRender({ flush: vi.fn(), activeFormat: "landscape" }),
    );

    expect(result.current.renderPhase).toBe("idle");
    expect(result.current.framesRendered).toBe(0);
    expect(result.current.totalFrames).toBe(0);
    expect(result.current.downloadPct).toBe(0);
    expect(result.current.url).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.jobId).toBeNull();
  });

  it("flushes, triggers video render, and enters rendering after trigger", async () => {
    const flush = vi.fn().mockResolvedValue("draft_1");
    mocks.triggerVideoRender.mockResolvedValue({ id: "job_1", status: "pending" });
    mocks.pollVideoRenderStatus.mockResolvedValue(idleStatus);
    const { result } = renderHook(() =>
      useVideoRender({ flush, activeFormat: "portrait" }),
    );

    const triggerPromise = act(async () => {
      await result.current.trigger();
    });
    expect(result.current.renderPhase).toBe("flushing");
    await triggerPromise;

    expect(flush).toHaveBeenCalledOnce();
    expect(mocks.triggerVideoRender).toHaveBeenCalledWith("draft_1", "portrait");
    expect(result.current.renderPhase).toBe("rendering");
    expect(result.current.jobId).toBe("job_1");
  });

  it("does not trigger while rendering", async () => {
    const flush = vi.fn().mockResolvedValue("draft_1");
    mocks.triggerVideoRender.mockResolvedValue({ id: "job_1", status: "pending" });
    mocks.pollVideoRenderStatus.mockResolvedValue(idleStatus);
    const { result } = renderHook(() =>
      useVideoRender({ flush, activeFormat: "landscape" }),
    );

    await act(async () => {
      await result.current.trigger();
    });
    await act(async () => {
      await result.current.trigger();
    });

    expect(flush).toHaveBeenCalledOnce();
    expect(mocks.triggerVideoRender).toHaveBeenCalledOnce();
  });

  it("maps chrome download progress from poll status", async () => {
    const flush = vi.fn().mockResolvedValue("draft_1");
    mocks.triggerVideoRender.mockResolvedValue({ id: "job_1", status: "pending" });
    mocks.pollVideoRenderStatus.mockResolvedValue({
      ...idleStatus,
      phase: "chrome-download",
      downloadPct: 42,
    });
    const { result } = renderHook(() =>
      useVideoRender({ flush, activeFormat: "landscape" }),
    );

    await act(async () => {
      await result.current.trigger();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.renderPhase).toBe("chrome-download");
    expect(result.current.downloadPct).toBe(42);
  });

  it("maps frame progress from rendering poll status", async () => {
    const flush = vi.fn().mockResolvedValue("draft_1");
    mocks.triggerVideoRender.mockResolvedValue({ id: "job_1", status: "pending" });
    mocks.pollVideoRenderStatus.mockResolvedValue({
      ...idleStatus,
      phase: "rendering",
      framesRendered: 100,
      totalFrames: 240,
    });
    const { result } = renderHook(() =>
      useVideoRender({ flush, activeFormat: "landscape" }),
    );

    await act(async () => {
      await result.current.trigger();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.renderPhase).toBe("rendering");
    expect(result.current.framesRendered).toBe(100);
    expect(result.current.totalFrames).toBe(240);
  });

  it("sets done url and stops polling on done status", async () => {
    const flush = vi.fn().mockResolvedValue("draft_1");
    mocks.triggerVideoRender.mockResolvedValue({ id: "job_1", status: "pending" });
    mocks.pollVideoRenderStatus.mockResolvedValue({
      ...idleStatus,
      phase: "done",
      url: "/output/d1/landscape.mp4",
    });
    const { result } = renderHook(() =>
      useVideoRender({ flush, activeFormat: "landscape" }),
    );

    await act(async () => {
      await result.current.trigger();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.renderPhase).toBe("done");
    expect(result.current.url).toBe("/output/d1/landscape.mp4");
    expect(mocks.pollVideoRenderStatus).toHaveBeenCalledTimes(1);
  });

  it("sets failed error and stops polling on failed status", async () => {
    const flush = vi.fn().mockResolvedValue("draft_1");
    mocks.triggerVideoRender.mockResolvedValue({ id: "job_1", status: "pending" });
    mocks.pollVideoRenderStatus.mockResolvedValue({
      ...idleStatus,
      phase: "failed",
      error: "encode error",
    });
    const { result } = renderHook(() =>
      useVideoRender({ flush, activeFormat: "landscape" }),
    );

    await act(async () => {
      await result.current.trigger();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.renderPhase).toBe("failed");
    expect(result.current.error).toBe("encode error");
    expect(mocks.pollVideoRenderStatus).toHaveBeenCalledTimes(1);
  });

  it("fails when flush cannot save before render", async () => {
    const flush = vi.fn().mockResolvedValue(null);
    const { result } = renderHook(() =>
      useVideoRender({ flush, activeFormat: "landscape" }),
    );

    await act(async () => {
      await result.current.trigger();
    });

    expect(result.current.renderPhase).toBe("failed");
    expect(result.current.error).toBe("Save failed before render");
    expect(mocks.triggerVideoRender).not.toHaveBeenCalled();
  });
});
