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
4. Run `npm run dev` and open http://localhost:3000.
   - Without `ANTHROPIC_API_KEY`, agents fall back to a heuristic — pipeline
     still runs, just no real LLM calls.
   - To enable live LLM, copy `.env.example` to `.env.local` and set the key.
5. Continue from "Next up" below.

## Current status (paused after detail pages + PDF + production build)

**Build status:** `npx next build` is GREEN. All routes compile.

```
Route (app)                                 Size  First Load JS
○ /                                      171 B         118 kB
○ /_not-found                            998 B         116 kB
ƒ /api/events                            132 B         115 kB
ƒ /api/pipeline                          132 B         115 kB
ƒ /api/state                             132 B         115 kB
ƒ /contract/[id]                         171 B         118 kB
ƒ /contract/[id]/pdf                     132 B         115 kB
ƒ /dashboard                           50.3 kB         168 kB
ƒ /lead/[id]                             171 B         118 kB
ƒ /underwriting/[id]                     171 B         118 kB
ƒ /underwriting/[id]/pdf                 132 B         115 kB
First Load JS shared by all             115 kB
```

**Functionally working today:**

- Trigger a lead via the dashboard. Pipeline runs end-to-end:
  1. Lead Capture: Apollo enrichment (mocked) → Claude scoring → HubSpot
     deal + meeting (mocked).
  2. Underwriting: bank/financial pull (fixture) → bureau pull (fixture) →
     Claude structured assessment → PDF.
  3. Contract: Claude drafts terms → PDF → DocuSign envelope (mocked).
- Master Supervisor (Opus 4.7) subscribes to events and emits alerts on:
  errors, needs_human, low confidence, capital threshold ($500k+), Hard Terms
  (50%+ upfront), and stalls (>30s).
- Live SSE stream from `/api/events` updates the dashboard in real time.
- All four agent cards animate, pipeline edges fill, event log streams,
  supervisor alerts pop in.
- Detail pages at `/lead/[id]`, `/underwriting/[id]`, `/contract/[id]` with
  embedded PDF iframes for the latter two.
- `DEMO_MODE=fixtures` env (or missing API key) routes everything through
  heuristic fallbacks so the demo can run fully offline.

**Not yet built:**

- **Landing page (`/`)** — currently a stub. Needs the 3D agent-network orb,
  tsparticles ambient bg, GSAP hero timeline, "Run Demo" CTA. (Task #11)
- **Smoke test + bundle audit + polish pass.** (Task #14)

**Open verification gaps:**

- Production build is green but a full live-pipeline run hasn't been done in
  this session (no API key set). Smoke test should run with both
  `DEMO_MODE=fixtures` and a real key.
- The dashboard mounts the SSE hook unconditionally; need to verify
  reconnect behavior when the dev server restarts.

## Decisions log

Append-only. Newest at the top.

### 2026-05-08 — Detail pages + PDFs landed; production build green

- Switched from pnpm to npm because `corepack` isn't installed on this
  machine. Functionally equivalent for our purposes; not worth the global
  install.
- `@react-three/fiber` had to bump from `^8` to `^9.1.0` (and `drei` to
  `^10.0.0`) for React 19 peer compatibility. fiber 8 only supports React 18.
- Discriminated-union `Omit` flattens to an intersection-style type. Fixed by
  defining `EventWithoutContext<E>` distributively in `agents/runner.ts`.
- PDF routes (`route.tsx`, not `.ts`) — they have JSX so the extension
  matters.
- All connectors share the `beat()` helper so events are visibly paced in the
  UI without any artificial sleep in the agent code.
- Records are stored in module-level `Map` singletons via `globalThis`
  references (`__oceanx_records`, `__oceanx_event_bus`, `__oceanx_alert_bus`,
  `__oceanx_supervisor_started`). This survives Next's module caching but
  resets on server restart — fine for a demo.

### 2026-05-08 — Initial design approved

- Picked the **3-agent pipeline + Supervisor** scope.
- Curated 6-lib animation stack (Motion / GSAP / Lottie / r3f+drei /
  tsparticles / View Transitions). Each has one job.
- Real Anthropic API calls (Sonnet 4.6 / Opus 4.7) with `DEMO_MODE=fixtures`
  fallback for live-demo safety.
- All third-party SaaS APIs mocked with realistic JSON fixtures.
- In-memory + localStorage persistence. No database.
- Removed `cat.txt` left over from init.

## File map

```
oceanai/
├── docs/superpowers/specs/
│   └── 2026-05-08-oceanx-3-agent-demo-design.md  ← spec
├── TRACKER.md                                    ← this file
├── package.json                                  ← deps + scripts (npm, not pnpm)
├── tsconfig.json                                 ← strict + noUncheckedIndexedAccess
├── next.config.ts                                ← viewTransition, optimizePackageImports
├── postcss.config.mjs                            ← Tailwind v4 plugin
├── biome.json                                    ← lint + format
├── .env.example                                  ← every key documented
├── .gitignore
├── app/
│   ├── layout.tsx                                ← root, Geist fonts, dark color-scheme
│   ├── globals.css                               ← Tailwind v4 @theme + reduced-motion + utilities
│   ├── page.tsx                                  ← STUB landing (replace in task #11)
│   ├── dashboard/
│   │   ├── page.tsx
│   │   └── dashboard-shell.tsx                   ← SSE-driven live view
│   ├── lead/[id]/page.tsx
│   ├── underwriting/[id]/
│   │   ├── page.tsx                              ← detail + iframe to PDF
│   │   └── pdf/route.tsx                         ← @react-pdf/renderer stream
│   ├── contract/[id]/
│   │   ├── page.tsx
│   │   └── pdf/route.tsx
│   └── api/
│       ├── events/route.ts                       ← SSE pump (Node runtime)
│       ├── pipeline/route.ts                     ← POST = run; GET = list seeds
│       └── state/route.ts                        ← snapshot for hydration
├── agents/
│   ├── event-bus.ts                              ← in-process pub/sub w/ globalThis pin
│   ├── runner.ts                                 ← runAgent + beat + AgentContext
│   ├── prompts.ts                                ← inline prompt strings
│   ├── prompts/                                  ← .md mirror copies (reference only)
│   ├── lead-capture.ts
│   ├── underwriting.ts
│   ├── contract.ts
│   └── supervisor.ts                             ← Opus 4.7, extended thinking
├── connectors/                                   ← all mocked
│   ├── apollo.ts
│   ├── credit-bureau.ts
│   ├── hubspot.ts
│   ├── xero.ts
│   ├── docusign.ts
│   ├── gocardless.ts
│   └── cin7.ts
├── components/
│   ├── agent-card.tsx
│   ├── pipeline.tsx
│   ├── event-log.tsx
│   ├── supervisor-panel.tsx
│   ├── trigger-bar.tsx
│   └── pdf/
│       ├── styles.ts
│       ├── underwriting-report.tsx
│       └── contract-doc.tsx
├── lib/
│   ├── anthropic.ts                              ← runModel + JSON extract + retry + cache
│   ├── env.ts                                    ← ANTHROPIC_API_KEY, DEMO_MODE, models
│   ├── ids.ts
│   ├── cn.ts                                     ← clsx + tailwind-merge
│   ├── store.ts                                  ← Zustand client store with persist
│   ├── sse.ts                                    ← useAgentEventStream hook
│   ├── orchestrator.ts                           ← orchestrate() + records singleton
│   └── types.ts                                  ← AgentEvent, Lead, Underwriting, Contract, …
└── fixtures/
    ├── leads.json                                ← 3 demo leads
    ├── apollo.json
    ├── financials.json
    └── bureau.json
```

## Open questions / parked items

- Should the landing page also expose a "Skip to dashboard" link for the
  Monday demo, in case the 3D scene takes >2s to mount on the demo machine?
  Default plan: yes — handoff inside `app/page.tsx` will include both the
  animated CTA and a small text link directly to `/dashboard`.

## Next up (in order)

1. **Task #11 — Landing page (`/`).** Replace `app/page.tsx` stub with:
   - tsparticles ambient background (lazy, capped 60 particles, pause-on-blur)
   - r3f agent-network orb (lazy, single accent piece, dynamic import w/
     `{ ssr: false }`)
   - GSAP hero timeline orchestrating the type-in / button reveal
   - "Run Demo" → View Transitions hop to `/dashboard`
   - Skip-link for low-end machines
2. **Task #14 — Smoke + bundle audit + polish.**
   - Run with a real `ANTHROPIC_API_KEY` end-to-end at least once.
   - `prefers-reduced-motion` verification.
   - Bundle audit: keep dashboard <200KB and `/` <150KB initial JS.
   - Demo-script run-through (the 7-step in the spec).

## Commit log highlights

- `58833d9` init
- `fdd48e0` docs: approved 3-agent demo spec + session tracker
- `f94427c` feat: scaffold Next 15 + R19 + Tailwind v4 + agent infra
- `40a0d7c` feat: agents (lead/underwriting/contract/supervisor) + dashboard + SSE
- *next* checkpoint: detail pages + PDFs (about to commit)
