import { z } from "zod";
import { callHaikuJson } from "../haiku-call";

/**
 * One Haiku call at webhook time: a feed summary (what visual to make) plus
 * brag-worthiness. Does not compose post copy — that happens on Brag (deferred).
 */
export type SurfaceTriggerInput = {
  type: "pr_merged";
  title: string;
  body: string;
  repoFullName: string;
};

export type SurfaceTriggerResult = {
  summary: string;
  confidence: number;
};

const SurfaceSchema = z.object({
  summary: z.string().transform((s) => s.slice(0, 280)),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .catch(0)
    .default(0),
});

const SYSTEM = `You help an indie maker decide whether a merged pull request is worth bragging about.

Output JSON only: {"summary": "...", "confidence": 0.0-1.0}. No markdown.

summary: One sentence telling the user what branded visual to make in the Kitchen (e.g. "Screenshot the new settings page — you shipped dark mode"). Mention the user-facing win, not implementation details. No post copy, no hashtags.

confidence (brag-worthiness, 0..1, two decimals):
- 0.85+ → clear user-facing feature ship or milestone.
- 0.55–0.85 → real change but niche, internal, or thin context.
- 0.30–0.55 → polish, deps, refactors, minor fixes.
- < 0.30 → CI, formatting, docs-only, lint.
Score conservatively.`;

export function fallbackSurfaceTrigger(input: SurfaceTriggerInput): SurfaceTriggerResult {
  const title = input.title.trim() || "Merged change";
  return {
    summary: `Turn "${title}" into a branded visual — merged in ${input.repoFullName}.`,
    confidence: 0.35,
  };
}

export async function surfaceTrigger(
  input: SurfaceTriggerInput,
): Promise<SurfaceTriggerResult> {
  const user = `Repo: ${input.repoFullName}
PR title: ${input.title}
PR body:
${(input.body || "(empty)").slice(0, 1200)}`;

  const fallback = fallbackSurfaceTrigger(input);
  const result = await callHaikuJson({
    system: SYSTEM,
    user,
    schema: SurfaceSchema,
    fallback,
    maxTokens: 200,
  });
  if (result.summary.trim().length > 0) {
    return result;
  }
  return fallback;
}
