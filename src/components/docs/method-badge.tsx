import { cn } from "@/lib/utils"
import type { HttpMethod } from "@/lib/docs/types"

const methodColors: Record<HttpMethod, string> = {
  GET: "bg-emerald-500/15 text-emerald-600",
  POST: "bg-blue-500/15 text-blue-600",
  PATCH: "bg-amber-500/15 text-amber-600",
  DELETE: "bg-red-500/15 text-red-600",
}

export function MethodBadge({ method }: { method: HttpMethod }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold tracking-wide font-mono",
        methodColors[method]
      )}
    >
      {method}
    </span>
  )
}
