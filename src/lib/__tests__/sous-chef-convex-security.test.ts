import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Sous-Chef Convex security boundaries", () => {
  it("uses internal actions for seeded scans", () => {
    const src = read("convex/sousChef.ts");
    expect(src).toContain("export const seed = internalAction");
    expect(src).toContain("export const scanNow = internalAction");
    expect(src).not.toContain("export const seed = action");
    expect(src).not.toContain("export const scanNow = action");
  });

  it("uses internal mutations for credential and draft writes", () => {
    const integrationSecretsSrc = read("convex/integrationSecrets.ts");
    const draftsSrc = read("convex/drafts.ts");
    const milestoneHitsSrc = read("convex/milestoneHits.ts");

    expect(integrationSecretsSrc).toContain("export const upsert = internalMutation");
    expect(integrationSecretsSrc).toContain("export const disconnect = internalMutation");
    expect(integrationSecretsSrc).toContain("export const setEnabled = internalMutation");
    expect(draftsSrc).toContain("export const insertDraftIfNew = internalMutation");
    expect(milestoneHitsSrc).toContain("export const seedAlreadyHit = internalMutation");
  });

  it("routes server-side callers through internal endpoints", () => {
    const integrationsRouteSrc = read("src/app/api/v1/sous-chef/integrations/route.ts");
    const githubWebhookSrc = read("src/app/api/github/webhooks/route.ts");
    const githubCallbackSrc = read("src/app/api/github/callback/route.ts");

    expect(integrationsRouteSrc).toContain("internal.integrationSecrets.upsert");
    expect(integrationsRouteSrc).toContain("internal.integrationSecrets.disconnect");
    expect(integrationsRouteSrc).toContain("internal.sousChef.seed");
    expect(githubWebhookSrc).toContain("internal.drafts.insertDraftIfNew");
    expect(githubWebhookSrc).toContain("internal.githubInstallations.upsert");
    expect(githubCallbackSrc).toContain("internal.githubInstallations.upsert");
    expect(githubCallbackSrc).toContain('provider: "github"');
  });
});
