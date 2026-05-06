export type PostingProvider = "buffer" | "postiz";

export type ChannelKey = string;

export function makeChannelKey(
  provider: PostingProvider,
  channelId: string,
): ChannelKey {
  return `${provider}::${channelId}`;
}

export function parseChannelKey(
  key: ChannelKey,
): { provider: PostingProvider; channelId: string } | null {
  const sep = key.indexOf("::");
  if (sep === -1) return null;
  const provider = key.slice(0, sep);
  const channelId = key.slice(sep + 2);
  if (provider !== "buffer" && provider !== "postiz") return null;
  if (!channelId) return null;
  return { provider, channelId };
}
