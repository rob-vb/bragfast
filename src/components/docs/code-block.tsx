import { highlight } from "@/lib/docs/highlight"

interface CodeBlockProps {
  code: string
  lang: string
}

export async function CodeBlock({ code, lang }: CodeBlockProps) {
  const html = await highlight(code.trim(), lang)

  return (
    <div className="relative group overflow-hidden">
      <div
        className="bg-[#24292e] text-sm overflow-x-auto [&_pre]:p-4 [&_pre]:m-0 [&_pre]:bg-transparent [&_code]:text-[13px] [&_code]:leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
