/**
 * Buffer posting — create a post via Buffer's GraphQL API.
 *
 * Only image formats are supported in MVP. Video formats throw PushError("media", …)
 * immediately so the fanout can surface a clear message.
 *
 * Buffer GraphQL endpoint: https://graph.buffer.com
 *
 * NOTE(approx schema): The PostCreateInput shape below is derived from Buffer's
 * public 2024 GraphQL schema documentation. Real integration testing (U9+) will
 * validate the exact field names. If the API returns an unknown shape, treat the
 * response id as the providerPostId.
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
  accessToken: string;
  channelId: string;
  title: string;
  description: string;
  mediaUrl: string;
  format: string;
  /** "queue" → AddToQueue, "draft" → Draft */
  postState: "queue" | "draft";
}

interface CreatePostResponse {
  createPost: {
    id: string;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CREATE_POST_MUTATION = `
  mutation CreatePost($input: PostCreateInput!) {
    createPost(input: $input) {
      id
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
  const { accessToken, channelId, title, description, mediaUrl, format, postState } = params;

  // Video not supported via Buffer in MVP — Postiz handles video.
  if (isVideoFormat(format)) {
    throw new PushError(
      "media",
      "Buffer video unsupported in MVP — use Postiz for video formats",
    );
  }

  const text = [title, description].filter(Boolean).join("\n\n");

  const input = {
    channelIds: [channelId],
    text,
    media: mediaUrl ? [{ type: "image", url: mediaUrl }] : [],
    scheduling: {
      type: postState === "queue" ? "AddToQueue" : "Draft",
    },
  };

  try {
    const data = await bufferGraphQL<CreatePostResponse>(
      accessToken,
      CREATE_POST_MUTATION,
      { input },
    );
    return { providerPostId: data.createPost.id };
  } catch (err) {
    const cls = classifyBufferError(err);
    const msg = err instanceof Error ? err.message : String(err);
    throw new PushError(cls, msg);
  }
}
