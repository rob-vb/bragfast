"use client";

import { PixelError } from "@/components/dashboard/pixel-error";

export default function KitchenError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="py-12 max-w-md mx-auto">
      <PixelError
        message={error.message || "Failed to load kitchen. Please try again."}
        onRetry={reset}
      />
    </div>
  );
}
