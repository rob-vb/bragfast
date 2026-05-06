/**
 * Component tests for ApproveDraftModal.
 *
 * Mocks:
 *  - global fetch (rewrite-copy + approve endpoints)
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
const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

vi.mock("posthog-js", () => ({
  default: { capture: vi.fn() },
}));

let mockFetch: ReturnType<typeof vi.fn>;

function mockFetchOk(body: unknown) {
  mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
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

/** Find the channel-list checkbox for a channel by display name.
 * The composer card heading also renders the display name, so we must scope
 * the lookup to the `<label>` ancestor that wraps the checkbox row. */
function findChannelCheckbox(displayName: string): HTMLInputElement {
  const matches = screen.getAllByText(displayName);
  for (const el of matches) {
    const label = el.closest("label");
    if (label) {
      const cb = label.querySelector("input[type=checkbox]");
      if (cb) return cb as HTMLInputElement;
    }
  }
  throw new Error(`No channel checkbox found for "${displayName}"`);
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

describe("ApproveDraftModal — per-channel composers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders one composer card per selected channel, eager-seeded with initial copy", async () => {
    render(<ApproveDraftModal {...BASE_PROPS} />);

    await waitFor(() => {
      expect(screen.getByTestId("channel-card-buffer::ch1")).toBeTruthy();
      expect(screen.getByTestId("channel-card-postiz::ch3")).toBeTruthy();
    });

    expect(
      (
        screen.getByTestId("channel-title-buffer::ch1") as HTMLInputElement
      ).value,
    ).toBe("Test Title");
    expect(
      (
        screen.getByTestId(
          "channel-description-postiz::ch3",
        ) as HTMLTextAreaElement
      ).value,
    ).toBe("Test description");
  });

  it("does not render a composer card for unchecked channels", async () => {
    render(<ApproveDraftModal {...BASE_PROPS} />);

    await waitFor(() => {
      expect(screen.getByTestId("channel-card-buffer::ch1")).toBeTruthy();
    });

    const xCheckbox = findChannelCheckbox("Acme X");
    await userEvent.click(xCheckbox);

    await waitFor(() => {
      expect(screen.queryByTestId("channel-card-buffer::ch1")).toBeNull();
    });
    expect(screen.getByTestId("channel-card-postiz::ch3")).toBeTruthy();
  });

  it("preserves per-channel edits when channel is unchecked then re-checked", async () => {
    render(<ApproveDraftModal {...BASE_PROPS} />);
    await waitFor(() => {
      expect(screen.getByTestId("channel-title-buffer::ch1")).toBeTruthy();
    });

    const xTitle = screen.getByTestId(
      "channel-title-buffer::ch1",
    ) as HTMLInputElement;
    fireEvent.change(xTitle, { target: { value: "Edited X title" } });

    const xCheckbox = findChannelCheckbox("Acme X");
    await userEvent.click(xCheckbox);
    await waitFor(() =>
      expect(screen.queryByTestId("channel-card-buffer::ch1")).toBeNull(),
    );
    await userEvent.click(xCheckbox);

    await waitFor(() => {
      const restored = screen.getByTestId(
        "channel-title-buffer::ch1",
      ) as HTMLInputElement;
      expect(restored.value).toBe("Edited X title");
    });
  });

  it("regenerate updates only the targeted channel's copy", async () => {
    mockFetchByUrl({
      "rewrite-copy": {
        ok: true,
        body: { title: "X-toned title", description: "X-toned desc" },
      },
    });

    render(<ApproveDraftModal {...BASE_PROPS} />);
    await waitFor(() => {
      expect(screen.getByTestId("channel-card-buffer::ch1")).toBeTruthy();
    });

    await userEvent.click(
      screen.getByTestId("channel-regenerate-buffer::ch1"),
    );

    await waitFor(() => {
      expect(
        (
          screen.getByTestId("channel-title-buffer::ch1") as HTMLInputElement
        ).value,
      ).toBe("X-toned title");
    });
    expect(
      (
        screen.getByTestId("channel-title-postiz::ch3") as HTMLInputElement
      ).value,
    ).toBe("Test Title");
  });

  it("disables regenerate after three generations on the same channel", async () => {
    mockFetchByUrl({
      "rewrite-copy": {
        ok: true,
        body: { title: "v", description: "v" },
      },
    });

    render(<ApproveDraftModal {...BASE_PROPS} />);
    const button = () =>
      screen.getByTestId(
        "channel-regenerate-buffer::ch1",
      ) as HTMLButtonElement;

    await waitFor(() => expect(button()).toBeTruthy());

    for (let i = 0; i < 3; i++) {
      await userEvent.click(button());
      await waitFor(() => {
        expect(
          (
            screen.getByTestId("channel-title-buffer::ch1") as HTMLInputElement
          ).value,
        ).toBe("v");
      });
    }

    expect(button().disabled).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(3);

    await userEvent.click(button());
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("regenerate cap is per-channel, not per-class", async () => {
    mockFetchByUrl({
      "rewrite-copy": {
        ok: true,
        body: { title: "v", description: "v" },
      },
    });

    // Two LinkedIn-class channels: Buffer ch2 + a Postiz LinkedIn channel.
    const props = {
      ...BASE_PROPS,
      integrations: [
        BUFFER_INTEGRATION,
        {
          provider: "postiz",
          enabled: true,
          extra: JSON.stringify({
            channels: [
              { id: "ch_li", identifier: "LINKEDIN", name: "Postiz LI" },
            ],
          }),
        },
      ],
      routingRows: [
        {
          format: "square",
          channels: [
            { provider: "buffer" as const, channelId: "ch2" },
            { provider: "postiz" as const, channelId: "ch_li" },
          ],
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
    };

    render(<ApproveDraftModal {...props} />);

    const bufferLi = () =>
      screen.getByTestId(
        "channel-regenerate-buffer::ch2",
      ) as HTMLButtonElement;
    const postizLi = () =>
      screen.getByTestId(
        "channel-regenerate-postiz::ch_li",
      ) as HTMLButtonElement;

    await waitFor(() => expect(bufferLi()).toBeTruthy());

    for (let i = 0; i < 3; i++) {
      await userEvent.click(bufferLi());
      await waitFor(() =>
        expect(
          (
            screen.getByTestId("channel-title-buffer::ch2") as HTMLInputElement
          ).value,
        ).toBe("v"),
      );
    }
    expect(bufferLi().disabled).toBe(true);
    // The other LinkedIn channel still has fresh budget.
    expect(postizLi().disabled).toBe(false);
  });

  it("disables regenerate for 'other' channel class with explanatory tooltip", async () => {
    const props = {
      ...BASE_PROPS,
      integrations: [
        {
          provider: "postiz",
          enabled: true,
          extra: JSON.stringify({
            channels: [
              { id: "ch_pin", identifier: "PINTEREST", name: "Pinterest A" },
            ],
          }),
        },
      ],
      routingRows: [
        {
          format: "square",
          channels: [{ provider: "postiz" as const, channelId: "ch_pin" }],
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
    };

    render(<ApproveDraftModal {...props} />);

    await waitFor(() => {
      const btn = screen.getByTestId(
        "channel-regenerate-postiz::ch_pin",
      ) as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
      expect(btn.getAttribute("title")).toMatch(/isn't supported/i);
    });
  });

  it("seeds composer with legacy initialCopyByPlatform and starts cap at 1", async () => {
    mockFetchByUrl({
      "rewrite-copy": {
        ok: true,
        body: { title: "v", description: "v" },
      },
    });

    render(
      <ApproveDraftModal
        {...BASE_PROPS}
        initialCopyByPlatform={{
          x: { title: "Legacy X", description: "Legacy X desc" },
        }}
      />,
    );

    await waitFor(() => {
      expect(
        (
          screen.getByTestId("channel-title-buffer::ch1") as HTMLInputElement
        ).value,
      ).toBe("Legacy X");
    });

    // Two more generations bring the cap to 3.
    const button = () =>
      screen.getByTestId(
        "channel-regenerate-buffer::ch1",
      ) as HTMLButtonElement;
    for (let i = 0; i < 2; i++) {
      await userEvent.click(button());
      await waitFor(() =>
        expect(
          (
            screen.getByTestId("channel-title-buffer::ch1") as HTMLInputElement
          ).value,
        ).toBe("v"),
      );
    }
    expect(button().disabled).toBe(true);
  });
});

describe("ApproveDraftModal — confirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POSTs copyByChannel keyed by channelKey on approve", async () => {
    mockFetchOk({ ok: true, pushIds: ["id1"], skipped: [] });

    render(<ApproveDraftModal {...BASE_PROPS} />);

    await waitFor(() =>
      expect(screen.getByTestId("channel-title-buffer::ch1")).toBeTruthy(),
    );

    fireEvent.change(screen.getByTestId("channel-title-buffer::ch1"), {
      target: { value: "Custom X title" },
    });

    await userEvent.click(screen.getByRole("button", { name: /^Send to /i }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const approveCall = mockFetch.mock.calls.find(([url]) =>
      (url as string).includes("/approve"),
    );
    expect(approveCall).toBeTruthy();
    const body = JSON.parse((approveCall![1] as RequestInit).body as string);
    expect(body.copyByChannel).toEqual({
      "buffer::ch1": {
        title: "Custom X title",
        description: "Test description",
      },
      "postiz::ch3": { title: "Test Title", description: "Test description" },
    });
    expect(body.copyByPlatform).toBeUndefined();
    expect(body.title).toBe("Test Title");
    expect(body.description).toBe("Test description");
    expect(body.postState).toBe("queue");
    expect(typeof body.clientNonce).toBe("string");
  });

  it("excludes unchecked channels from copyByChannel", async () => {
    mockFetchOk({ ok: true, pushIds: ["id1"], skipped: [] });

    render(<ApproveDraftModal {...BASE_PROPS} />);
    await waitFor(() =>
      expect(screen.getByTestId("channel-title-buffer::ch1")).toBeTruthy(),
    );

    const xCheckbox = findChannelCheckbox("Acme X");
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
      expect(Object.keys(body.copyByChannel ?? {})).toEqual(["postiz::ch3"]);
    });
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

  it("shows error toast and keeps modal open on 409 all_selections_skipped", async () => {
    const onClose = vi.fn();
    mockFetchErr(409, { error: "all_selections_skipped" });

    render(<ApproveDraftModal {...BASE_PROPS} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: /^Send to /i }));

    await waitFor(() => expect(mockToastError).toHaveBeenCalledOnce());
    expect(mockToastError.mock.calls[0]![0]).toMatch(/All selected channels/i);
    expect(onClose).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
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
