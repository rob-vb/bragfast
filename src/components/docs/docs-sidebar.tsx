"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import type { ApiSection } from "@/lib/docs/types"

interface SidebarGroup {
  label: string
  items: { title: string; anchor: string }[]
}

function buildGroups(sections: ApiSection[]): SidebarGroup[] {
  const intro: SidebarGroup = { label: "", items: [] }
  const resources: SidebarGroup = { label: "Resources", items: [] }

  for (const section of sections) {
    if (
      ["introduction", "authentication", "async", "rate-limits", "credits", "status-codes"].includes(section.anchor)
    ) {
      intro.items.push({ title: section.title, anchor: section.anchor })
    } else {
      resources.items.push({ title: section.title, anchor: section.anchor })
      for (const ep of section.endpoints) {
        resources.items.push({ title: `  ${ep.title}`, anchor: ep.anchor })
      }
    }
  }

  return [intro, resources]
}

export function DocsSidebar({
  sections,
  className,
}: {
  sections: ApiSection[]
  className?: string
}) {
  const groups = buildGroups(sections)
  const [activeAnchor, setActiveAnchor] = useState("")

  useEffect(() => {
    // Track which section is in view
    const handleHash = () => setActiveAnchor(window.location.hash.slice(1))
    handleHash()
    window.addEventListener("hashchange", handleHash)

    // Use IntersectionObserver for scroll-based tracking
    const anchors = groups.flatMap((g) => g.items.map((i) => i.anchor))
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveAnchor(entry.target.id)
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    )

    for (const anchor of anchors) {
      const el = document.getElementById(anchor)
      if (el) observer.observe(el)
    }

    return () => {
      window.removeEventListener("hashchange", handleHash)
      observer.disconnect()
    }
  }, [groups])

  return (
    <nav
      className={cn(
        "sticky top-0 h-screen overflow-y-auto py-8 pr-4",
        className
      )}
    >
      <a
        href="/docs"
        className="block text-sm font-mono font-bold text-zinc-900 mb-0.5 px-3"
      >
        brag.fast
      </a>
      <span className="block text-[11px] text-zinc-400 mb-8 px-3">v1</span>

      {groups.map((group, i) => (
        <div key={i} className="mb-6">
          {group.label && (
            <h3 className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              {group.label}
            </h3>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const isChild = item.title.startsWith("  ")
              const isActive = activeAnchor === item.anchor

              return (
                <li key={item.anchor}>
                  <a
                    href={`#${item.anchor}`}
                    className={cn(
                      "block px-3 py-1.5 text-[13px] rounded-md transition-colors",
                      isChild
                        ? "pl-6 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50"
                        : "text-zinc-600 font-medium hover:text-zinc-900 hover:bg-zinc-50",
                      isActive && !isChild && "bg-gold/20 text-brand border-l-2 border-brand",
                      isActive && isChild && "text-brand bg-gold/10"
                    )}
                  >
                    {item.title.trim()}
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
