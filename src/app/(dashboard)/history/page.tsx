import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { PixelTable } from "@/components/dashboard/pixel-table";
import { PixelBadge } from "@/components/dashboard/pixel-badge";
import { PixelCard } from "@/components/dashboard/pixel-card";
import { HistoryFilter } from "@/components/dashboard/history-filter";

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
        <PixelTable
          headers={["ID", "Template", "Slides", "Status", "Credits", "Date"]}
        >
          {releases.map((r) => (
            <tr key={r._id} className="hover:bg-[#F8AF3C]/5">
              <td className="px-4 py-3 font-mono text-xs">{r.externalId}</td>
              <td className="px-4 py-3 text-xs">{r.template}</td>
              <td className="px-4 py-3 text-xs">
                {r.images ? Object.keys(r.images as Record<string, unknown>).length : "-"}
              </td>
              <td className="px-4 py-3">
                <PixelBadge status={r.status} />
              </td>
              <td className="px-4 py-3 text-xs">{r.credits_used}</td>
              <td className="px-4 py-3 text-xs">
                {new Date(r.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </PixelTable>
      )}
    </div>
  );
}
