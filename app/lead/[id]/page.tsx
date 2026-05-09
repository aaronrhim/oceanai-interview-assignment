import Link from "next/link";
import { notFound } from "next/navigation";
import { records } from "@/lib/orchestrator";

export const dynamic = "force-dynamic";

export default async function LeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = records.leads.get(id);
  if (!lead) notFound();

  const e = lead.enriched;
  const s = lead.score;

  return (
    <div className="min-h-dvh">
      <header className="border-b border-[color:var(--color-line)]">
        <div className="mx-auto max-w-[1100px] px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-fg-3 text-sm hover:text-fg-0">
            ← Dashboard
          </Link>
          <span className="text-fg-3 text-xs font-mono">{lead.id}</span>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-6 py-10">
        <div className="text-fg-3 text-xs uppercase tracking-widest">Lead</div>
        <h1 className="text-3xl font-semibold text-fg-0 tracking-tight mt-2">
          {lead.raw.company}
        </h1>
        <p className="text-fg-2 mt-1">
          {lead.raw.name} · {lead.raw.email} · requested ${lead.raw.requestedCreditUsd.toLocaleString()}
        </p>

        <section className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card label="ICP score" value={`${s.score} / 100`} accent={s.score >= 60} />
          <Card label="Channel" value={s.suggested_channel} />
          <Card label="Source" value={lead.raw.source} />
        </section>

        <section className="mt-6 glass rounded-2xl p-6">
          <SectionTitle>Score rationale</SectionTitle>
          <p className="text-fg-1 leading-relaxed mt-2">{s.rationale}</p>
        </section>

        <section className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="glass rounded-2xl p-6">
            <SectionTitle>Apollo enrichment</SectionTitle>
            <Row k="Domain" v={e.domain} />
            <Row k="Industry" v={e.industry} />
            <Row k="Employees" v={String(e.employees)} />
            <Row k="HQ" v={e.hqCountry} />
            <Row k="Funding" v={e.fundingStage} />
            {e.techStack && <Row k="Tech" v={e.techStack.join(", ")} />}
          </div>
          <div className="glass rounded-2xl p-6">
            <SectionTitle>HubSpot</SectionTitle>
            <Row k="Deal id" v={lead.hubspot_deal_id} mono />
            <Row k="Meeting" v={lead.meeting_url} mono link />
            <div className="text-fg-3 text-xs mt-4 leading-relaxed">
              In production this is a live HubSpot link. The mock returns a deterministic URL so the demo stays clickable.
            </div>
          </div>
        </section>

        <section className="mt-4 glass rounded-2xl p-6">
          <SectionTitle>Notes</SectionTitle>
          <p className="text-fg-1 leading-relaxed mt-2">
            {lead.raw.notes ?? "—"}
          </p>
        </section>
      </main>
    </div>
  );
}

function Card({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
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
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
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
          className={`text-accent-0 hover:underline ${mono ? "font-mono text-xs break-all" : ""}`}
        >
          {v}
        </a>
      ) : (
        <span className={`text-fg-0 ${mono ? "font-mono text-xs break-all" : ""}`}>
          {v}
        </span>
      )}
    </div>
  );
}
