import type { ApiParam } from "@/lib/docs/types"

function ParamRow({ param, depth = 0 }: { param: ApiParam; depth?: number }) {
  return (
    <>
      {/* Desktop row */}
      <tr className="border-b border-zinc-100 hidden sm:table-row">
        <td className="py-2.5 pr-3 align-top">
          <div style={{ paddingLeft: `${depth * 16}px` }}>
            <code className="text-[13px] font-mono font-medium text-zinc-900">
              {param.name}
            </code>
          </div>
        </td>
        <td className="py-2.5 pr-3 align-top">
          <span className="text-[13px] text-zinc-500">{param.type}</span>
        </td>
        <td className="py-2.5 pr-3 align-top">
          {param.required && (
            <span className="text-[11px] font-medium text-red-500 uppercase tracking-wide">
              required
            </span>
          )}
        </td>
        <td className="py-2.5 align-top">
          <span className="text-sm text-zinc-600">{param.description}</span>
        </td>
      </tr>

      {/* Mobile stacked layout */}
      <tr className="sm:hidden border-b border-zinc-100">
        <td colSpan={4} className="py-3" style={{ paddingLeft: `${depth * 12}px` }}>
          <div className="flex items-baseline gap-2 mb-1">
            <code className="text-[13px] font-mono font-medium text-zinc-900">
              {param.name}
            </code>
            <span className="text-[12px] text-zinc-400">{param.type}</span>
            {param.required && (
              <span className="text-[10px] font-medium text-red-500 uppercase tracking-wide">
                required
              </span>
            )}
          </div>
          <p className="text-[13px] text-zinc-600 leading-snug">
            {param.description}
          </p>
        </td>
      </tr>

      {param.children?.map((child) => (
        <ParamRow key={child.name} param={child} depth={depth + 1} />
      ))}
    </>
  )
}

export function ParamTable({ params }: { params: ApiParam[] }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-left">
        <thead className="hidden sm:table-header-group">
          <tr className="border-b border-zinc-200">
            <th className="pb-2 pr-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Parameter
            </th>
            <th className="pb-2 pr-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Type
            </th>
            <th className="pb-2 pr-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 w-16">
              &nbsp;
            </th>
            <th className="pb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
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
