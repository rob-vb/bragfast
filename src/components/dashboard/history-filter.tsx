"use client";

import { useRouter } from "next/navigation";
import { PixelButton } from "@/components/dashboard/pixel-button";

const filters = ["all", "completed", "pending", "failed"] as const;

export function HistoryFilter({ current }: { current: string }) {
  const router = useRouter();

  return (
    <div className="flex gap-1">
      {filters.map((f) => (
        <PixelButton
          key={f}
          variant={current === f ? "primary" : "ghost"}
          onClick={() =>
            router.push(f === "all" ? "/dashboard/history" : `/dashboard/history?status=${f}`)
          }
        >
          {f}
        </PixelButton>
      ))}
    </div>
  );
}
