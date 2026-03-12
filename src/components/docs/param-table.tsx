import type { ReactNode } from "react"
import type { ApiParam } from "@/lib/docs/types"

function ParamRow({ param, depth = 0 }: { param: ApiParam; depth?: number }) {
  return (
    <>
      {/* Desktop row */}
      <tr className="border-b border-zinc-100 hidden sm:table-row">
        <td className="py-2.5 pr-3 align-top">
          <div style={{ paddingLeft: `${depth * 16}px` }}>
            <code className="text-[13px] font-mono font-medium text-zinc-800">
              {param.name}
            </code>
          </div>
        </td>
        <td className="py-2.5 pr-3 align-top">
          <span className="text-[13px] text-zinc-400">{param.type}</span>
        </td>
        <td className="py-2.5 pr-3 align-top">
          {param.required && (
            <span className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider">
              req
            </span>
          )}
        </td>
        <td className="py-2.5 align-top">
          <span className="text-sm text-zinc-500">{param.description}</span>
        </td>
      </tr>

      {/* Mobile stacked layout */}
      <tr className="sm:hidden border-b border-zinc-100">
        <td colSpan={4} className="py-3" style={{ paddingLeft: `${depth * 12}px` }}>
          <div className="flex items-baseline gap-2 mb-1">
            <code className="text-[13px] font-mono font-medium text-zinc-800">
              {param.name}
            </code>
            <span className="text-[12px] text-zinc-400">{param.type}</span>
            {param.required && (
              <span className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider">
                req
              </span>
            )}
          </div>
          <p className="text-[13px] text-zinc-500 leading-snug">
            {param.description}
          </p>
        </td>
      </tr>

      {param.children && <GroupedParamRows params={param.children} depth={depth + 1} />}
    </>
  )
}

const GROUP_LABELS: Record<string, string> = {
  text: "Text objects",
  image: "Image objects",
}

function GroupedParamRows({ params, depth }: { params: ApiParam[]; depth: number }) {
  const rows: ReactNode[] = []
  let lastGroup: string | undefined
  for (const child of params) {
    if (child.group && child.group !== lastGroup) {
      rows.push(
        <tr key={`group-${child.group}`} className="border-b border-zinc-100">
          <td
            colSpan={4}
            className="pt-4 pb-1.5 align-top"
            style={{ paddingLeft: `${depth * 16}px` }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-300">
              {GROUP_LABELS[child.group] ?? child.group}
            </span>
          </td>
        </tr>
      )
      lastGroup = child.group
    }
    rows.push(<ParamRow key={child.name} param={child} depth={depth} />)
  }
  return <>{rows}</>
}

export function ParamTable({ params }: { params: ApiParam[] }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-left">
        <thead className="hidden sm:table-header-group">
          <tr className="border-b border-zinc-200">
            <th className="pb-2 pr-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Parameter
            </th>
            <th className="pb-2 pr-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Type
            </th>
            <th className="pb-2 pr-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 w-12">
              &nbsp;
            </th>
            <th className="pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Description
            </th>
          </tr>
        </thead>
        <tbody>
          {params.map((param) => (
            <ParamRow key={param.name} param={param} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
