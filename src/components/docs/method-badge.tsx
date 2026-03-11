import { cn } from "@/lib/utils"
import type { HttpMethod } from "@/lib/docs/types"

const methodColors: Record<HttpMethod, string> = {
  GET: "bg-gold/20 text-brand",
  POST: "bg-gold/40 text-brand",
  PATCH: "bg-gold/30 text-brand",
  DELETE: "bg-red-500/15 text-red-700",
}

export function MethodBadge({ method }: { method: HttpMethod }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-xs font-bold tracking-wide font-mono border border-brand/20",
        methodColors[method]
      )}
    >
      {method}
    </span>
  )
}
