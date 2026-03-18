import { API_REFERENCE } from "@/lib/docs/api-reference"
import { DocsSidebar } from "@/components/docs/docs-sidebar"
import { DocsSidebarMobile } from "@/components/docs/docs-sidebar-mobile"
import { DocsSection } from "@/components/docs/docs-section"

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-geist-sans)]">
      <DocsSidebarMobile sections={API_REFERENCE} />

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] xl:grid-cols-[240px_1fr]">
        {/* Sidebar — hidden on mobile */}
        <div className="hidden md:block border-r border-zinc-100">
          <DocsSidebar sections={API_REFERENCE} />
        </div>

        {/* Main content */}
        <main className="min-w-0 px-4 sm:px-6 md:px-10 xl:px-16 pb-24">
          {/* Hero / Base URL */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 xl:gap-8 pt-8 md:pt-12 pb-10 border-b border-zinc-100">
            <div>
              <h1 className="font-[family-name:var(--font-press-start)] text-base sm:text-lg text-brand mb-3 sm:mb-4">
                API Reference
              </h1>
              <p className="text-sm text-zinc-600 leading-relaxed max-w-lg">
                brag.fast auto-generates branded social media images for your
                product releases. Design a brand kit, POST your release details,
                and receive images in multiple aspect ratios.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="rounded-lg bg-[#24292e] px-4 sm:px-5 py-3 sm:py-4">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                  Base URL
                </span>
                <p className="mt-1 text-sm font-mono text-emerald-400 break-all">
                  https://brag.fast/api/v1
                </p>
              </div>

              <div className="rounded-lg bg-[#24292e] px-4 sm:px-5 py-3 sm:py-4">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                  Authentication
                </span>
                <p className="mt-1 text-sm font-mono text-zinc-300 break-all">
                  Authorization: Bearer bf_...
                </p>
              </div>
            </div>
          </div>

          {/* API Sections */}
          <div className="divide-y divide-zinc-100">
            {API_REFERENCE.map((section, index) => (
              <DocsSection key={section.anchor} section={section} index={index} />
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
