/**
 * Buffer posting — create a post via Buffer's GraphQL API (API-key auth).
 *
 * Image-only in MVP. Video formats throw PushError("media", …) so the fanout
 * surfaces a clear message; route video to Postiz instead.
 *
 * Buffer queue-only constraint: createPost has no `draft` mode. Valid modes are
 * `addToQueue | shareNow | shareNext | customScheduled`. When the user picks
 * "Save as draft" + Buffer, we still send `addToQueue` and log a warning. The
 * UI surfaces this asymmetry before confirm; the fanout finalizes Buffer pushes
 * as `state: "queued"` regardless of user intent.
 *
 * Endpoint: https://api.buffer.com (GraphQL).
 */

import { PushError, type ErrorClass } from "../error-classes";
import {
  bufferGraphQL,
  BufferAuthError,
  BufferGraphQLError,
  BufferRateLimitError,
  BufferHttpError,
} from "./graphql";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BufferPushParams {
  apiKey: string;
  channelId: string;
  title: string;
  description: string;
  mediaUrl: string;
  format: string;
  /** User intent. Buffer always queues regardless — see queue-only note. */
  postState: "queue" | "draft";
}

interface CreatePostSuccess {
  __typename?: "PostActionSuccess";
  post: { id: string };
}

interface CreatePostError {
  __typename?: "MutationError";
  message: string;
}

interface CreatePostResponse {
  createPost: CreatePostSuccess | CreatePostError;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CREATE_POST_MUTATION = `
  mutation CreatePost($input: PostCreateInput!) {
    createPost(input: $input) {
      __typename
      ... on PostActionSuccess {
        post { id }
      }
      ... on MutationError {
        message
      }
    }
  }
`;

const VIDEO_FORMATS = new Set([
  "video-square",
  "video-landscape",
  "video-portrait",
]);

function isVideoFormat(format: string): boolean {
  return VIDEO_FORMATS.has(format);
}

function classifyBufferError(err: unknown): ErrorClass {
  if (err instanceof BufferAuthError) return "auth";
  if (err instanceof BufferRateLimitError) return "rate_limit";

  if (err instanceof BufferGraphQLError) {
    const messages = err.errors.map((e) => e.message.toLowerCase()).join(" ");
    const codes = err.errors
      .map((e) => String(e.extensions?.code ?? ""))
      .join(" ")
      .toLowerCase();

    if (
      messages.includes("channelreconnectrequired") ||
      messages.includes("channel reconnect") ||
      codes.includes("channel_reconnect")
    ) {
      return "channel_gone";
    }
    if (
      messages.includes("media") ||
      messages.includes("url") ||
      messages.includes("fetch failed") ||
      messages.includes("image")
    ) {
      return "media";
    }
    return "unknown";
  }

  if (err instanceof BufferHttpError) {
    if (err.status >= 500) return "transient";
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
 * Create a Buffer post for a single channel.
 *
 * Throws PushError on any failure with a classified errorClass.
 */
export async function pushToBuffer(params: BufferPushParams): Promise<{ providerPostId: string }> {
  const { apiKey, channelId, title, description, mediaUrl, format, postState } = params;

  if (isVideoFormat(format)) {
    throw new PushError(
      "media",
      "Buffer video unsupported in MVP — use Postiz for video formats",
    );
  }

  if (postState === "draft") {
    console.warn(
      `[buffer:push] User picked draft state, but Buffer createPost has no draft mode. Sending mode: addToQueue (channel=${channelId}).`,
    );
  }

  const text = [title, description].filter(Boolean).join("\n\n");

  const input: Record<string, unknown> = {
    channelId,
    text,
    schedulingType: "automatic",
    mode: "addToQueue",
  };

  if (mediaUrl) {
    input.assets = { images: [{ url: mediaUrl }] };
  }

  let data: CreatePostResponse;
  try {
    data = await bufferGraphQL<CreatePostResponse>(
      apiKey,
      CREATE_POST_MUTATION,
      { input },
    );
  } catch (err) {
    const cls = classifyBufferError(err);
    const msg = err instanceof Error ? err.message : String(err);
    throw new PushError(cls, msg);
  }

  const result = data.createPost;
  if (result && "post" in result && result.post?.id) {
    return { providerPostId: result.post.id };
  }
  if (result && "message" in result) {
    const message = result.message ?? "Buffer createPost returned MutationError";
    const cls: ErrorClass = /channel.*reconnect/i.test(message)
      ? "channel_gone"
      : /unauth|forbidden/i.test(message)
        ? "auth"
        : /media|image|url/i.test(message)
          ? "media"
          : "unknown";
    throw new PushError(cls, message);
  }
  throw new PushError("unknown", "Buffer createPost returned unexpected payload");
}
