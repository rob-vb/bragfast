import { slidesSchema } from "../validation/object-modifications";
import type { ObjectModification } from "../types";
import { callHaikuJson } from "./haiku-call";

type TemplateSlot = {
  id: string;
  type: "text" | "visual" | "logo";
  maxLines?: number;
};

export type GenerateSlideContentInput = {
  draftCopy: string;        // the drafted tweet; feeds tone + "title" slot
  commitMessage: string;    // raw commit context
  templateSlots: TemplateSlot[];
};

export type GenerateSlideContentResult = {
  objects: ObjectModification[];
};

function buildPrompt(input: GenerateSlideContentInput): { systemPrompt: string; userPrompt: string } {
  const textSlots = input.templateSlots
    .filter((s) => s.type === "text")
    .map((s) => `- "${s.id}"${s.maxLines ? ` (fits ~${s.maxLines} line${s.maxLines > 1 ? "s" : ""})` : ""}`)
    .join("\n");

  const systemPrompt = `You fill template slots for a social media image that announces a single ship. You output JSON only.

Output format:
{ "slides": [ { "objects": [ { "id": "slot_id", "text": "content" } ] } ] }

Rules:
- Output exactly 1 slide.
- Every slide MUST include a "title" object.
- "title" slot: short, punchy, 5-10 words. Name the capability, not hype.
- Other text slots: write for the slot's line limit. One-line slots get one punchy sentence. Multi-line slots can use "• point\\n• point" bullets.
- NEVER fill "logo" slots (auto-filled).
- Do NOT repeat the full tweet copy verbatim; adapt the message to each slot's role.`;

  const userPrompt = `Draft tweet: "${input.draftCopy}"
Commit context: "${input.commitMessage.slice(0, 300)}"

Available text slots:
${textSlots || "(no text slots)"}

Output JSON.`;

  return { systemPrompt, userPrompt };
}

export async function generateSlideContent(
  input: GenerateSlideContentInput,
): Promise<GenerateSlideContentResult> {
  const { systemPrompt, userPrompt } = buildPrompt(input);

  const validSlotIds = new Set(input.templateSlots.filter((s) => s.type !== "logo").map((s) => s.id));

  const result = await callHaikuJson({
    systemPrompt,
    userPrompt,
    validator: slidesSchema,
    maxTokens: 768,
    fallback: () => ({
      slides: [
        {
          objects: [{ id: "title", text: input.draftCopy.slice(0, 80) }],
        },
      ],
    }),
  });

  // Drop any object whose id isn't a real slot in the chosen template.
  // Haiku occasionally invents slot names; we clamp here rather than render garbage.
  const slide = result.slides[0];
  const objects = slide.objects.filter((obj) => validSlotIds.has(obj.id));

  // Ensure title always present — fallback to draftCopy if Haiku omitted it.
  if (!objects.some((o) => o.id === "title") && validSlotIds.has("title")) {
    objects.unshift({ id: "title", text: input.draftCopy.slice(0, 80) });
  }

  return { objects };
}
