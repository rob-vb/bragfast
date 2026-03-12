import { cn } from "@/lib/utils"
import type { HttpMethod } from "@/lib/docs/types"

const methodColors: Record<HttpMethod, string> = {
  GET: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20",
  POST: "bg-blue-500/10 text-blue-700 ring-blue-500/20",
  PATCH: "bg-amber-500/10 text-amber-700 ring-amber-500/20",
  DELETE: "bg-red-500/10 text-red-700 ring-red-500/20",
}

export function MethodBadge({ method }: { method: HttpMethod }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[11px] font-semibold tracking-wider font-mono ring-1 rounded-md",
        methodColors[method]
      )}
    >
      {method}
    </span>
  )
}
