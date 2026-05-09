import { z } from "zod";
import type { Lead, LeadScore, RawLead } from "@/lib/types";
import { runModel } from "@/lib/anthropic";
import { liveAgentsEnabled, env } from "@/lib/env";
import { enrichCompany } from "@/connectors/apollo";
import { createDeal, bookMeeting } from "@/connectors/hubspot";
import { type AgentContext, beat, runAgent } from "./runner";
import { LEAD_SCORING_PROMPT } from "./prompts";

const ScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  rationale: z.string().min(1).max(400),
  suggested_channel: z.enum(["outbound-email", "linkedin", "broker", "events"]),
});

const RESPONSE_SHAPE = `{
  "score": number 0..100,
  "rationale": string,
  "suggested_channel": "outbound-email" | "linkedin" | "broker" | "events"
}`;

async function scoreLead(
  ctx: AgentContext,
  raw: RawLead,
  enriched: Awaited<ReturnType<typeof enrichCompany>>,
): Promise<LeadScore> {
  if (!liveAgentsEnabled()) return fallbackScore(raw, enriched);

  const userMsg = JSON.stringify(
    {
      lead: { name: raw.name, company: raw.company, requestedCreditUsd: raw.requestedCreditUsd, source: raw.source, notes: raw.notes },
      enrichment: enriched,
    },
    null,
    2,
  );

  const result = await runModel({
    model: env.workerModel,
    system: LEAD_SCORING_PROMPT,
    user: userMsg,
    responseShape: RESPONSE_SHAPE,
    parse: (raw) => ScoreSchema.parse(raw),
    cacheSystem: true,
    maxTokens: 400,
  });

  ctx.emit({
    kind: "llm",
    model: env.workerModel,
    tokens_in: result.tokens_in,
    tokens_out: result.tokens_out,
    cached: result.cached,
    latency_ms: result.latency_ms,
  });

  return result.value;
}

function fallbackScore(raw: RawLead, enriched: Awaited<ReturnType<typeof enrichCompany>>): LeadScore {
  // Used when live agents disabled or live call fails.
  let s = 50;
  if (enriched.employees >= 30 && enriched.employees <= 250) s += 15;
  if (["bootstrapped", "growth"].includes(enriched.fundingStage)) s += 10;
  if (["SG", "MY", "UK", "US", "PL"].includes(enriched.hqCountry)) s += 10;
  if (raw.requestedCreditUsd > 1_500_000) s -= 8;
  if (raw.requestedCreditUsd < 50_000) s -= 6;
  s = Math.max(0, Math.min(100, s));
  const channel: LeadScore["suggested_channel"] =
    s >= 75 && enriched.socials.linkedin
      ? "linkedin"
      : s >= 60
        ? "outbound-email"
        : raw.source === "broker"
          ? "broker"
          : "events";
  return {
    score: s,
    rationale: `Heuristic fit: ${enriched.industry}, ${enriched.employees} employees, ${enriched.fundingStage} stage in ${enriched.hqCountry}.`,
    suggested_channel: channel,
  };
}

export async function runLeadCapture(raw: RawLead): Promise<Lead> {
  const { output } = await runAgent("lead-capture", raw, async (input, ctx) => {
    ctx.emit({ kind: "step", label: "Enriching via Apollo" });
    const enriched = await enrichCompany(input.company);
    await beat(120);

    ctx.emit({ kind: "step", label: "Scoring against ICP", data: { company: enriched.domain } });
    let score: LeadScore;
    try {
      score = await scoreLead(ctx, input, enriched);
    } catch (err) {
      // Live call failed — fall through to heuristic and warn the supervisor.
      ctx.emit({
        kind: "step",
        label: "Score via heuristic (LLM unavailable)",
        data: { error: err instanceof Error ? err.message : String(err) },
      });
      score = fallbackScore(input, enriched);
    }

    ctx.emit({ kind: "step", label: `Score ${score.score} → ${score.suggested_channel}` });
    await beat(140);

    ctx.emit({ kind: "step", label: "Pushing to HubSpot" });
    const deal = await createDeal({
      email: input.email,
      name: input.name,
      company: input.company,
      amount_usd: input.requestedCreditUsd,
    });

    ctx.emit({ kind: "step", label: "Booking meeting slot" });
    const meeting = await bookMeeting({ contact_id: deal.contact_id, duration_min: 30 });

    if (score.score < 45) {
      ctx.emit({
        kind: "needs_human",
        reason: `Lead "${input.company}" scored ${score.score} — below auto-qualify threshold.`,
        suggested_action: "Review and decide whether to nurture or drop.",
      });
    }

    const lead: Lead = {
      id: input.id,
      raw: input,
      enriched,
      score,
      hubspot_deal_id: deal.deal_id,
      meeting_url: meeting.meeting_url,
      createdAt: Date.now(),
    };
    return lead;
  });
  return output;
}
