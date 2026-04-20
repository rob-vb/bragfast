"use client";

import { PixelError } from "@/components/admin/pixel-error";

export default function DraftsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="py-12 max-w-md mx-auto">
      <PixelError
        message={error.message || "Failed to load drafts. Please try again."}
        onRetry={reset}
      />
    </div>
  );
}
