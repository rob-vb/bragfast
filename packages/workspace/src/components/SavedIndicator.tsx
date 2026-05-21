import type { SaveStatus } from "../hooks/useAutoSave";

const LABELS: Record<SaveStatus, string> = {
  idle: "Unsaved",
  unsaved: "Unsaved",
  saving: "Saving...",
  saved: "Saved",
  error: "Save failed - retrying on next edit",
};

interface SavedIndicatorProps {
  status: SaveStatus;
}

export function SavedIndicator({ status }: SavedIndicatorProps) {
  return (
    <div className="flex min-h-[32px] items-center gap-2 text-[12px] font-semibold text-[var(--workspace-muted)]">
      <span
        aria-hidden
        className={[
          "h-2 w-2 rounded-full",
          status === "saved" ? "bg-[var(--workspace-lime)]" : "",
          status === "saving" ? "bg-[var(--workspace-sage)]" : "",
          status === "error" ? "bg-red-600" : "",
          status === "idle" || status === "unsaved" ? "bg-[var(--workspace-border)]" : "",
        ].join(" ")}
      />
      {LABELS[status]}
    </div>
  );
}
