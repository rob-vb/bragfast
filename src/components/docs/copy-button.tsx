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
      className="absolute top-2 right-2 z-10 px-2 py-1 text-xs text-brand/40 hover:text-brand hover:bg-gold/10 transition-all sm:opacity-0 sm:group-hover:opacity-100"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  )
}
