"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { useDemoStore } from "@/lib/store";
import { useAgentEventStream } from "@/lib/sse";
import { Pipeline } from "@/components/pipeline";
import { AgentCard } from "@/components/agent-card";
import { EventLog } from "@/components/event-log";
import { SupervisorPanel } from "@/components/supervisor-panel";
import { TriggerBar } from "@/components/trigger-bar";
import type { AgentName } from "@/lib/types";
import { liveAgentsEnabled } from "@/lib/env";

const WORKERS: AgentName[] = ["lead-capture", "underwriting", "contract"];

interface InitialState {
  liveLLM: boolean;
  records: {
    leadIds: string[];
    underwritingIds: string[];
    contractIds: string[];
  };
}

export function DashboardShell({ initial }: { initial: InitialState }) {
  useAgentEventStream();
  const events = useDemoStore((s) => s.events);
  const alerts = useDemoStore((s) => s.alerts);
  const agents = useDemoStore((s) => s.agents);
  const leads = useDemoStore((s) => s.leads);
  const underwritings = useDemoStore((s) => s.underwritings);
  const contracts = useDemoStore((s) => s.contracts);

  // Hydrate from server-side records on mount.
  useEffect(() => {
    fetch("/api/state")
      .then((r) => r.json())
      .then((d) => {
        const setState = useDemoStore.setState;
        const eventsArr = (d.events ?? []) as typeof events;
        const alertsArr = (d.alerts ?? []) as typeof alerts;
        setState((s) => ({
          ...s,
          leads: Object.fromEntries((d.leads ?? []).map((l: { id: string }) => [l.id, l])),
          underwritings: Object.fromEntries(
            (d.underwritings ?? []).map((u: { id: string }) => [u.id, u]),
          ),
          contracts: Object.fromEntries(
            (d.contracts ?? []).map((c: { id: string }) => [c.id, c]),
          ),
          // Don't overwrite live events/alerts if they've already arrived.
          events: s.events.length > 0 ? s.events : eventsArr,
          alerts: s.alerts.length > 0 ? s.alerts : alertsArr,
        }));
      })
      .catch(() => {
        /* ignore */
      });
  }, []);

  const statusByAgent = {
    "lead-capture": agents["lead-capture"].status,
    underwriting: agents.underwriting.status,
    contract: agents.contract.status,
    supervisor: agents.supervisor.status,
  };

  const recentLeads = Object.values(leads).slice(-3).reverse();
  const recentUW = Object.values(underwritings).slice(-3).reverse();
  const recentContracts = Object.values(contracts).slice(-3).reverse();

  return (
    <div className="min-h-dvh">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-[color:var(--color-line)] bg-bg-0/70 backdrop-blur-md">
        <div className="mx-auto max-w-[1400px] px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo />
            <div className="leading-none">
              <div className="text-fg-0 text-sm font-medium tracking-tight">OceanX AI</div>
              <div className="text-fg-3 text-[10px] uppercase tracking-widest mt-1">
                Agent Pipeline · Live
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <ModeBadge live={initial.liveLLM} />
            <TriggerBar />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-6 grid gap-4">
        {/* Pipeline */}
        <Pipeline status={statusByAgent} />

        {/* Cards row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {WORKERS.map((a) => (
            <AgentCard
              key={a}
              agent={a}
              status={agents[a].status}
              lastLabel={agents[a].lastLabel}
              tokensIn={agents[a].tokensIn}
              tokensOut={agents[a].tokensOut}
              runs={agents[a].runs}
            />
          ))}
          <AgentCard
            agent="supervisor"
            status={agents.supervisor.status}
            lastLabel={agents.supervisor.lastLabel}
            tokensIn={agents.supervisor.tokensIn}
            tokensOut={agents.supervisor.tokensOut}
            runs={agents.supervisor.runs}
          />
        </div>

        {/* Records strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <RecordSection
            title="Leads"
            href="/lead"
            items={recentLeads.map((l) => ({
              id: l.id,
              primary: l.raw.company,
              secondary: `score ${l.score.score} · ${l.score.suggested_channel}`,
            }))}
          />
          <RecordSection
            title="Underwriting"
            href="/underwriting"
            items={recentUW.map((u) => ({
              id: u.id,
              primary: `Risk ${u.assessment.risk_score} · $${u.assessment.recommended_credit_limit_usd.toLocaleString()}`,
              secondary: `${u.assessment.confidence} confidence`,
            }))}
          />
          <RecordSection
            title="Contracts"
            href="/contract"
            items={recentContracts.map((c) => ({
              id: c.id,
              primary: `${c.terms.parties.customer} · $${c.terms.total_value_usd.toLocaleString()}`,
              secondary: `${c.terms.payment.upfront_pct}% upfront · ${c.terms.payment.weeks}w terms`,
            }))}
          />
        </div>

        {/* Lower row: log + supervisor */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 min-h-[420px]">
          <div className="lg:col-span-2 min-h-[420px]">
            <EventLog events={events} />
          </div>
          <div className="min-h-[420px]">
            <SupervisorPanel alerts={alerts} />
          </div>
        </div>
      </main>
    </div>
  );
}

function ModeBadge({ live }: { live: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-[10px] uppercase tracking-widest font-mono px-2 py-1 rounded-full border border-[color:var(--color-line-strong)]"
      title={live ? "Real Anthropic API calls" : "Heuristic fallback (no key or DEMO_MODE=fixtures)"}
    >
      <span className="inline-flex items-center gap-1.5">
        <span
          className={`h-1.5 w-1.5 rounded-full ${live ? "bg-accent-0 pulse-ring" : "bg-fg-3"}`}
        />
        {live ? "live LLM" : "heuristic"}
      </span>
    </motion.div>
  );
}

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="11" stroke="var(--color-accent-0)" strokeWidth="1.4" />
      <path
        d="M3 14c3-2 6-2 9 0s6 2 9 0"
        stroke="var(--color-accent-0)"
        strokeWidth="1.4"
        fill="none"
      />
      <circle cx="12" cy="12" r="2.2" fill="var(--color-accent-0)" />
    </svg>
  );
}

function RecordSection({
  title,
  href,
  items,
}: {
  title: string;
  href: string;
  items: { id: string; primary: string; secondary: string }[];
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between text-fg-3 text-xs uppercase tracking-widest mb-2">
        <span>{title}</span>
        <span className="font-mono text-fg-3/70">{items.length}</span>
      </div>
      <div className="space-y-1">
        {items.map((it) => (
          <Link
            key={it.id}
            href={`${href}/${it.id}`}
            className="block rounded-lg px-3 py-2 text-sm hover:bg-bg-2 transition-colors border border-transparent hover:border-[color:var(--color-line)]"
          >
            <div className="text-fg-0">{it.primary}</div>
            <div className="text-fg-3 text-xs mt-0.5 font-mono">{it.secondary}</div>
          </Link>
        ))}
        {items.length === 0 && (
          <div className="text-fg-3 text-xs py-2 px-3">No {title.toLowerCase()} yet.</div>
        )}
      </div>
    </div>
  );
}
