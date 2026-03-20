import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export interface SocialCopy {
  twitter: string;
  linkedin: string;
}

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

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: systemMessage,
      messages: [{ role: "user", content: userMessage }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      twitter:
        typeof parsed.twitter === "string" ? parsed.twitter.slice(0, 280) : "",
      linkedin:
        typeof parsed.linkedin === "string"
          ? parsed.linkedin.slice(0, 500)
          : "",
    };
  } catch (err) {
    console.error("Copy generation failed:", err);
    // Return empty copy on failure -- not critical
    return { twitter: "", linkedin: "" };
  }
}
