"use client";

import { PixelError } from "@/components/dashboard/pixel-error";

export default function HistoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="py-12 max-w-md mx-auto">
      <PixelError
        message={error.message || "Failed to load history. Please try again."}
        onRetry={reset}
      />
    </div>
  );
}
