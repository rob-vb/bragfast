/**
 * Component tests for ApproveDraftModal.
 *
 * Mocks:
 *  - global fetch (the cook-and-approve POST endpoint)
 *  - next/navigation: useRouter
 *  - sonner: toast
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApproveDraftModal } from "../approve-draft-modal";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));

const mockToastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: { success: (...args: unknown[]) => mockToastSuccess(...args) },
}));

vi.mock("posthog-js", () => ({
  default: { capture: vi.fn() },
}));

let mockFetch: ReturnType<typeof vi.fn>;

function mockFetchOk(body: unknown) {
  mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => body,
  });
  global.fetch = mockFetch as unknown as typeof fetch;
}

function mockFetchErr(status: number, body: unknown) {
  mockFetch = vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => body,
  });
  global.fetch = mockFetch as unknown as typeof fetch;
}

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
  });

  it("renders title and description fields pre-filled", () => {
    render(<ApproveDraftModal {...BASE_PROPS} />);
    expect(screen.getByDisplayValue("Test Title")).toBeTruthy();
    expect(screen.getByDisplayValue("Test description")).toBeTruthy();
  });

  it("shows provider badges for connected providers", () => {
    render(<ApproveDraftModal {...BASE_PROPS} />);
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

  it("POSTs to the approve endpoint with correct body", async () => {
    mockFetchOk({ ok: true, pushIds: ["id1", "id2"], skipped: [] });

    render(<ApproveDraftModal {...BASE_PROPS} />);

    const titleInput = screen.getByDisplayValue("Test Title");
    fireEvent.change(titleInput, { target: { value: "Updated Title" } });

    const confirmBtn = screen.getByRole("button", { name: /^Send to /i });
    await userEvent.click(confirmBtn);

    await waitFor(() => expect(mockFetch).toHaveBeenCalledOnce());
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/v1/drafts/drf_abc/approve");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.title).toBe("Updated Title");
    expect(body.postState).toBe("queue");
    expect(typeof body.clientNonce).toBe("string");
    expect(body.clientNonce.length).toBeGreaterThan(0);
  });

  it("shows toast and navigates to history on success", async () => {
    const onClose = vi.fn();
    mockFetchOk({ ok: true, pushIds: ["id1"], skipped: [] });

    render(<ApproveDraftModal {...BASE_PROPS} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: /^Send to /i }));

    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledOnce());
    expect(onClose).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith("/admin/history");
  });

  it("shows inline error on nothing_selected response", async () => {
    mockFetchOk({ ok: false, error: "nothing_selected" });

    render(<ApproveDraftModal {...BASE_PROPS} />);
    await userEvent.click(screen.getByRole("button", { name: /^Send to /i }));

    await waitFor(() => {
      expect(screen.getByText(/Select at least one channel/i)).toBeTruthy();
    });
  });

  it("shows inline error on no_providers_connected response", async () => {
    mockFetchOk({ ok: false, error: "no_providers_connected" });

    render(<ApproveDraftModal {...BASE_PROPS} />);
    await userEvent.click(screen.getByRole("button", { name: /^Send to /i }));

    await waitFor(() => {
      expect(screen.getByText(/Connect Buffer or Postiz/i)).toBeTruthy();
    });
  });

  it("shows inline error on duplicate_approval response", async () => {
    mockFetchOk({ ok: false, error: "duplicate_approval" });

    render(<ApproveDraftModal {...BASE_PROPS} />);
    await userEvent.click(screen.getByRole("button", { name: /^Send to /i }));

    await waitFor(() => {
      expect(screen.getByText(/already approved/i)).toBeTruthy();
    });
  });

  it("shows server error message on non-ok HTTP response", async () => {
    mockFetchErr(500, { error: "Render failed." });

    render(<ApproveDraftModal {...BASE_PROPS} />);
    await userEvent.click(screen.getByRole("button", { name: /^Send to /i }));

    await waitFor(() => {
      expect(screen.getByText(/Render failed/i)).toBeTruthy();
    });
  });

  it("shows skipped warnings when endpoint returns skipped items", async () => {
    mockFetchOk({
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
    await userEvent.click(screen.getByRole("button", { name: /^Send to /i }));

    await waitFor(() => {
      expect(screen.getByText(/Some channels were skipped/i)).toBeTruthy();
      expect(screen.getByText(/channel_not_found/i)).toBeTruthy();
    });
  });
});
