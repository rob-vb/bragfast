import Anthropic from "@anthropic-ai/sdk";
import type { ObjectModification } from "../types";

const anthropic = new Anthropic();

type TemplateObjectSlot = {
  id: string;
  type: "text" | "image" | "logo";
};

type AnalysisInput = {
  releaseName: string;
  releaseTag: string;
  releaseBody: string;
  templateObjects: TemplateObjectSlot[];
  maxSlides: number;
};

type AnalysisResult = {
  slides: Array<{ objects: ObjectModification[] }>;
};

export function buildAnalysisPrompt(input: AnalysisInput): {
  systemMessage: string;
  userMessage: string;
} {
  const textSlots = input.templateObjects
    .filter((o) => o.type === "text")
    .map((o) => `- "${o.id}" (text)`)
    .join("\n");
  const imageSlots = input.templateObjects
    .filter((o) => o.type === "image")
    .map((o) => `- "${o.id}" (image)`)
    .join("\n");

  const systemMessage = `You fill template slots for social media images that announce software releases.
You output JSON only. No markdown, no explanation.

Output format:
{
  "slides": [
    {
      "objects": [
        { "id": "<slot_id>", "text": "content" },
        { "id": "<slot_id>", "image_url": "https://..." }
      ]
    }
  ]
}

Rules:
- For text slots: write concise, marketing-friendly copy. Not raw changelogs.
- "title" slot: catchy headline, not just the version number. 5-10 words max.
- "description" slot: write a clear, benefit-focused description. Use \\n for line breaks. For multiple points, use a bullet list like "• Point one\\n• Point two\\n• Point three". Keep each bullet under 10 words.
- For image slots: only fill if you find image URLs in the release body (markdown ![alt](url) syntax). Otherwise omit the slot.
- You have up to ${input.maxSlides} slide(s). ${input.maxSlides > 1 ? `IMPORTANT: Use multiple slides when the release has enough content. Spread key points across slides — one main idea per slide is better than cramming everything into one. Each slide should feel like its own announcement.` : "Use exactly 1 slide."}
- Each slide must include at least the "title" object.
- Do NOT include "logo" slots — those are auto-filled.`;

  const userMessage = `Release: "${input.releaseName}" (tag: ${input.releaseTag})

Available template slots:
${textSlots}
${imageSlots || "(no image slots)"}

Max slides: ${input.maxSlides}

Release body:
---
${input.releaseBody || "(empty)"}
---

Generate the slides JSON.`;

  return { systemMessage, userMessage };
}

export function parseAnalysisResponse(
  text: string,
  maxSlides?: number
): AnalysisResult {
  try {
    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");

    const parsed = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed.slides) || parsed.slides.length === 0) {
      throw new Error("No slides in response");
    }

    let slides = parsed.slides.map((slide: { objects?: Array<Record<string, string>> }) => ({
      objects: (slide.objects ?? [])
        .filter((obj: Record<string, string>) => typeof obj.id === "string" && obj.id.length > 0)
        .map((obj: Record<string, string>) => {
          const mod: ObjectModification = { id: obj.id };
          if (obj.text) mod.text = obj.text;
          if (obj.image_url) mod.image_url = obj.image_url;
          return mod;
        }),
    }));

    if (maxSlides && slides.length > maxSlides) {
      slides = slides.slice(0, maxSlides);
    }

    return { slides };
  } catch {
    // Fallback: single slide with release name as title
    return {
      slides: [
        {
          objects: [{ id: "title", text: "New Release" }],
        },
      ],
    };
  }
}

export async function analyzeRelease(input: AnalysisInput): Promise<AnalysisResult> {
  const { systemMessage, userMessage } = buildAnalysisPrompt(input);

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemMessage,
      messages: [{ role: "user", content: userMessage }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    return parseAnalysisResponse(text, input.maxSlides);
  } catch (err) {
    console.error("AI analysis failed, using fallback:", err);
    // Fallback: use release name as title, stripped body as description
    const title = input.releaseName || input.releaseTag;
    const description = input.releaseBody
      ? input.releaseBody.slice(0, 197) + (input.releaseBody.length > 200 ? "..." : "")
      : "";
    return {
      slides: [
        {
          objects: [
            { id: "title", text: title },
            ...(description ? [{ id: "description", text: description }] : []),
          ],
        },
      ],
    };
  }
}
