import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSchedule } from "../useSchedule";
import type { ScheduleRequest } from "../../types";

const mocks = vi.hoisted(() => ({
  schedulePost: vi.fn(),
  saveRoutingDefault: vi.fn(),
}));

vi.mock("../../api", () => ({
  schedulePost: mocks.schedulePost,
  saveRoutingDefault: mocks.saveRoutingDefault,
}));

const request: Omit<ScheduleRequest, "draftId" | "caption"> = {
  selections: [
    { format: "landscape", channelIds: ["chan_x"] },
  ],
  scheduling: { mode: "queue" },
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
}

describe("useSchedule", () => {
  beforeEach(() => {
    mocks.schedulePost.mockReset();
    mocks.saveRoutingDefault.mockReset();
    mocks.saveRoutingDefault.mockResolvedValue(undefined);
  });

  it("starts with idle schedule state", () => {
    const { result } = renderHook(() =>
      useSchedule({ flush: vi.fn(), caption: "Ship it" }),
    );

    expect(result.current.phase).toBe("idle");
    expect(result.current.confirmation).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("flushes before scheduling and fails if save returns null", async () => {
    const flush = vi.fn().mockResolvedValue(null);
    const { result } = renderHook(() =>
      useSchedule({ flush, caption: "Ship it" }),
    );

    await act(async () => {
      await result.current.trigger(request);
    });

    expect(flush).toHaveBeenCalledOnce();
    expect(result.current.phase).toBe("failed");
    expect(result.current.error).toBe("Save failed before schedule");
    expect(mocks.schedulePost).not.toHaveBeenCalled();
  });

  it("calls schedulePost with draftId, selections, caption, and scheduling", async () => {
    const flush = vi.fn().mockResolvedValue("draft_1");
    mocks.schedulePost.mockResolvedValue({ confirmation: [] });
    const { result } = renderHook(() =>
      useSchedule({ flush, caption: "Ship it" }),
    );

    await act(async () => {
      await result.current.trigger(request);
    });

    expect(mocks.schedulePost).toHaveBeenCalledWith({
      draftId: "draft_1",
      caption: "Ship it",
      selections: request.selections,
      scheduling: request.scheduling,
    });
  });

  it("does not start another schedule while uploading", async () => {
    const flushResult = deferred<string | null>();
    const flush = vi.fn().mockReturnValue(flushResult.promise);
    const { result } = renderHook(() =>
      useSchedule({ flush, caption: "Ship it" }),
    );

    act(() => {
      void result.current.trigger(request);
      void result.current.trigger(request);
    });

    expect(result.current.phase).toBe("uploading");
    expect(flush).toHaveBeenCalledOnce();
    await act(async () => {
      flushResult.resolve(null);
      await flushResult.promise;
    });
  });

  it("does not start another schedule while scheduling", async () => {
    const scheduleResult = deferred<{ confirmation: [] }>();
    const flush = vi.fn().mockResolvedValue("draft_1");
    mocks.schedulePost.mockReturnValue(scheduleResult.promise);
    const { result } = renderHook(() =>
      useSchedule({ flush, caption: "Ship it" }),
    );

    await act(async () => {
      void result.current.trigger(request);
      await Promise.resolve();
    });
    expect(result.current.phase).toBe("scheduling");
    await act(async () => {
      void result.current.trigger(request);
    });
    expect(mocks.schedulePost).toHaveBeenCalledOnce();

    await act(async () => {
      scheduleResult.resolve({ confirmation: [] });
      await scheduleResult.promise;
    });
  });

  it("stores confirmation rows on success", async () => {
    const confirmation = [
      {
        provider: "buffer",
        channelId: "chan_x",
        format: "landscape" as const,
        status: "scheduled",
        scheduledAt: "2026-05-22T10:00:00.000Z",
        externalId: "post_123",
      },
    ];
    const flush = vi.fn().mockResolvedValue("draft_1");
    mocks.schedulePost.mockResolvedValue({ confirmation });
    const { result } = renderHook(() =>
      useSchedule({ flush, caption: "Ship it" }),
    );

    await act(async () => {
      await result.current.trigger(request);
    });

    expect(result.current.phase).toBe("done");
    expect(result.current.confirmation).toEqual(confirmation);
    expect(result.current.error).toBeNull();
  });

  it("sets failed state and error message when API rejects", async () => {
    const flush = vi.fn().mockResolvedValue("draft_1");
    mocks.schedulePost.mockRejectedValue(new Error("Buffer disconnected"));
    const { result } = renderHook(() =>
      useSchedule({ flush, caption: "Ship it" }),
    );

    await act(async () => {
      await result.current.trigger(request);
    });

    expect(result.current.phase).toBe("failed");
    expect(result.current.error).toBe("Buffer disconnected");
    expect(result.current.confirmation).toEqual([]);
  });
});
