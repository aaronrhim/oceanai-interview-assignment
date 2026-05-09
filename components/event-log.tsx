"use client";

import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/cn";
import type { AgentEvent } from "@/lib/types";

interface Props {
  events: AgentEvent[];
}

export function EventLog({ events }: Props) {
  // Show most recent 60, newest first.
  const slice = events.slice(-60).reverse();

  return (
    <div className="glass rounded-2xl p-4 h-full flex flex-col">
      <div className="flex items-center justify-between text-fg-3 text-xs uppercase tracking-widest mb-3">
        <span>Event log</span>
        <span className="font-mono text-fg-3/70">{events.length} events</span>
      </div>
      <div className="flex-1 overflow-y-auto pr-1 space-y-1">
        <AnimatePresence initial={false}>
          {slice.map((e, i) => (
            <motion.div
              key={`${e.runId}-${e.ts}-${i}`}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className={cn(
                "flex items-start gap-3 text-xs font-mono py-1.5 px-2 rounded-md",
                "border border-transparent hover:border-[color:var(--color-line)] hover:bg-bg-1/40",
              )}
            >
              <span className="text-fg-3 shrink-0 w-[64px]">{fmtTime(e.ts)}</span>
              <span className={cn("shrink-0 w-[110px]", agentColor(e.agent))}>
                {e.agent}
              </span>
              <span className={cn("shrink-0 w-[80px]", kindColor(e.kind))}>{e.kind}</span>
              <span className="text-fg-1 break-words">{summary(e)}</span>
            </motion.div>
          ))}
          {slice.length === 0 && (
            <div className="text-fg-3 text-sm py-8 text-center">
              No events yet — trigger a lead to begin.
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return d.toTimeString().slice(0, 8);
}

function agentColor(a: string): string {
  if (a === "lead-capture") return "text-accent-0";
  if (a === "underwriting") return "text-[color:var(--color-warn)]";
  if (a === "contract") return "text-[color:var(--color-ok)]";
  if (a === "supervisor") return "text-[color:var(--color-human)]";
  return "text-fg-2";
}

function kindColor(k: string): string {
  if (k === "error") return "text-[color:var(--color-err)]";
  if (k === "needs_human") return "text-[color:var(--color-human)]";
  if (k === "finished") return "text-[color:var(--color-ok)]";
  if (k === "llm") return "text-accent-1";
  return "text-fg-2";
}

function summary(e: AgentEvent): string {
  switch (e.kind) {
    case "started":
      return "started";
    case "step":
      return e.label;
    case "llm":
      return `${e.model} · ${e.tokens_in}↓/${e.tokens_out}↑ · ${e.latency_ms}ms${e.cached ? " · cached" : ""}`;
    case "finished":
      return "finished";
    case "error":
      return e.message;
    case "needs_human":
      return e.reason;
  }
}
