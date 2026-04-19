import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { DraftsList } from "@/components/admin/drafts-list";

export const dynamic = "force-dynamic";

export default async function DraftsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const drafts = await fetchQuery(api.drafts.listByUser, { userId: user._id, limit: 50 });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="font-press-start text-xl text-brand">▸ DRAFTS</h1>
        <p className="text-brand/70 text-sm mt-2">
          brag.fast checks your repos daily at 8am PT. Approve, edit, or dismiss agent-drafted posts.
        </p>
      </header>
      <DraftsList initialDrafts={drafts.map((d) => ({
        id: d._id,
        copy: d.copy,
        originalCopy: d.originalCopy,
        status: d.status,
        source: d.source,
        repoFullName: d.repoFullName,
        sourceCommitShas: d.sourceCommitShas,
        suggestedTemplateId: d.suggestedTemplateId,
        suggestedFormat: d.suggestedFormat,
        errorMessage: d.errorMessage,
        postedAt: d.postedAt,
        created_at: d.created_at,
        approved_at: d.approved_at,
      }))} />
      <div id="a11y-live" aria-live="polite" className="sr-only" />
    </div>
  );
}
