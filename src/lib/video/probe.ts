/**
 * Lightweight MP4 duration probe.
 *
 * Fetches the opening bytes of a video URL and walks the box structure to find
 * `moov > mvhd`, which stores the timescale and total duration. Works for
 * faststart-encoded MP4s (moov near start of file). Returns null for anything
 * else — callers should fall back to the template's default slide duration.
 *
 * Spec reference: ISO/IEC 14496-12 (MP4 container format).
 */
export async function probeMp4DurationSeconds(url: string): Promise<number | null> {
  try {
    const buf = await fetchLeadingBytes(url, 4 * 1024 * 1024); // 4 MB should cover faststart moov
    if (!buf) return null;
    return parseMp4DurationFromBuffer(buf);
  } catch {
    return null;
  }
}

async function fetchLeadingBytes(url: string, bytes: number): Promise<Buffer | null> {
  const res = await fetch(url, { headers: { Range: `bytes=0-${bytes - 1}` } });
  if (!res.ok && res.status !== 206) return null;
  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

function parseMp4DurationFromBuffer(buf: Buffer): number | null {
  let offset = 0;
  while (offset + 8 <= buf.length) {
    const size = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    if (size < 8) return null;

    if (type === "moov") {
      return findMvhdInContainer(buf, offset + 8, offset + size);
    }

    // `size === 1` means 64-bit extended size in the next 8 bytes
    if (size === 1) {
      const hi = buf.readUInt32BE(offset + 8);
      const lo = buf.readUInt32BE(offset + 12);
      offset += hi * 0x100000000 + lo;
    } else {
      offset += size;
    }
  }
  return null;
}

function findMvhdInContainer(buf: Buffer, start: number, end: number): number | null {
  let offset = start;
  while (offset + 8 <= Math.min(end, buf.length)) {
    const size = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    if (size < 8) return null;

    if (type === "mvhd") {
      const version = buf.readUInt8(offset + 8);
      // version + flags (4) + created (4|8) + modified (4|8) + timescale (4) + duration (4|8)
      if (version === 0) {
        const timescale = buf.readUInt32BE(offset + 20);
        const duration = buf.readUInt32BE(offset + 24);
        if (!timescale) return null;
        return duration / timescale;
      }
      // version 1: 64-bit timestamps
      const timescale = buf.readUInt32BE(offset + 28);
      const hi = buf.readUInt32BE(offset + 32);
      const lo = buf.readUInt32BE(offset + 36);
      const duration = hi * 0x100000000 + lo;
      if (!timescale) return null;
      return duration / timescale;
    }

    offset += size;
  }
  return null;
}
