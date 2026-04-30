// Layer 1 of safety per PRD §safety. Pre-render content filter:
// before Haiku ever sees a PR, keyword-scan title+body for sensitive patterns.
// Match → skip auto-draft. User can manually invoke if they want.

export type ContentCategory =
  | "security"
  | "confidentiality"
  | "sensitive"
  | "hr_financial";

export type ContentFilterMatch = {
  category: ContentCategory;
  term: string;
};

export type ContentFilterResult = {
  blocked: boolean;
  matches: ContentFilterMatch[];
};

const PATTERNS: Record<ContentCategory, string[]> = {
  security: [
    "security",
    "vulnerability",
    "vulnerabilities",
    "exploit",
    "patch",
    "exposed",
    "leak",
    "leaked",
    "cve",
    "password",
    "passwords",
    "token",
    "tokens",
    "secret",
    "secrets",
    "credential",
    "credentials",
    "api key",
    "private key",
    "auth bypass",
  ],
  confidentiality: [
    "client",
    "customer name",
    "internal only",
    "confidential",
    "nda",
    "do not share",
    "do not disclose",
  ],
  sensitive: [
    "racial",
    "fired",
    "laid off",
    "layoff",
    "lawsuit",
    "litigation",
    "harassment",
    "discrimination",
  ],
  hr_financial: [
    "salary",
    "compensation",
    "payroll",
    "headcount",
    "termination",
    "severance",
    "acquisition",
    "merger",
    "earnings",
    "revenue projection",
  ],
};

// Word-boundary matcher. Multi-word phrases match as substring on word edges.
// Matching is case-insensitive on the input.
function makeMatcher(term: string): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // For multi-word terms, allow matching across whitespace runs.
  const pattern = escaped.replace(/\s+/g, "\\s+");
  return new RegExp(`(?:^|[^a-z0-9])${pattern}(?:[^a-z0-9]|$)`, "i");
}

const COMPILED: Array<{
  category: ContentCategory;
  term: string;
  regex: RegExp;
}> = Object.entries(PATTERNS).flatMap(([category, terms]) =>
  terms.map((term) => ({
    category: category as ContentCategory,
    term,
    regex: makeMatcher(term),
  })),
);

export function scanContent(
  ...inputs: Array<string | null | undefined>
): ContentFilterResult {
  const haystack = inputs.filter(Boolean).join("\n").toLowerCase();
  if (!haystack) return { blocked: false, matches: [] };

  const matches: ContentFilterMatch[] = [];
  const seen = new Set<string>();
  for (const { category, term, regex } of COMPILED) {
    if (regex.test(haystack)) {
      const key = `${category}:${term}`;
      if (!seen.has(key)) {
        seen.add(key);
        matches.push({ category, term });
      }
    }
  }
  return { blocked: matches.length > 0, matches };
}
