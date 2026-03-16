"use client";

import { useState } from "react";
import { PixelBadge } from "@/components/dashboard/pixel-badge";
import { PixelTable } from "@/components/dashboard/pixel-table";

type SkippedRelease = {
  _id: string;
  repoFullName: string;
  releaseTag: string;
  releaseName?: string;
  reason: string;
  created_at: string;
};

const reasonVariant: Record<string, string> = {
  account_disabled: "removed",
  repo_disabled: "removed",
  insufficient_credits: "failed",
  prerelease: "suspended",
  filtered: "suspended",
  duplicate: "pending",
};

export function SkippedReleasesLog({ releases }: { releases: SkippedRelease[] }) {
  const [open, setOpen] = useState(false);

  if (releases.length === 0) return null;

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-brand/60 hover:text-brand transition-colors"
      >
        <span>{open ? "▼" : "▶"}</span>
        <span>Skipped Releases ({releases.length})</span>
      </button>
      {open && (
        <div className="mt-2">
          <PixelTable headers={["Repo", "Tag", "Reason", "Date"]}>
            {releases.map((r) => (
              <tr key={r._id} className="hover:bg-gold/5">
                <td className="px-4 py-2 text-xs font-mono">{r.repoFullName}</td>
                <td className="px-4 py-2 text-xs">{r.releaseTag}</td>
                <td className="px-4 py-2">
                  <PixelBadge
                    label={r.reason.replace(/_/g, " ")}
                    variant={reasonVariant[r.reason]}
                  />
                </td>
                <td className="px-4 py-2 text-xs">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </PixelTable>
        </div>
      )}
    </div>
  );
}
