"use client";

import { PixelError } from "@/components/admin/pixel-error";

export default function ReportError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="py-12 max-w-md mx-auto">
      <PixelError
        message={error.message || "Failed to load weekly report. Please try again."}
        onRetry={reset}
      />
    </div>
  );
}
