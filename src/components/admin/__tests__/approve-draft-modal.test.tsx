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

// Multi-endpoint fetch helper: maps URL pattern → response body, with the
// approve endpoint as a default fallback.
type FetchResponse = { ok: boolean; status?: number; body: unknown };
function mockFetchByUrl(routes: Record<string, FetchResponse>) {
  mockFetch = vi.fn().mockImplementation((url: string) => {
    for (const [pattern, resp] of Object.entries(routes)) {
      if (url.includes(pattern)) {
        return Promise.resolve({
          ok: resp.ok,
          status: resp.status ?? (resp.ok ? 200 : 500),
          json: async () => resp.body,
        });
      }
    }
    throw new Error(`mockFetchByUrl: no match for ${url}`);
  });
  global.fetch = mockFetch as unknown as typeof fetch;
}

describe("ApproveDraftModal — customize copy per class", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders one customize button per available named class", () => {
    render(<ApproveDraftModal {...BASE_PROPS} />);
    // Default-checked: buffer ch1 (twitter→x) + postiz ch3 (instagram).
    expect(screen.getByTestId("customize-button-x")).toBeTruthy();
    expect(screen.getByTestId("customize-button-instagram")).toBeTruthy();
    expect(screen.queryByTestId("customize-button-linkedin")).toBeNull();
  });

  it("hides a class button when its only checked channel is unchecked", async () => {
    render(<ApproveDraftModal {...BASE_PROPS} />);
    expect(screen.getByTestId("customize-button-x")).toBeTruthy();

    // Find and uncheck the buffer ch1 (X) checkbox.
    const xLabel = screen.getByText("Acme X").closest("label")!;
    const xCheckbox = xLabel.querySelector(
      "input[type=checkbox]",
    ) as HTMLInputElement;
    await userEvent.click(xCheckbox);

    expect(screen.queryByTestId("customize-button-x")).toBeNull();
    expect(screen.getByTestId("customize-button-instagram")).toBeTruthy();
  });

  it("renders a variant block after a successful rewrite-copy call", async () => {
    mockFetchByUrl({
      "rewrite-copy": {
        ok: true,
        body: { title: "X-toned title", description: "X-toned desc" },
      },
    });

    render(<ApproveDraftModal {...BASE_PROPS} />);
    await userEvent.click(screen.getByTestId("customize-button-x"));

    await waitFor(() => {
      expect(screen.getByTestId("variant-x")).toBeTruthy();
    });
    expect(screen.getByDisplayValue("X-toned title")).toBeTruthy();
    expect(screen.getByDisplayValue("X-toned desc")).toBeTruthy();
  });

  it("disables the button after three generations for the same class", async () => {
    mockFetchByUrl({
      "rewrite-copy": {
        ok: true,
        body: { title: "v", description: "v" },
      },
    });

    render(<ApproveDraftModal {...BASE_PROPS} />);
    const button = () =>
      screen.getByTestId("customize-button-x") as HTMLButtonElement;

    for (let i = 0; i < 3; i++) {
      await userEvent.click(button());
      await waitFor(() => expect(screen.getByTestId("variant-x")).toBeTruthy());
    }

    expect(button().disabled).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(3);

    // A fourth click does nothing — no extra fetch.
    await userEvent.click(button());
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("removes a variant when the Remove button is clicked", async () => {
    mockFetchByUrl({
      "rewrite-copy": {
        ok: true,
        body: { title: "v", description: "v" },
      },
    });

    render(<ApproveDraftModal {...BASE_PROPS} />);
    await userEvent.click(screen.getByTestId("customize-button-x"));
    await waitFor(() => expect(screen.getByTestId("variant-x")).toBeTruthy());

    await userEvent.click(screen.getByTestId("variant-remove-x"));

    await waitFor(() =>
      expect(screen.queryByTestId("variant-x")).toBeNull(),
    );
  });

  it("greys out a variant when its class has no checked channels but keeps it in state", async () => {
    mockFetchByUrl({
      "rewrite-copy": {
        ok: true,
        body: { title: "v", description: "v" },
      },
    });

    render(<ApproveDraftModal {...BASE_PROPS} />);
    await userEvent.click(screen.getByTestId("customize-button-x"));
    await waitFor(() => expect(screen.getByTestId("variant-x")).toBeTruthy());

    // Uncheck the X channel.
    const xLabel = screen.getByText("Acme X").closest("label")!;
    const xCheckbox = xLabel.querySelector(
      "input[type=checkbox]",
    ) as HTMLInputElement;
    await userEvent.click(xCheckbox);

    const block = screen.getByTestId("variant-x");
    expect(block).toBeTruthy();
    expect(block.getAttribute("aria-disabled")).toBe("true");
  });

  it("sends copyByPlatform on approve keyed by ChannelClass", async () => {
    mockFetchByUrl({
      "rewrite-copy": {
        ok: true,
        body: { title: "X-title", description: "X-desc" },
      },
      approve: {
        ok: true,
        body: { ok: true, pushIds: ["id1"], skipped: [] },
      },
    });

    render(<ApproveDraftModal {...BASE_PROPS} />);
    await userEvent.click(screen.getByTestId("customize-button-x"));
    await waitFor(() => expect(screen.getByTestId("variant-x")).toBeTruthy());

    await userEvent.click(screen.getByRole("button", { name: /^Send to /i }));

    await waitFor(() => {
      const approveCall = mockFetch.mock.calls.find(([url]) =>
        (url as string).includes("/approve"),
      );
      expect(approveCall).toBeTruthy();
      const body = JSON.parse(
        (approveCall![1] as RequestInit).body as string,
      );
      expect(body.copyByPlatform).toEqual({
        x: { title: "X-title", description: "X-desc" },
      });
    });
  });

  it("excludes greyed variants from the approve body", async () => {
    mockFetchByUrl({
      "rewrite-copy": {
        ok: true,
        body: { title: "X-title", description: "X-desc" },
      },
      approve: {
        ok: true,
        body: { ok: true, pushIds: ["id1"], skipped: [] },
      },
    });

    render(<ApproveDraftModal {...BASE_PROPS} />);
    await userEvent.click(screen.getByTestId("customize-button-x"));
    await waitFor(() => expect(screen.getByTestId("variant-x")).toBeTruthy());

    // Uncheck the X channel — variant becomes greyed.
    const xLabel = screen.getByText("Acme X").closest("label")!;
    const xCheckbox = xLabel.querySelector(
      "input[type=checkbox]",
    ) as HTMLInputElement;
    await userEvent.click(xCheckbox);

    await userEvent.click(screen.getByRole("button", { name: /^Send to /i }));

    await waitFor(() => {
      const approveCall = mockFetch.mock.calls.find(([url]) =>
        (url as string).includes("/approve"),
      );
      expect(approveCall).toBeTruthy();
      const body = JSON.parse(
        (approveCall![1] as RequestInit).body as string,
      );
      expect(body.copyByPlatform).toBeUndefined();
    });
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
