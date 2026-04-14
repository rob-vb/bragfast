"use client";

import { useRouter } from "next/navigation";
import { PixelButton } from "@/components/admin/pixel-button";

const filters = ["all", "completed", "pending", "failed"] as const;

export function HistoryFilter({ current }: { current: string }) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap gap-1">
      {filters.map((f) => (
        <PixelButton
          key={f}
          variant={current === f ? "primary" : "ghost"}
          onClick={() =>
            router.push(f === "all" ? "/admin/history" : `/admin/history?status=${f}`)
          }
        >
          {f}
        </PixelButton>
      ))}
    </div>
  );
}
