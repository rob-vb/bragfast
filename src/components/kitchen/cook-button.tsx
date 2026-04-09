"use client";

import { PixelButton } from "@/components/admin/pixel-button";

type CookButtonStatus = "idle" | "cooking" | "done" | "error";

interface CookButtonProps {
  status: CookButtonStatus;
  disabled?: boolean;
  onClick: () => void;
  onStartOver?: () => void;
}

const LABELS: Record<CookButtonStatus, string> = {
  idle: "COOK IT!",
  cooking: "COOKING...",
  done: "COOK AGAIN",
  error: "TRY AGAIN",
};

export function CookButton({ status, disabled, onClick, onStartOver }: CookButtonProps) {
  const label = LABELS[status];
  const isCooking = status === "cooking";

  return (
    <div className="pt-2 flex flex-col gap-2">
      <PixelButton
        onClick={onClick}
        disabled={disabled || isCooking}
        className="w-full justify-center text-xs py-3"
      >
        {isCooking ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-pulse">{label}</span>
          </span>
        ) : (
          label
        )}
      </PixelButton>
      {status === "done" && onStartOver && (
        <button
          onClick={onStartOver}
          className="w-full text-center text-xs font-[family-name:var(--font-press-start)] text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          START OVER
        </button>
      )}
    </div>
  );
}
