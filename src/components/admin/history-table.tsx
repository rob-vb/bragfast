"use client";

import { useState, useRef, useEffect } from "react";
import { PixelBadge } from "@/components/admin/pixel-badge";
import { PixelTable } from "@/components/admin/pixel-table";

type Release = {
  _id: string;
  externalId: string;
  template: string;
  status: "completed" | "scheduled" | "pending" | "failed";
  output?: "image" | "video";
  images?: unknown;
  videos?: unknown;
  metadata?: string;
  webhook_url?: string;
  created_at: string;
  completed_at?: string;
  source?: "api" | "github" | "demo" | "dashboard";
};

function buildResponseBody(r: Release) {
  return {
    cook_id: r.externalId,
    output: r.output ?? "image",
    status: r.status,
    images: r.images ?? null,
    videos: r.videos ?? null,
    created_at: r.created_at,
    ...(r.completed_at ? { completed_at: r.completed_at } : {}),
    ...(r.metadata ? { metadata: r.metadata } : {}),
    ...(r.webhook_url ? { webhook_url: r.webhook_url } : {}),
    ...(r.source ? { source: r.source } : {}),
  };
}

function DownloadButton({ releaseId, status }: { releaseId: string; status: string }) {
  const [downloading, setDownloading] = useState(false);
  const isDisabled = status !== "completed";

  async function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
    if (isDisabled || downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/v1/cook/${releaseId}/download`);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${releaseId}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={isDisabled || downloading}
      aria-busy={downloading}
      title={isDisabled ? "No images to download" : undefined}
      className="font-[family-name:var(--font-press-start)] text-[8px] px-3 py-1.5 border border-brand bg-gold text-brand shadow-[2px_2px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none transition-all"
    >
      {downloading ? "..." : "Download"}
    </button>
  );
}


function ExpandableRow({ release, defaultOpen }: { release: Release; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const rowRef = useRef<HTMLTableRowElement>(null);
  const response = buildResponseBody(release);

  useEffect(() => {
    if (defaultOpen && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [defaultOpen]);

  return (
    <>
      <tr
        ref={rowRef}
        className="align-top hover:bg-gold/5 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] text-[12px] text-brand">
          <span className="inline-block w-4 text-brand/40 mr-1">
            {open ? "▼" : "▶"}
          </span>
          {release.externalId}
          {release.source === "github" && (
            <span className="ml-2">
              <PixelBadge label="GitHub" variant="github" />
            </span>
          )}
        </td>
        <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] text-[12px] text-brand/70">
          {release.template}
        </td>
        <td className="px-4 py-3">
          <PixelBadge status={release.status} />
        </td>
        <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] text-[11px] text-brand/60 whitespace-nowrap">
          {new Date(release.created_at).toLocaleDateString()}
        </td>
        <td className="px-4 py-3">
          <DownloadButton releaseId={release.externalId} status={release.status} />
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={5} className="px-4 py-0">
            {/* Response JSON */}
            <div className="mb-4 mt-3 border-2 border-brand bg-brand shadow-[4px_4px_0_var(--color-brand)]">
              <div className="flex items-center justify-between border-b border-brand/10 px-3 py-2">
                <span className="font-[family-name:var(--font-press-start)] text-[8px] text-gold">
                  Response
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(
                      JSON.stringify(response, null, 2)
                    );
                  }}
                  className="font-[family-name:var(--font-press-start)] text-[8px] text-[var(--color-surface)]/60 hover:text-gold transition-colors"
                >
                  Copy
                </button>
              </div>
              <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-[var(--color-surface)]/80 whitespace-pre-wrap break-all max-w-full">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function HistoryTable({ releases, highlightId }: { releases: Release[]; highlightId?: string }) {
  return (
    <PixelTable headers={["ID", "Template", "Status", "Date", ""]}>
      {releases.map((r) => (
        <ExpandableRow key={r._id} release={r} defaultOpen={r.externalId === highlightId} />
      ))}
    </PixelTable>
  );
}
