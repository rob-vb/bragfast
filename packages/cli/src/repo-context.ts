import { execSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";

export interface RepoContext {
  tag: string | null;
  sha: string | null;
  name: string | null;
  version: string | null;
}

/**
 * Reads lightweight project context from a directory: the latest git tag and
 * short commit SHA (if it is a git repo) plus name/version from package.json.
 *
 * Never throws. Any failure (non-git directory, missing package.json, git not
 * installed) yields null for the affected fields. Used to prefill Workspace
 * copy slots — no AI, no network.
 */
export function getRepoContext(cwd: string): RepoContext {
  // Each fallible call gets its own try/catch so a missing tag does not
  // suppress a valid SHA. Command strings are static literals — the only
  // dynamic value (cwd) is passed via execSync's options.cwd, never
  // interpolated into the shell command (no injection vector).
  const exec = (cmd: string): string | null => {
    try {
      return execSync(cmd, { cwd, stdio: "pipe" }).toString().trim() || null;
    } catch {
      return null;
    }
  };

  const tag = exec("git describe --tags --abbrev=0");
  const sha = exec("git rev-parse --short HEAD");

  let name: string | null = null;
  let version: string | null = null;
  try {
    const raw = readFileSync(path.join(cwd, "package.json"), "utf8");
    const pkg = JSON.parse(raw) as { name?: string; version?: string };
    name = pkg.name ?? null;
    version = pkg.version ?? null;
  } catch {
    name = null;
    version = null;
  }

  return { tag, sha, name, version };
}
