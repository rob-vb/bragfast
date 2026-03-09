import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "API Reference — Bragfast",
  description:
    "Complete API reference for Bragfast — generate branded social media images via API.",
}

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
