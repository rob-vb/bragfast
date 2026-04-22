import { z } from "zod";
import { callHaikuJson } from "../haiku-call";

export interface SocialCopy {
  twitter: string;
  linkedin: string;
}

const SocialCopySchema = z.object({
  twitter: z.string().transform((s) => s.slice(0, 280)),
  linkedin: z.string().transform((s) => s.slice(0, 500)),
});

export async function generateSocialCopy(input: {
  releaseName: string;
  releaseTag: string;
  releaseBody: string;
  brandName?: string;
}): Promise<SocialCopy> {
  const systemMessage = `You generate social media post drafts for software release announcements.
Output JSON only. No markdown, no explanation.

Output format:
{
  "twitter": "tweet text here (max 280 chars, include relevant emoji, make it punchy)",
  "linkedin": "linkedin post here (max 500 chars, professional but enthusiastic tone, can use line breaks)"
}

Rules:
- Twitter: punchy, emoji-friendly, under 280 chars. Include the version if available.
- LinkedIn: professional but enthusiastic, can be longer (up to 500 chars), use line breaks for readability.
- Both: focus on benefits, not just features. Make it sound exciting.
- Do NOT use hashtags excessively (max 2-3 for Twitter, 3-5 for LinkedIn).
- Do NOT include placeholder URLs or links.`;

  const userMessage = `Release: "${input.releaseName}" (tag: ${input.releaseTag})
${input.brandName ? `Brand: ${input.brandName}` : ""}

Release notes:
---
${input.releaseBody || "(empty)"}
---

Generate the social copy JSON.`;

  return callHaikuJson({
    system: systemMessage,
    user: userMessage,
    schema: SocialCopySchema,
    fallback: { twitter: "", linkedin: "" },
    maxTokens: 512,
  });
}
