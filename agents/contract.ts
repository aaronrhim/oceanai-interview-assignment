import { z } from "zod";
import type { Contract, ContractTerms, Underwriting, Lead } from "@/lib/types";
import { runModel } from "@/lib/anthropic";
import { liveAgentsEnabled, env } from "@/lib/env";
import { sendEnvelope } from "@/connectors/docusign";
import { type AgentContext, beat, runAgent } from "./runner";
import { CONTRACT_PROMPT } from "./prompts";
import { makeId } from "@/lib/ids";

const TermsSchema = z.object({
  parties: z.object({ customer: z.string(), supplier: z.string() }),
  goods: z.string(),
  total_value_usd: z.number().int().positive(),
  margin_pct: z.number().min(0).max(80),
  payment: z.object({
    upfront_pct: z.number().min(0).max(100),
    on_delivery_pct: z.number().min(0).max(100),
    weekly_installments_pct: z.number().min(0).max(100),
    weeks: z.number().int().min(0).max(52),
  }),
  delivery: z.object({ incoterms: z.string(), eta_days: z.number().int().min(1).max(180) }),
  jurisdiction: z.string(),
  default_clause: z.string(),
  signatories: z
    .array(z.object({ name: z.string(), role: z.string(), email: z.string() }))
    .min(2),
});

const RESPONSE_SHAPE = `{
  "parties": { "customer": string, "supplier": string },
  "goods": string,
  "total_value_usd": number,
  "margin_pct": number,
  "payment": {
    "upfront_pct": number, "on_delivery_pct": number,
    "weekly_installments_pct": number, "weeks": number
  },
  "delivery": { "incoterms": string, "eta_days": number },
  "jurisdiction": string,
  "default_clause": string,
  "signatories": [{ "name": string, "role": string, "email": string }]
}`;

export interface ContractInput {
  lead: Lead;
  underwriting: Underwriting;
  goods: string;
  supplier: string;
  total_value_usd: number;
  margin_pct: number;
}

async function draftTerms(ctx: AgentContext, input: ContractInput): Promise<ContractTerms> {
  if (!liveAgentsEnabled()) return fallbackTerms(input);

  const userMsg = JSON.stringify(
    {
      customer: input.lead.raw.company,
      customer_country: input.lead.enriched.hqCountry,
      customer_signer: { name: input.lead.raw.name, email: input.lead.raw.email },
      supplier: input.supplier,
      goods: input.goods,
      total_value_usd: input.total_value_usd,
      margin_pct: input.margin_pct,
      underwriting: {
        risk_score: input.underwriting.assessment.risk_score,
        approved_credit_limit: input.underwriting.assessment.recommended_credit_limit_usd,
        confidence: input.underwriting.assessment.confidence,
      },
    },
    null,
    2,
  );

  const result = await runModel({
    model: env.workerModel,
    system: CONTRACT_PROMPT,
    user: userMsg,
    responseShape: RESPONSE_SHAPE,
    parse: (raw) => TermsSchema.parse(raw),
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

  // Sanity: percentages must sum to 100. If model drifts, normalize.
  const p = result.value.payment;
  const total = p.upfront_pct + p.on_delivery_pct + p.weekly_installments_pct;
  if (total !== 100 && total > 0) {
    const k = 100 / total;
    p.upfront_pct = round1(p.upfront_pct * k);
    p.on_delivery_pct = round1(p.on_delivery_pct * k);
    p.weekly_installments_pct = round1(100 - p.upfront_pct - p.on_delivery_pct);
  }
  return result.value;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function fallbackTerms(input: ContractInput): ContractTerms {
  const score = input.underwriting.assessment.risk_score;
  const conf = input.underwriting.assessment.confidence;
  const eu = ["DE", "FR", "IT", "ES", "NL", "PL", "SE", "DK", "FI", "BE", "AT", "IE", "PT"];
  const country = input.lead.enriched.hqCountry;
  const incoterms = eu.includes(country) ? "CIF Rotterdam" : "FOB Singapore";
  const jurisdiction = ["GB", "US"].includes(country)
    ? country
    : eu.includes(country)
      ? country
      : "Singapore";

  let payment: ContractTerms["payment"];
  if (score >= 65 && conf !== "low") {
    payment = { upfront_pct: 25, on_delivery_pct: 0, weekly_installments_pct: 75, weeks: 10 };
  } else if (score >= 50) {
    payment = { upfront_pct: 35, on_delivery_pct: 30, weekly_installments_pct: 35, weeks: 4 };
  } else {
    payment = { upfront_pct: 50, on_delivery_pct: 40, weekly_installments_pct: 10, weeks: 0 };
  }

  return {
    parties: { customer: input.lead.raw.company, supplier: input.supplier },
    goods: input.goods,
    total_value_usd: input.total_value_usd,
    margin_pct: input.margin_pct,
    payment,
    delivery: { incoterms, eta_days: 28 },
    jurisdiction,
    default_clause:
      "30-day cure period; OceanX may reclaim title to undelivered goods and accelerate the receivable.",
    signatories: [
      { name: input.lead.raw.name, role: "Authorised Signatory", email: input.lead.raw.email },
      { name: "Aaron Rhim", role: "VP, Trade Finance", email: "aaron@oceanx.ai" },
    ],
  };
}

export async function runContract(input: ContractInput): Promise<Contract> {
  const { output } = await runAgent("contract", input, async (i, ctx) => {
    ctx.emit({ kind: "step", label: "Drafting contract terms" });
    let terms: ContractTerms;
    try {
      terms = await draftTerms(ctx, i);
    } catch (err) {
      ctx.emit({
        kind: "step",
        label: "Draft via heuristic (LLM unavailable)",
        data: { error: err instanceof Error ? err.message : String(err) },
      });
      terms = fallbackTerms(i);
    }

    ctx.emit({
      kind: "step",
      label: `Terms: ${terms.payment.upfront_pct}% upfront / ${terms.payment.on_delivery_pct}% on delivery / ${terms.payment.weekly_installments_pct}% over ${terms.payment.weeks}w`,
    });
    await beat(180);

    ctx.emit({ kind: "step", label: "Rendering PDF contract" });
    const id = makeId("ctr");
    const pdf_url = `/contract/${id}/pdf`;
    await beat(260);

    ctx.emit({ kind: "step", label: "Sending via DocuSign" });
    const envelope = await sendEnvelope({
      document_url: pdf_url,
      signers: terms.signatories.map((s) => ({ name: s.name, email: s.email })),
    });

    if (terms.payment.upfront_pct >= 50) {
      ctx.emit({
        kind: "needs_human",
        reason: "Hard Terms structure (50%+ upfront) signals high-risk deal.",
        suggested_action: "Sales lead should walk customer through the structure personally.",
      });
    }

    const c: Contract = {
      id,
      underwriting_id: i.underwriting.id,
      terms,
      pdf_url,
      docusign_envelope_id: envelope.envelope_id,
      signing_url: envelope.signing_url,
      createdAt: Date.now(),
    };
    return c;
  });
  return output;
}
