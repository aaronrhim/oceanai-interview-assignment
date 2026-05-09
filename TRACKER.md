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

## Current status (paused after smoke + polish pass; ready for live-LLM smoke)

**Build status:** `npx next build` is GREEN. All routes compile.

```
Route (app)                                 Size  First Load JS
○ /                                     31.3 kB         156 kB
○ /_not-found                            995 B          116 kB
ƒ /api/events                            132 B          115 kB
ƒ /api/pipeline                          132 B          115 kB
ƒ /api/state                             132 B          115 kB
ƒ /contract/[id]                         168 B          119 kB
ƒ /contract/[id]/pdf                     132 B          115 kB
ƒ /dashboard                           43.8 kB          169 kB
ƒ /lead/[id]                             168 B          119 kB
ƒ /underwriting/[id]                     168 B          119 kB
ƒ /underwriting/[id]/pdf                 132 B          115 kB
First Load JS shared by all             115 kB
```

`/` is 156 kB First Load — the page-specific 31.3 kB is essentially gsap core
(~30 kB minified+gz). 6 kB over the 150 kB soft target. tsparticles + r3f +
three are correctly tree-split out (would add 200 kB+ to initial if eager).

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

**Polish-pass smoke (DEMO_MODE=fixtures) confirmed:**

- All 3 seeds run end-to-end. Records persist (`/api/state` returns leads,
  uw, contracts). Detail pages + PDFs all return 200.
- Supervisor alerts now produce **one specific alert per condition** instead
  of a generic relay + a special-case duplicate. Verified output:
  - Alpha (clean): 0 alerts.
  - Beta ($1.1M): 1 alert "Capital approval: $770,000".
  - Gamma (small + low-confidence + Hard Terms): 2 alerts —
    "Low-confidence assessment — needs senior eyes" with red flags listed,
    and "Hard Terms drafted — sales should warm-handover".
- Agent `needs_human` events still fire (drive the dashboard pill purple)
  with case-specific reason text — no more "capital approval" text on $30K
  cases.
- Server-side reset works: `DELETE /api/state` clears records + event +
  alert buses. Trigger-bar Reset button now hits this before clearing the
  client store, so a refresh-after-reset doesn't re-hydrate stale data.

**Not yet built / verified:**

- **Live LLM smoke.** Has not been run in this session (no API key set).
  Should run once with a real `ANTHROPIC_API_KEY` to verify token counters
  populate, supervisor uses Opus 4.7 + extended thinking, and JSON-mode
  parsing holds across all three workers.

**Open verification gaps:**

- Visual run in a real browser. The GSAP timeline, r3f orb, particles, and
  the `/` → `/dashboard` View Transition cross-fade have only been
  smoke-checked at the HTML/SSR level. They need a pixel pass on the demo
  machine.
- `prefers-reduced-motion` visual confirmation (Chrome devtools toggle).
- The dashboard mounts the SSE hook unconditionally; reconnect behavior
  on dev-server restart not yet verified.

## Decisions log

Append-only. Newest at the top.

### 2026-05-08 — Polish pass: alert dedup, status-pill flicker fix, server reset

Five fixes from the end-to-end smoke (all 3 seeds, fixtures mode):

- **`agents/underwriting.ts`** — the `needs_human` reason text was a single
  generic line ("Underwriting outcome requires capital approval…") regardless
  of which of the three trigger conditions fired. For gamma's $30K
  low-confidence case this said "capital approval" wrongly. Split into
  three branches: capital threshold ($500K+), low confidence, mid-score
  manual band — each with its own specific reason + suggested_action.
- **`agents/supervisor.ts`** — the supervisor used to relay **needs_human**
  events as alerts AND emit its own specific alert from the **finished**
  event for the same condition. Demo would surface 2 redundant alerts per
  flagged run. Removed the needs_human relay (the more-specific finished-
  derived alert wins) and expanded `heuristicAlert` to handle low-confidence
  and mid-score underwriting cases (previously fell through to null after
  shouldFlag returned true). Result: one specific alert per flagged
  condition. Also stripped trailing periods from red-flag joins so bodies
  don't end in "..".
- **`lib/store.ts` ingestEvent** — `needs_human → finished` arrived back-to-
  back from agents that do both, so the dashboard pill flickered purple
  for milliseconds then went green. Made `finished` a no-op when the agent
  is currently in `needs_human`. Next `started` resets to running.
- **`app/api/state/route.ts`** — added `DELETE` handler that clears records
  + eventBus + alertBus. Previously the trigger-bar Reset button was
  client-only; refreshing the page right after Reset re-hydrated the prior
  run's state from /api/state. Demo footgun.
- **`components/trigger-bar.tsx`** — Reset now `fetch("/api/state",
  { method: "DELETE" })` then clears the client store. Page-refresh-safe.

Also confirmed during smoke: detail pages + PDFs all 200, dashboard still
renders cleanly, build still GREEN with same bundle sizes (156 kB / / and
169 kB / /dashboard).

### 2026-05-08 — Landing page (`/`) built; gsap + r3f + tsparticles all wired

- New files:
  - `app/page.tsx` — server entry, sets metadata, reads `liveAgentsEnabled()`
    so the eyebrow chip can show "Live Anthropic" vs. "Heuristic fallback".
  - `components/landing/landing-shell.tsx` — client orchestrator. Owns the
    GSAP timeline, the View-Transition hop, and the layout.
  - `components/landing/particles-bg.tsx` — tsparticles via `@tsparticles/react`
    + `@tsparticles/slim`. Capped 60 particles, `pauseOnBlur`,
    `pauseOnOutsideViewport`, `fpsLimit:60`. Lazy via `next/dynamic` w/ `ssr:false`.
  - `components/landing/agent-network.tsx` — r3f scene: wireframe icosahedron
    core + soft glow sphere + 4 satellites orbiting at different radii/speeds.
    DPR capped `[1, 1.5]`, `meshBasicMaterial` only (no expensive shaders).
    Lazy via `next/dynamic` w/ `ssr:false`.
- GSAP timeline: `gsap.context(...)` scoped to `containerRef`, animates
  `.hero-brand → .hero-eyebrow → .hero-title → .hero-sub → .hero-pipeline > * →
  .hero-cta → .hero-skip → .hero-stats > *` with overlapping eases. Cleaned
  up via `ctx.revert()` on unmount.
- `prefers-reduced-motion`: detected via `window.matchMedia` — when reduced,
  GSAP is skipped entirely and elements stay at their visible default
  (because we use `gsap.from()`, the natural state is opacity:1).
- View-Transition hop: feature-detected `document.startViewTransition`,
  falls back to plain `router.push`. CSS animations defined in `globals.css`
  (`::view-transition-old/new(root)` → vt-fade-out / vt-fade-in) take care
  of the cross-fade automatically.
- FX layers (particles + 3D) deferred one frame past mount via
  `requestAnimationFrame` so the first paint is the static hero (no white
  flash, no FOIT-style stall waiting on canvas).
- Skip-link below the CTA: `<Link href="/dashboard" prefetch>` — gives the
  demo machine an escape hatch if the 3D scene chugs.
- Bundle: `/` is now 156 kB First Load (was a 118 kB stub). The 31.3 kB
  page-specific is gsap core. r3f + drei + three.js + tsparticles are NOT in
  the initial chunk (they'd push it past 350 kB if eager). 6 kB over the
  150 kB soft target — acceptable for a demo with a planned animation lib.
- Lint: only NEW lint warning was `noArrayIndexKey` on the satellite map,
  fixed by keying on the satellite's `radius+phase`. The two
  `noSvgWithoutTitle` warnings on the Logo/PlayIcon SVGs are consistent
  with the existing dashboard Logo (already lints the same way).

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
│   ├── page.tsx                                  ← landing (server entry)
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
│   ├── landing/
│   │   ├── landing-shell.tsx                    ← client orchestrator + GSAP
│   │   ├── particles-bg.tsx                     ← tsparticles, lazy ssr:false
│   │   └── agent-network.tsx                    ← r3f orb, lazy ssr:false
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

1. **Task #14 — Smoke + bundle audit + polish.**
   - Run `/` and `/dashboard` in a real browser. Confirm GSAP timeline plays,
     particles + 3D orb mount cleanly, and the "Run the demo" CTA does the
     View-Transition cross-fade into `/dashboard`.
   - Run with a real `ANTHROPIC_API_KEY` end-to-end at least once. Trigger a
     lead, watch the pipeline animate, open the underwriting + contract PDFs.
   - Trigger a deliberately-bad lead (low score / huge ask) and confirm the
     supervisor surfaces a "needs human" alert with rationale.
   - `prefers-reduced-motion` verification: macOS / Chrome devtools toggle.
     GSAP should bypass; particles/3D should still render but feel calmer.
   - Bundle audit: dashboard <200 KB ✅ (169 KB), `/` is 156 KB (6 KB over the
     150 KB soft target — gsap core. Decide whether to lazy-load gsap or
     leave it.).
   - Demo-script run-through (the 7-step in the spec).

## Commit log highlights

- `58833d9` init
- `fdd48e0` docs: approved 3-agent demo spec + session tracker
- `f94427c` feat: scaffold Next 15 + R19 + Tailwind v4 + agent infra
- `40a0d7c` feat: agents (lead/underwriting/contract/supervisor) + dashboard + SSE
- `8d98a7d` feat: detail pages (lead/underwriting/contract) + react-pdf reports
- `e592d99` feat: landing page with gsap hero + r3f orb + tsparticles bg
- *next* checkpoint: polish pass — alert dedup + reset endpoint (about to commit)
