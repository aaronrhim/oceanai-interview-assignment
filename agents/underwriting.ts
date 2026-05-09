import { z } from "zod";
import type { Lead, Underwriting, UnderwritingAssessment } from "@/lib/types";
import { runModel } from "@/lib/anthropic";
import { liveAgentsEnabled, env } from "@/lib/env";
import { pullBureau, pullFinancials } from "@/connectors/credit-bureau";
import { type AgentContext, beat, runAgent } from "./runner";
import { UNDERWRITING_PROMPT } from "./prompts";
import { makeId } from "@/lib/ids";

const AssessmentSchema = z.object({
  risk_score: z.number().int().min(0).max(100),
  recommended_credit_limit_usd: z.number().int().nonnegative(),
  red_flags: z.array(z.string()).max(20),
  rationale: z.string().min(1).max(800),
  confidence: z.enum(["low", "medium", "high"]),
});

const RESPONSE_SHAPE = `{
  "risk_score": int 0..100,
  "recommended_credit_limit_usd": number,
  "red_flags": string[],
  "rationale": string,
  "confidence": "low" | "medium" | "high"
}`;

export interface UnderwritingInput {
  lead: Lead;
  order_size_usd: number;
}

async function assess(
  ctx: AgentContext,
  inputs: Underwriting["inputs"],
): Promise<UnderwritingAssessment> {
  if (!liveAgentsEnabled()) return fallbackAssessment(inputs);

  const userMsg = JSON.stringify(inputs, null, 2);
  const result = await runModel({
    model: env.workerModel,
    system: UNDERWRITING_PROMPT,
    user: userMsg,
    responseShape: RESPONSE_SHAPE,
    parse: (raw) => AssessmentSchema.parse(raw),
    cacheSystem: true,
    maxTokens: 800,
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

function fallbackAssessment(inputs: Underwriting["inputs"]): UnderwritingAssessment {
  const f = inputs.financials;
  const b = inputs.bureau;
  const avgInflow = avg(f.monthly_inflow_usd);
  const trend = avg(f.monthly_inflow_usd.slice(-6)) - avg(f.monthly_inflow_usd.slice(0, 6));

  let s = 60;
  if (f.current_ratio > 1.3) s += 8;
  if (f.current_ratio < 1.0) s -= 12;
  if (f.debt_to_equity < 1.0) s += 6;
  if (f.debt_to_equity > 2.0) s -= 14;
  if (b.score >= 70) s += 8;
  if (b.score < 55) s -= 8;
  if (b.delinquencies_24m > 0) s -= 6;
  if (b.utilization > 0.85) s -= 8;
  if (trend > 0) s += 4;
  if (trend < 0) s -= 4;
  s = Math.max(0, Math.min(100, s));

  const base = Math.min(inputs.requested_credit_usd, avgInflow * 6);
  const mult = s < 40 ? 0.4 : s < 60 ? 0.7 : s < 80 ? 1.0 : 1.2;
  let limit = Math.round((base * mult) / 5000) * 5000;
  limit = Math.min(limit, Math.round(f.revenue_ttm_usd * 0.25));
  limit = Math.min(limit, Math.round(inputs.requested_credit_usd * 1.5));

  const red_flags: string[] = [];
  if (f.current_ratio < 1.0)
    red_flags.push(`Current ratio of ${f.current_ratio.toFixed(2)} — short-term obligations exceed liquid assets.`);
  if (f.debt_to_equity > 2.0)
    red_flags.push(`Debt/equity ${f.debt_to_equity.toFixed(2)} is leveraged.`);
  if (b.utilization > 0.85)
    red_flags.push(`Credit utilization ${(b.utilization * 100).toFixed(0)}% suggests stretched lines.`);
  if (b.delinquencies_24m > 0)
    red_flags.push(`${b.delinquencies_24m} delinquency in last 24 months.`);
  if (trend < 0) red_flags.push("Monthly inflow trending down over the last 6 months.");

  const confidence: "low" | "medium" | "high" =
    s <= 30 || s >= 70 ? "high" : s >= 40 && s <= 69 ? "medium" : "low";

  return {
    risk_score: s,
    recommended_credit_limit_usd: limit,
    red_flags,
    rationale: `Heuristic-only assessment (LLM unavailable). Bureau ${b.score}, current ratio ${f.current_ratio}, D/E ${f.debt_to_equity}, EBITDA margin ${(f.ebitda_margin * 100).toFixed(1)}%.`,
    confidence,
  };
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export async function runUnderwriting(input: UnderwritingInput): Promise<Underwriting> {
  const { output } = await runAgent("underwriting", input, async (i, ctx) => {
    ctx.emit({ kind: "step", label: "Pulling 12-month bank summary" });
    const financials = await pullFinancials(i.lead.raw.company);

    ctx.emit({ kind: "step", label: "Pulling credit-bureau snapshot" });
    const bureau = await pullBureau(i.lead.raw.company);

    const inputs: Underwriting["inputs"] = {
      requested_credit_usd: i.lead.raw.requestedCreditUsd,
      order_size_usd: i.order_size_usd,
      financials,
      bureau,
    };

    ctx.emit({ kind: "step", label: "Assessing risk" });
    let assessment: UnderwritingAssessment;
    try {
      assessment = await assess(ctx, inputs);
    } catch (err) {
      ctx.emit({
        kind: "step",
        label: "Assess via heuristic (LLM unavailable)",
        data: { error: err instanceof Error ? err.message : String(err) },
      });
      assessment = fallbackAssessment(inputs);
    }

    ctx.emit({
      kind: "step",
      label: `Risk ${assessment.risk_score} → $${assessment.recommended_credit_limit_usd.toLocaleString()} (${assessment.confidence})`,
    });
    await beat(180);

    ctx.emit({ kind: "step", label: "Rendering PDF report" });
    const id = makeId("uwr");
    const pdf_url = `/underwriting/${id}/pdf`;
    await beat(220);

    if (
      assessment.confidence === "low" ||
      (assessment.risk_score >= 40 && assessment.risk_score <= 55) ||
      assessment.recommended_credit_limit_usd > 500_000
    ) {
      ctx.emit({
        kind: "needs_human",
        reason: `Underwriting outcome requires capital approval (score ${assessment.risk_score}, $${assessment.recommended_credit_limit_usd.toLocaleString()}, confidence ${assessment.confidence}).`,
        suggested_action: "Capital committee review.",
      });
    }

    const u: Underwriting = {
      id,
      lead_id: i.lead.id,
      inputs,
      assessment,
      pdf_url,
      createdAt: Date.now(),
    };
    return u;
  });
  return output;
}
