# CLI-first reposition

We are shelving the automated build-in-public engine described in `PRD.md` (GitHub/Stripe/PostHog triggers → server AI drafts → web approval → Buffer/Postiz) and repositioning brag.fast as a **CLI-first creation tool for developers**. A developer runs `npx brag`, authors and fills branded post templates in a locally-served browser Workspace, and copies or schedules the result. The ICP shifts from habit-deficient solopreneurs who want automation to hands-on developers who want a fast manual tool that lives in their terminal.

## Considered options

- **Keep the automation PRD** — richer moat (trigger graph, voice model, history feed) but large surface, server AI cost, and a non-dev ICP we hadn't validated.
- **CLI-first manual tool (chosen)** — smaller buildable MVP, dev-native distribution (`npx`), and a clear free-compute story once render moves client-side (see ADR-0002, ADR-0003).
- **Run both in parallel** — rejected: two surfaces at solo-founder headcount means two underbuilt products.

## Consequences

- `PRD.md` and the prior `CONTEXT.md` automation glossary (Source, Trigger, Goal, TriggerDrafting) are parked, not deleted; they may return in a later milestone.
- Existing backend assets (drafts, templates, brands, posting backbone, OAuth) are reused; the GitHub App / trigger scanners / goals go dormant.
