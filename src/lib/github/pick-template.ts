import { z } from "zod";
import { callHaikuJson } from "./haiku-call";

export type TemplateCandidate = {
  id: string;          // externalId, e.g. "split-browser" or "tmpl_abc123"
  name: string;
  tags?: string[];
  description?: string;
};

export type PickTemplateInput = {
  draftCopy: string;
  candidates: TemplateCandidate[];
  availableFormats: Array<"landscape" | "square" | "portrait">;
};

const resultSchema = z.object({
  templateId: z.string(),
  format: z.enum(["landscape", "square", "portrait"]),
  reasoning: z.string().optional(),
});

export type PickTemplateResult = z.infer<typeof resultSchema>;

const FALLBACK_TEMPLATE_ID = "split-browser";

function buildPrompt(input: PickTemplateInput): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You pick the best template for a brag post.

You receive:
- drafted Twitter copy (<=280 chars)
- a list of candidate templates with tags + descriptions
- available formats

You output JSON only. No commentary.

Schema:
{
  "templateId": "<id from candidates>",
  "format": "landscape" | "square" | "portrait",
  "reasoning": "one short sentence"
}

Rules:
- Pick ONLY from the provided candidate IDs. Do not invent.
- Pick ONLY from the provided available formats.
- Prefer "landscape" for feature announcements and mobile screenshots-that-aren't.
- Prefer "portrait" for mobile-specific content.
- Prefer "hero" or similar templates with prominent visuals when the draft leads with a visual.
- Fall back to the first candidate if nothing clearly fits.`;

  const candidateLines = input.candidates
    .map((c) => {
      const tags = c.tags?.length ? ` [${c.tags.join(", ")}]` : "";
      const desc = c.description ? ` — ${c.description}` : "";
      return `- ${c.id}: ${c.name}${tags}${desc}`;
    })
    .join("\n");

  const userPrompt = `Draft copy:
"${input.draftCopy}"

Candidate templates:
${candidateLines}

Available formats: ${input.availableFormats.join(", ")}

Pick one. Output JSON.`;

  return { systemPrompt, userPrompt };
}

export async function pickTemplate(input: PickTemplateInput): Promise<PickTemplateResult> {
  const candidateIds = new Set(input.candidates.map((c) => c.id));
  const fallbackId = candidateIds.has(FALLBACK_TEMPLATE_ID)
    ? FALLBACK_TEMPLATE_ID
    : input.candidates[0]?.id;

  if (!fallbackId) {
    throw new Error("pickTemplate: no candidate templates provided");
  }

  const fallbackFormat = input.availableFormats.includes("landscape")
    ? "landscape"
    : input.availableFormats[0];

  const { systemPrompt, userPrompt } = buildPrompt(input);
  const result = await callHaikuJson({
    systemPrompt,
    userPrompt,
    validator: resultSchema,
    maxTokens: 256,
    fallback: () => ({
      templateId: fallbackId,
      format: fallbackFormat,
      reasoning: "fallback: Haiku call failed",
    }),
  });

  // Guard: Haiku may hallucinate a template ID or format that isn't in the candidates.
  // Clamp to valid values instead of failing the whole draft pipeline.
  if (!candidateIds.has(result.templateId)) {
    return { ...result, templateId: fallbackId, reasoning: "fallback: invalid templateId from Haiku" };
  }
  if (!input.availableFormats.includes(result.format)) {
    return { ...result, format: fallbackFormat, reasoning: "fallback: invalid format from Haiku" };
  }
  return result;
}
