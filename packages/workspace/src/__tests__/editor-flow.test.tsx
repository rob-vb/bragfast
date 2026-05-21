import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CanvasTemplateConfig } from "@bragfast/render-core/browser";
import type { DraftConfig } from "../types";
import { SlotPanel } from "../components/SlotPanel";

const mocks = vi.hoisted(() => ({
  uploadLocalMedia: vi.fn(),
}));

vi.mock("../media", () => ({
  uploadLocalMedia: mocks.uploadLocalMedia,
}));

const templateConfig: CanvasTemplateConfig = {
  version: 2,
  colors: { background: "#fff", text: "#111", primary: "#1F3D3A" },
  formats: {
    landscape: {
      objects: [
        {
          id: "title",
          type: "text",
          name: "Title",
          x: 0,
          y: 0,
          width: 500,
          height: 80,
          opacity: 1,
          zIndex: 1,
          previewText: "Launch",
        },
        {
          id: "visual",
          type: "visual",
          name: "Visual",
          x: 0,
          y: 100,
          width: 500,
          height: 300,
          opacity: 1,
          zIndex: 2,
        },
        {
          id: "logo",
          type: "logo",
          name: "Logo",
          x: 0,
          y: 420,
          width: 120,
          height: 40,
          opacity: 1,
          zIndex: 3,
        },
      ],
    },
    square: { objects: [] },
    portrait: { objects: [] },
  },
};

const baseConfig: DraftConfig = {
  output: "image",
  templateId: "standard-browser",
  format: "landscape",
  objectContent: {},
};

describe("SlotPanel", () => {
  beforeEach(() => {
    mocks.uploadLocalMedia.mockReset();
  });

  it("writes text slots and caption into separate config locations", () => {
    const onConfigChange = vi.fn();
    render(
      <SlotPanel
        templateConfig={templateConfig}
        format="landscape"
        config={baseConfig}
        brandLogoUrl=""
        onConfigChange={onConfigChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Shipped" } });
    expect(onConfigChange).toHaveBeenLastCalledWith({
      ...baseConfig,
      objectContent: { title: { text: "Shipped" } },
    });

    fireEvent.change(screen.getByLabelText("Post caption"), { target: { value: "Social copy" } });
    expect(onConfigChange).toHaveBeenLastCalledWith({ ...baseConfig, caption: "Social copy" });
  });

  it("uploads and previews image media from browse input", async () => {
    mocks.uploadLocalMedia.mockResolvedValue({ id: "media_1", url: "/media/shot.png" });
    const onConfigChange = vi.fn();
    render(
      <SlotPanel
        templateConfig={templateConfig}
        format="landscape"
        config={baseConfig}
        brandLogoUrl=""
        onConfigChange={onConfigChange}
      />,
    );

    const file = new File(["png"], "shot.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Browse media for Visual"), {
      target: { files: [file] },
    });

    await waitFor(() => expect(mocks.uploadLocalMedia).toHaveBeenCalledWith(file));
    await screen.findByAltText("Visual preview");
    expect(onConfigChange).toHaveBeenCalledWith({
      ...baseConfig,
      objectContent: { visual: { image_url: "/media/shot.png" } },
    });
  });

  it("rejects unsupported media and clears existing refs", async () => {
    const onConfigChange = vi.fn();
    render(
      <SlotPanel
        templateConfig={templateConfig}
        format="landscape"
        config={{
          ...baseConfig,
          objectContent: { visual: { image_url: "/media/old.png" } },
        }}
        brandLogoUrl=""
        onConfigChange={onConfigChange}
      />,
    );

    const file = new File(["txt"], "note.txt", { type: "text/plain" });
    fireEvent.change(screen.getByLabelText("Browse media for Visual"), {
      target: { files: [file] },
    });

    expect(await screen.findByText("Unsupported file type. Use PNG, JPG, WebP, SVG, MP4, MOV, or WebM.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear media" }));
    expect(onConfigChange).toHaveBeenLastCalledWith({
      ...baseConfig,
      objectContent: { visual: {} },
    });
  });
});
