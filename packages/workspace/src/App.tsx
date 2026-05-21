import { useState } from "react";
import type { CanvasTemplateConfig } from "@bragfast/render-core/browser";
import { Home } from "./pages/Home";
import type { Brand } from "./types";

export default function App() {
  const [editorState, setEditorState] = useState<{
    draftId: string | null;
    templateId?: string;
    config?: CanvasTemplateConfig;
    brand?: Brand;
  } | null>(null);

  if (editorState) {
    return (
      <main className="min-h-screen bg-[var(--workspace-bg)] px-6 py-6 text-[var(--workspace-ink)]">
        <div className="mx-auto max-w-5xl rounded-[8px] border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-5">
          <button
            type="button"
            className="mb-4 text-[12px] font-semibold text-[var(--workspace-forest)] underline decoration-[var(--workspace-lime)] underline-offset-4"
            onClick={() => setEditorState(null)}
          >
            Start from template
          </button>
          <h1 className="text-[24px] font-semibold text-[var(--workspace-forest)]">
            {editorState.draftId ? "Loading draft..." : "Template ready"}
          </h1>
          <p className="mt-2 text-[14px] text-[var(--workspace-muted)]">
            The single-screen editor continues in the next plan.
          </p>
        </div>
      </main>
    );
  }

  return (
    <Home
      onReopenDraft={(draftId) => setEditorState({ draftId })}
      onNewTemplate={(templateId, config, brand) =>
        setEditorState({ draftId: null, templateId, config, brand })
      }
    />
  );
}
