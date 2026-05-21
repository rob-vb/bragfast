import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SchedulePanel } from "../components/SchedulePanel";
import type { FormatRenderState, IntegrationRecord, RoutingDefault, ScheduleRequest } from "../types";

const mocks = vi.hoisted(() => ({
  fetchIntegrations: vi.fn(),
  fetchRoutingDefaults: vi.fn(),
}));

vi.mock("../api", () => ({
  fetchIntegrations: mocks.fetchIntegrations,
  fetchRoutingDefaults: mocks.fetchRoutingDefaults,
}));

const readyFormats: Record<"landscape" | "square" | "portrait", FormatRenderState> = {
  landscape: { phase: "done", url: "/output/landscape.jpg" },
  square: { phase: "done", url: "/output/square.jpg" },
  portrait: { phase: "done", url: "/output/portrait.jpg" },
};

const bufferIntegration: IntegrationRecord = {
  provider: "buffer",
  enabled: true,
  extra: JSON.stringify({
    channels: [
      { id: "ch_x", name: "X channel", service: "twitter" },
      { id: "ch_linkedin", name: "LinkedIn page", service: "linkedin" },
      { id: "ch_instagram", name: "Instagram profile", service: "instagram" },
    ],
  }),
};

function renderPanel({
  integrations = [bufferIntegration],
  routingDefaults = [],
  phase = "idle",
  confirmation = [],
  trigger = vi.fn().mockResolvedValue(undefined),
}: {
  integrations?: IntegrationRecord[];
  routingDefaults?: RoutingDefault[];
  phase?: "idle" | "uploading" | "scheduling" | "done" | "failed";
  confirmation?: Array<{
    provider: string;
    channelId: string;
    channelName?: string;
    format: "landscape" | "square" | "portrait";
    status: string;
    scheduledAt?: string;
  }>;
  trigger?: (request: Omit<ScheduleRequest, "draftId" | "caption">) => Promise<void>;
} = {}) {
  mocks.fetchIntegrations.mockResolvedValue(integrations);
  mocks.fetchRoutingDefaults.mockResolvedValue(routingDefaults);

  render(
    <SchedulePanel
      activeFormat="landscape"
      formats={readyFormats}
      schedule={{
        phase,
        confirmation,
        error: null,
        trigger,
      }}
    />,
  );

  return { trigger };
}

describe("SchedulePanel", () => {
  beforeEach(() => {
    mocks.fetchIntegrations.mockReset();
    mocks.fetchRoutingDefaults.mockReset();
  });

  it("shows a Buffer not connected notice when no enabled Buffer integration exists", async () => {
    renderPanel({ integrations: [] });

    expect(
      await screen.findByText("Buffer not connected. Connect Buffer in Settings to schedule posts."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Schedule post" })).not.toBeInTheDocument();
  });

  it("renders channel groups for each image format", async () => {
    renderPanel();

    expect(await screen.findByRole("heading", { name: "Landscape" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Square" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Portrait" })).toBeInTheDocument();
  });

  it("pre-checks saved routing defaults instead of built-in defaults", async () => {
    renderPanel({
      routingDefaults: [
        {
          format: "landscape",
          channels: [{ provider: "buffer", channelId: "ch_x" }],
        },
      ],
    });

    const landscape = await screen.findByRole("group", { name: "Landscape" });
    expect(within(landscape).getByLabelText("X channel")).toBeChecked();
    expect(within(landscape).getByLabelText("LinkedIn page")).not.toBeChecked();
  });

  it("reveals a native datetime-local input for exact scheduling", async () => {
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Exact time" }));

    expect(screen.getByText("Post at")).toBeInTheDocument();
    expect(screen.getByLabelText("Post at")).toHaveAttribute("type", "datetime-local");
  });

  it("submits selected channels with queue scheduling", async () => {
    const { trigger } = renderPanel();

    await screen.findByRole("heading", { name: "Landscape" });
    fireEvent.click(screen.getByRole("button", { name: "Schedule post" }));

    await waitFor(() =>
      expect(trigger).toHaveBeenCalledWith({
        selections: [
          { format: "landscape", channelIds: ["ch_linkedin"] },
          { format: "square", channelIds: ["ch_x", "ch_linkedin"] },
          { format: "portrait", channelIds: ["ch_instagram"] },
        ],
        scheduling: { mode: "queue" },
      }),
    );
  });

  it("shows successful scheduling confirmation lines", async () => {
    renderPanel({
      phase: "done",
      confirmation: [
        {
          provider: "buffer",
          channelId: "ch_linkedin",
          channelName: "LinkedIn page",
          format: "landscape",
          status: "scheduled",
        },
      ],
    });

    expect(await screen.findByRole("heading", { name: "Scheduled" })).toBeInTheDocument();
    expect(screen.getByText("Added to queue on LinkedIn page")).toBeInTheDocument();
  });
});
