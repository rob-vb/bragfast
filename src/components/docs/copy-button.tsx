"use client"

import { useState } from "react"

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="absolute top-2.5 right-2.5 z-10 px-2 py-0.5 text-xs rounded text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.08] transition-all sm:opacity-0 sm:group-hover:opacity-100"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  )
}
