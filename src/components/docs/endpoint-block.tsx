import type { ApiEndpoint } from "@/lib/docs/types"
import { MethodBadge } from "./method-badge"
import { ParamTable } from "./param-table"
import { CodeBlock } from "./code-block"
import { CodeTabs } from "./code-tabs"
import { CopyButton } from "./copy-button"

export async function EndpointBlock({ endpoint }: { endpoint: ApiEndpoint }) {
  return (
    <div
      id={endpoint.anchor}
      className="scroll-mt-14 md:scroll-mt-8 grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 xl:gap-8 py-8 sm:py-10 border-b border-zinc-100 last:border-b-0"
    >
      {/* Left: Prose */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 flex-wrap">
          <MethodBadge method={endpoint.method} />
          <code className="text-sm font-mono font-medium text-zinc-800 break-all">
            {endpoint.path}
          </code>
        </div>

        <h3 className="text-base sm:text-lg font-semibold text-zinc-900 mb-2">
          {endpoint.title}
        </h3>

        <p className="text-sm text-zinc-600 leading-relaxed mb-5 sm:mb-6">
          {endpoint.description}
        </p>

        {endpoint.params && endpoint.params.length > 0 && (
          <div className="mb-5 sm:mb-6">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
              Parameters
            </h4>
            <ParamTable params={endpoint.params} />
          </div>
        )}
      </div>

      {/* Right: Code */}
      <div className="min-w-0 space-y-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        {endpoint.requestExample && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Request
            </h4>
            <CodeTabs>
              {{
                curl: (
                  <div className="relative group">
                    <CopyButton text={endpoint.requestExample.curl.trim()} />
                    <CodeBlock
                      code={endpoint.requestExample.curl}
                      lang="bash"
                    />
                  </div>
                ),
                javascript: (
                  <div className="relative group">
                    <CopyButton
                      text={endpoint.requestExample.javascript.trim()}
                    />
                    <CodeBlock
                      code={endpoint.requestExample.javascript}
                      lang="javascript"
                    />
                  </div>
                ),
                python: (
                  <div className="relative group">
                    <CopyButton text={endpoint.requestExample.python.trim()} />
                    <CodeBlock
                      code={endpoint.requestExample.python}
                      lang="python"
                    />
                  </div>
                ),
              }}
            </CodeTabs>
          </div>
        )}

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
            Response{" "}
            <span className="text-zinc-300 normal-case font-normal">
              {endpoint.responseStatus}
            </span>
          </h4>
          <div className="relative group">
            <CopyButton text={endpoint.responseExample.trim()} />
            <CodeBlock code={endpoint.responseExample} lang="json" />
          </div>
        </div>
      </div>
    </div>
  )
}
