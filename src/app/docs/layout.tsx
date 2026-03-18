import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "API Reference — brag.fast",
  description:
    "The full brag.fast API reference. Generate branded social media images with one POST request — releases, brands, templates, fonts, and uploads.",
}

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="border-t-[3px] border-brand">
      {children}
    </div>
  )
}
