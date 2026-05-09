import bureauFixture from "@/fixtures/bureau.json" with { type: "json" };
import financialsFixture from "@/fixtures/financials.json" with { type: "json" };
import type { BureauSnapshot, FinancialSummary } from "@/lib/types";
import { beat } from "@/agents/runner";

const BUREAU = bureauFixture as Record<string, BureauSnapshot>;
const FIN = financialsFixture as Record<string, FinancialSummary>;

/** Fixture-backed pull. Real implementation would call Equifax / Experian / D&B. */
export async function pullBureau(company: string): Promise<BureauSnapshot> {
  await beat(360);
  return BUREAU[company] ?? synthesizeBureau();
}

/** Fixture-backed pull. Real implementation would aggregate bank-feed data. */
export async function pullFinancials(company: string): Promise<FinancialSummary> {
  await beat(420);
  return FIN[company] ?? synthesizeFinancials();
}

function synthesizeBureau(): BureauSnapshot {
  return {
    bureau: "experian",
    score: 50 + Math.floor(Math.random() * 30),
    delinquencies_24m: Math.random() < 0.3 ? 1 : 0,
    bankruptcies: 0,
    utilization: 0.4 + Math.random() * 0.4,
    trade_references: 1 + Math.floor(Math.random() * 6),
  };
}

function synthesizeFinancials(): FinancialSummary {
  const base = 200000 + Math.random() * 400000;
  const inflow = Array.from({ length: 12 }, (_, i) => Math.round(base * (1 + i * 0.02)));
  const outflow = inflow.map((v) => Math.round(v * (0.8 + Math.random() * 0.15)));
  return {
    revenue_ttm_usd: inflow.reduce((a, b) => a + b, 0),
    ebitda_margin: 0.08 + Math.random() * 0.1,
    cash_on_hand_usd: Math.round(base * 0.6),
    current_ratio: 1.0 + Math.random() * 0.6,
    debt_to_equity: 0.3 + Math.random() * 1.2,
    monthly_inflow_usd: inflow,
    monthly_outflow_usd: outflow,
  };
}
