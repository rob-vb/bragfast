/**
 * Component tests for PushStatusPanel.
 *
 * Mocks:
 *  - convex/react: useQuery (push rows), useMutation (retryPush)
 *  - @convex/_generated/api: stub api object
 *  - sonner: toast
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PushStatusPanel } from "../push-status-panel";

// ── Mocks ──────────────────────────────────────────────────────────────────────

// Mock sonner
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

// Mock convex generated api
vi.mock("@convex/_generated/api", () => ({
  api: {
    draftPushes: {
      listByDraft: "draftPushes:listByDraft",
      retryPush: "draftPushes:retryPush",
    },
  },
}));

// Controlled stubs — replaced per test
let mockUseQueryFn = vi.fn();
let mockMutationFn = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQueryFn(...args),
  useMutation: (_ref: unknown) => mockMutationFn,
}));

// ── Shared fixtures ────────────────────────────────────────────────────────────

const DRAFT_ID = "drf_abc";

interface RowFixture {
  _id: string;
  format: string;
  provider: "buffer" | "postiz";
  channelId: string;
  channelLabel?: string;
  state: "pending" | "in_flight" | "queued" | "drafted" | "failed";
  postState: "queue" | "draft";
  providerPostId?: string;
  attempts: number;
  lastAttemptAt?: number;
  created_at: string;
  updated_at: string;
  errorMessage?: string;
}

function makeRow(overrides: Partial<RowFixture> = {}): RowFixture {
  return {
    _id: `row_${Math.random().toString(36).slice(2, 8)}`,
    format: "square",
    provider: "buffer" as const,
    channelId: "ch1",
    channelLabel: "@acme",
    state: "queued" as const,
    postState: "queue" as const,
    providerPostId: "post_xyz",
    attempts: 1,
    lastAttemptAt: Date.now() - 60_000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

const BASE_PROPS = {
  draftId: DRAFT_ID,
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("PushStatusPanel — loading / empty", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutationFn = vi.fn();
  });

  it("renders null when useQuery returns undefined (loading)", () => {
    mockUseQueryFn = vi.fn().mockReturnValue(undefined);
    const { container } = render(<PushStatusPanel {...BASE_PROPS} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders null when useQuery returns empty array", () => {
    mockUseQueryFn = vi.fn().mockReturnValue([]);
    const { container } = render(<PushStatusPanel {...BASE_PROPS} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("PushStatusPanel — happy path (3 queued + 2 drafted)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutationFn = vi.fn();
  });

  it("renders 5 rows in the table", () => {
    const rows = [
      makeRow({ _id: "r1", format: "square", state: "queued", provider: "buffer", channelLabel: "@handle1", providerPostId: "pid1" }),
      makeRow({ _id: "r2", format: "landscape", state: "queued", provider: "buffer", channelLabel: "@handle2", providerPostId: "pid2" }),
      makeRow({ _id: "r3", format: "portrait", state: "queued", provider: "postiz", channelLabel: "IG page", providerPostId: "pid3" }),
      makeRow({ _id: "r4", format: "video-square", state: "drafted", provider: "buffer", channelLabel: "@handle1", providerPostId: "pid4" }),
      makeRow({ _id: "r5", format: "video-landscape", state: "drafted", provider: "postiz", channelLabel: "IG page", providerPostId: "pid5" }),
    ];
    mockUseQueryFn = vi.fn().mockReturnValue(rows);

    render(<PushStatusPanel {...BASE_PROPS} />);

    // 5 data rows rendered (plus header row)
    const tableRows = screen.getAllByRole("row");
    expect(tableRows.length).toBe(6); // 1 header + 5 data rows
  });

  it("displays format labels correctly", () => {
    const rows = [
      makeRow({ _id: "r1", format: "square", state: "queued" }),
      makeRow({ _id: "r2", format: "video-landscape", state: "drafted" }),
    ];
    mockUseQueryFn = vi.fn().mockReturnValue(rows);

    render(<PushStatusPanel {...BASE_PROPS} />);
    expect(screen.getByText("Square")).toBeTruthy();
    expect(screen.getByText("Video · Landscape")).toBeTruthy();
  });

  it("shows Queued badge for queued rows", () => {
    mockUseQueryFn = vi.fn().mockReturnValue([
      makeRow({ _id: "r1", state: "queued" }),
    ]);

    render(<PushStatusPanel {...BASE_PROPS} />);
    expect(screen.getByText("Queued")).toBeTruthy();
  });

  it("shows Drafted badge for drafted rows", () => {
    mockUseQueryFn = vi.fn().mockReturnValue([
      makeRow({ _id: "r1", state: "drafted" }),
    ]);

    render(<PushStatusPanel {...BASE_PROPS} />);
    expect(screen.getByText("Drafted")).toBeTruthy();
  });

  it("renders providerPostId as monospace badge", () => {
    mockUseQueryFn = vi.fn().mockReturnValue([
      makeRow({ _id: "r1", state: "queued", providerPostId: "post_abc123" }),
    ]);

    render(<PushStatusPanel {...BASE_PROPS} />);
    expect(screen.getByText("post_abc123")).toBeTruthy();
  });

  it("shows channel label with provider prefix", () => {
    mockUseQueryFn = vi.fn().mockReturnValue([
      makeRow({ _id: "r1", provider: "buffer", channelLabel: "@acme_x" }),
    ]);

    render(<PushStatusPanel {...BASE_PROPS} />);
    expect(screen.getByText("Buffer · @acme_x")).toBeTruthy();
  });

  it("falls back to provider:channelId when channelLabel is absent", () => {
    mockUseQueryFn = vi.fn().mockReturnValue([
      makeRow({ _id: "r1", provider: "postiz", channelLabel: undefined, channelId: "ch_fallback" }),
    ]);

    render(<PushStatusPanel {...BASE_PROPS} />);
    expect(screen.getByText("postiz:ch_fallback")).toBeTruthy();
  });
});

describe("PushStatusPanel — all pending rows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutationFn = vi.fn();
  });

  it("shows Pushing... badge for every pending row", () => {
    const rows = [
      makeRow({ _id: "r1", state: "pending", lastAttemptAt: undefined }),
      makeRow({ _id: "r2", state: "pending", lastAttemptAt: undefined }),
      makeRow({ _id: "r3", state: "in_flight", lastAttemptAt: undefined }),
    ];
    mockUseQueryFn = vi.fn().mockReturnValue(rows);

    render(<PushStatusPanel {...BASE_PROPS} />);
    const badges = screen.getAllByText("Pushing...");
    expect(badges).toHaveLength(3);
  });

  it("does not show Retry button for pending rows", () => {
    mockUseQueryFn = vi.fn().mockReturnValue([
      makeRow({ _id: "r1", state: "pending" }),
    ]);

    render(<PushStatusPanel {...BASE_PROPS} />);
    expect(screen.queryByRole("button", { name: /Retry/i })).toBeNull();
  });
});

describe("PushStatusPanel — failed rows + retry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutationFn = vi.fn();
  });

  it("shows Failed badge with error message", () => {
    mockUseQueryFn = vi.fn().mockReturnValue([
      makeRow({
        _id: "r1",
        state: "failed",
        errorMessage: "Rate limit exceeded",
      }),
    ]);

    render(<PushStatusPanel {...BASE_PROPS} />);
    expect(screen.getByText("Failed")).toBeTruthy();
    expect(screen.getByText("Rate limit exceeded")).toBeTruthy();
  });

  it("shows Retry button only on failed rows", () => {
    mockUseQueryFn = vi.fn().mockReturnValue([
      makeRow({ _id: "r1", state: "queued" }),
      makeRow({ _id: "r2", state: "failed", errorMessage: "Auth error" }),
      makeRow({ _id: "r3", state: "drafted" }),
    ]);

    render(<PushStatusPanel {...BASE_PROPS} />);
    // Only one Retry button (for the failed row)
    const retryButtons = screen.getAllByRole("button", { name: /Retry push/i });
    expect(retryButtons).toHaveLength(1);
  });

  it("calls retryPush mutation with correct args when Retry is clicked", async () => {
    const ROW_ID = "row_failed_001";
    mockUseQueryFn = vi.fn().mockReturnValue([
      makeRow({ _id: ROW_ID, state: "failed", errorMessage: "timeout" }),
    ]);
    mockMutationFn = vi.fn().mockResolvedValue({ ok: true });

    render(<PushStatusPanel {...BASE_PROPS} />);

    const retryBtn = screen.getByRole("button", { name: /Retry push/i });
    await userEvent.click(retryBtn);

    expect(mockMutationFn).toHaveBeenCalledOnce();
    const callArgs = mockMutationFn.mock.calls[0][0];
    expect(callArgs.rowId).toBe(ROW_ID);
  });

  it("shows success toast on successful retry", async () => {
    mockUseQueryFn = vi.fn().mockReturnValue([
      makeRow({ _id: "r_fail", state: "failed" }),
    ]);
    mockMutationFn = vi.fn().mockResolvedValue({ ok: true });

    render(<PushStatusPanel {...BASE_PROPS} />);
    const retryBtn = screen.getByRole("button", { name: /Retry push/i });
    await userEvent.click(retryBtn);

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledOnce();
    });
  });

  it("shows error toast when mutation returns non-ok", async () => {
    mockUseQueryFn = vi.fn().mockReturnValue([
      makeRow({ _id: "r_fail", state: "failed" }),
    ]);
    mockMutationFn = vi.fn().mockResolvedValue({ ok: false, error: "forbidden" });

    render(<PushStatusPanel {...BASE_PROPS} />);
    const retryBtn = screen.getByRole("button", { name: /Retry push/i });
    await userEvent.click(retryBtn);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledOnce();
    });
  });

  it("shows error toast when mutation throws", async () => {
    mockUseQueryFn = vi.fn().mockReturnValue([
      makeRow({ _id: "r_fail", state: "failed" }),
    ]);
    mockMutationFn = vi.fn().mockRejectedValue(new Error("Network error"));

    render(<PushStatusPanel {...BASE_PROPS} />);
    const retryBtn = screen.getByRole("button", { name: /Retry push/i });
    await userEvent.click(retryBtn);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledOnce();
    });
  });
});

describe("PushStatusPanel — live state transitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutationFn = vi.fn();
  });

  it("updates badges when data changes (simulated re-render with new data)", () => {
    // Initial render: row is pending
    mockUseQueryFn = vi.fn().mockReturnValue([
      makeRow({ _id: "r1", state: "pending" }),
    ]);

    const { rerender } = render(<PushStatusPanel {...BASE_PROPS} />);
    expect(screen.getByText("Pushing...")).toBeTruthy();

    // Simulate Convex pushing an update: row transitions to queued
    mockUseQueryFn = vi.fn().mockReturnValue([
      makeRow({ _id: "r1", state: "queued", providerPostId: "pid_live" }),
    ]);

    rerender(<PushStatusPanel {...BASE_PROPS} />);
    expect(screen.queryByText("Pushing...")).toBeNull();
    expect(screen.getByText("Queued")).toBeTruthy();
    expect(screen.getByText("pid_live")).toBeTruthy();
  });

  it("shows retry button only after transitioning to failed state", () => {
    // Start: in_flight — no retry
    mockUseQueryFn = vi.fn().mockReturnValue([
      makeRow({ _id: "r1", state: "in_flight" }),
    ]);

    const { rerender } = render(<PushStatusPanel {...BASE_PROPS} />);
    expect(screen.queryByRole("button", { name: /Retry push/i })).toBeNull();

    // Transition to failed
    mockUseQueryFn = vi.fn().mockReturnValue([
      makeRow({ _id: "r1", state: "failed", errorMessage: "Auth expired" }),
    ]);
    rerender(<PushStatusPanel {...BASE_PROPS} />);
    expect(screen.getByRole("button", { name: /Retry push/i })).toBeTruthy();
  });
});

describe("PushStatusPanel — Pushed At display", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutationFn = vi.fn();
  });

  it("shows 'Pending' when no lastAttemptAt", () => {
    mockUseQueryFn = vi.fn().mockReturnValue([
      makeRow({ _id: "r1", state: "pending", lastAttemptAt: undefined }),
    ]);

    render(<PushStatusPanel {...BASE_PROPS} />);
    expect(screen.getByText("Pending")).toBeTruthy();
  });

  it("shows relative time when lastAttemptAt is set", () => {
    mockUseQueryFn = vi.fn().mockReturnValue([
      makeRow({ _id: "r1", state: "queued", lastAttemptAt: Date.now() - 90_000 }), // 1.5min ago
    ]);

    render(<PushStatusPanel {...BASE_PROPS} />);
    // 1.5min rounds to 2m ago
    expect(screen.getByText("2m ago")).toBeTruthy();
  });
});
