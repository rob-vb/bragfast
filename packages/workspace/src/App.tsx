import { useState } from "react";
import {
  CANVAS_DEFAULTS,
  type CanvasTemplateConfig,
} from "@bragfast/render-core/browser";
import { fetchDraft } from "./api";
import { Home } from "./pages/Home";
import { Editor } from "./pages/Editor";
import type { Brand, DraftConfig } from "./types";

type AppView =
  | { screen: "home" }
  | {
      screen: "editor";
      draftId: string | null;
      templateId: string;
      templateConfig: CanvasTemplateConfig;
      initialConfig: DraftConfig;
      initialBrand: Brand;
      initiallyDirty?: boolean;
    }
  | { screen: "loading-draft" }
  | { screen: "error" };

export default function App() {
  const [view, setView] = useState<AppView>({ screen: "home" });

  async function reopenDraft(draftId: string) {
    setView({ screen: "loading-draft" });
    try {
      const draft = await fetchDraft(draftId);
      const templateId = draft.config.templateId ?? "standard-browser";
      const template = CANVAS_DEFAULTS[templateId] ?? CANVAS_DEFAULTS["standard-browser"];
      setView({
        screen: "editor",
        draftId,
        templateId,
        templateConfig: template.config,
        initialConfig: draft.config,
        initialBrand: {
          name: "",
          logoBase64: "",
          website: "",
          colors: draft.config.colors ?? template.config.colors,
        },
      });
    } catch {
      setView({ screen: "error" });
    }
  }

  if (view.screen === "loading-draft") {
    return (
      <main className="min-h-screen bg-[var(--workspace-bg)] px-6 py-6 text-[var(--workspace-ink)]">
        <div className="mx-auto max-w-5xl rounded-[8px] border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-5">
          <h1 className="text-[24px] font-semibold text-[var(--workspace-forest)]">
            Loading draft...
          </h1>
        </div>
      </main>
    );
  }

  if (view.screen === "error") {
    return (
      <main className="min-h-screen bg-[var(--workspace-bg)] px-6 py-6 text-[var(--workspace-ink)]">
        <div className="mx-auto max-w-5xl border border-red-200 bg-white p-5 text-red-700">
          Could not load the Workspace. Check that the local brag server is still running, then refresh.
        </div>
      </main>
    );
  }

  if (view.screen === "editor") {
    return (
      <Editor
        draftId={view.draftId}
        templateId={view.templateId}
        templateConfig={view.templateConfig}
        initialConfig={view.initialConfig}
        initialBrand={view.initialBrand}
        initiallyDirty={view.initiallyDirty}
        onBack={() => setView({ screen: "home" })}
      />
    );
  }

  return (
    <Home
      onReopenDraft={(draftId) => void reopenDraft(draftId)}
      onNewTemplate={(templateId, config, brand) =>
        setView({
          screen: "editor",
          draftId: null,
          templateId,
          templateConfig: config,
          initialConfig: {
            output: "image",
            templateId,
            format: "landscape",
            colors: brand.colors,
            objectContent: {},
          },
          initialBrand: brand,
          initiallyDirty: false,
        })
      }
    />
  );
}
