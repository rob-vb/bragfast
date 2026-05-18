/**
 * Pure helpers for the voice-profile markdown document.
 *
 * The document has the shape:
 *
 * ---
 * last_updated: <ISO string>
 * last_reflected: <ISO string>
 * approval_count: <number>
 * skip_count: <number>
 * ---
 *
 * ## Compiled Truth
 *
 * <content>
 *
 * ## Timeline
 *
 * <content>
 *
 * No YAML dependency — frontmatter is parsed with regex.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VoiceProfileFrontmatter {
  last_updated: string;
  last_reflected: string;
  approval_count: number;
  skip_count: number;
}

export interface VoiceProfileParts {
  frontmatter: VoiceProfileFrontmatter;
  compiledTruth: string;
  timeline: string;
}

export interface TimelineEntry {
  dateIso: string;
  triggerType: string;
  action: "approved" | "skipped";
  wasEdited: boolean;
  original?: string;
  final?: string;
  editType?: string;
  reason?: string;
}

// ---------------------------------------------------------------------------
// Default / empty profile
// ---------------------------------------------------------------------------

// NOTE: The date here is intentionally static — this is a template string, not
// a snapshot of "now". The actual last_updated/last_reflected values are set
// when the profile is first written to the database.
export const DEFAULT_VOICE_PROFILE_MD = `---
last_updated: 2026-05-04T12:00:00Z
last_reflected: 2026-05-01T09:00:00Z
approval_count: 0
skip_count: 0
---

## Compiled Truth

- (empty until first reflection — composer ignores empty section)

## Timeline

`;

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

/**
 * Parse a voice-profile markdown string into its constituent parts.
 * Frontmatter is parsed with regex — no yaml dependency.
 */
export function parseVoiceProfile(md: string): VoiceProfileParts {
  // --- frontmatter ---
  const fmMatch = md.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fmMatch) {
    throw new Error("voice-profile: missing frontmatter block");
  }
  const fmRaw = fmMatch[1];

  function fmString(key: string): string {
    const m = fmRaw.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    return m ? m[1].trim() : "";
  }

  function fmNumber(key: string): number {
    const raw = fmString(key);
    const n = parseInt(raw, 10);
    return isNaN(n) ? 0 : n;
  }

  const frontmatter: VoiceProfileFrontmatter = {
    last_updated: fmString("last_updated"),
    last_reflected: fmString("last_reflected"),
    approval_count: fmNumber("approval_count"),
    skip_count: fmNumber("skip_count"),
  };

  // --- sections ---
  // Body is everything after the closing ---\n
  const bodyStart = fmMatch[0].length;
  const body = md.slice(bodyStart);

  // Split on H2 headings. We expect exactly two: "## Compiled Truth" and "## Timeline"
  // Pattern: split on lines that start with "## "
  const sections = splitH2Sections(body);

  const compiledTruth = sections["Compiled Truth"] ?? "";
  const timeline = sections["Timeline"] ?? "";

  return { frontmatter, compiledTruth, timeline };
}

/**
 * Split a markdown body into sections keyed by H2 heading text.
 * Returns the raw content string for each section (without the heading line).
 */
function splitH2Sections(body: string): Record<string, string> {
  const result: Record<string, string> = {};
  // Split by lines starting with "## "
  const parts = body.split(/^(?=## )/m);
  for (const part of parts) {
    const headingMatch = part.match(/^## (.+)\n([\s\S]*)$/);
    if (headingMatch) {
      result[headingMatch[1].trim()] = headingMatch[2];
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Serialize
// ---------------------------------------------------------------------------

/**
 * Reassemble the full markdown from its constituent parts.
 *
 * Invariant: `compiledTruth` and `timeline` each begin with `\n` so that the
 * template literal below produces a blank line between the heading and the
 * section body (e.g. "## Compiled Truth\n\n- bullet…"). This is preserved by
 * the round-trip parse → serialize cycle.
 */
export function serializeVoiceProfile(parts: VoiceProfileParts): string {
  const { frontmatter, compiledTruth, timeline } = parts;
  const fm = [
    "---",
    `last_updated: ${frontmatter.last_updated}`,
    `last_reflected: ${frontmatter.last_reflected}`,
    `approval_count: ${frontmatter.approval_count}`,
    `skip_count: ${frontmatter.skip_count}`,
    "---",
  ].join("\n");

  return `${fm}\n\n## Compiled Truth\n${compiledTruth}## Timeline\n${timeline}`;
}

// ---------------------------------------------------------------------------
// voiceProfileBlock
// ---------------------------------------------------------------------------

/**
 * Returns "" when md is empty/null/undefined OR when the Compiled Truth
 * section is empty/whitespace. Otherwise returns a formatted block for
 * system prompt injection:
 *   "## Your Writing Voice\n\n{compiledTruth}"
 */
export function voiceProfileBlock(md: string | null | undefined): string {
  if (!md) return "";

  let parsed: VoiceProfileParts;
  try {
    parsed = parseVoiceProfile(md);
  } catch {
    return "";
  }

  const truth = parsed.compiledTruth;

  // Strip out lines that are the default placeholder so empty profiles return ""
  const meaningful = truth
    .split("\n")
    .filter(
      (line) =>
        line.trim() !== "" &&
        line.trim() !== "- (empty until first reflection — composer ignores empty section)",
    )
    .join("\n");

  if (!meaningful) return "";

  // Use `meaningful` (placeholder-filtered lines) rather than the raw `truth`
  // so the placeholder line is never included in the returned block.
  return `## Your Writing Voice\n\n${meaningful}\n`;
}

// ---------------------------------------------------------------------------
// appendTimelineEntry
// ---------------------------------------------------------------------------

/**
 * Prepends a ### block under ## Timeline, bumps approval_count or skip_count,
 * and refreshes last_updated to dateIso.
 */
export function appendTimelineEntry(md: string, entry: TimelineEntry): string {
  const parsed = parseVoiceProfile(md);

  // Build the new entry block
  const editedSuffix = entry.wasEdited ? " (edited)" : "";
  const heading = `### ${entry.dateIso} — ${entry.triggerType} ${entry.action}${editedSuffix}`;
  const lines: string[] = [heading];
  if (entry.original !== undefined) lines.push(`- Original: ${entry.original}`);
  if (entry.final !== undefined) lines.push(`- Final: ${entry.final}`);
  if (entry.editType !== undefined) lines.push(`- Edit type: ${entry.editType}`);
  if (entry.reason !== undefined) lines.push(`- Reason: ${entry.reason}`);
  const newBlock = lines.join("\n") + "\n";

  // Prepend entry into timeline (newest first)
  const newTimeline = newBlock + (parsed.timeline.startsWith("\n") ? parsed.timeline : "\n" + parsed.timeline);

  // Bump counters
  const fm = { ...parsed.frontmatter };
  if (entry.action === "approved") {
    fm.approval_count += 1;
  } else {
    fm.skip_count += 1;
  }
  fm.last_updated = entry.dateIso;

  return serializeVoiceProfile({
    frontmatter: fm,
    compiledTruth: parsed.compiledTruth,
    timeline: newTimeline,
  });
}

// ---------------------------------------------------------------------------
// trimTimeline
// ---------------------------------------------------------------------------

const DEFAULT_MAX_ENTRIES = 50;

/**
 * Drops the oldest ### blocks past the cap.
 * Timeline entries are delimited by "### " at the start of a line.
 */
export function trimTimeline(md: string, maxEntries: number = DEFAULT_MAX_ENTRIES): string {
  // Guard against 0 (or negative) caps — treat them as 1 to avoid silently
  // dropping every entry.
  maxEntries = Math.max(1, maxEntries);
  const parsed = parseVoiceProfile(md);
  const timeline = parsed.timeline;

  // Split timeline into entry blocks. Each entry starts with "### " at BOL.
  // We split in a way that keeps the "### " delimiter with each block.
  const parts = timeline.split(/^(?=### )/m);

  // parts[0] may be a leading newline/whitespace before the first entry
  const leading = parts[0].match(/^### /) ? "" : parts[0];
  const entries = parts[0].match(/^### /) ? parts : parts.slice(1);

  if (entries.length <= maxEntries) return md;

  // Keep the first maxEntries (newest — they are prepended)
  const kept = entries.slice(0, maxEntries);
  const newTimeline = leading + kept.join("");

  return serializeVoiceProfile({
    frontmatter: parsed.frontmatter,
    compiledTruth: parsed.compiledTruth,
    timeline: newTimeline,
  });
}
