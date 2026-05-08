# TRACKER — OceanX AI 3-Agent Demo

> Session continuity log. Future sessions: read this top-to-bottom before
> doing anything else. Update at the end of every meaningful change.

## Project at a glance

- **Goal:** working live demo for the OceanX AI intern assignment.
- **Demo deadline:** Monday 2026-05-11 (Singapore group session).
- **Scope:** 3-agent pipeline (Lead Capture → Underwriting → Contract) plus a
  Master Supervisor agent. Mocked third-party APIs. Real Anthropic calls.
- **Spec:** `docs/superpowers/specs/2026-05-08-oceanx-3-agent-demo-design.md`
  — read this first.
- **Stack:** Next.js 15 + React 19 + TS strict + Tailwind v4 + Anthropic SDK
  (Sonnet 4.6 workers, Opus 4.7 supervisor) + Motion/GSAP/Lottie/r3f/tsparticles.

## How to pick this up next session

1. Read the spec linked above.
2. Read this file end-to-end.
3. Check `git log --oneline` to see what was committed.
4. Run `pnpm dev` and open http://localhost:3000.
5. Continue from the latest "Next up" entry below.

## Current status

- **Phase:** brainstorming complete; spec approved.
- **Next up:** scaffold Next.js 15 project, install deps, set up Tailwind,
  create base layout. See "Implementation plan" below once written.

## Decisions log

Append-only. Newest at the top.

### 2026-05-08 — Initial design approved

- Picked the **3-agent pipeline + Supervisor** scope (over single-agent or
  full 9-agent). Reasoning: best matches the assignment's "Agent Architecture"
  centerpiece, demonstrates orchestration, fits 3-day budget.
- Pushed back on "every animation library." Curated 6-lib stack instead, each
  with one job:
  - Motion — primary UI animation
  - GSAP — one orchestrated hero timeline only
  - Lottie — micro-illustrations on agent state changes
  - @react-three/fiber + drei — one accent 3D scene
  - tsparticles — ambient hero background only
  - View Transitions API + CSS — routine transitions
- Animations are split per-route via `next/dynamic(..., { ssr: false })`,
  transforms+opacity only, `prefers-reduced-motion` honored.
- Real Anthropic API calls (Sonnet 4.6 workers, Opus 4.7 supervisor) with a
  `DEMO_MODE=fixtures` fallback for live-demo safety.
- All third-party SaaS APIs (Apollo, HubSpot, Xero, DocuSign, GoCardless,
  CIN7) are mocked. Connectors expose realistic shapes so a future swap to
  sandbox is one-flag.
- In-memory + localStorage persistence. No database.
- Removed the empty `cat.txt` file that was committed at init.

## File map (live — update as files arrive)

- `docs/superpowers/specs/2026-05-08-oceanx-3-agent-demo-design.md` — design spec
- `TRACKER.md` — this file
- `.env.example` — *(not yet written)*
- `package.json` — *(not yet written)*
- everything else — *(not yet written)*

## Open questions / parked items

- None at the moment.

## Commit log highlights

(Will fill as we commit. Keep entries short — one line per commit.)

- `58833d9` init
