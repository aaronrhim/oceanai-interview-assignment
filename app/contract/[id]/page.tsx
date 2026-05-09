import Link from "next/link";
import { notFound } from "next/navigation";
import { records } from "@/lib/orchestrator";

export const dynamic = "force-dynamic";

export default async function ContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = records.contracts.get(id);
  if (!c) notFound();
  const u = records.underwritings.get(c.underwriting_id);
  const lead = u ? records.leads.get(u.lead_id) : undefined;

  const t = c.terms;

  return (
    <div className="min-h-dvh">
      <header className="border-b border-[color:var(--color-line)]">
        <div className="mx-auto max-w-[1100px] px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-fg-3 text-sm hover:text-fg-0">
            ← Dashboard
          </Link>
          <span className="text-fg-3 text-xs font-mono">{c.id}</span>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-6 py-10 grid gap-4">
        <div>
          <div className="text-fg-3 text-xs uppercase tracking-widest">Contract</div>
          <h1 className="text-3xl font-semibold text-fg-0 tracking-tight mt-2">
            {t.parties.customer} ↔ {t.parties.supplier}
          </h1>
          <p className="text-fg-2 mt-1">
            {t.goods} · ${t.total_value_usd.toLocaleString()} · {t.delivery.incoterms}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Upfront" value={`${t.payment.upfront_pct}%`} accent />
          <Stat label="On delivery" value={`${t.payment.on_delivery_pct}%`} />
          <Stat
            label="Installments"
            value={`${t.payment.weekly_installments_pct}%`}
            sub={t.payment.weeks > 0 ? `${t.payment.weeks} weeks` : "—"}
          />
          <Stat label="Margin" value={`${t.margin_pct.toFixed(1)}%`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="glass rounded-2xl p-6">
            <Title>DocuSign envelope</Title>
            <Row k="Envelope id" v={c.docusign_envelope_id} mono />
            <Row k="Signing URL" v={c.signing_url} mono link />
            <div className="text-fg-3 text-xs mt-4 leading-relaxed">
              Mocked DocuSign in this demo. Real envelope ids and signing URLs flow through the same
              connector boundary.
            </div>
          </div>
          <div className="glass rounded-2xl p-6">
            <Title>Legal</Title>
            <Row k="Jurisdiction" v={t.jurisdiction} />
            <div className="mt-3">
              <div className="text-fg-3 text-xs uppercase tracking-wider">Default clause</div>
              <p className="text-fg-1 mt-1 text-sm leading-relaxed">{t.default_clause}</p>
            </div>
            <div className="mt-4">
              <div className="text-fg-3 text-xs uppercase tracking-wider">Signatories</div>
              <div className="mt-2 grid gap-2">
                {t.signatories.map((s, i) => (
                  <div key={i} className="rounded-lg border border-[color:var(--color-line)] px-3 py-2">
                    <div className="text-fg-0 text-sm font-medium">{s.name}</div>
                    <div className="text-fg-3 text-xs">
                      {s.role} · {s.email}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {lead && (
          <div className="glass rounded-2xl p-6">
            <Title>Linked records</Title>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
              <Link
                className="rounded-lg px-3 py-2 hover:bg-bg-2 transition-colors border border-[color:var(--color-line)]"
                href={`/lead/${lead.id}`}
              >
                <div className="text-fg-3 text-xs">Lead</div>
                <div className="text-fg-0 text-sm">{lead.raw.company}</div>
              </Link>
              {u && (
                <Link
                  className="rounded-lg px-3 py-2 hover:bg-bg-2 transition-colors border border-[color:var(--color-line)]"
                  href={`/underwriting/${u.id}`}
                >
                  <div className="text-fg-3 text-xs">Underwriting</div>
                  <div className="text-fg-0 text-sm">
                    Risk {u.assessment.risk_score} · ${u.assessment.recommended_credit_limit_usd.toLocaleString()}
                  </div>
                </Link>
              )}
            </div>
          </div>
        )}

        <div className="glass rounded-2xl p-2 overflow-hidden">
          <iframe
            src={`/contract/${c.id}/pdf`}
            className="w-full h-[820px] rounded-xl bg-white"
            title="Contract PDF"
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

function Row({
  k,
  v,
  mono,
  link,
}: {
  k: string;
  v: string;
  mono?: boolean;
  link?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-[color:var(--color-line)] last:border-0">
      <span className="text-fg-3 text-xs uppercase tracking-wider">{k}</span>
      {link ? (
        <a
          href={v}
          target="_blank"
          rel="noreferrer"
          className={`text-accent-0 hover:underline ${mono ? "font-mono text-xs break-all text-right" : ""}`}
        >
          {v}
        </a>
      ) : (
        <span className={`text-fg-0 ${mono ? "font-mono text-xs break-all text-right" : ""}`}>
          {v}
        </span>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-fg-3 text-[10px] uppercase tracking-widest">{label}</div>
      <div
        className={`mt-2 text-2xl font-semibold tracking-tight ${
          accent ? "text-accent-0" : "text-fg-0"
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-fg-3 text-xs mt-1">{sub}</div>}
    </div>
  );
}
