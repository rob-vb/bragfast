import { z } from "zod";
import { callHaikuText } from "../haiku-call";

export type TemplateId =
  | "standard-browser"
  | "standard-mobile"
  | "split-browser"
  | "split-mobile"
  | "hero";

export const TEMPLATE_IDS: readonly TemplateId[] = [
  "standard-browser",
  "standard-mobile",
  "split-browser",
  "split-mobile",
  "hero",
] as const;

export type PickTemplateInput = {
  milestoneKey: string;
  prContext?: { title: string; body: string };
};

export type PickTemplateResult = {
  templateId: TemplateId;
  reason: "rule" | "haiku" | "haiku-fallback";
  debug?: { matchedKeyword?: string; rule?: string };
};

const MOBILE_KEYWORDS =
  /\b(ios|iphone|ipad|android|react native|mobile app|mobile|swift|kotlin)\b/i;
const WEB_KEYWORDS =
  /\b(web|browser|desktop|landing page|website|chrome|firefox|safari)\b/i;

const LONG_BODY_THRESHOLD = 120;

// Returns a templateId when rules can decide, or null for "ambiguous" (triggers Haiku fallback).
export function pickTemplateByRules(
  input: PickTemplateInput,
): PickTemplateResult | { templateId: null; reason: "ambiguous" } {
  const key = input.milestoneKey;

  if (key.startsWith("mrr:"))
    return { templateId: "hero", reason: "rule", debug: { rule: "mrr:*" } };
  if (key === "first_sale")
    return { templateId: "hero", reason: "rule", debug: { rule: "first_sale" } };
  if (key.startsWith("visitors:"))
    return {
      templateId: "hero",
      reason: "rule",
      debug: { rule: "visitors:*" },
    };
  if (key.startsWith("ga:"))
    return { templateId: "hero", reason: "rule", debug: { rule: "ga:*" } };
  if (key.startsWith("star:"))
    return { templateId: "hero", reason: "rule", debug: { rule: "star:*" } };

  if (key.startsWith("pr_merged:")) {
    if (!input.prContext) {
      throw new Error("prContext required for pr_merged milestone");
    }
    const { title, body } = input.prContext;
    const haystack = `${title} ${body}`;
    const mobileMatch = haystack.match(MOBILE_KEYWORDS);
    const webMatch = haystack.match(WEB_KEYWORDS);

    if (mobileMatch && webMatch) {
      return { templateId: null, reason: "ambiguous" };
    }

    const mobile = !!mobileMatch;
    const long = body.length >= LONG_BODY_THRESHOLD;
    const templateId = (
      long
        ? mobile
          ? "split-mobile"
          : "split-browser"
        : mobile
          ? "standard-mobile"
          : "standard-browser"
    ) as TemplateId;

    return {
      templateId,
      reason: "rule",
      debug: {
        rule: `pr_merged:${long ? "split" : "standard"}-${mobile ? "mobile" : "browser"}`,
        matchedKeyword: mobileMatch?.[0] ?? webMatch?.[0],
      },
    };
  }

  // Unknown milestone key — delegate to Haiku.
  return { templateId: null, reason: "ambiguous" };
}

const TemplateIdSchema = z.object({
  templateId: z.enum([
    "standard-browser",
    "standard-mobile",
    "split-browser",
    "split-mobile",
    "hero",
  ]),
});

export async function pickTemplate(
  input: PickTemplateInput,
): Promise<PickTemplateResult> {
  const ruleResult = pickTemplateByRules(input);
  if (ruleResult.templateId !== null) {
    return ruleResult as PickTemplateResult;
  }

  // Haiku fallback
  const system = `You pick the best brag.fast canvas template for a social media post.

Templates:
- standard-browser: desktop/browser feature screenshot, short-to-medium text.
- standard-mobile: mobile app screenshot in phone frame, short-to-medium text.
- split-browser: text-heavy post alongside a desktop screenshot.
- split-mobile: text-heavy post alongside a mobile screenshot.
- hero: big-number announcement, full-bleed background image at 60% opacity, no screenshot frame.

Output JSON only: {"templateId": "<one of the five>"}`;

  const user = `Milestone: ${input.milestoneKey}
${input.prContext ? `PR title: ${input.prContext.title}\nPR body: ${input.prContext.body.slice(0, 600)}` : ""}
Pick the single best template.`;

  try {
    const text = await callHaikuText({ system, user, maxTokens: 128 });
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = TemplateIdSchema.safeParse(JSON.parse(match[0]));
      if (parsed.success) {
        return { templateId: parsed.data.templateId, reason: "haiku" };
      }
    }
  } catch {
    // fall through to fallback
  }
  return { templateId: "standard-browser", reason: "haiku-fallback" };
}
