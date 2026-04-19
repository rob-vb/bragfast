import { z } from "zod";
import { callHaikuJson } from "./haiku-call";

export type CommitInput = {
  sha: string;
  message: string;
  prTitle?: string;
  filesTouched?: string[];
};

export type AnalyzeCommitsInput = {
  repoFullName: string;
  commits: CommitInput[];
};

const resultSchema = z.object({
  worthPosting: z.boolean(),
  chosenCommitSha: z.string().optional(),
  draftCopy: z.string().max(280).optional(),
  reasoning: z.string().optional(),
});

export type AnalyzeCommitsResult = z.infer<typeof resultSchema>;

// Escape commit content before interpolation into the prompt.
// Basic belt-and-suspenders against prompt injection — approval gate is the real defense.
function escape(text: string): string {
  return text.replace(/[`\r]/g, " ").slice(0, 500);
}

function buildPrompt(input: AnalyzeCommitsInput): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You act as an indie hacker's social media PR rep. You read a day's commits and pick AT MOST ONE worth bragging about on Twitter/X.

SKIP: chore:, refactor:, docs:, test:, ci:, build:, style:, perf: (unless dramatic). Dependabot / renovate / automated bots. Pure internal plumbing.

PICK: user-visible features, new capabilities, noteworthy fixes, ship milestones.

You output JSON only. No markdown, no commentary.

Schema:
{
  "worthPosting": boolean,
  "chosenCommitSha": "sha" (omit if worthPosting=false),
  "draftCopy": "tweet text <=280 chars" (omit if worthPosting=false),
  "reasoning": "one sentence why you picked or skipped"
}

Rules for draftCopy:
- Second person ("you can now..." / "shipped ...").
- Concrete. Name the capability, not hype adjectives.
- No hashtags, no emojis unless the commit message uses them.
- No "excited to announce", "stoked", "game-changer", or similar hype.
- If all commits are chores, return worthPosting=false. Silence is a valid outcome.`;

  const lines = input.commits
    .slice(0, 30)
    .map(
      (c) =>
        `[${c.sha.slice(0, 7)}] ${escape(c.prTitle || c.message)}` +
        (c.filesTouched?.length ? `\n    files: ${c.filesTouched.slice(0, 5).join(", ")}` : ""),
    )
    .join("\n");

  const userPrompt = `Repo: ${input.repoFullName}

Last 24h commits:
${lines || "(none)"}

Pick zero or one. Output JSON.`;

  return { systemPrompt, userPrompt };
}

export async function analyzeCommits(input: AnalyzeCommitsInput): Promise<AnalyzeCommitsResult> {
  if (input.commits.length === 0) {
    return { worthPosting: false, reasoning: "no commits in window" };
  }
  const { systemPrompt, userPrompt } = buildPrompt(input);
  return callHaikuJson({
    systemPrompt,
    userPrompt,
    validator: resultSchema,
    maxTokens: 512,
    fallback: () => ({ worthPosting: false, reasoning: "Haiku call failed" }),
  });
}
