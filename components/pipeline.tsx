"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import type { AgentName } from "@/lib/types";
import type { AgentStatus } from "@/lib/store";

const NODES: { agent: AgentName; label: string }[] = [
  { agent: "lead-capture", label: "Lead" },
  { agent: "underwriting", label: "Underwriting" },
  { agent: "contract", label: "Contract" },
];

interface Props {
  status: Record<AgentName, AgentStatus>;
}

export function Pipeline({ status }: Props) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between text-fg-3 text-xs uppercase tracking-widest mb-4">
        <span>Pipeline</span>
        <span className="font-mono text-fg-3/70">3 workers · 1 supervisor</span>
      </div>
      <div className="flex items-stretch gap-3">
        {NODES.map((n, i) => (
          <NodeAndEdge
            key={n.agent}
            label={n.label}
            status={status[n.agent]}
            isLast={i === NODES.length - 1}
            nextStatus={i < NODES.length - 1 ? status[NODES[i + 1]!.agent] : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function NodeAndEdge({
  label,
  status,
  nextStatus,
  isLast,
}: {
  label: string;
  status: AgentStatus;
  nextStatus?: AgentStatus;
  isLast: boolean;
}) {
  const color =
    status === "running"
      ? "bg-accent-0/15 text-accent-0 border-accent-0/40"
      : status === "ok"
        ? "bg-[color:var(--color-ok)]/10 text-[color:var(--color-ok)] border-[color:var(--color-ok)]/40"
        : status === "error"
          ? "bg-[color:var(--color-err)]/10 text-[color:var(--color-err)] border-[color:var(--color-err)]/40"
          : status === "needs_human"
            ? "bg-[color:var(--color-human)]/10 text-[color:var(--color-human)] border-[color:var(--color-human)]/40"
            : "bg-bg-2 text-fg-2 border-[color:var(--color-line)]";

  // edge "filled" when this node has finished and the next has work
  const edgeActive = (status === "ok" || status === "running") && nextStatus !== "idle";

  return (
    <>
      <motion.div
        layout
        className={cn(
          "flex-1 rounded-xl border px-4 py-3 text-sm transition-colors",
          color,
        )}
        animate={{ scale: status === "running" ? 1.02 : 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
      >
        <div className="font-medium">{label}</div>
        <div className="text-[10px] uppercase tracking-wider opacity-70 mt-1">{status}</div>
      </motion.div>
      {!isLast && <Edge active={edgeActive} />}
    </>
  );
}

function Edge({ active }: { active: boolean }) {
  return (
    <div className="relative w-10 self-center h-[2px] overflow-hidden rounded-full bg-bg-3">
      {active && (
        <motion.div
          className="absolute inset-y-0 w-full bg-accent-0"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        />
      )}
    </div>
  );
}
