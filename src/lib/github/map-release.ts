import type { ReleaseRequest, FormatEntry } from "../types";
import type { FormatKey } from "../templates/canvas-types";

export interface GitHubReleasePayload {
  action: string;
  release: {
    id: number;
    tag_name: string;
    name: string | null;
    body: string | null;
    prerelease: boolean;
    draft: boolean;
    html_url: string;
  };
  repository: {
    full_name: string;
    owner: {
      login: string;
    };
    name: string;
  };
  installation?: {
    id: number;
  };
}

export interface RepoConfig {
  brandId?: string;
  template?: string;
  formats?: string[];
}

export function stripMarkdown(text: string): string {
  return (
    text
      // Remove headers
      .replace(/^#{1,6}\s+/gm, "")
      // Remove bold/italic
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
      .replace(/_{1,3}([^_]+)_{1,3}/g, "$1")
      // Remove images (before links — image syntax contains link syntax)
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "")
      // Convert links to just text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`([^`]+)`/g, "$1")
      // Remove blockquotes
      .replace(/^>\s+/gm, "")
      // Remove horizontal rules
      .replace(/^[-*_]{3,}\s*$/gm, "")
      // Remove list markers
      .replace(/^[\s]*[-*+]\s+/gm, "")
      .replace(/^[\s]*\d+\.\s+/gm, "")
      // Collapse whitespace
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

export function mapReleaseToRequest(
  payload: GitHubReleasePayload,
  config: RepoConfig
): ReleaseRequest {
  const title = payload.release.name || payload.release.tag_name;

  let description = "";
  if (payload.release.body) {
    description = stripMarkdown(payload.release.body);
    if (description.length > 200) {
      description = description.slice(0, 197) + "...";
    }
  }

  const formatNames = (config.formats ?? ["landscape"]) as FormatKey[];
  const formats: FormatEntry[] = formatNames.map((name) => ({
    name,
    slides: [
      {
        objects: [
          { id: "title", text: title },
          ...(description ? [{ id: "description", text: description }] : []),
        ],
      },
    ],
  }));

  const request: ReleaseRequest = {
    template: config.template ?? "standard-browser",
    formats,
  };

  if (config.brandId) {
    request.brand_id = config.brandId;
  } else {
    // Fallback colors when no brand is configured
    request.colors = { background: "#0f172a", text: "#f8fafc", primary: "#3b82f6" };
    request.name = payload.repository.owner.login;
  }

  return request;
}

export function buildSourceMetadata(payload: GitHubReleasePayload): string {
  return JSON.stringify({
    installationId: payload.installation?.id,
    repoFullName: payload.repository.full_name,
    releaseTag: payload.release.tag_name,
    releaseUrl: payload.release.html_url,
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    githubReleaseId: payload.release.id,
  });
}
