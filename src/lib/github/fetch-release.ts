export async function fetchGitHubRelease(owner: string, repo: string, tag: string) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(tag)}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "bragfast",
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
    }
  );

  if (!res.ok) return null;

  const data = await res.json();
  return {
    name: (data.name as string) || tag,
    tag_name: data.tag_name as string,
    body: (data.body as string) || "",
  };
}
