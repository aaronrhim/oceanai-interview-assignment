// ─── Domain types ────────────────────────────────────────────────────────────

export type AgentName = "lead-capture" | "underwriting" | "contract" | "supervisor";

export type Confidence = "low" | "medium" | "high";

export interface RawLead {
  id: string;
  name: string;
  company: string;
  email: string;
  requestedCreditUsd: number;
  source: "cold-email" | "linkedin" | "apollo" | "tradeshow" | "referral" | "ads" | "broker";
  notes?: string;
}

export interface ApolloEnrichment {
  domain: string;
  industry: string;
  employees: number;
  fundingStage: "pre-seed" | "seed" | "series-a" | "series-b" | "series-c" | "growth" | "public" | "bootstrapped";
  hqCountry: string;
  socials: { linkedin?: string; twitter?: string };
  techStack?: string[];
}

export interface LeadScore {
  score: number; // 0..100
  rationale: string;
  suggested_channel: "outbound-email" | "linkedin" | "broker" | "events";
}

export interface Lead {
  id: string;
  raw: RawLead;
  enriched: ApolloEnrichment;
  score: LeadScore;
  hubspot_deal_id: string;
  meeting_url: string;
  createdAt: number;
}

export interface FinancialSummary {
  revenue_ttm_usd: number;
  ebitda_margin: number; // 0..1
  cash_on_hand_usd: number;
  current_ratio: number;
  debt_to_equity: number;
  monthly_inflow_usd: number[];
  monthly_outflow_usd: number[];
}

export interface BureauSnapshot {
  bureau: "equifax" | "experian" | "dunn-bradstreet";
  score: number; // 0..100
  delinquencies_24m: number;
  bankruptcies: number;
  utilization: number; // 0..1
  trade_references: number;
}

export interface UnderwritingAssessment {
  risk_score: number; // 0..100
  recommended_credit_limit_usd: number;
  red_flags: string[];
  rationale: string;
  confidence: Confidence;
}

export interface Underwriting {
  id: string;
  lead_id: string;
  inputs: {
    requested_credit_usd: number;
    order_size_usd: number;
    financials: FinancialSummary;
    bureau: BureauSnapshot;
  };
  assessment: UnderwritingAssessment;
  pdf_url: string;
  createdAt: number;
}

export interface ContractTerms {
  parties: { customer: string; supplier: string };
  goods: string;
  total_value_usd: number;
  margin_pct: number;
  payment: {
    upfront_pct: number;
    on_delivery_pct: number;
    weekly_installments_pct: number;
    weeks: number;
  };
  delivery: { incoterms: string; eta_days: number };
  jurisdiction: string;
  default_clause: string;
  signatories: { name: string; role: string; email: string }[];
}

export interface Contract {
  id: string;
  underwriting_id: string;
  terms: ContractTerms;
  pdf_url: string;
  docusign_envelope_id: string;
  signing_url: string;
  createdAt: number;
}

// ─── Event bus / agent runtime ───────────────────────────────────────────────

export type AgentEventKind =
  | "started"
  | "step"
  | "llm"
  | "finished"
  | "error"
  | "needs_human";

export type AgentEvent =
  | { kind: "started"; agent: AgentName; runId: string; ts: number; input: unknown }
  | {
      kind: "step";
      agent: AgentName;
      runId: string;
      ts: number;
      label: string;
      data?: unknown;
    }
  | {
      kind: "llm";
      agent: AgentName;
      runId: string;
      ts: number;
      model: string;
      tokens_in: number;
      tokens_out: number;
      cached?: boolean;
      latency_ms: number;
    }
  | { kind: "finished"; agent: AgentName; runId: string; ts: number; output: unknown }
  | { kind: "error"; agent: AgentName; runId: string; ts: number; message: string }
  | {
      kind: "needs_human";
      agent: AgentName;
      runId: string;
      ts: number;
      reason: string;
      suggested_action?: string;
    };

export interface SupervisorAlert {
  id: string;
  ts: number;
  agent: AgentName;
  runId: string;
  severity: "info" | "warn" | "human";
  title: string;
  body: string;
  suggested_action?: string;
}

// ─── DEMO_MODE ───────────────────────────────────────────────────────────────

export type DemoMode = "live" | "fixtures";
