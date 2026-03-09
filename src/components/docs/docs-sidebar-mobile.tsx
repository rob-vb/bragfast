"use client"

import { useState } from "react"
import type { ApiSection } from "@/lib/docs/types"
import { DocsSidebar } from "./docs-sidebar"

export function DocsSidebarMobile({ sections }: { sections: ApiSection[] }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden rounded-md bg-white border border-zinc-200 p-2 shadow-sm"
        aria-label="Open navigation"
      >
        <svg
          className="h-5 w-5 text-zinc-600"
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

      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/20"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-zinc-200 shadow-xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 rounded-md p-1 text-zinc-400 hover:text-zinc-600"
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
      )}
    </>
  )
}
