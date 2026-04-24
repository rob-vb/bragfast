import { z } from "zod";
import { callHaikuJson } from "../haiku-call";

// Text-only draft copy for Sous-Chef. Title + description sized for
// the smallest template text slots (hero title ~140 chars, split-*
// description ~600 chars before the font forces truncation).
export type Copy = { title: string; description: string };

export type ComposeCopyInput =
  | {
      type: "pr_merged";
      title: string;
      body: string;
      repoFullName: string;
      commits?: string[];
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
  title: z.string().transform((s) => s.slice(0, 140)),
  description: z.string().transform((s) => s.slice(0, 600)),
});

function brandLine(input: { brandName?: string; brandVoice?: string }): string {
  const parts: string[] = [];
  if (input.brandName) parts.push(`Brand: ${input.brandName}`);
  if (input.brandVoice) parts.push(`Voice: ${input.brandVoice}`);
  return parts.join("\n");
}

const BASE_SYSTEM = `You write short, honest brag posts for indie makers.
Output JSON only: {"title": "...", "description": "..."}. No markdown.
Keep titles punchy (one line). Description is 1-3 short sentences. Avoid hype stock phrases ("game-changing", "revolutionary").`;

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
Title: 8 words max, catchy headline — not the raw PR title, not a version number.

For description, choose ONE format based on the PR:
- SINGLE thing shipped: 1-2 sentences, max 300 chars.
- MULTIPLE distinct features (2+): use EXACTLY this format in the JSON string value, with \\n as the separator character between lines:
  "- [most impactful feature]\\n- [second feature]\\n- [third feature]\\n- And more ..."
  Max 3 features. Add "- And more ..." only if there are more than 3. Max 300 chars total.

IMPORTANT: When using the bullet format, the \\n must appear literally in the JSON string (as the two characters backslash and n), not as a real newline. Example JSON: {"title": "...", "description": "- Feature one\\n- Feature two\\n- And more ..."}
`;

  const commitSection =
    input.commits && input.commits.length > 0
      ? `\nCommit messages:\n${input.commits.map((m) => `- ${m}`).join("\n")}`
      : "";

  const user = `Repo: ${input.repoFullName}
${brandLine(input)}
PR title: ${input.title}
PR body:
---
${input.body.slice(0, 2000) || "(empty)"}
---${commitSection}

Write the brag post JSON.`;

  return callHaikuJson({
    system,
    user,
    schema: CopySchema,
    fallback: {
      title: input.title.slice(0, 140),
      description: "",
    },
    maxTokens: 300,
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
