import type { ApiSection, StatusCode } from "@/lib/docs/types"
import { EndpointBlock } from "./endpoint-block"
import { CodeBlock } from "./code-block"

function StatusCodeTable({ codes }: { codes: StatusCode[] }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-brand/30">
            <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wider text-brand/50 w-16">
              Code
            </th>
            <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wider text-brand/50 hidden sm:table-cell">
              Status
            </th>
            <th className="pb-2 text-xs font-semibold uppercase tracking-wider text-brand/50">
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
              <tr key={sc.code} className="border-b border-brand/10">
                <td className="py-2.5 pr-4 align-top">
                  <code className={`text-[13px] font-mono font-semibold ${color}`}>
                    {sc.code}
                  </code>
                </td>
                <td className="py-2.5 pr-4 align-top hidden sm:table-cell">
                  <span className="text-[13px] font-medium text-brand">
                    {sc.label}
                  </span>
                </td>
                <td className="py-2.5 align-top">
                  <span className="text-sm text-brand/70">{sc.description}</span>
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
      {/* NES section header bar */}
      <div className="bg-brand text-gold px-4 sm:px-5 py-2.5 mt-8 sm:mt-10 flex items-center gap-3">
        <span className="text-[10px] font-mono tracking-widest opacity-60">
          {String(index + 1).padStart(2, "0")}
        </span>
        <h2 className="text-sm sm:text-base font-bold tracking-wide uppercase">
          {section.title}
        </h2>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 xl:gap-8 pt-6 sm:pt-8 pb-2">
        <div>
          <p className="text-sm text-brand/70 leading-relaxed">
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
            <h4 className="text-xs font-semibold uppercase tracking-wider text-brand/50 mb-2">
              The {section.title.toLowerCase()} object
            </h4>
            <CodeBlock code={section.sampleObject} lang="json" />
          </div>
        )}
      </div>
      {section.endpoints.map((endpoint) => (
        <EndpointBlock key={endpoint.anchor} endpoint={endpoint} />
      ))}
    </section>
  )
}
