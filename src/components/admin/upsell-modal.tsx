"use client";

import Link from "next/link";
// Stub types — upsell modal removed in plan 08-05, plan-tiers deleted in 08-04
type Tier = "free" | "toast" | "plate" | "buffet";
const TIER_CONFIG: Record<Tier, { platforms: number }> = {
  free: { platforms: 1 },
  toast: { platforms: 1 },
  plate: { platforms: 2 },
  buffet: { platforms: 2 },
};

type UpsellReason = "format" | "video" | "platforms";

const TIER_NAME: Record<Tier, string> = {
  free: "On the House",
  toast: "Toast",
  plate: "Full Plate",
  buffet: "Buffet",
};

function reasonCopy(reason: UpsellReason, currentTier: Tier, targetTier: Tier): {
  title: string;
  body: string;
} {
  const tgt = TIER_NAME[targetTier];
  const cur = TIER_NAME[currentTier];
  const cap = TIER_CONFIG[currentTier];
  switch (reason) {
    case "format":
      return {
        title: `${cur} is square-only`,
        body: `Upgrade to ${tgt} for landscape and portrait formats.`,
      };
    case "video":
      return {
        title: "Video is a Buffet feature",
        body: `Upgrade to ${tgt} to ship animated video posts.`,
      };
    case "platforms":
      return {
        title: `${cur} caps platforms per post at ${cap.platforms}`,
        body: `Upgrade to ${tgt} to push to multiple destinations per approval.`,
      };
  }
}

export function UpsellModal({
  open,
  onClose,
  reason,
  currentTier,
  targetTier,
}: {
  open: boolean;
  onClose: () => void;
  reason: UpsellReason;
  currentTier: Tier;
  targetTier: Tier;
}) {
  if (!open) return null;
  const { title, body } = reasonCopy(reason, currentTier, targetTier);
  return (
    <div
      className="fixed inset-0 z-50 bg-brand/30 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border-2 border-brand shadow-[8px_8px_0_var(--color-brand)] p-6 max-w-md w-full space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between">
          <h2 className="font-[family-name:var(--font-press-start)] text-sm text-brand">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="font-[family-name:var(--font-press-start)] text-xs text-brand/60 hover:text-brand"
          >
            ✕
          </button>
        </div>
        <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/80">
          {body}
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/admin/account/upgrade"
            className="inline-block font-[family-name:var(--font-press-start)] text-[10px] px-4 py-2 border-2 border-brand bg-gold text-brand shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            ▸ Upgrade to {TIER_NAME[targetTier]}
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="font-[family-name:var(--font-press-start)] text-[10px] px-4 py-2 border-2 border-brand/30 text-brand/70 hover:border-brand hover:text-brand transition-all"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

export type { UpsellReason };
