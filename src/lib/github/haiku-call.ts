import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";

const anthropic = new Anthropic();

export const HAIKU_MODEL = "claude-haiku-4-5-20251001";

export type HaikuCallOptions<T> = {
  systemPrompt: string;
  userPrompt: string;
  validator: z.ZodType<T>;
  maxTokens?: number;
  // Called when everything fails (parse, validation, API error).
  // Return a valid T or throw to bubble up.
  fallback?: () => T;
};

export class HaikuCallError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
    public readonly rawResponse?: string,
  ) {
    super(message);
    this.name = "HaikuCallError";
  }
}

// Extracts the first JSON object from a free-form Haiku response.
// Haiku sometimes wraps JSON in ```json fences; this tolerates both.
function extractJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in response");
  return JSON.parse(match[0]);
}

/**
 * Shared wrapper around Anthropic SDK for Haiku-backed JSON prompts.
 * Handles: model config, JSON extraction, Zod validation, structured logging.
 * Falls back via `options.fallback` on any failure if provided.
 */
export async function callHaikuJson<T>(options: HaikuCallOptions<T>): Promise<T> {
  const { systemPrompt, userPrompt, validator, maxTokens = 1024, fallback } = options;

  let rawText = "";
  try {
    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const first = response.content[0];
    rawText = first && first.type === "text" ? first.text : "";

    const parsed = extractJson(rawText);
    const validated = validator.parse(parsed);
    return validated;
  } catch (err) {
    if (fallback) {
      console.error("[haiku-call] failure, using fallback:", err, { rawText });
      return fallback();
    }
    throw new HaikuCallError(
      err instanceof Error ? err.message : "Haiku call failed",
      err,
      rawText,
    );
  }
}
