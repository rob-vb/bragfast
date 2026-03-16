import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { getInstallationToken } from "@/lib/github/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const installations = await fetchQuery(api.githubInstallations.listByUserId, {
    userId: user._id,
  });

  const active = installations.find(
    (i) => i.status === "active" && i.userId === user._id
  );
  if (!active) {
    return Response.json({ repos: [] });
  }

  let token: string;
  try {
    token = await getInstallationToken(active.installationId);
  } catch (err) {
    console.error("Failed to get GitHub installation token:", err);
    return Response.json(
      { error: "GitHub authentication failed" },
      { status: 502 }
    );
  }

  const repos: Array<{
    full_name: string;
    name: string;
    private: boolean;
    description: string | null;
  }> = [];

  let page = 1;
  while (true) {
    const res = await fetch(
      `https://api.github.com/installation/repositories?per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error(`GitHub repos fetch failed: ${res.status} ${text}`);
      return Response.json({ error: "Failed to fetch repos" }, { status: 502 });
    }

    const data = await res.json();
    const repoList = data.repositories ?? [];
    for (const r of repoList) {
      repos.push({
        full_name: r.full_name,
        name: r.name,
        private: r.private,
        description: r.description,
      });
    }

    if (repos.length >= (data.total_count ?? 0) || repoList.length < 100) break;
    page++;
  }

  return Response.json(
    { repos },
    { headers: { "Cache-Control": "private, max-age=60" } }
  );
}
