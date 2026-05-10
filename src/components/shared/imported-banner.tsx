"use client";

import Link from "next/link";

export function ImportedBanner({
  templateName,
  templateExternalId,
  onDismiss,
  className,
}: {
  templateName: string;
  templateExternalId: string;
  onDismiss?: () => void;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={`border-2 border-brand bg-gold p-3 shadow-[4px_4px_0_var(--color-brand)] flex items-center justify-between gap-3${className ? ` ${className}` : ""}`}
    >
      <p className="font-[family-name:var(--font-press-start)] text-[10px] text-brand leading-relaxed">
        Welcome — your template&apos;s ready.{" "}
        <span className="font-mono normal-case">&ldquo;{templateName}&rdquo;</span> is in your kitchen.
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={`/admin/templates/${templateExternalId}/edit`}
          className="border-2 border-brand bg-white px-3 py-1 font-[family-name:var(--font-press-start)] text-[10px] text-brand hover:bg-cream"
        >
          Open
        </Link>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="border-2 border-brand bg-white px-2 py-1 font-[family-name:var(--font-press-start)] text-[10px] text-brand hover:bg-cream"
          >
            ✕
          </button>
        ) : null}
      </div>
    </div>
  );
}
