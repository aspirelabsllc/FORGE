# Website Builder — Project Overview

We are building an AI-powered, GUI-configurable website builder. The pitch: most AI site generators (v0, Lovable, Bolt.new, Framer AI, 10Web, Durable) produce recognizably templated output that still needs a human design pass. This product's job is to close that gap by default — production-grade, genuinely novel design as the baseline output, not an accident that requires manual polish afterward.

## Core flow

1. User provides an initial brand document — brand strategy (what the brand represents, how it captures the consumer, how it answers objections, its voice) and brand identity (typography, theme, assets).
2. **Forge** — the conversational builder agent — ingests the doc, then has a genuine one-question-at-a-time conversation to gather remaining expectations and inputs. It accepts dropped-in asset files (e.g. product photos) and saves them. Forge proposes specific, opinionated creative ideas per section rather than generic templates, and asks permission before adding flourishes — e.g.:
   - *"I have an idea for the hero section that we showcase one of our most popular products in it with an interactive animation that responds to the user's scroll, cursor, and clicks... Would you mind sharing a picture of the product?"*
   - *"I think the background on this page looks very plain. If you'd like, we can add a sophisticated gradient-based glow... Do you think we should go ahead with that?"*
3. Forge builds an actual production-level initial frontend — not a mockup.
4. The user can tweak the result two ways: via chat with Forge, or directly through a GUI editor (MVP scope: move, resize, basic layout edits). Both paths write to the same live codebase in real time.
5. **Aegis** — the adversarial design critic agent — must approve a design before it ships. If a proposal doesn't meet the bar, Aegis returns concrete guidance and Forge re-proposes. Nothing ships without Aegis's sign-off.

## Quality bar

Salman (the person building this) is a perfectionist who wants quality over speed, and explicitly does not want another generic AI site generator. Every design decision should be judged against: does this look bespoke and intentional, or does it look like every other AI-generated site? When in doubt, push for the more opinionated, more novel option — and say so explicitly rather than defaulting to safe/generic choices.

## Architecture direction (validated via research 2026-07-09, pre-implementation)

**Foundation: fork/build on [Onlook](https://github.com/onlook-dev/onlook).** Apache-2.0, 26k+ stars, actively maintained. It's the only OSS project doing true per-element bidirectional DOM↔source sync on React+Tailwind — surveyed and ruled out as inferior for this: GrapesJS, Craft.js, Puck, TeleportHQ, Locofy (all one-way/no source-mapping), Plasmic (bidirectional-ish but coarse whole-file ownership, not per-element), tldraw (licensing cost kills it as a dependency).

- Mechanics: AST transform injects stable IDs into JSX at build/dev time (`packages/parser`), mapping DOM elements to file+location ("template nodes"). Live preview runs sandboxed in an iframe via `penpal` RPC with a pluggable backend (`packages/code-provider`). Versioning is git-native (`packages/git`).
- Stack (inherited if we build on Onlook): Next.js App Router + tRPC, MobX, Supabase, Bun, TypeScript+Zod.
- It's a monolith, not a library — no plugin API. Integrating Forge/Aegis means forking and modifying core app code (`apps/web`/`apps/backend`/`apps/admin`, `packages/ai`), not bolting on externally.
- Bonus: Onlook already has a "brand extraction from Firecrawl" feature in `packages/ai` (Nov 2025) — adjacent to Forge's brand-intake step, worth reusing.
- Caution: 3 CVEs patched Dec 2025 (open-redirect, DOM XSS, missing authz) and one currently-open unresolved issue — cross-user IDOR across tRPC procedures. Audit/fix before any multi-user exposure.
- No built-in edit-ownership model exists in Onlook — must be built by us.

**Edit ownership:** tag DOM nodes/props with last-editor (agent vs. user) + timestamp so Forge never silently overwrites manual GUI tweaks on regeneration. [bolt.diy](https://github.com/stackblitz-labs/bolt.diy) (MIT) has a file-locking mechanism for concurrent AI/human edits worth studying as a narrower precedent, even though it has no GUI-editing layer of its own.

**Brand-intake schema:**
- Identity/theme (typography, color): emit **[W3C Design Tokens (DTCG format)](https://designtokens.org/tr/drafts/format)** rather than inventing a shape — stable spec, supports composite tokens (e.g. one "typography" token bundling font/size/weight/spacing/color), pairs with **Style Dictionary** to compile straight to Tailwind config.
- Assets/logos/colors: Brandfetch's API shape is a good reference structure, and could auto-bootstrap a kit from an existing site/domain.
- Strategy/voice (positioning, target consumer, objection-handling, tone): no existing standard — this is genuinely bespoke and needs its own schema (positioning statement, target consumer, tone adjectives + do/don't examples, key objections + responses).
- Differentiator: no competitor (10Web, Durable, Lovable) models brand info as a persistent structured kit vs. one-shot generation input — Forge should.

**Design execution stack for Forge's output:**
- Motion (Framer Motion) for micro-interactions, GSAP ScrollTrigger for scroll-pinned/sequenced storytelling, Lenis for smooth/momentum scroll feel — the current baseline "site feels alive" trio.
- React Three Fiber / Three.js only for a deliberate 3D hero moment — highest effort/payoff, use sparingly, not everywhere.
- shadcn/ui as structural base + Aceternity UI / Magic UI / Motion Primitives (copy-paste, not dependencies) for glow/spotlight/beam flourishes — avoids the "everything glows" AI-generic trap.
- Anti-generic rubric candidates for Aegis: flag static no-motion heroes, uniform stock particle backgrounds, non-interactive bento grids.

**Aegis:** genuinely unbuilt territory — no shipped AI builder (Lovable, v0, Bolt, Framer AI, 10Web, Durable) does critic-gating today, and the only related work found is a paper (*CritiqueCrew*) with no linked implementation. Build from generic LLM-as-judge scaffolding (JudgeLM-style patterns) plus bespoke design heuristics. Should not be a single critic call — use a multi-lens adversarial pattern (separate critics for novelty, brand-fit, accessibility, technical feasibility; require supermajority approval). Log human overrides of Aegis's verdicts as a calibration signal over time. This is the highest-risk, least-precedented component — worth prototyping early rather than last.
