import Anthropic from "@anthropic-ai/sdk";
import type { ZodTypeAny, z } from "zod";

// Shared Claude Haiku wrapper. Two primitives:
//   callHaikuText — run a prompt, return the raw content text. Throws on SDK error.
//   callHaikuJson — run a prompt, validate the JSON output against a Zod schema,
//                   return typed data. Returns the caller-supplied fallback on any
//                   failure (SDK error, no JSON found, malformed JSON, schema mismatch).
//
// Model pinned to claude-haiku-4-5-20251001 — bump here when moving versions.

const MODEL = "claude-haiku-4-5-20251001";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export type HaikuTextInput = {
  system: string;
  user: string;
  maxTokens?: number;
};

export async function callHaikuText(input: HaikuTextInput): Promise<string> {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: input.maxTokens ?? 1024,
    system: input.system,
    messages: [{ role: "user", content: input.user }],
  });
  const first = response.content[0];
  return first && first.type === "text" ? first.text : "";
}

export type HaikuJsonInput<T extends ZodTypeAny> = HaikuTextInput & {
  schema: T;
  fallback: z.infer<T>;
};

export async function callHaikuJson<T extends ZodTypeAny>(
  input: HaikuJsonInput<T>,
): Promise<z.infer<T>> {
  let text: string;
  try {
    text = await callHaikuText(input);
  } catch (err) {
    console.warn("[haiku-call] SDK error, using fallback:", err);
    return input.fallback;
  }

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    console.warn("[haiku-call] no JSON object found in Haiku response");
    return input.fallback;
  }

  let raw: unknown;
  try {
    raw = JSON.parse(match[0]);
  } catch (err) {
    console.warn("[haiku-call] JSON parse failed:", err);
    return input.fallback;
  }

  const result = input.schema.safeParse(raw);
  if (!result.success) {
    console.warn("[haiku-call] schema validation failed:", result.error.issues);
    return input.fallback;
  }
  return result.data;
}
