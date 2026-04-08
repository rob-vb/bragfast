"use client";

import { PixelError } from "@/components/admin/pixel-error";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="py-12 max-w-md mx-auto">
      <PixelError
        message={error.message || "Failed to load admin. Please try again."}
        onRetry={reset}
      />
    </div>
  );
}
