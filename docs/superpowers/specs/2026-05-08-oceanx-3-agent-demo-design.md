# OceanX AI — 3-Agent Demo

**Date:** 2026-05-08
**Demo deadline:** Monday 2026-05-11, group session (Singapore time)
**Author:** session 1
**Status:** Approved (initial design)

## 1. Goal

Build a working live demo for the OceanX AI intern automation assignment that
shows a multi-agent pipeline running end-to-end:

```
Lead Capture  →  Underwriting  →  Contract Generation
                          ↑
                Master Supervisor (monitors all three)
```

The demo must make the assignment's core principle visible:

> Humans only do relationships + capital decisions. Agents run everything else.

The two human checkpoints from the assignment (customer meeting, supplier
payment approval) are surfaced in the UI as deliberate "human required" cards
that the supervisor produces.

## 2. Non-goals

- Auth, multi-tenant, RBAC.
- Real third-party SaaS integrations. The assignment explicitly allows mocks
  ("Option 2 — Mock API Demo") and live keys are too risky during a demo.
- Mobile responsive beyond "doesn't crash on a phone." Interviewer is on a
  laptop in a screenshare.
- Test coverage beyond a happy-path smoke test. Three days, not three weeks.
- Feature parity with the full 9-agent ideal architecture in the assignment.
  Three workers + supervisor is the scoped deliverable.

## 3. The agents

### 3.1 Lead Capture Agent (worker)

- **Input:** raw lead (name, company, email, requested credit ballpark).
- **Steps:**
  1. Enrich via mocked Apollo connector (firmographics, employee count,
     funding stage, social links).
  2. Score fit using Claude (Sonnet 4.6) against a fixed ICP rubric. Returns
     `{ score: 0..100, rationale, suggested_channel }`.
  3. Push to mocked HubSpot connector (creates contact + deal).
  4. Book a meeting slot via mocked HubSpot meetings (returns calendar link).
- **Output:** `Lead { id, enriched, score, hubspot_deal_id, meeting_url }`.

### 3.2 Underwriting Agent (worker)

- **Input:** approved lead + requested credit limit + order ballpark.
- **Steps:**
  1. Pull mocked bank statements + financial summary (12 months).
  2. Pull mocked credit bureau snapshot (Equifax-style).
  3. Have Claude (Sonnet 4.6) produce a structured assessment:
     ```ts
     {
       risk_score: 0..100,
       recommended_credit_limit_usd: number,
       red_flags: string[],
       rationale: string,
       confidence: "low" | "medium" | "high"
     }
     ```
  4. Render a PDF underwriting report via @react-pdf/renderer.
- **Output:** `Underwriting { id, lead_id, risk_score, credit_limit, pdf_url, confidence }`.

### 3.3 Contract Agent (worker)

- **Input:** approved underwriting + order details (goods, supplier, customer,
  margin target).
- **Steps:**
  1. Have Claude (Sonnet 4.6) draft contract terms (parties, payment terms,
     delivery, jurisdiction, default clauses) given a template.
  2. Render PDF contract via @react-pdf/renderer.
  3. Send to mocked DocuSign connector → returns envelope id + signing URL.
- **Output:** `Contract { id, underwriting_id, pdf_url, docusign_envelope_id, signing_url }`.

### 3.4 Master Supervisor Agent

- Subscribes to all worker events via the in-process EventBus.
- Triggers on: stalls (>30s with no event), errors, low-confidence outputs,
  outputs flagged "needs human" by a worker.
- Uses Claude **Opus 4.7** with extended thinking to produce a short summary
  of *what's wrong* and *what action a human should take*.
- Surfaces alerts as cards in the dashboard's "Supervisor" panel.
- Also produces a one-line health note every N events ("3 agents running, 0
  stalled, 1 awaiting human").

## 4. Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15 (App Router, RSC) + React 19 |
| Language | TypeScript strict |
| Styling | Tailwind v4, custom black + electric-cyan token palette |
| Animation | Motion (primary), GSAP (one hero timeline only), Lottie (micro-illustrations on agent state changes), @react-three/fiber + drei (one accent 3D scene), tsparticles (ambient hero only), View Transitions API (page transitions) |
| State | Zustand (client) + Server Actions (mutations) |
| AI | Anthropic SDK; **Sonnet 4.6** for workers, **Opus 4.7** for supervisor; prompt caching enabled |
| PDF | @react-pdf/renderer (Node runtime) |
| Realtime | Server-Sent Events (one-way agent → UI) |
| Persistence | In-memory + localStorage. Resets across deploys; OK for demo |
| 3rd-party APIs | All mocked with realistic JSON fixtures (Apollo, HubSpot, Xero, DocuSign, GoCardless, CIN7) |
| Tooling | pnpm, Biome (lint+format), Vitest, Playwright (smoke only) |

## 5. Architecture

```
Browser ──SSE──> /api/events                  (live agent activity stream)
   │
   ├─ POST /api/leads        → Lead Capture Agent runner
   ├─ POST /api/underwrite   → Underwriting Agent runner
   ├─ POST /api/contract     → Contract Agent runner
   └─ GET  /api/supervisor   → snapshot supervisor state

Server (Next.js):
   AgentRunner (one per agent type)
       │   publishes
       ▼
   EventBus (in-process pub/sub)
       │   subscribed by
       ├──> SSE pump (per-client filtered stream)
       └──> Supervisor (Opus 4.7)
              │
              ▼
       Alerts queue (read by /api/supervisor and dashboard)

   Connectors (all mocked):
     apollo, hubspot, xero, docusign, gocardless, cin7
     - each exposes the same shape it would in real life
     - one DEMO_MODE flag chooses fixture vs. (future) live sandbox
```

### 5.1 EventBus contract

```ts
type AgentEvent =
  | { kind: "started"; agent: AgentName; runId: string; input: unknown }
  | { kind: "step"; agent: AgentName; runId: string; label: string; data?: unknown }
  | { kind: "llm"; agent: AgentName; runId: string; model: string; tokens_in: number; tokens_out: number; cached?: boolean }
  | { kind: "finished"; agent: AgentName; runId: string; output: unknown }
  | { kind: "error"; agent: AgentName; runId: string; message: string }
  | { kind: "needs_human"; agent: AgentName; runId: string; reason: string };
```

### 5.2 Why these choices over alternatives

- **Next.js 15 over Vite + Express:** server actions + route handlers + RSC
  give us streaming + low client bundle without wiring two servers.
- **SSE over WebSockets:** one-way, fewer moving parts, trivially
  reconnectable.
- **In-memory over SQLite:** demo state lives <1h. A database adds chrome that
  doesn't pay for itself in 3 days.
- **Mocked third parties over sandbox accounts:** assignment allows it; live
  sandbox auth during a 1h demo is a pure downside.

## 6. Pages

- `/` — animated entry. tsparticles ambient bg + 3D agent-network orb +
  "Run Demo" CTA. Auto-redirects to `/dashboard` after CTA.
- `/dashboard` — main demo view:
  - Top: pipeline visualization (4 nodes, animated edges when events fire).
  - Middle: 4 agent cards (live status, last event, mini-spark of activity).
  - Right: supervisor alerts panel.
  - Bottom: event log (virtualized).
  - Header: "Trigger lead" button + "Reset demo" button.
- `/lead/[id]` — lead detail with enrichment data + score rationale.
- `/underwriting/[id]` — risk scorecard + embedded PDF preview.
- `/contract/[id]` — terms summary + embedded PDF preview + DocuSign mock.

## 7. File structure

```
oceanai/
  app/
    (marketing)/page.tsx                 # landing
    dashboard/page.tsx                   # main demo
    lead/[id]/page.tsx
    underwriting/[id]/page.tsx
    contract/[id]/page.tsx
    api/
      events/route.ts                    # SSE
      leads/route.ts
      underwrite/route.ts
      contract/route.ts
      supervisor/route.ts
  agents/
    runner.ts                            # base AgentRunner
    lead-capture.ts
    underwriting.ts
    contract.ts
    supervisor.ts
    event-bus.ts
    prompts/                             # versioned prompt files
      underwriting.md
      contract.md
      lead-scoring.md
      supervisor.md
  connectors/                            # all mocked
    apollo.ts
    hubspot.ts
    xero.ts
    docusign.ts
    gocardless.ts
    cin7.ts
  components/
    agent-card.tsx
    pipeline.tsx
    event-log.tsx
    supervisor-panel.tsx
    pdf/underwriting-report.tsx
    pdf/contract.tsx
    three/agent-network.tsx              # lazy
    fx/particles-bg.tsx                  # lazy
  lib/
    anthropic.ts
    store.ts                             # Zustand
    types.ts
    sse.ts
  fixtures/
    leads.json
    financials.json
    bureau.json
    apollo.json
  TRACKER.md                             # session continuity log (root)
  .env.example
```

## 8. Performance plan

The "rich animations + not laggy" requirement is binary, not a polish item.

- Lazy-load 3D, Lottie, particles per route via `next/dynamic(..., { ssr: false })`.
- Particles capped at 60, `pauseOnBlur: true`.
- Animations use `transform` and `opacity` only — never `top/left/width`.
- `LayoutGroup` + FLIP for list reorders.
- React 19 `useTransition` to keep SSE updates non-blocking.
- Bundle target: <150KB initial JS for non-3D routes (verified with
  `next build` analysis).
- `prefers-reduced-motion` honored; degrades to opacity-only transitions.
- One animation library "owns" each surface — no two libs animating the same
  element.

## 9. Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Live Anthropic call fails mid-demo | medium | `DEMO_MODE=fixtures` env returns canned outputs if API errors; visible toast says "fallback engaged" |
| Animation jank on weak laptop | medium | Lazy splits, transforms only, reduced-motion respected |
| SSE timeout on Vercel (300s) | low (demo is local) | Demo is run locally; document Pusher/Ably swap path if hosting |
| PDF rendering breaks on edge runtime | known | Force Node runtime on `/api/contract` and `/api/underwrite` |
| Prompt drifts producing JSON parse errors | medium | Use Anthropic structured outputs / JSON mode + Zod validation + 1 retry |

## 10. Out of scope (explicit YAGNI list)

- Authentication, RBAC, multi-tenancy.
- Real Apollo / HubSpot / Xero / DocuSign / GoCardless / CIN7 integration.
- Persistent database.
- Comprehensive test suite.
- i18n, a11y beyond keyboard nav + reduced-motion.
- Mobile-first responsive design.
- Full 9-agent system from the assignment's "ideal architecture."

## 11. Demo script (what we'll show on Monday)

1. Land on `/`. Particles + 3D orb. Click "Run Demo." (10s)
2. `/dashboard`. Click "Trigger Lead." A lead enters the pipeline. (5s)
3. Lead Capture Agent runs visibly: enrichment → score → HubSpot push →
   meeting booked. Card animates through states. (~15s)
4. Underwriting Agent picks up. Steps stream in. PDF report appears. Open it. (~25s)
5. Contract Agent picks up. Drafts terms. PDF appears. DocuSign mock returns
   a signing URL. (~25s)
6. Trigger a deliberately bad lead to show Supervisor flagging "needs human"
   with a written rationale. (~20s)
7. Show event log + token counters (proves real LLM calls). (10s)

Total: ~2 minutes of show time. Leaves 58 minutes for Q&A.

## 12. Success criteria (binary)

- [ ] Pipeline triggers end-to-end against real Anthropic API.
- [ ] All four agents emit events visible in dashboard.
- [ ] Supervisor flags at least one human-checkpoint scenario.
- [ ] Underwriting and Contract PDFs render and open.
- [ ] No frame drop on a 2020-era laptop during full pipeline run.
- [ ] `DEMO_MODE=fixtures` produces a clean run with zero network calls.
- [ ] `.env.example` lists every required key.
- [ ] `TRACKER.md` reflects current state at end of every session.
