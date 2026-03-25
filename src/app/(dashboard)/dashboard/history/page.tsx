import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { HistoryFilter } from "@/components/dashboard/history-filter";
import { PixelEmptyState } from "@/components/dashboard/pixel-empty-state";
import { HistoryTable } from "@/components/dashboard/history-table";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; id?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { status, id } = await searchParams;
  const allReleases = await fetchQuery(api.releases.listByUser, { userId: user._id });

  const releases = status && status !== "all"
    ? allReleases.filter((r) => r.status === status)
    : allReleases;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-press-start)] text-lg text-brand">
          History
        </h1>
        <HistoryFilter current={status ?? "all"} />
      </div>

      {releases.length === 0 ? (
        <PixelEmptyState
          title="No releases yet"
          description="Your release history will appear here once you generate your first images."
          cta={{ label: "Get Started", href: "/docs" }}
        />
      ) : (
        <HistoryTable releases={releases} highlightId={id} />
      )}
    </div>
  );
}
