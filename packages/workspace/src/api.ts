import type { RepoContext } from "./types";

export async function fetchRepoContext(): Promise<RepoContext> {
  const response = await fetch("/api/repo-context");
  if (!response.ok) throw new Error(`repo-context failed (${response.status})`);
  return (await response.json()) as RepoContext;
}
