import { z } from "zod";
import { callHaikuJson } from "../haiku-call";

// Text-only draft copy for Sous-Chef. Keep this intentionally short:
// drafts are starting points for social cards, not changelog summaries.
export type Copy = { title: string; description: string };

export type ComposeCopyInput =
  | {
      type: "pr_merged";
      title: string;
      body: string;
      repoFullName: string;
      brandName?: string;
      brandVoice?: string;
    }
  | {
      type: "mrr";
      threshold: number;
      brandName?: string;
      brandVoice?: string;
    }
  | {
      type: "first_sale";
      brandName?: string;
      brandVoice?: string;
    }
  | {
      type: "visitors";
      source: "posthog" | "ga4";
      threshold: number;
      brandName?: string;
      brandVoice?: string;
    }
  | {
      type: "star";
      repoFullName: string;
      threshold: number;
      brandName?: string;
      brandVoice?: string;
    }
  | {
      type: "total_revenue";
      threshold: number;
      brandName?: string;
      brandVoice?: string;
    }
  | {
      type: "subscribers";
      threshold: number;
      brandName?: string;
      brandVoice?: string;
    };

const CopySchema = z.object({
  title: z.string().transform((s) => s.slice(0, 80)),
  description: z.string().transform((s) => s.slice(0, 220)),
});

function brandLine(input: { brandName?: string; brandVoice?: string }): string {
  const parts: string[] = [];
  if (input.brandName) parts.push(`Brand: ${input.brandName}`);
  if (input.brandVoice) parts.push(`Voice: ${input.brandVoice}`);
  return parts.join("\n");
}

const BASE_SYSTEM = `You write short, honest brag posts for indie makers.
Output JSON only: {"title": "...", "description": "..."}. No markdown.
Keep titles punchy (one line, usually 3-6 words). Description is usually one short sentence, two only when needed.
Pick the one thing worth announcing. Ignore implementation details, refactors, polish, tests, dependency bumps, and minor bug fixes unless they are the main user-facing win.
Avoid hype stock phrases ("game-changing", "revolutionary").`;

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

Write the brag post JSON.`;

  return callHaikuJson({
    system,
    user,
    schema: CopySchema,
    fallback: {
      title: `${amount} MRR`,
      description: "",
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

Write the brag post JSON.`;

  return callHaikuJson({
    system,
    user,
    schema: CopySchema,
    fallback: {
      title: "First paying customer",
      description: "",
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

Write the brag post JSON.`;

  return callHaikuJson({
    system,
    user,
    schema: CopySchema,
    fallback: {
      title: `${n} visitors`,
      description: "",
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

Write the brag post JSON.`;

  return callHaikuJson({
    system,
    user,
    schema: CopySchema,
    fallback: { title: `${amount} in revenue`, description: "" },
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

Write the brag post JSON.`;

  return callHaikuJson({
    system,
    user,
    schema: CopySchema,
    fallback: { title: `${n} subscribers`, description: "" },
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

Write the brag post JSON.`;

  return callHaikuJson({
    system,
    user,
    schema: CopySchema,
    fallback: {
      title: `${n} stars on ${input.repoFullName}`,
      description: "",
    },
    maxTokens: 200,
  });
}
