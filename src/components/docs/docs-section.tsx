import type { ApiSection, StatusCode } from "@/lib/docs/types"
import { EndpointBlock } from "./endpoint-block"
import { CodeBlock } from "./code-block"

function StatusCodeTable({ codes }: { codes: StatusCode[] }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-zinc-200">
            <th className="pb-2 pr-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 w-16">
              Code
            </th>
            <th className="pb-2 pr-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 hidden sm:table-cell">
              Status
            </th>
            <th className="pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Description
            </th>
          </tr>
        </thead>
        <tbody>
          {codes.map((sc) => {
            const color =
              sc.code < 300
                ? "text-emerald-600"
                : sc.code < 500
                  ? "text-amber-600"
                  : "text-red-500"
            return (
              <tr key={sc.code} className="border-b border-zinc-100">
                <td className="py-2.5 pr-4 align-top">
                  <code className={`text-[13px] font-mono font-semibold ${color}`}>
                    {sc.code}
                  </code>
                </td>
                <td className="py-2.5 pr-4 align-top hidden sm:table-cell">
                  <span className="text-[13px] font-medium text-zinc-800">
                    {sc.label}
                  </span>
                </td>
                <td className="py-2.5 align-top">
                  <span className="text-sm text-zinc-500">{sc.description}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export async function DocsSection({ section, index }: { section: ApiSection; index: number }) {
  return (
    <section id={section.anchor} className="scroll-mt-14 md:scroll-mt-8">
      {/* Section header — left accent bar */}
      <div className="mt-10 sm:mt-14 mb-6 sm:mb-8 flex items-center gap-3 border-l-2 border-zinc-900 pl-4">
        <h2 className="text-base sm:text-lg font-semibold tracking-tight text-zinc-900">
          {section.title}
        </h2>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 xl:gap-8 pb-2">
        <div>
          <p className="text-[15px] text-zinc-500 leading-relaxed">
            {section.description}
          </p>
          {section.statusCodes && (
            <div className="mt-6">
              <StatusCodeTable codes={section.statusCodes} />
            </div>
          )}
        </div>
        {section.sampleObject && (
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              The {section.title.toLowerCase()} object
            </h4>
            <div className="rounded-lg overflow-hidden">
              <CodeBlock code={section.sampleObject} lang="json" />
            </div>
          </div>
        )}
      </div>
      {section.endpoints.map((endpoint) => (
        <EndpointBlock key={endpoint.anchor} endpoint={endpoint} />
      ))}
    </section>
  )
}
