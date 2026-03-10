"use client";
import { useCallback, useEffect, useRef } from "react";
import { EditorProvider, useEditor } from "./editor-context";
import { EditorLeftSidebar } from "./editor-left-sidebar";
import { EditorCanvas } from "./editor-canvas";
import { EditorRightSidebar } from "./editor-right-sidebar";
import type { CanvasTemplateConfig } from "@/lib/templates/canvas-types";

/** Injects Google Fonts <link> tags for all fonts used across all formats */
function useFontLoader(config: CanvasTemplateConfig) {
  const loadedRef = useRef(new Set<string>());

  useEffect(() => {
    const families = new Set<string>();
    for (const fmt of Object.values(config.formats)) {
      for (const obj of fmt.objects) {
        if (obj.fontFamily) {
          families.add(obj.fontFamily);
        }
      }
    }
    for (const family of families) {
      if (loadedRef.current.has(family)) continue;
      loadedRef.current.add(family);
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
      document.head.appendChild(link);
    }
  }, [config]);
}

function EditorInner() {
  const { state, dispatch } = useEditor();
  useFontLoader(state.config);

  const handleSave = useCallback(async () => {
    const res = await fetch(`/api/v1/templates/${state.templateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: state.name,
        config: state.config,
      }),
    });
    if (!res.ok) {
      console.error("Save failed:", await res.text());
      return;
    }
    dispatch({ type: "MARK_SAVED" });
  }, [state.templateId, state.name, state.config, dispatch]);

  return (
    <div className="h-screen flex bg-white">
      <EditorLeftSidebar onSave={handleSave} />
      <EditorCanvas />
      <EditorRightSidebar />
    </div>
  );
}

interface TemplateEditorProps {
  templateId: string;
  name: string;
  config: CanvasTemplateConfig;
}

export function TemplateEditor({ templateId, name, config }: TemplateEditorProps) {
  return (
    <EditorProvider templateId={templateId} initialName={name} initialConfig={config}>
      <EditorInner />
    </EditorProvider>
  );
}
