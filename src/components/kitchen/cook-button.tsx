"use client";

import { PixelButton } from "@/components/dashboard/pixel-button";

type CookButtonStatus = "idle" | "previewing" | "cooking" | "done" | "error";

interface CookButtonProps {
  status: CookButtonStatus;
  disabled?: boolean;
  onClick: () => void;
}

const LABELS: Record<CookButtonStatus, string> = {
  idle: "COOK IT!",
  previewing: "COOK IT!",
  cooking: "COOKING...",
  done: "COOK AGAIN",
  error: "TRY AGAIN",
};

export function CookButton({ status, disabled, onClick }: CookButtonProps) {
  const label = LABELS[status];
  const isCooking = status === "cooking";

  return (
    <div className="pt-2">
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
    </div>
  );
}
