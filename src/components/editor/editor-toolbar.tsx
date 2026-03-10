"use client";
import { useRouter } from "next/navigation";
import { useEditor } from "./editor-context";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface EditorToolbarProps {
  onSave: () => Promise<void>;
}

export function EditorToolbar({ onSave }: EditorToolbarProps) {
  const router = useRouter();
  const { state, dispatch } = useEditor();
  const [saving, setSaving] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.userAgent));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    await onSave();
    setSaving(false);
  }, [onSave]);

  return (
    <div className="h-11 border-b border-zinc-200 bg-white/80 backdrop-blur-sm flex items-center px-3 gap-3 shrink-0 z-10">
      {/* Back */}
      <button
        onClick={() => router.push("/dashboard/templates")}
        className="w-8 h-8 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
        title="Back to templates"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-zinc-200" />

      {/* Editable name + dirty indicator */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <input
          ref={nameRef}
          value={state.name}
          onChange={(e) => dispatch({ type: "SET_NAME", name: e.target.value })}
          onKeyDown={(e) => { if (e.key === "Enter") nameRef.current?.blur(); }}
          className="bg-transparent text-sm font-medium text-zinc-800 border-none outline-none px-1.5 py-1 rounded hover:bg-zinc-100 focus:bg-zinc-100 focus:ring-1 focus:ring-zinc-300 transition-colors truncate max-w-[260px]"
          spellCheck={false}
        />
        {state.isDirty && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Unsaved changes" />
        )}
      </div>

      {/* Save */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-zinc-400 hidden sm:block">
          {isMac ? "\u2318S" : "Ctrl+S"}
        </span>
        <button
          onClick={handleSave}
          disabled={saving || !state.isDirty}
          className={`h-7 px-3 text-xs font-medium rounded-md transition-all ${
            state.isDirty
              ? "bg-zinc-900 text-white hover:bg-zinc-800"
              : "bg-zinc-100 text-zinc-400 cursor-default"
          }`}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
