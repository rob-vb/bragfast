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
    <div className="rounded-lg overflow-hidden border border-zinc-800 bg-[#0d1117]">
      <div className="flex border-b border-zinc-800">
        {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={cn(
              "px-4 py-2 text-xs font-medium transition-colors",
              active === key
                ? "text-white bg-zinc-800/50"
                : "text-zinc-500 hover:text-zinc-300"
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
