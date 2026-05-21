import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Home } from "../pages/Home";

const mocks = vi.hoisted(() => ({
  fetchDrafts: vi.fn(),
  createDraft: vi.fn(),
}));

vi.mock("../api", async () => {
  const actual = await vi.importActual<typeof import("../api")>("../api");
  return {
    ...actual,
    fetchDrafts: mocks.fetchDrafts,
    createDraft: mocks.createDraft,
  };
});

vi.mock("../components/TemplatePreview", () => ({
  TemplatePreview: ({ config }: { config: { colors: { primary: string } } }) => (
    <div data-testid="template-preview" style={{ color: config.colors.primary }} />
  ),
}));

vi.mock("../hooks/useBrand", () => ({
  useBrand: () => ({
    selectedBrand: {
      name: "Acme",
      logoBase64: "https://example.com/logo.png",
      website: "",
      colors: { background: "#fff", text: "#111", primary: "#123456" },
    },
    colors: { background: "#fff", text: "#111", primary: "#123456" },
    brands: [],
    loading: false,
    error: null,
    selectedBrandId: "brand_1",
    selectBrand: vi.fn(),
  }),
}));

describe("Home", () => {
  beforeEach(() => {
    mocks.fetchDrafts.mockReset();
    mocks.createDraft.mockReset();
  });

  it("renders empty drafts, Start from template, and five template tiles", async () => {
    mocks.fetchDrafts.mockResolvedValue([]);

    render(<Home onReopenDraft={vi.fn()} onNewTemplate={vi.fn()} />);

    expect(await screen.findByText("No drafts yet")).toBeInTheDocument();
    expect(screen.getByText("Pick a template to start your first local draft.")).toBeInTheDocument();
    expect(screen.getByText("Start from template")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Use template/i })).toHaveLength(5);
  });

  it("calls the reopen handler when a recent draft is clicked", async () => {
    mocks.fetchDrafts.mockResolvedValue([
      {
        id: "draft_1",
        name: "Launch draft",
        source: "user",
        created_at: "2026-05-21T08:00:00Z",
        preview: { title: "Launch draft", output: "image", templateId: "hero" },
      },
    ]);
    const onReopenDraft = vi.fn();

    render(<Home onReopenDraft={onReopenDraft} onNewTemplate={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: /Reopen draft/i }));

    expect(onReopenDraft).toHaveBeenCalledWith("draft_1");
  });

  it("selects templates without creating a draft", async () => {
    mocks.fetchDrafts.mockResolvedValue([]);
    const onNewTemplate = vi.fn();

    render(<Home onReopenDraft={vi.fn()} onNewTemplate={onNewTemplate} />);

    await waitFor(() => expect(screen.getAllByRole("button", { name: /Use template/i })).toHaveLength(5));
    fireEvent.click(screen.getAllByRole("button", { name: /Use template/i })[0]);

    expect(onNewTemplate).toHaveBeenCalledOnce();
    expect(mocks.createDraft).not.toHaveBeenCalled();
  });
});
