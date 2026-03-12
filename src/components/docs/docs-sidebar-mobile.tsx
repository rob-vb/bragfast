"use client"

import { useState, useEffect } from "react"
import type { ApiSection } from "@/lib/docs/types"
import { DocsSidebar } from "./docs-sidebar"

export function DocsSidebarMobile({ sections }: { sections: ApiSection[] }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  return (
    <>
      {/* Sticky mobile header */}
      <div className="sticky top-0 z-40 md:hidden flex items-center gap-3 bg-white/90 backdrop-blur-sm border-b border-zinc-100 px-4 py-3">
        <button
          onClick={() => setOpen(true)}
          className="p-1.5 -ml-1.5 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 transition-colors"
          aria-label="Open navigation"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>
        <span className="text-sm font-mono font-semibold text-zinc-900">brag.fast</span>
        <span className="text-[11px] text-zinc-400">API v1</span>
      </div>

      {/* Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px] transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl transition-transform duration-250 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute top-5 right-3 p-1.5 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
          aria-label="Close navigation"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <div onClick={() => setOpen(false)}>
          <DocsSidebar sections={sections} />
        </div>
      </div>
    </>
  )
}
