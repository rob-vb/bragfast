"use client"

import { useState } from "react"

export function CopyForLlmButton() {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const res = await fetch("/docs.md")
    const markdown = await res.text()
    await navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider bg-[#24292e] text-zinc-300 hover:text-white border border-zinc-700 rounded-md transition-colors cursor-pointer"
    >
      {copied ? "Copied!" : "Copy for LLM"}
    </button>
  )
}
