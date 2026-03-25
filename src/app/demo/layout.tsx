import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demo | brag.fast",
  description:
    "Try the brag.fast template editor. Pick templates, fonts, and formats. Preview branded social images live.",
  alternates: { canonical: "/demo" },
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
