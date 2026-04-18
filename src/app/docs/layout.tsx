import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "API Reference | brag.fast",
  description:
    "Everything you need to turn releases into branded images and video. Endpoints, brands, templates, fonts. One API call, every format.",
  alternates: { canonical: "/docs" },
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
