/**
 * Postiz posting — upload media and create a post via Postiz REST API.
 *
 * Supports both image and video formats.
 *
 * Flow:
 *  1. uploadFromUrl(mediaUrl) → {id, path}
 *  2. createPost({ type, date, posts: [{ integration, value: [{ content, image }] }] })
 *
 * Auth: Postiz uses `Authorization: <apiKey>` with no Bearer prefix.
 */

import { PushError, type ErrorClass } from "../error-classes";
import {
  uploadFromUrl,
  createPost,
  PostizAuthError,
  PostizApiError,
  normalizeInstanceUrl,
} from "./client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PostizPushParams {
  apiKey: string;
  instanceUrl: string;
  channelId: string;
  title: string;
  description: string;
  mediaUrl: string;
  /** "queue" → "now" (Postiz "now" means add to queue), "draft" → "draft" */
  postState: "queue" | "draft";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function classifyPostizError(err: unknown): ErrorClass {
  if (err instanceof PostizAuthError) return "auth";

  if (err instanceof PostizApiError) {
    if (err.status === 429) return "rate_limit";
    if (err.status >= 500) return "transient";

    const msg = err.message.toLowerCase();
    if (msg.includes("media") || msg.includes("url") || msg.includes("size") || msg.includes("format")) {
      return "media";
    }
    if (msg.includes("channel") || msg.includes("integration")) {
      return "channel_gone";
    }
    return "unknown";
  }

  // Network-level errors
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("ECONNRESET") || msg.includes("timeout") || msg.includes("AbortError")) {
    return "transient";
  }
  return "unknown";
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/**
 * Upload media and create a Postiz post on a single channel.
 *
 * Throws PushError on any failure with a classified errorClass.
 */
export async function pushToPostiz(
  params: PostizPushParams,
): Promise<{ providerPostId: string }> {
  const { apiKey, instanceUrl, channelId, title, description, mediaUrl, postState } = params;

  const baseUrl = normalizeInstanceUrl(instanceUrl);
  const content = [title, description].filter(Boolean).join("\n\n");

  // Step 1: upload media from URL
  let uploadResult: { id: string; path: string };
  try {
    uploadResult = await uploadFromUrl(baseUrl, apiKey, mediaUrl);
  } catch (err) {
    const cls = classifyPostizError(err);
    const msg = err instanceof Error ? err.message : String(err);
    throw new PushError(cls, `Postiz media upload failed: ${msg}`);
  }

  // Step 2: create the post
  // Postiz requires a date even for "now"/"draft" — use a near-future ISO string.
  const scheduleDate = new Date(Date.now() + 60_000).toISOString();
  const postizType = postState === "draft" ? "draft" : "now";

  try {
    const result = await createPost(baseUrl, apiKey, {
      type: postizType,
      date: scheduleDate,
      posts: [
        {
          integration: { id: channelId },
          value: [
            {
              content,
              image: [{ id: uploadResult.id, path: uploadResult.path }],
            },
          ],
        },
      ],
    });

    const postId = result.id ?? String(result);
    return { providerPostId: postId };
  } catch (err) {
    const cls = classifyPostizError(err);
    const msg = err instanceof Error ? err.message : String(err);
    throw new PushError(cls, `Postiz createPost failed: ${msg}`);
  }
}
