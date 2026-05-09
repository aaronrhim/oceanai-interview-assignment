"use client";

import { useState, useTransition, useEffect } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { useDemoStore } from "@/lib/store";

interface Seed {
  id: string;
  company: string;
  requestedCreditUsd: number;
  notes?: string;
}

export function TriggerBar() {
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [pending, startTransition] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);
  const reset = useDemoStore((s) => s.reset);

  useEffect(() => {
    fetch("/api/pipeline")
      .then((r) => r.json())
      .then((d) => setSeeds(d.seeds ?? []))
      .catch(() => {
        /* ignore */
      });
  }, []);

  const trigger = (seedId?: string) => {
    startTransition(async () => {
      await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(seedId ? { seedId } : {}),
      }).catch(() => {
        /* surfaced via SSE */
      });
      setPickerOpen(false);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        whileHover={{ y: -1 }}
        onClick={() => trigger()}
        disabled={pending}
        className={cn(
          "rounded-full px-4 py-2 text-sm font-medium transition-colors",
          "bg-accent-0 text-bg-0 hover:bg-accent-1",
          "disabled:opacity-60 disabled:cursor-wait",
          "shadow-[0_0_28px_-6px_var(--color-accent-glow)]",
        )}
      >
        {pending ? "Dispatching…" : "Trigger lead"}
      </motion.button>

      <div className="relative">
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className="rounded-full px-3 py-2 text-sm border border-[color:var(--color-line-strong)] hover:bg-bg-2"
        >
          Pick seed ▾
        </motion.button>
        {pickerOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-[calc(100%+6px)] z-30 w-80 glass rounded-xl p-1 border border-[color:var(--color-line-strong)]"
          >
            {seeds.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => trigger(s.id)}
                className="w-full text-left rounded-lg px-3 py-2 hover:bg-bg-2 transition-colors"
              >
                <div className="text-sm text-fg-0">{s.company}</div>
                <div className="text-xs text-fg-3 font-mono mt-0.5">
                  ${s.requestedCreditUsd.toLocaleString()} requested
                </div>
                {s.notes && <div className="text-xs text-fg-3 mt-1">{s.notes}</div>}
              </button>
            ))}
            {seeds.length === 0 && (
              <div className="px-3 py-2 text-fg-3 text-xs">Loading seeds…</div>
            )}
          </motion.div>
        )}
      </div>

      <button
        type="button"
        onClick={reset}
        className="rounded-full px-3 py-2 text-sm text-fg-3 hover:text-fg-0 hover:bg-bg-2"
      >
        Reset records
      </button>
    </div>
  );
}
