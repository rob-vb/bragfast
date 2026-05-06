import type { ChannelClass } from "@/lib/integrations/channel-classes";

export type NamedChannelClass = Exclude<ChannelClass, "other">;

type PostingProvider = "buffer" | "postiz";

interface ChannelWithClass {
  channelId: string;
  channelClass: ChannelClass;
}

const CANONICAL_ORDER: NamedChannelClass[] = [
  "x",
  "linkedin",
  "instagram",
  "tiktok",
  "threads",
  "facebook",
  "youtube",
];

/**
 * Given the modal's checked-selection set and the per-provider channel list,
 * returns the named ChannelClass values present in the selection in canonical
 * order. "other" is filtered out.
 *
 * Selection key format: `${format}::${provider}::${channelId}`.
 */
export function availableClassesFromSelection(
  checked: Set<string>,
  channelsByProvider: Record<PostingProvider, ChannelWithClass[]>,
): NamedChannelClass[] {
  const present = new Set<ChannelClass>();
  for (const key of checked) {
    const [, provider, channelId] = key.split("::");
    if (provider !== "buffer" && provider !== "postiz") continue;
    const found = channelsByProvider[provider].find(
      (c) => c.channelId === channelId,
    );
    if (found) present.add(found.channelClass);
  }
  return CANONICAL_ORDER.filter((c) => present.has(c));
}
