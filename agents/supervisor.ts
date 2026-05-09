import { z } from "zod";
import type { AgentEvent, SupervisorAlert, UnderwritingAssessment, ContractTerms } from "@/lib/types";
import { runModel } from "@/lib/anthropic";
import { liveAgentsEnabled, env } from "@/lib/env";
import { eventBus, alertBus } from "./event-bus";
import { SUPERVISOR_PROMPT } from "./prompts";
import { makeId } from "@/lib/ids";

const AlertSchema = z.object({
  title: z.string().min(1).max(160),
  body: z.string().min(1).max(800),
  suggested_action: z.string().min(1).max(280),
  severity: z.enum(["info", "warn", "human"]),
});

const RESPONSE_SHAPE = `{
  "title": string,
  "body": string,
  "suggested_action": string,
  "severity": "info" | "warn" | "human"
}`;

// ─── Triggers we care about ──────────────────────────────────────────────────

const STALL_MS = 30_000;
const lastActivityByRun = new Map<string, number>();
const activeRuns = new Set<string>();

function shouldFlag(event: AgentEvent): boolean {
  if (event.kind === "error") return true;
  // Note: agents emit `needs_human` for the dashboard's status pill, but the
  // supervisor produces its own (more specific) alert from the `finished`
  // event. Relaying the needs_human would just duplicate that alert.
  if (event.kind === "finished") {
    const out = event.output as Record<string, unknown> | undefined;
    if (event.agent === "underwriting") {
      const a = (out?.assessment ?? out) as UnderwritingAssessment | undefined;
      if (!a) return false;
      if (a.confidence === "low") return true;
      if (a.risk_score >= 40 && a.risk_score <= 55) return true;
      if (a.recommended_credit_limit_usd > 500_000) return true;
    }
    if (event.agent === "contract") {
      const t = (out?.terms ?? out) as ContractTerms | undefined;
      if (t && t.payment && t.payment.upfront_pct >= 50) return true;
    }
  }
  return false;
}

async function reviewWithLLM(
  trigger: AgentEvent,
  recent: AgentEvent[],
): Promise<SupervisorAlert | null> {
  if (!liveAgentsEnabled()) {
    return heuristicAlert(trigger);
  }
  try {
    const result = await runModel({
      model: env.supervisorModel,
      system: SUPERVISOR_PROMPT,
      user: JSON.stringify({ trigger, recent_events: recent.slice(-12) }, null, 2),
      responseShape: RESPONSE_SHAPE,
      parse: (raw) => AlertSchema.parse(raw),
      cacheSystem: true,
      thinkingBudgetTokens: 1024,
      maxTokens: 600,
      retries: 1,
    });
    return {
      id: makeId("alrt"),
      ts: Date.now(),
      agent: trigger.agent,
      runId: trigger.runId,
      severity: result.value.severity,
      title: result.value.title,
      body: result.value.body,
      suggested_action: result.value.suggested_action,
    };
  } catch {
    return heuristicAlert(trigger);
  }
}

function heuristicAlert(event: AgentEvent): SupervisorAlert | null {
  const base = { id: makeId("alrt"), ts: Date.now(), agent: event.agent, runId: event.runId };
  if (event.kind === "error") {
    return {
      ...base,
      severity: "human",
      title: `${event.agent} agent errored`,
      body: event.message,
      suggested_action: "Inspect agent logs and re-run.",
    };
  }
  if (event.kind === "finished" && event.agent === "underwriting") {
    const a = (event.output as { assessment: UnderwritingAssessment }).assessment;
    const limit = a.recommended_credit_limit_usd;
    // Order matters — the most specific / highest-stakes condition wins.
    if (limit > 500_000) {
      return {
        ...base,
        severity: "human",
        title: `Capital approval: $${limit.toLocaleString()}`,
        body: `Underwriting recommends $${limit.toLocaleString()} (risk ${a.risk_score}, ${a.confidence} confidence). Above $500K policy threshold.`,
        suggested_action: "Capital committee review before extending the line.",
      };
    }
    if (a.confidence === "low") {
      return {
        ...base,
        severity: "human",
        title: "Low-confidence assessment — needs senior eyes",
        body: `Risk ${a.risk_score} → $${limit.toLocaleString()} but the model flagged low confidence. ${a.red_flags.length ? `Flags: ${a.red_flags.slice(0, 2).map((f) => f.replace(/\.$/, "")).join("; ")}.` : "No clear red flags — borderline data."}`,
        suggested_action: "Senior underwriter to sanity-check before exposure is committed.",
      };
    }
    if (a.risk_score >= 40 && a.risk_score <= 55) {
      return {
        ...base,
        severity: "warn",
        title: `Borderline risk score ${a.risk_score} — manual decision`,
        body: `Underwriting lands in the 40–55 manual-decision band ($${limit.toLocaleString()}, ${a.confidence} confidence). Outside the auto-approve and auto-reject zones.`,
        suggested_action: "Senior underwriter to make the final call.",
      };
    }
  }
  if (event.kind === "finished" && event.agent === "contract") {
    const t = (event.output as { terms: ContractTerms }).terms;
    if (t.payment.upfront_pct >= 50) {
      return {
        ...base,
        severity: "human",
        title: "Hard Terms drafted — sales should warm-handover",
        body: `${t.parties.customer} contract requires ${t.payment.upfront_pct}% upfront. Customer should hear this from a person, not a docusign link.`,
        suggested_action: `Sales lead briefs ${t.parties.customer} before sending.`,
      };
    }
  }
  return null;
}

// ─── Stall detector ──────────────────────────────────────────────────────────

function startStallSweeper() {
  if (typeof setInterval === "undefined") return;
  globalThis.setInterval(() => {
    const now = Date.now();
    for (const runId of activeRuns) {
      const last = lastActivityByRun.get(runId) ?? 0;
      if (now - last > STALL_MS) {
        const stallEvent: AgentEvent = {
          kind: "error",
          agent: "supervisor",
          runId,
          ts: now,
          message: `Stall detected: no events for ${Math.round((now - last) / 1000)}s.`,
        };
        // Synthetic event for the supervisor to flag once.
        activeRuns.delete(runId);
        void reviewWithLLM(stallEvent, eventBus.history(20)).then((a) => {
          if (a) alertBus.publish(a);
        });
      }
    }
  }, 5000);
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __oceanx_supervisor_started: boolean | undefined;
}

export function ensureSupervisor() {
  if (globalThis.__oceanx_supervisor_started) return;
  globalThis.__oceanx_supervisor_started = true;

  eventBus.subscribe((e) => {
    lastActivityByRun.set(e.runId, e.ts);
    if (e.kind === "started") activeRuns.add(e.runId);
    if (e.kind === "finished" || e.kind === "error") activeRuns.delete(e.runId);

    if (shouldFlag(e)) {
      const recent = eventBus.history(20);
      void reviewWithLLM(e, recent).then((alert) => {
        if (alert) alertBus.publish(alert);
      });
    }
  });

  startStallSweeper();
}
