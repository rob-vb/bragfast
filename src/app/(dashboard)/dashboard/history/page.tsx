import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { PixelCard } from "@/components/dashboard/pixel-card";
import { HistoryFilter } from "@/components/dashboard/history-filter";
import { HistoryTable } from "@/components/dashboard/history-table";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { status } = await searchParams;
  const allReleases = await fetchQuery(api.releases.listByUser, { userId: user._id });

  const releases = status && status !== "all"
    ? allReleases.filter((r) => r.status === status)
    : allReleases;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-press-start)] text-lg text-[#4A3326]">
          History
        </h1>
        <HistoryFilter current={status ?? "all"} />
      </div>

      {releases.length === 0 ? (
        <PixelCard>
          <p className="text-center text-sm text-[#4A3326]/60 py-8">
            No releases found.
          </p>
        </PixelCard>
      ) : (
        <HistoryTable releases={releases} />
      )}
    </div>
  );
}
