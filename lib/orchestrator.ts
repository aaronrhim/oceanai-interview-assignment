import type { Contract, Lead, Underwriting } from "./types";
import { runLeadCapture } from "@/agents/lead-capture";
import { runUnderwriting } from "@/agents/underwriting";
import { runContract } from "@/agents/contract";
import { ensureSupervisor } from "@/agents/supervisor";

declare global {
  // eslint-disable-next-line no-var
  var __oceanx_records: {
    leads: Map<string, Lead>;
    underwritings: Map<string, Underwriting>;
    contracts: Map<string, Contract>;
  } | undefined;
}

export const records = (globalThis.__oceanx_records ??= {
  leads: new Map<string, Lead>(),
  underwritings: new Map<string, Underwriting>(),
  contracts: new Map<string, Contract>(),
});

interface OrchestrateInput {
  raw: Parameters<typeof runLeadCapture>[0];
  order: { goods: string; supplier: string; total_value_usd: number; margin_pct: number };
}

/**
 * Runs the full pipeline. Returns the records produced. Each agent's events
 * stream out via the EventBus for the SSE pump.
 */
export async function orchestrate(input: OrchestrateInput): Promise<{
  lead: Lead;
  underwriting: Underwriting;
  contract: Contract | null;
}> {
  ensureSupervisor();

  const lead = await runLeadCapture(input.raw);
  records.leads.set(lead.id, lead);

  const underwriting = await runUnderwriting({
    lead,
    order_size_usd: input.order.total_value_usd,
  });
  records.underwritings.set(underwriting.id, underwriting);

  // Skip contract if underwriting recommends $0 (uninvestable).
  if (underwriting.assessment.recommended_credit_limit_usd <= 0) {
    return { lead, underwriting, contract: null };
  }

  const contract = await runContract({
    lead,
    underwriting,
    goods: input.order.goods,
    supplier: input.order.supplier,
    total_value_usd: input.order.total_value_usd,
    margin_pct: input.order.margin_pct,
  });
  records.contracts.set(contract.id, contract);

  return { lead, underwriting, contract };
}
