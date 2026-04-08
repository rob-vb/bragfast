"use client";

interface PixelErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function PixelError({
  message = "Something went wrong",
  onRetry,
}: PixelErrorProps) {
  return (
    <div className="border-[3px] border-brand bg-white shadow-[6px_6px_0_var(--color-brand)] overflow-hidden">
      {/* NES-style header bar */}
      <div className="bg-brand text-gold px-4 py-3">
        <h2 className="font-[family-name:var(--font-press-start)] text-xs">
          &#9654; Error
        </h2>
      </div>

      <div className="p-6 text-center">
        <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/80 mb-6">
          {message}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="font-[family-name:var(--font-press-start)] text-[10px] px-4 py-3 border-2 border-brand bg-gold text-brand shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
