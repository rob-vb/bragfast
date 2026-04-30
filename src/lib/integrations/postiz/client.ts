/**
 * Postiz REST API client.
 *
 * Auth convention: Postiz uses `Authorization: <api-key>` with NO `Bearer` prefix.
 * This is codified here — callers must not pass raw auth headers.
 *
 * All HTTP calls go through `safeFetch` for SSRF protection.
 *
 * API base: `{instanceUrl}/public/v1`
 * Cloud default: `https://api.postiz.com`
 */

import { safeFetch } from "./safe-fetch";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PostizChannel {
  id: string;
  identifier: string;
  name: string;
  picture?: string;
  disabled: boolean;
  profile?: Record<string, unknown>;
}

export interface PostizUploadResult {
  id: string;
  path: string;
}

export interface PostizPostValue {
  content: string;
  image?: Array<{ id: string; path: string }>;
}

export interface PostizPostIntegration {
  id: string;
}

export interface PostizPostEntry {
  integration: PostizPostIntegration;
  value: PostizPostValue[];
  settings?: Record<string, unknown>;
}

export interface PostizCreatePostBody {
  type: "schedule" | "now" | "draft";
  /** ISO 8601. Required by Postiz even for "now" / "draft". */
  date: string;
  posts: PostizPostEntry[];
}

export interface PostizCreatePostResult {
  id?: string;
  [key: string]: unknown;
}

export interface PostizSlotResult {
  date?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class PostizAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PostizAuthError";
  }
}

export class PostizApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "PostizApiError";
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalize instance URL: strip trailing slash.
 * Throws if the URL is missing a scheme.
 */
export function normalizeInstanceUrl(instanceUrl: string): string {
  if (!instanceUrl.startsWith("http://") && !instanceUrl.startsWith("https://")) {
    throw new Error("instanceUrl must include a scheme (https:// or http://)");
  }
  return instanceUrl.replace(/\/+$/, "");
}

function apiBase(instanceUrl: string): string {
  return `${normalizeInstanceUrl(instanceUrl)}/public/v1`;
}

function authHeaders(apiKey: string): Record<string, string> {
  return {
    // Postiz: no "Bearer" prefix — just the raw key
    Authorization: apiKey,
    "Content-Type": "application/json",
  };
}

async function postizFetch<T>(
  url: string,
  apiKey: string,
  options: {
    method?: string;
    body?: unknown;
  } = {},
): Promise<T> {
  const { status, body: rawBody } = await safeFetch(url, {
    method: options.method ?? "GET",
    headers: authHeaders(apiKey),
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (status === 401 || status === 403) {
    throw new PostizAuthError(`Postiz rejected the API key (HTTP ${status})`);
  }

  if (status < 200 || status >= 300) {
    throw new PostizApiError(
      `Postiz API returned HTTP ${status}: ${rawBody.slice(0, 200)}`,
      status,
    );
  }

  try {
    return JSON.parse(rawBody) as T;
  } catch {
    throw new PostizApiError(
      `Postiz API returned non-JSON response (status ${status})`,
      status,
    );
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch the list of connected channel integrations.
 * `GET /public/v1/integrations`
 */
export async function listIntegrations(
  instanceUrl: string,
  apiKey: string,
): Promise<PostizChannel[]> {
  const url = `${apiBase(instanceUrl)}/integrations`;
  return postizFetch<PostizChannel[]>(url, apiKey);
}

/**
 * Upload a media asset from a URL.
 * `POST /public/v1/upload-from-url`
 * Returns `{id, path}` for use in `createPost`.
 */
export async function uploadFromUrl(
  instanceUrl: string,
  apiKey: string,
  mediaUrl: string,
): Promise<PostizUploadResult> {
  const url = `${apiBase(instanceUrl)}/upload-from-url`;
  return postizFetch<PostizUploadResult>(url, apiKey, {
    method: "POST",
    body: { url: mediaUrl },
  });
}

/**
 * Create or schedule a post.
 * `POST /public/v1/posts`
 */
export async function createPost(
  instanceUrl: string,
  apiKey: string,
  body: PostizCreatePostBody,
): Promise<PostizCreatePostResult> {
  const url = `${apiBase(instanceUrl)}/posts`;
  return postizFetch<PostizCreatePostResult>(url, apiKey, {
    method: "POST",
    body,
  });
}

/**
 * Find the next available slot for a given integration.
 * `GET /public/v1/find-slot/{integrationId}`
 */
export async function findSlot(
  instanceUrl: string,
  apiKey: string,
  integrationId: string,
): Promise<PostizSlotResult> {
  const url = `${apiBase(instanceUrl)}/find-slot/${encodeURIComponent(integrationId)}`;
  return postizFetch<PostizSlotResult>(url, apiKey);
}
