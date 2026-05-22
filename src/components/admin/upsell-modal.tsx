"use client";

import Link from "next/link";

export function UpsellModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
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
            Trial ended
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="font-[family-name:var(--font-press-start)] text-xs text-brand/60 hover:text-brand"
          >
            &#x2715;
          </button>
        </div>
        <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/80">
          Scheduling and sync require a subscription. Local render keeps working.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/admin/account/upgrade"
            className="inline-block font-[family-name:var(--font-press-start)] text-[10px] px-4 py-2 border-2 border-brand bg-gold text-brand shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            &#9658; Subscribe Now
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

export type { };
