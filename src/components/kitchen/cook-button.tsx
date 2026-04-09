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
    <div className={`pt-2 flex ${status === "done" ? "flex-row gap-3" : "flex-col gap-2"}`}>
      {status === "done" && onStartOver && (
        <PixelButton
          variant="ghost"
          onClick={onStartOver}
          className="flex-1 justify-center text-xs py-3"
        >
          START OVER
        </PixelButton>
      )}
      <PixelButton
        onClick={onClick}
        disabled={disabled || isCooking}
        className={`justify-center text-xs py-3 ${status === "done" ? "flex-1" : "w-full"}`}
      >
        {isCooking ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-pulse">{label}</span>
          </span>
        ) : (
          label
        )}
      </PixelButton>
    </div>
  );
}
