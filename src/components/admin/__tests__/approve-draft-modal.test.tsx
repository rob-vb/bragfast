/**
 * Component tests for ApproveDraftModal.
 *
 * Mocks:
 *  - convex/react: useMutation (the approve mutation)
 *  - next/navigation: useRouter
 *  - sonner: toast
 *  - @convex/_generated/api: returns a stub api object
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApproveDraftModal } from "../approve-draft-modal";

// ── Mocks ──────────────────────────────────────────────────────────────────────

// Mock next/navigation
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

// Mock sonner
const mockToastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: { success: (...args: unknown[]) => mockToastSuccess(...args) },
}));

// Mock convex generated api
vi.mock("@convex/_generated/api", () => ({
  api: {
    draftPushes: {
      approveDraft: "draftPushes:approveDraft",
    },
  },
}));

// The approve mutation stub — replaced per test
let mockMutationFn = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: (_ref: unknown) => mockMutationFn,
}));

// ── Shared props ───────────────────────────────────────────────────────────────

const BUFFER_INTEGRATION = {
  provider: "buffer",
  enabled: true,
  extra: JSON.stringify({
    channels: [
      { id: "ch1", service: "twitter", displayName: "Acme X" },
      { id: "ch2", service: "linkedin", displayName: "Acme LI" },
    ],
  }),
};

const POSTIZ_INTEGRATION = {
  provider: "postiz",
  enabled: true,
  extra: JSON.stringify({
    channels: [{ id: "ch3", identifier: "INSTAGRAM", name: "Acme IG" }],
  }),
};

const ROUTING_ROW = {
  format: "square",
  channels: [
    { provider: "buffer" as const, channelId: "ch1" },
    { provider: "postiz" as const, channelId: "ch3" },
  ],
  updated_at: "2026-01-01T00:00:00Z",
};

const BASE_PROPS = {
  draftId: "drf_abc",
  initialTitle: "Test Title",
  initialDescription: "Test description",
  draftFormats: ["square" as const],
  routingRows: [ROUTING_ROW],
  integrations: [BUFFER_INTEGRATION, POSTIZ_INTEGRATION],
  onClose: vi.fn(),
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("ApproveDraftModal — rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutationFn = vi.fn();
  });

  it("renders title and description fields pre-filled", () => {
    render(<ApproveDraftModal {...BASE_PROPS} />);
    expect(screen.getByDisplayValue("Test Title")).toBeTruthy();
    expect(screen.getByDisplayValue("Test description")).toBeTruthy();
  });

  it("shows provider badges for connected providers", () => {
    render(<ApproveDraftModal {...BASE_PROPS} />);
    // "Buffer" appears in the badge AND in channel labels, so use getAllBy
    expect(screen.getAllByText("Buffer").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Postiz").length).toBeGreaterThan(0);
  });

  it("shows no-providers message when no providers connected", () => {
    render(
      <ApproveDraftModal
        {...BASE_PROPS}
        integrations={[
          { provider: "buffer", enabled: false, extra: null },
        ]}
      />,
    );
    expect(screen.getByText(/No posting providers connected/i)).toBeTruthy();
  });

  it("shows format rows for draft formats", () => {
    render(<ApproveDraftModal {...BASE_PROPS} />);
    expect(screen.getByText("Square")).toBeTruthy();
  });

  it("pre-checks channels from routing defaults", () => {
    render(<ApproveDraftModal {...BASE_PROPS} />);
    const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    // Should have at least the routing-defaults channels checked
    const checked = checkboxes.filter((cb) => cb.checked);
    expect(checked.length).toBeGreaterThan(0);
  });

  it("shows close button and calls onClose when clicked", async () => {
    const onClose = vi.fn();
    render(<ApproveDraftModal {...BASE_PROPS} onClose={onClose} />);
    const closeBtn = screen.getByLabelText("Close modal");
    await userEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("ApproveDraftModal — confirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls mutation with correct args on confirm", async () => {
    mockMutationFn = vi.fn().mockResolvedValue({
      ok: true,
      pushIds: ["id1", "id2"],
      skipped: [],
    });

    render(<ApproveDraftModal {...BASE_PROPS} />);

    // Change title
    const titleInput = screen.getByDisplayValue("Test Title");
    fireEvent.change(titleInput, { target: { value: "Updated Title" } });

    // Click confirm
    const confirmBtn = screen.getByRole("button", { name: /Confirm/i });
    await userEvent.click(confirmBtn);

    expect(mockMutationFn).toHaveBeenCalledOnce();
    const callArgs = mockMutationFn.mock.calls[0][0];
    expect(callArgs.draftId).toBe("drf_abc");
    expect(callArgs.title).toBe("Updated Title");
    expect(callArgs.postState).toBe("queue");
    expect(callArgs.clientNonce).toBeTypeOf("string");
    expect(callArgs.clientNonce.length).toBeGreaterThan(0);
  });

  it("shows toast and closes on success", async () => {
    const onClose = vi.fn();
    mockMutationFn = vi.fn().mockResolvedValue({
      ok: true,
      pushIds: ["id1"],
      skipped: [],
    });

    render(<ApproveDraftModal {...BASE_PROPS} onClose={onClose} />);
    const confirmBtn = screen.getByRole("button", { name: /Confirm/i });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledOnce();
    });
    expect(onClose).toHaveBeenCalledOnce();
    expect(mockRefresh).toHaveBeenCalledOnce();
  });

  it("shows inline error on nothing_selected response", async () => {
    mockMutationFn = vi.fn().mockResolvedValue({
      ok: false,
      error: "nothing_selected",
    });

    render(<ApproveDraftModal {...BASE_PROPS} />);
    const confirmBtn = screen.getByRole("button", { name: /Confirm/i });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Select at least one channel/i),
      ).toBeTruthy();
    });
  });

  it("shows inline error on no_providers_connected response", async () => {
    mockMutationFn = vi.fn().mockResolvedValue({
      ok: false,
      error: "no_providers_connected",
    });

    render(<ApproveDraftModal {...BASE_PROPS} />);
    const confirmBtn = screen.getByRole("button", { name: /Confirm/i });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText(/Connect Buffer or Postiz/i)).toBeTruthy();
    });
  });

  it("shows inline error on duplicate_approval response", async () => {
    mockMutationFn = vi.fn().mockResolvedValue({
      ok: false,
      error: "duplicate_approval",
    });

    render(<ApproveDraftModal {...BASE_PROPS} />);
    const confirmBtn = screen.getByRole("button", { name: /Confirm/i });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText(/already approved/i)).toBeTruthy();
    });
  });

  it("shows skipped warnings when mutation returns skipped items", async () => {
    mockMutationFn = vi.fn().mockResolvedValue({
      ok: true,
      pushIds: ["id1"],
      skipped: [
        {
          format: "square",
          provider: "buffer",
          channelId: "ch_gone",
          reason: "channel_not_found",
        },
      ],
    });

    render(<ApproveDraftModal {...BASE_PROPS} />);
    const confirmBtn = screen.getByRole("button", { name: /Confirm/i });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText(/Some channels were skipped/i)).toBeTruthy();
      expect(screen.getByText(/channel_not_found/i)).toBeTruthy();
    });
  });
});

describe("ApproveDraftModal — post state toggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutationFn = vi.fn().mockResolvedValue({
      ok: true,
      pushIds: ["id1"],
      skipped: [],
    });
  });

  it("defaults to queue post state", () => {
    render(<ApproveDraftModal {...BASE_PROPS} />);
    const queueRadio = screen.getByRole("radio", {
      name: /Add to queue/i,
    }) as HTMLInputElement;
    expect(queueRadio.checked).toBe(true);
  });

  it("switches to draft post state when selected", async () => {
    render(<ApproveDraftModal {...BASE_PROPS} />);
    const draftRadio = screen.getByRole("radio", {
      name: /Save as draft/i,
    });
    await userEvent.click(draftRadio);

    await userEvent.click(screen.getByRole("button", { name: /Confirm/i }));

    const callArgs = mockMutationFn.mock.calls[0][0];
    expect(callArgs.postState).toBe("draft");
  });
});
