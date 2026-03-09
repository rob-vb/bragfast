import type { ApiSection } from "@/lib/docs/types"
import { EndpointBlock } from "./endpoint-block"
import { CodeBlock } from "./code-block"

export async function DocsSection({ section }: { section: ApiSection }) {
  return (
    <section id={section.anchor} className="scroll-mt-14 md:scroll-mt-8">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 xl:gap-8 pt-8 sm:pt-10 pb-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 mb-2 sm:mb-3">
            {section.title}
          </h2>
          <p className="text-sm text-zinc-600 leading-relaxed">
            {section.description}
          </p>
        </div>

        {section.sampleObject && (
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
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
