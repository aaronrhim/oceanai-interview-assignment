import Link from "next/link";
import { notFound } from "next/navigation";
import { records } from "@/lib/orchestrator";

export const dynamic = "force-dynamic";

export default async function UnderwritingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const u = records.underwritings.get(id);
  if (!u) notFound();
  const lead = records.leads.get(u.lead_id);

  const a = u.assessment;
  const f = u.inputs.financials;
  const b = u.inputs.bureau;

  return (
    <div className="min-h-dvh">
      <header className="border-b border-[color:var(--color-line)]">
        <div className="mx-auto max-w-[1100px] px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-fg-3 text-sm hover:text-fg-0">
            ← Dashboard
          </Link>
          <span className="text-fg-3 text-xs font-mono">{u.id}</span>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-6 py-10 grid gap-4">
        <div>
          <div className="text-fg-3 text-xs uppercase tracking-widest">Underwriting</div>
          <h1 className="text-3xl font-semibold text-fg-0 tracking-tight mt-2">
            {lead?.raw.company ?? "Unknown company"}
          </h1>
          <p className="text-fg-2 mt-1">
            {lead?.enriched.industry} · TTM revenue ${f.revenue_ttm_usd.toLocaleString()}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Stat
            label="Risk score"
            value={`${a.risk_score} / 100`}
            tone={a.risk_score >= 65 ? "ok" : a.risk_score >= 50 ? "warn" : "err"}
          />
          <Stat label="Recommended limit" value={`$${a.recommended_credit_limit_usd.toLocaleString()}`} />
          <Stat
            label="Confidence"
            value={a.confidence}
            tone={a.confidence === "high" ? "ok" : a.confidence === "medium" ? "warn" : "err"}
            capitalize
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="glass rounded-2xl p-6">
            <Title>Assessment</Title>
            <p className="text-fg-1 leading-relaxed mt-2">{a.rationale}</p>

            {a.red_flags.length > 0 && (
              <div className="mt-5">
                <div className="text-[color:var(--color-warn)] text-xs uppercase tracking-widest font-mono">
                  Red flags
                </div>
                <ul className="mt-2 space-y-2">
                  {a.red_flags.map((flag, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-fg-1">
                      <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--color-warn)] shrink-0" />
                      <span>{flag}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="glass rounded-2xl p-6">
            <Title>Financial snapshot</Title>
            <Row k="EBITDA margin" v={`${(f.ebitda_margin * 100).toFixed(1)}%`} />
            <Row k="Cash on hand" v={`$${f.cash_on_hand_usd.toLocaleString()}`} />
            <Row k="Current ratio" v={f.current_ratio.toFixed(2)} />
            <Row k="Debt / equity" v={f.debt_to_equity.toFixed(2)} />
            <Row k="Avg monthly inflow" v={`$${Math.round(avg(f.monthly_inflow_usd)).toLocaleString()}`} />
            <Row k="Avg monthly outflow" v={`$${Math.round(avg(f.monthly_outflow_usd)).toLocaleString()}`} />

            <div className="mt-5">
              <div className="text-fg-3 text-xs uppercase tracking-widest font-mono">
                Bureau ({b.bureau})
              </div>
              <Row k="Score" v={`${b.score} / 100`} />
              <Row k="Delinquencies (24m)" v={String(b.delinquencies_24m)} />
              <Row k="Utilization" v={`${(b.utilization * 100).toFixed(0)}%`} />
              <Row k="Trade refs" v={String(b.trade_references)} />
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-2 overflow-hidden">
          <iframe
            src={`/underwriting/${u.id}/pdf`}
            className="w-full h-[820px] rounded-xl bg-white"
            title="Underwriting report PDF"
          />
        </div>
      </main>
    </div>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-fg-3 text-[10px] uppercase tracking-widest font-mono">
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-[color:var(--color-line)] last:border-0">
      <span className="text-fg-3 text-xs uppercase tracking-wider">{k}</span>
      <span className="text-fg-0 text-sm font-mono">{v}</span>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  capitalize,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "err";
  capitalize?: boolean;
}) {
  const color =
    tone === "ok"
      ? "text-[color:var(--color-ok)]"
      : tone === "warn"
        ? "text-[color:var(--color-warn)]"
        : tone === "err"
          ? "text-[color:var(--color-err)]"
          : "text-fg-0";
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-fg-3 text-[10px] uppercase tracking-widest">{label}</div>
      <div
        className={`mt-2 text-2xl font-semibold tracking-tight ${color} ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
