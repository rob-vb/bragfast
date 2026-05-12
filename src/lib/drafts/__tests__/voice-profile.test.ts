import { describe, it, expect } from "vitest";
import {
  DEFAULT_VOICE_PROFILE_MD,
  parseVoiceProfile,
  serializeVoiceProfile,
  voiceProfileBlock,
  appendTimelineEntry,
  trimTimeline,
} from "../voice-profile";

// ---------------------------------------------------------------------------
// parseVoiceProfile / serializeVoiceProfile round-trip
// ---------------------------------------------------------------------------

describe("parseVoiceProfile / serializeVoiceProfile round-trip", () => {
  const sample = `---
last_updated: 2026-05-04T12:00:00Z
last_reflected: 2026-05-01T09:00:00Z
approval_count: 14
skip_count: 6
---

## Compiled Truth

- Prefers punchy headlines
- Avoids hype words

## Timeline

### 2026-05-04 — pr_merged approved (edited)
- Original: Add learning system — Drafts now learn from edits
- Final: Bragfast learns your voice — Each approval teaches the AI
- Edit type: both
`;

  it("parses frontmatter scalars correctly", () => {
    const parsed = parseVoiceProfile(sample);
    expect(parsed.frontmatter.last_updated).toBe("2026-05-04T12:00:00Z");
    expect(parsed.frontmatter.last_reflected).toBe("2026-05-01T09:00:00Z");
    expect(parsed.frontmatter.approval_count).toBe(14);
    expect(parsed.frontmatter.skip_count).toBe(6);
  });

  it("extracts compiledTruth content", () => {
    const parsed = parseVoiceProfile(sample);
    expect(parsed.compiledTruth).toContain("Prefers punchy headlines");
    expect(parsed.compiledTruth).toContain("Avoids hype words");
  });

  it("extracts timeline content", () => {
    const parsed = parseVoiceProfile(sample);
    expect(parsed.timeline).toContain("### 2026-05-04 — pr_merged approved (edited)");
    expect(parsed.timeline).toContain("- Original: Add learning system");
  });

  it("serialize(parse(md)) equals the original", () => {
    const parsed = parseVoiceProfile(sample);
    const reserialized = serializeVoiceProfile(parsed);
    expect(reserialized).toBe(sample);
  });

  it("round-trips the default profile", () => {
    const parsed = parseVoiceProfile(DEFAULT_VOICE_PROFILE_MD);
    const reserialized = serializeVoiceProfile(parsed);
    expect(reserialized).toBe(DEFAULT_VOICE_PROFILE_MD);
  });
});

// ---------------------------------------------------------------------------
// appendTimelineEntry
// ---------------------------------------------------------------------------

describe("appendTimelineEntry — approved with edits", () => {
  it("prepends entry at the top of timeline", () => {
    const md = DEFAULT_VOICE_PROFILE_MD;
    const result = appendTimelineEntry(md, {
      dateIso: "2026-05-10T08:00:00Z",
      triggerType: "pr_merged",
      action: "approved",
      wasEdited: true,
      original: "Ship it",
      final: "We shipped a thing",
      editType: "both",
    });
    const parsed = parseVoiceProfile(result);
    // Timeline should start with the new entry
    expect(parsed.timeline.trimStart()).toMatch(
      /^### 2026-05-10T08:00:00Z — pr_merged approved \(edited\)/,
    );
  });

  it("increments approval_count", () => {
    const md = DEFAULT_VOICE_PROFILE_MD;
    const before = parseVoiceProfile(md).frontmatter.approval_count;
    const result = appendTimelineEntry(md, {
      dateIso: "2026-05-10T08:00:00Z",
      triggerType: "pr_merged",
      action: "approved",
      wasEdited: false,
    });
    const after = parseVoiceProfile(result).frontmatter.approval_count;
    expect(after).toBe(before + 1);
  });

  it("refreshes last_updated to dateIso", () => {
    const result = appendTimelineEntry(DEFAULT_VOICE_PROFILE_MD, {
      dateIso: "2026-05-10T08:00:00Z",
      triggerType: "pr_merged",
      action: "approved",
      wasEdited: false,
    });
    expect(parseVoiceProfile(result).frontmatter.last_updated).toBe(
      "2026-05-10T08:00:00Z",
    );
  });

  it("includes Original/Final/EditType lines when present", () => {
    const result = appendTimelineEntry(DEFAULT_VOICE_PROFILE_MD, {
      dateIso: "2026-05-10T08:00:00Z",
      triggerType: "mrr",
      action: "approved",
      wasEdited: true,
      original: "Old title",
      final: "New title",
      editType: "title",
    });
    const parsed = parseVoiceProfile(result);
    expect(parsed.timeline).toContain("- Original: Old title");
    expect(parsed.timeline).toContain("- Final: New title");
    expect(parsed.timeline).toContain("- Edit type: title");
  });

  it("omits optional lines when not provided", () => {
    const result = appendTimelineEntry(DEFAULT_VOICE_PROFILE_MD, {
      dateIso: "2026-05-10T08:00:00Z",
      triggerType: "mrr",
      action: "approved",
      wasEdited: false,
    });
    const parsed = parseVoiceProfile(result);
    expect(parsed.timeline).not.toContain("- Original:");
    expect(parsed.timeline).not.toContain("- Final:");
    expect(parsed.timeline).not.toContain("- Edit type:");
  });
});

describe("appendTimelineEntry — skipped with reason", () => {
  it("increments skip_count", () => {
    const before = parseVoiceProfile(DEFAULT_VOICE_PROFILE_MD).frontmatter.skip_count;
    const result = appendTimelineEntry(DEFAULT_VOICE_PROFILE_MD, {
      dateIso: "2026-05-11T10:00:00Z",
      triggerType: "first_sale",
      action: "skipped",
      wasEdited: false,
      reason: "Not worth posting",
    });
    const after = parseVoiceProfile(result).frontmatter.skip_count;
    expect(after).toBe(before + 1);
  });

  it("does not increment approval_count on skip", () => {
    const before = parseVoiceProfile(DEFAULT_VOICE_PROFILE_MD).frontmatter.approval_count;
    const result = appendTimelineEntry(DEFAULT_VOICE_PROFILE_MD, {
      dateIso: "2026-05-11T10:00:00Z",
      triggerType: "first_sale",
      action: "skipped",
      wasEdited: false,
      reason: "Not worth posting",
    });
    const after = parseVoiceProfile(result).frontmatter.approval_count;
    expect(after).toBe(before);
  });

  it("includes reason line in entry", () => {
    const result = appendTimelineEntry(DEFAULT_VOICE_PROFILE_MD, {
      dateIso: "2026-05-11T10:00:00Z",
      triggerType: "first_sale",
      action: "skipped",
      wasEdited: false,
      reason: "Not worth posting",
    });
    const parsed = parseVoiceProfile(result);
    expect(parsed.timeline).toContain("- Reason: Not worth posting");
  });

  it("entry heading does not include (edited) when wasEdited=false", () => {
    const result = appendTimelineEntry(DEFAULT_VOICE_PROFILE_MD, {
      dateIso: "2026-05-11T10:00:00Z",
      triggerType: "first_sale",
      action: "skipped",
      wasEdited: false,
    });
    const parsed = parseVoiceProfile(result);
    expect(parsed.timeline).toContain(
      "### 2026-05-11T10:00:00Z — first_sale skipped",
    );
    expect(parsed.timeline).not.toContain("(edited)");
  });
});

// ---------------------------------------------------------------------------
// trimTimeline
// ---------------------------------------------------------------------------

describe("trimTimeline", () => {
  function makeProfile(entryCount: number): string {
    let md = DEFAULT_VOICE_PROFILE_MD;
    for (let i = 0; i < entryCount; i++) {
      md = appendTimelineEntry(md, {
        dateIso: `2026-05-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
        triggerType: "pr_merged",
        action: "approved",
        wasEdited: false,
      });
    }
    return md;
  }

  it("keeps all entries when under the cap", () => {
    const md = makeProfile(3);
    const trimmed = trimTimeline(md, 5);
    const timeline = parseVoiceProfile(trimmed).timeline;
    const count = (timeline.match(/^### /gm) ?? []).length;
    expect(count).toBe(3);
  });

  it("drops oldest entries past the cap", () => {
    // Build 5 entries, cap at 3 — should drop 2 oldest
    const md = makeProfile(5);
    const trimmed = trimTimeline(md, 3);
    const timeline = parseVoiceProfile(trimmed).timeline;
    const count = (timeline.match(/^### /gm) ?? []).length;
    expect(count).toBe(3);
  });

  it("retains the newest entries (not the oldest)", () => {
    // Entries are prepended so the newest is at the top.
    // After making 5 entries the dates are: 05, 04, 03, 02, 01 (top to bottom)
    const md = makeProfile(5);
    const trimmed = trimTimeline(md, 3);
    const timeline = parseVoiceProfile(trimmed).timeline;
    // The three newest should be 05, 04, 03
    expect(timeline).toContain("2026-05-05T00:00:00Z");
    expect(timeline).toContain("2026-05-04T00:00:00Z");
    expect(timeline).toContain("2026-05-03T00:00:00Z");
    // The two oldest should be gone
    expect(timeline).not.toContain("2026-05-02T00:00:00Z");
    expect(timeline).not.toContain("2026-05-01T00:00:00Z");
  });

  it("default cap is 50", () => {
    // Implicitly checks that 50 entries are kept but 51st is not
    const md = makeProfile(51);
    const trimmed = trimTimeline(md);
    const timeline = parseVoiceProfile(trimmed).timeline;
    const count = (timeline.match(/^### /gm) ?? []).length;
    expect(count).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// voiceProfileBlock
// ---------------------------------------------------------------------------

describe("voiceProfileBlock", () => {
  it("returns '' for null", () => {
    expect(voiceProfileBlock(null)).toBe("");
  });

  it("returns '' for undefined", () => {
    expect(voiceProfileBlock(undefined)).toBe("");
  });

  it("returns '' for empty string", () => {
    expect(voiceProfileBlock("")).toBe("");
  });

  it("returns '' when Compiled Truth is empty/whitespace", () => {
    // DEFAULT_VOICE_PROFILE_MD has an empty Compiled Truth
    expect(voiceProfileBlock(DEFAULT_VOICE_PROFILE_MD)).toBe("");
  });

  it("returns formatted block when Compiled Truth has content", () => {
    const md = `---
last_updated: 2026-05-04T12:00:00Z
last_reflected: 2026-05-01T09:00:00Z
approval_count: 5
skip_count: 1
---

## Compiled Truth

- Prefers dry wit
- Short punchy headlines

## Timeline

`;
    const block = voiceProfileBlock(md);
    expect(block).toBe("## Your Writing Voice\n\n- Prefers dry wit\n- Short punchy headlines\n");
  });

  it("returns '' when Compiled Truth has only whitespace characters", () => {
    const md = `---
last_updated: 2026-05-04T12:00:00Z
last_reflected: 2026-05-01T09:00:00Z
approval_count: 0
skip_count: 0
---

## Compiled Truth



## Timeline

`;
    expect(voiceProfileBlock(md)).toBe("");
  });
});
