"use client";

import { PixelButton } from "@/components/admin/pixel-button";

type CookButtonStatus = "idle" | "cooking" | "done" | "error";

interface CookButtonProps {
  status: CookButtonStatus;
  disabled?: boolean;
  progress?: number;
  isVideo?: boolean;
  onClick: () => void;
  onStartOver?: () => void;
}

const LABELS: Record<CookButtonStatus, string> = {
  idle: "COOK IT!",
  cooking: "COOKING...",
  done: "COOK AGAIN",
  error: "TRY AGAIN",
};

function ProgressBar({ progress }: { progress?: number }) {
  const pct = progress ?? 0;
  // 10 segments for the pixel-art look
  const filled = Math.round((pct / 100) * 10);

  return (
    <div className="mt-2 space-y-1">
      {/* Bar */}
      <div className="h-4 border-2 border-brand bg-surface flex overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 transition-colors duration-300 ${
              i < filled ? "bg-gold" : "bg-transparent"
            } ${i > 0 ? "border-l border-brand/20" : ""}`}
          />
        ))}
      </div>
      {/* Label */}
      <p className="text-center font-[family-name:var(--font-press-start)] text-[10px] text-brand/60 tabular-nums">
        {pct > 0 ? `${pct}%` : "Warming up..."}
      </p>
    </div>
  );
}

export function CookButton({ status, disabled, progress, isVideo, onClick, onStartOver }: CookButtonProps) {
  const label = LABELS[status];
  const isCooking = status === "cooking";
  const showProgress = isCooking && isVideo;

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
      <div className={status === "done" ? "flex-1" : "w-full"}>
        <PixelButton
          onClick={onClick}
          disabled={disabled || isCooking}
          className={`justify-center text-xs py-3 w-full`}
        >
          {isCooking ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-pulse">{label}</span>
            </span>
          ) : (
            label
          )}
        </PixelButton>
        {showProgress && <ProgressBar progress={progress} />}
      </div>
    </div>
  );
}
