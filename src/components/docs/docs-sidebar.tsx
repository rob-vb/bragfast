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
              return (
                <li key={item.anchor}>
                  <a
                    href={`#${item.anchor}`}
                    className={cn(
                      "block px-3 py-1.5 text-[13px] rounded-md transition-colors",
                      isChild
                        ? "pl-6 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50"
                        : "text-zinc-600 font-medium hover:text-zinc-900 hover:bg-zinc-50"
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
