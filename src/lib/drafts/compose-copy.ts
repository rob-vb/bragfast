import { z } from "zod";
import { callHaikuJson } from "../haiku-call";

// Text-only draft copy for Sous-Chef. Keep this intentionally short:
// drafts are starting points for social cards, not changelog summaries.
//
// `confidence` ∈ [0, 1] — Haiku's self-rating for whether this trigger is
// worth posting about. Drafts with confidence < SUPPRESS_THRESHOLD get
// inserted in suppressed state and don't surface by default; the user can
// override on the drafts page. Fallbacks return 0.
export type Copy = { title: string; description: string; confidence: number };

export const SUPPRESS_THRESHOLD = 0.5;

export type Platform = "x" | "linkedin";
export const PLATFORMS: Platform[] = ["x", "linkedin"];
export type CopyByPlatform = Partial<
  Record<Platform, { title: string; description: string }>
>;

// S8.3: optional few-shot examples drawn from the user's recent approvals.
// Each example is the agent's original draft copy paired with the copy the
// user actually shipped. Injected into the system prompt to bias Haiku toward
// this user's voice without retraining.
export type ApprovalExample = {
  original: { title: string; description: string };
  edited: { title: string; description: string };
};

type PlatformOpt = {
  platform?: Platform;
  voicePreset?: VoicePreset | null;
  examples?: ApprovalExample[] | null;
};

export type ComposeCopyInput =
  | ({
      type: "pr_merged";
      title: string;
      body: string;
      repoFullName: string;
      brandName?: string;
      brandVoice?: string;
    } & PlatformOpt)
  | ({
      type: "mrr";
      threshold: number;
      brandName?: string;
      brandVoice?: string;
    } & PlatformOpt)
  | ({
      type: "first_sale";
      brandName?: string;
      brandVoice?: string;
    } & PlatformOpt)
  | ({
      type: "visitors";
      source: "posthog" | "ga4";
      threshold: number;
      brandName?: string;
      brandVoice?: string;
    } & PlatformOpt)
  | ({
      type: "star";
      repoFullName: string;
      threshold: number;
      brandName?: string;
      brandVoice?: string;
    } & PlatformOpt)
  | ({
      type: "total_revenue";
      threshold: number;
      brandName?: string;
      brandVoice?: string;
    } & PlatformOpt)
  | ({
      type: "subscribers";
      threshold: number;
      brandName?: string;
      brandVoice?: string;
    } & PlatformOpt);

const CopySchema = z.object({
  title: z.string().transform((s) => s.slice(0, 80)),
  description: z.string().transform((s) => s.slice(0, 220)),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .catch(0)
    .default(0),
});

function brandLine(input: {
  brandName?: string;
  brandVoice?: string;
  voicePreset?: VoicePreset | null;
}): string {
  const parts: string[] = [];
  if (input.brandName) parts.push(`Brand: ${input.brandName}`);
  if (input.brandVoice) parts.push(`Voice: ${input.brandVoice}`);
  const presetLine = voicePresetLine(input.voicePreset);
  if (presetLine) parts.push(presetLine);
  return parts.join("\n");
}

// S8.2: voice presets shape Haiku tone when no explicit brandVoice override.
export type VoicePreset =
  | "casual_builder"
  | "dry_technical"
  | "earnest_milestone"
  | "deadpan";

const VOICE_PRESET_GUIDE: Record<VoicePreset, string> = {
  casual_builder:
    "Tone: casual indie maker. First person, light humor, no corporate polish.",
  dry_technical:
    "Tone: dry and technical. State the change plainly, no exclamation, no celebration.",
  earnest_milestone:
    "Tone: earnest milestone. Sincere, brief gratitude, no false modesty.",
  deadpan:
    "Tone: deadpan. Minimal, slightly understated, factual. No emojis, no hype.",
};

export function voicePresetLine(preset: VoicePreset | null | undefined): string {
  return preset ? VOICE_PRESET_GUIDE[preset] : "";
}

const PLATFORM_GUIDE: Record<Platform, string> = {
  x: `Target platform: X (Twitter). Description should read like a tweet — punchy, conversational, no hashtags, fits in ~220 chars. Title doubles as the post hook.`,
  linkedin: `Target platform: LinkedIn. Description should read like a short LinkedIn post — slightly more reflective, can mention the journey or thanks, but still concise (1–2 short sentences, no hashtags, no buzzwords).`,
};

function platformLine(input: { platform?: Platform }): string {
  return input.platform ? PLATFORM_GUIDE[input.platform] : "";
}

// S8.3: render the few-shot block. Empty string when no examples — callers
// concat unconditionally without needing a guard.
export function examplesBlock(
  examples: ApprovalExample[] | null | undefined,
): string {
  if (!examples || examples.length === 0) return "";
  const lines = examples
    .slice(0, 3)
    .map((ex, i) => {
      const o = `${ex.original.title} — ${ex.original.description}`.trim();
      const e = `${ex.edited.title} — ${ex.edited.description}`.trim();
      return `Example ${i + 1}:\n  Agent draft: ${o}\n  User shipped: ${e}`;
    })
    .join("\n");
  return `Past approvals from this user (the user's edits show their voice — match it, don't copy verbatim):\n${lines}`;
}

/**
 * Compose copy for multiple platforms in parallel. Returns one Copy per
 * requested platform. Confidence is assumed equal across platforms — the
 * first platform's score is used as the canonical signal.
 */
export async function composeCopyByPlatform(
  base: ComposeCopyInput,
  platforms: Platform[],
): Promise<{ copies: CopyByPlatform; primary: Copy; primaryPlatform: Platform | null }> {
  if (platforms.length === 0) {
    const primary = await composeCopy(base);
    return { copies: {}, primary, primaryPlatform: null };
  }
  const results = await Promise.all(
    platforms.map((p) => composeCopy({ ...base, platform: p })),
  );
  const copies: CopyByPlatform = {};
  platforms.forEach((p, i) => {
    copies[p] = { title: results[i].title, description: results[i].description };
  });
  return {
    copies,
    primary: results[0],
    primaryPlatform: platforms[0],
  };
}

const BASE_SYSTEM = `You write short, honest brag posts for indie makers.
Output JSON only: {"title": "...", "description": "...", "confidence": 0.0-1.0}. No markdown.
Keep titles punchy (one line, usually 3-6 words). Description is usually one short sentence, two only when needed.
Pick the one thing worth announcing. Ignore implementation details, refactors, polish, tests, dependency bumps, and minor bug fixes unless they are the main user-facing win.
Avoid hype stock phrases ("game-changing", "revolutionary").

Confidence rubric (0..1, two decimals): how brag-worthy is this trigger for an indie maker's audience?
- 0.85+ → user-facing feature ship, milestone hit, externally noteworthy event.
- 0.55–0.85 → real change but niche, internal, or thin context (sparse PR body, unclear user impact).
- 0.30–0.55 → mostly polish, copy tweaks, dependency bumps, or refactors.
- < 0.30 → almost certainly not worth a post (CI fixes, formatting, internal docs, lint).
Score conservatively. The user sees suppressed (low-confidence) drafts only on demand.`;

function formatThresholdUsd(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `$${n}`;
}

function formatThresholdCount(n: number): string {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `${n}`;
}

export async function composeCopy(input: ComposeCopyInput): Promise<Copy> {
  switch (input.type) {
    case "pr_merged":
      return composePrMerged(input);
    case "mrr":
      return composeMrr(input);
    case "first_sale":
      return composeFirstSale(input);
    case "visitors":
      return composeVisitors(input);
    case "star":
      return composeStar(input);
    case "total_revenue":
      return composeTotalRevenue(input);
    case "subscribers":
      return composeSubscribers(input);
  }
}

async function composePrMerged(
  input: Extract<ComposeCopyInput, { type: "pr_merged" }>,
): Promise<Copy> {
  const system = `${BASE_SYSTEM}
You summarize a merged pull request into a shippable announcement.
The title is a plain benefit or feature headline — not the raw PR title, not a version number, and not a changelog headline.
The description should say what users can now do. Do not list everything in the PR.
If the PR contains one real feature plus cleanup/fixes, announce only the feature.`;

  const user = `Repo: ${input.repoFullName}
${brandLine(input)}
${platformLine(input)}
${examplesBlock(input.examples)}
PR title: ${input.title}
PR body:
---
${input.body.slice(0, 2000) || "(empty)"}
---

Write the brag post JSON.`;

  return callHaikuJson({
    system,
    user,
    schema: CopySchema,
    fallback: {
      title: input.title.slice(0, 80),
      description: "",
      confidence: 0,
    },
    maxTokens: 250,
  });
}

async function composeMrr(
  input: Extract<ComposeCopyInput, { type: "mrr" }>,
): Promise<Copy> {
  const amount = formatThresholdUsd(input.threshold);
  const system = `${BASE_SYSTEM}
You celebrate a revenue milestone. The title should prominently feature the dollar amount — don't reword it into prose. Description adds one sentence of context or gratitude.`;

  const user = `Milestone: ${amount} MRR
${brandLine(input)}
${platformLine(input)}
${examplesBlock(input.examples)}

Write the brag post JSON.`;

  return callHaikuJson({
    system,
    user,
    schema: CopySchema,
    fallback: {
      title: `${amount} MRR`,
      description: "",
      confidence: 0,
    },
    maxTokens: 200,
  });
}

async function composeFirstSale(
  input: Extract<ComposeCopyInput, { type: "first_sale" }>,
): Promise<Copy> {
  const system = `${BASE_SYSTEM}
You celebrate the first paying customer. Title should feel momentous but not cheesy. Description is one sentence of gratitude or context.`;

  const user = `Milestone: first paying customer
${brandLine(input)}
${platformLine(input)}
${examplesBlock(input.examples)}

Write the brag post JSON.`;

  return callHaikuJson({
    system,
    user,
    schema: CopySchema,
    fallback: {
      title: "First paying customer",
      description: "",
      confidence: 0,
    },
    maxTokens: 200,
  });
}

async function composeVisitors(
  input: Extract<ComposeCopyInput, { type: "visitors" }>,
): Promise<Copy> {
  const n = formatThresholdCount(input.threshold);
  const system = `${BASE_SYSTEM}
You celebrate a visitor/traffic milestone. Title leads with the number. Description is one sentence of context (e.g. "this month", "in the first week after launch").`;

  const user = `Milestone: ${n} visitors (rolling 30 days, via ${input.source})
${brandLine(input)}
${platformLine(input)}
${examplesBlock(input.examples)}

Write the brag post JSON.`;

  return callHaikuJson({
    system,
    user,
    schema: CopySchema,
    fallback: {
      title: `${n} visitors`,
      description: "",
      confidence: 0,
    },
    maxTokens: 200,
  });
}

async function composeTotalRevenue(
  input: Extract<ComposeCopyInput, { type: "total_revenue" }>,
): Promise<Copy> {
  const amount = formatThresholdUsd(input.threshold);
  const system = `${BASE_SYSTEM}
You celebrate a total revenue milestone. Title leads with the dollar amount. Description is one sentence of context or gratitude.`;

  const user = `Milestone: ${amount} in total revenue
${brandLine(input)}
${platformLine(input)}
${examplesBlock(input.examples)}

Write the brag post JSON.`;

  return callHaikuJson({
    system,
    user,
    schema: CopySchema,
    fallback: { title: `${amount} in revenue`, description: "", confidence: 0 },
    maxTokens: 200,
  });
}

async function composeSubscribers(
  input: Extract<ComposeCopyInput, { type: "subscribers" }>,
): Promise<Copy> {
  const n = formatThresholdCount(input.threshold);
  const system = `${BASE_SYSTEM}
You celebrate a paying subscriber milestone. Title leads with the number. Description is one sentence of context or gratitude.`;

  const user = `Milestone: ${n} paying subscribers
${brandLine(input)}
${platformLine(input)}
${examplesBlock(input.examples)}

Write the brag post JSON.`;

  return callHaikuJson({
    system,
    user,
    schema: CopySchema,
    fallback: { title: `${n} subscribers`, description: "", confidence: 0 },
    maxTokens: 200,
  });
}

async function composeStar(
  input: Extract<ComposeCopyInput, { type: "star" }>,
): Promise<Copy> {
  const n = formatThresholdCount(input.threshold);
  const system = `${BASE_SYSTEM}
You celebrate a GitHub star milestone. Title names the number and the repo. Description is one sentence of thanks to contributors or the community.`;

  const user = `Milestone: ${n} GitHub stars on ${input.repoFullName}
${brandLine(input)}
${platformLine(input)}
${examplesBlock(input.examples)}

Write the brag post JSON.`;

  return callHaikuJson({
    system,
    user,
    schema: CopySchema,
    fallback: {
      title: `${n} stars on ${input.repoFullName}`,
      description: "",
      confidence: 0,
    },
    maxTokens: 200,
  });
}
