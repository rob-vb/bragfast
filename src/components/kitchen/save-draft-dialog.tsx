"use client";

import { useEffect, useRef, useState } from "react";

interface SaveDraftDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  defaultName?: string;
  title?: string;
  submitLabel?: string;
}

export function SaveDraftDialog({
  open,
  onClose,
  onSave,
  defaultName,
  title = "Save as Draft",
  submitLabel = "Save",
}: SaveDraftDialogProps) {
  const [name, setName] = useState(defaultName ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(defaultName ?? "");
      setError(null);
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open, defaultName]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSave(name.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-brand/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-draft-title"
    >
      <div
        className="w-full max-w-md border-[3px] border-brand bg-white shadow-[6px_6px_0_var(--color-brand)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="bg-brand text-gold px-4 py-3 flex items-center justify-between">
          <h2 id="save-draft-title" className="font-[family-name:var(--font-press-start)] text-xs">
            ▸ {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="font-[family-name:var(--font-press-start)] text-[10px] text-gold hover:text-white"
            aria-label="Close"
          >
            X
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label
              htmlFor="draft-name"
              className="block font-[family-name:var(--font-press-start)] text-[10px] text-brand mb-2 uppercase"
            >
              Name <span className="text-brand/50 normal-case">(optional)</span>
            </label>
            <input
              id="draft-name"
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder="e.g. Release v2.3"
              className="w-full border-2 border-brand bg-surface px-3 py-2 font-[family-name:var(--font-geist-sans)] text-sm text-brand focus:outline-2 focus:outline-offset-2 focus:outline-gold"
            />
            <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/50 mt-2">
              Leave blank to use the first bit of your copy as the title.
            </p>
          </div>

          {error && (
            <p className="font-[family-name:var(--font-geist-sans)] text-xs text-red-700">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="font-[family-name:var(--font-press-start)] text-[10px] px-4 py-2 border-2 border-brand bg-transparent text-brand hover:bg-gold/20 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="font-[family-name:var(--font-press-start)] text-[10px] px-4 py-2 border-2 border-brand bg-gold text-brand shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
            >
              {busy ? "Saving…" : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
