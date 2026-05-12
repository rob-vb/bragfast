"use node";

// Voice profile reflection — periodically distills the timeline into compiled truth bullets.
// Scheduled by appendTimelineInternal every 10 approvals/skips.

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { callHaikuText } from "../src/lib/haiku-call";
import {
  parseVoiceProfile,
  serializeVoiceProfile,
  trimTimeline,
} from "../src/lib/drafts/voice-profile";

export const runReflectionForUser = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    // 1. Read the current voice profile markdown.
    const md = await ctx.runQuery(
      internal.userProfiles.getVoiceProfileMdInternal,
      { userId },
    );

    // 2. Early return: no profile at all.
    if (!md) return;

    // 3. Parse and early return if timeline is empty.
    let parsed;
    try {
      parsed = parseVoiceProfile(md);
    } catch {
      return;
    }

    if (!parsed.timeline.trim()) return;

    // 4. Build the prompt.
    const currentTruth = parsed.compiledTruth.trim() || "(none yet)";
    const userPrompt = `Current rules (only add or remove with strong evidence):\n${currentTruth}\n\nTimeline of edits and decisions:\n${parsed.timeline}`;

    // 5. Call Haiku to distill the timeline into bullets.
    let haikuResponse: string;
    try {
      haikuResponse = await callHaikuText({
        system:
          "You are distilling a user's writing style from their edit history. Output 5-10 specific, actionable bullets (e.g. '- Prefers active voice', '- Skips refactor announcements'). Be concrete, not generic. Don't invent rules not evidenced by the timeline. Use markdown list format with - dashes, not numbers.",
        user: userPrompt,
        maxTokens: 512,
      });
    } catch (err) {
      console.warn("[voiceProfileReflection] Haiku call failed:", err);
      return;
    }

    // 6. Extract bullet lines (lines starting with "- " or "* ").
    const bullets = haikuResponse
      .split("\n")
      .filter((line) => /^[-*] /.test(line.trim()))
      .map((line) => line.trim());

    // 7. If fewer than 2 bullets, don't update.
    if (bullets.length < 2) {
      console.warn(
        "[voiceProfileReflection] Too few bullets from Haiku, skipping update.",
      );
      return;
    }

    // 8. Replace the Compiled Truth section with the new bullets.
    const newCompiledTruth = "\n" + bullets.join("\n") + "\n\n";
    const updatedMd = serializeVoiceProfile({
      frontmatter: {
        ...parsed.frontmatter,
        last_updated: new Date().toISOString(),
        last_reflected: new Date().toISOString(),
      },
      compiledTruth: newCompiledTruth,
      timeline: parsed.timeline,
    });

    // 9. Trim timeline to max 50 entries.
    const finalMd = trimTimeline(updatedMd, 50);

    // 10. Persist the updated profile.
    await ctx.runMutation(internal.userProfiles.setVoiceProfileMdInternal, {
      userId,
      md: finalMd,
    });

    // 11. Stamp the reflection timestamp.
    await ctx.runMutation(
      internal.userProfiles.stampVoiceProfileReflectedAt,
      { userId },
    );
  },
});
