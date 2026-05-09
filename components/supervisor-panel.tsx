"use client";

import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/cn";
import type { SupervisorAlert } from "@/lib/types";

interface Props {
  alerts: SupervisorAlert[];
}

export function SupervisorPanel({ alerts }: Props) {
  return (
    <div className="glass rounded-2xl p-4 h-full flex flex-col">
      <div className="flex items-center justify-between text-fg-3 text-xs uppercase tracking-widest mb-3">
        <span>Supervisor</span>
        <span className="font-mono text-fg-3/70">{alerts.length} alerts</span>
      </div>
      <div className="flex-1 overflow-y-auto pr-1 space-y-2">
        <AnimatePresence initial={false}>
          {alerts.map((a) => (
            <motion.div
              key={a.id}
              layout
              initial={{ opacity: 0, scale: 0.97, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "rounded-xl p-3 border",
                a.severity === "human"
                  ? "border-[color:var(--color-human)]/35 bg-[color:var(--color-human)]/5"
                  : a.severity === "warn"
                    ? "border-[color:var(--color-warn)]/35 bg-[color:var(--color-warn)]/5"
                    : "border-[color:var(--color-line)] bg-bg-1/40",
              )}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span
                  className={cn(
                    "font-mono uppercase tracking-wider",
                    a.severity === "human" && "text-[color:var(--color-human)]",
                    a.severity === "warn" && "text-[color:var(--color-warn)]",
                    a.severity === "info" && "text-fg-3",
                  )}
                >
                  {a.severity === "human" ? "human required" : a.severity}
                </span>
                <span className="text-fg-3 font-mono">{a.agent}</span>
              </div>
              <div className="text-fg-0 text-sm font-medium leading-snug">{a.title}</div>
              <div className="text-fg-2 text-xs mt-1 leading-relaxed">{a.body}</div>
              {a.suggested_action && (
                <div className="mt-2 text-xs text-accent-0 font-medium">
                  → {a.suggested_action}
                </div>
              )}
            </motion.div>
          ))}
          {alerts.length === 0 && (
            <div className="text-fg-3 text-sm py-8 text-center">
              All quiet. Supervisor will surface issues here.
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
