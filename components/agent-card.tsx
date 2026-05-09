"use client";

import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/cn";
import type { AgentName } from "@/lib/types";
import type { AgentStatus } from "@/lib/store";

const NAMES: Record<AgentName, string> = {
  "lead-capture": "Lead Capture",
  underwriting: "Underwriting",
  contract: "Contract",
  supervisor: "Supervisor",
};

const SUBTITLES: Record<AgentName, string> = {
  "lead-capture": "Apollo · HubSpot · scoring",
  underwriting: "Bank · bureau · risk model",
  contract: "Drafting · DocuSign",
  supervisor: "Watching all agents",
};

const STATUS_LABEL: Record<AgentStatus, string> = {
  idle: "idle",
  running: "running",
  ok: "completed",
  error: "errored",
  needs_human: "needs human",
};

const STATUS_COLOR: Record<AgentStatus, string> = {
  idle: "text-fg-3 bg-bg-2",
  running: "text-accent-0 bg-accent-0/10",
  ok: "text-[color:var(--color-ok)] bg-[color:var(--color-ok)]/10",
  error: "text-[color:var(--color-err)] bg-[color:var(--color-err)]/10",
  needs_human: "text-[color:var(--color-human)] bg-[color:var(--color-human)]/10",
};

interface Props {
  agent: AgentName;
  status: AgentStatus;
  lastLabel?: string;
  tokensIn: number;
  tokensOut: number;
  runs: number;
}

export function AgentCard({ agent, status, lastLabel, tokensIn, tokensOut, runs }: Props) {
  const isRunning = status === "running";

  return (
    <motion.div
      layout
      className={cn(
        "glass relative overflow-hidden rounded-2xl p-5",
        "border border-[color:var(--color-line)]",
        isRunning && "glow-edge",
      )}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-fg-0 font-medium tracking-tight">{NAMES[agent]}</div>
          <div className="text-fg-3 text-xs mt-0.5">{SUBTITLES[agent]}</div>
        </div>
        <div
          className={cn(
            "text-[10px] uppercase tracking-wider rounded-full px-2 py-1",
            STATUS_COLOR[status],
          )}
        >
          <span className="inline-flex items-center gap-1.5">
            <StatusDot status={status} />
            {STATUS_LABEL[status]}
          </span>
        </div>
      </div>

      {/* Last label */}
      <div className="mt-4 h-10 relative">
        <AnimatePresence mode="popLayout" initial={false}>
          {lastLabel ? (
            <motion.div
              key={lastLabel}
              className="text-fg-1 text-sm leading-snug"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {lastLabel}
            </motion.div>
          ) : (
            <div className="text-fg-3 text-sm">Awaiting work…</div>
          )}
        </AnimatePresence>
      </div>

      {/* Metric row */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <Metric label="runs" value={String(runs)} />
        <Metric label="tok in" value={fmt(tokensIn)} />
        <Metric label="tok out" value={fmt(tokensOut)} />
      </div>

      {/* Animated activity bar */}
      <motion.div
        className="absolute left-0 right-0 bottom-0 h-[2px] bg-accent-0/0"
        animate={{
          backgroundColor: isRunning ? "rgba(20,232,245,0.85)" : "rgba(20,232,245,0)",
        }}
      >
        {isRunning && (
          <motion.div
            className="h-full w-1/3 bg-accent-0"
            initial={{ x: "-100%" }}
            animate={{ x: "300%" }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
          />
        )}
      </motion.div>
    </motion.div>
  );
}

function StatusDot({ status }: { status: AgentStatus }) {
  return (
    <span
      className={cn(
        "inline-block h-1.5 w-1.5 rounded-full",
        status === "idle" && "bg-fg-3",
        status === "running" && "bg-accent-0 pulse-ring",
        status === "ok" && "bg-[color:var(--color-ok)]",
        status === "error" && "bg-[color:var(--color-err)]",
        status === "needs_human" && "bg-[color:var(--color-human)]",
      )}
    />
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-bg-1 px-2 py-1.5 border border-[color:var(--color-line)]">
      <div className="text-fg-3 text-[10px] uppercase tracking-wider">{label}</div>
      <div className="text-fg-0 font-mono text-sm">{value}</div>
    </div>
  );
}

function fmt(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}
