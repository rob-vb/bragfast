# Decisions Log — brag.fast Repositioning

Append-only ledger. PRD.md is strategic source-of-truth; this file captures implementation-level decisions surfaced during build that aren't in PRD.

Format:
```
## YYYY-MM-DD — <short title>
**Context:** <what triggered the decision>
**Options considered:** <alternatives>
**Decision:** <what was chosen>
**Rationale:** <why>
**PRD impact:** <none | clarifies §X | conflicts with §X — see below>
```

---

## 2026-04-30 — GitHub App scope guidance is user-side, not enforced (S0.5)

**Context:** PRD §safety Layer 5 calls for a "select repositories" default install scope. PRD §sessions S0.5 acceptance asks the install screen pre-select "Only select repositories." Investigated whether GitHub's `https://github.com/apps/{slug}/installations/new` endpoint accepts a parameter that pre-selects scoped install.

**Options considered:**
1. URL parameter — GitHub's install endpoint accepts `state`, `target_id`, `target_type`, `repository_ids`, `suggested_target_id`. None pre-selects the access mode (All vs. Select).
2. App manifest — no manifest file in this repo; manifest creation is a one-time GitHub UI flow. Existing app's defaults are set in App settings on github.com.
3. UI nudge — render guidance copy next to the install CTA telling the user to choose "Only select repositories."

**Decision:** Option 3. Add hint text under the Install button on `src/components/admin/github-section.tsx` and the Sous-Chef install surface. Cannot enforce server-side; GitHub presents both options unconditionally.

**Rationale:** GitHub doesn't expose a switch for default repo-access mode. The realistic Layer 5 mitigation is education at the install moment + the planned org-pending detection (PRD §safety, also covers `github_app_install_blocked` event). Pairs with later S0.4c (server-side ownership scoping on `githubRepoConfigs`).

**PRD impact:** clarifies §safety Layer 5 / §sessions S0.5 — agent-browser cannot verify "pre-selected" because GitHub never pre-selects. Acceptance reframed: user-facing copy is present, sent in PR.

