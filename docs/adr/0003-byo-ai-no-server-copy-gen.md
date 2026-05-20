# BYO-AI — no server-side copy generation

brag.fast generates no post copy. The server-side Haiku copy generation and the per-user voice-calibration moat from `PRD.md` are removed. Developers already run their own AI (Claude Code, Codex); the CLI points them there, and the user types or pastes finished copy into the Workspace. Repo context (git log, package.json) is used only to prefill a raw string for editing, never to call an LLM.

## Considered options

- **Server AI copy + voice model (PRD)** — the original moat, but ongoing LLM cost, prompt/voice maintenance, and safety-filter surface for content we don't author.
- **BYO-AI (chosen)** — zero LLM cost on our side, no safety-classifier burden, and a natural fit for a dev ICP that already has better AI than we'd ship.

## Consequences

- The Layer-1 sensitive-content filter, confidence scoring, and voice presets from the PRD are dropped for this milestone.
- No agent/MCP copy-push in the MVP — copy enters only by manual paste in the Workspace. (MCP/agent-push remains a possible later power path.)
