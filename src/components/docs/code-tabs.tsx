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
    <div className="rounded-lg overflow-hidden">
      <div className="flex bg-[#1c2028] px-2 pt-2 gap-0.5">
        {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-colors rounded-t-md",
              active === key
                ? "text-zinc-200 bg-[#24292e]"
                : "text-zinc-500 hover:text-zinc-400"
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
