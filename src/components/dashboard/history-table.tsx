"use client";

import { useState } from "react";
import { PixelBadge } from "@/components/dashboard/pixel-badge";
import { PixelTable } from "@/components/dashboard/pixel-table";

type Release = {
  _id: string;
  externalId: string;
  template: string;
  status: "completed" | "pending" | "failed";
  images?: unknown;
  credits_used: number;
  transparent: boolean;
  metadata?: string;
  webhook_url?: string;
  created_at: string;
  completed_at?: string;
};

function buildResponseBody(r: Release) {
  return {
    release_id: r.externalId,
    status: r.status,
    images: r.images ?? null,
    credits_used: r.credits_used,
    created_at: r.created_at,
    ...(r.completed_at ? { completed_at: r.completed_at } : {}),
    transparent: r.transparent,
    ...(r.metadata ? { metadata: r.metadata } : {}),
    ...(r.webhook_url ? { webhook_url: r.webhook_url } : {}),
  };
}

function ExpandableRow({ release }: { release: Release }) {
  const [open, setOpen] = useState(false);
  const response = buildResponseBody(release);

  return (
    <>
      <tr
        className="hover:bg-[#F8AF3C]/5 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <td className="px-4 py-3 font-mono text-xs">
          <span className="inline-block w-4 text-[#4A3326]/40 mr-1">
            {open ? "▼" : "▶"}
          </span>
          {release.externalId}
        </td>
        <td className="px-4 py-3 text-xs">{release.template}</td>
        <td className="px-4 py-3">
          <PixelBadge status={release.status} />
        </td>
        <td className="px-4 py-3 text-xs">{release.credits_used}</td>
        <td className="px-4 py-3 text-xs">
          {new Date(release.created_at).toLocaleDateString()}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={5} className="px-4 py-0">
            <div className="mb-4 mt-1 border-2 border-[#4A3326] bg-[#4A3326] shadow-[4px_4px_0_#4A3326]">
              <div className="flex items-center justify-between border-b border-[#4A3326]/20 px-3 py-2">
                <span className="font-[family-name:var(--font-press-start)] text-[8px] text-[#F8AF3C]">
                  Response
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(
                      JSON.stringify(response, null, 2)
                    );
                  }}
                  className="font-[family-name:var(--font-press-start)] text-[8px] text-[#FFF8F0]/60 hover:text-[#F8AF3C] transition-colors"
                >
                  Copy
                </button>
              </div>
              <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-[#FFF8F0]/80">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function HistoryTable({ releases }: { releases: Release[] }) {
  return (
    <PixelTable headers={["ID", "Template", "Status", "Credits", "Date"]}>
      {releases.map((r) => (
        <ExpandableRow key={r._id} release={r} />
      ))}
    </PixelTable>
  );
}
