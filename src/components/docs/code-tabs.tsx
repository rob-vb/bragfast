"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

const TAB_LABELS = {
  curl: "cURL",
  javascript: "JavaScript",
  python: "Python",
} as const

type TabKey = keyof typeof TAB_LABELS

export function CodeTabs({
  children,
}: {
  children: Record<TabKey, React.ReactNode>
}) {
  const [active, setActive] = useState<TabKey>("curl")

  return (
    <div className="overflow-hidden border-2 border-brand">
      <div className="flex border-b border-brand/30 bg-brand">
        {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={cn(
              "px-3 sm:px-4 py-2.5 text-xs font-medium transition-colors min-w-[64px]",
              active === key
                ? "text-gold bg-brand/80"
                : "text-surface/50 hover:text-surface/80 active:text-surface"
            )}
          >
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>
      {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => (
        <div key={key} className={active === key ? "" : "hidden"}>
          {children[key]}
        </div>
      ))}
    </div>
  )
}
