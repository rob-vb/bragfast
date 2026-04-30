/**
 * channel-classes.ts
 *
 * Derives a normalised "channel class" from a Buffer channel (keyed by
 * `service`) or a Postiz channel (keyed by `identifier`).
 *
 * The class is used by the routing-defaults UI to apply built-in pre-checks
 * and to display a platform icon.
 *
 * Buffer `service` examples:  "twitter", "linkedin", "instagram", "tiktok",
 *   "threads", "facebook", "youtube", "pinterest", "googlebusiness", …
 *
 * Postiz `identifier` examples: "TWITTER", "LINKEDIN", "INSTAGRAM", "TIKTOK",
 *   "THREADS", "FACEBOOK", "YOUTUBE", …
 */

export type ChannelClass =
  | "x"
  | "linkedin"
  | "instagram"
  | "tiktok"
  | "threads"
  | "facebook"
  | "youtube"
  | "other";

/** Icon characters used in the routing table header cells. */
export const CHANNEL_CLASS_ICONS: Record<ChannelClass, string> = {
  x: "𝕏",
  linkedin: "in",
  instagram: "IG",
  tiktok: "TT",
  threads: "TH",
  facebook: "FB",
  youtube: "YT",
  other: "◆",
};

// ── Lookup tables ─────────────────────────────────────────────────────────────

const BUFFER_SERVICE_MAP: Record<string, ChannelClass> = {
  twitter: "x",
  x: "x",
  linkedin: "linkedin",
  instagram: "instagram",
  tiktok: "tiktok",
  threads: "threads",
  facebook: "facebook",
  youtube: "youtube",
};

const POSTIZ_IDENTIFIER_MAP: Record<string, ChannelClass> = {
  twitter: "x",
  x: "x",
  linkedin: "linkedin",
  instagram: "instagram",
  tiktok: "tiktok",
  threads: "threads",
  facebook: "facebook",
  youtube: "youtube",
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Derive the channel class from a Buffer channel's `service` field.
 */
export function channelClassFromBufferService(service: string): ChannelClass {
  return BUFFER_SERVICE_MAP[service.toLowerCase()] ?? "other";
}

/**
 * Derive the channel class from a Postiz channel's `identifier` field.
 */
export function channelClassFromPostizIdentifier(
  identifier: string,
): ChannelClass {
  return POSTIZ_IDENTIFIER_MAP[identifier.toLowerCase()] ?? "other";
}

// ── Built-in default mappings ─────────────────────────────────────────────────

/**
 * The built-in default channel classes for each format.
 *
 * These are used by the routing-defaults UI to pre-check channels when the
 * user has not yet saved any routing preferences for a format.
 *
 * Logic:
 *   - square      → x, linkedin
 *   - landscape   → linkedin
 *   - portrait    → instagram, tiktok, threads
 *   - video-*     → same mapping as the corresponding image format
 */
export const BUILT_IN_FORMAT_DEFAULTS: Record<string, ChannelClass[]> = {
  square: ["x", "linkedin"],
  landscape: ["linkedin"],
  portrait: ["instagram", "tiktok", "threads"],
  "video-square": ["x", "linkedin"],
  "video-landscape": ["linkedin"],
  "video-portrait": ["instagram", "tiktok", "threads"],
};
