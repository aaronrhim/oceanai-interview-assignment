"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  AgentEvent,
  AgentName,
  Contract,
  Lead,
  SupervisorAlert,
  Underwriting,
} from "./types";

export type AgentStatus = "idle" | "running" | "ok" | "error" | "needs_human";

interface AgentState {
  status: AgentStatus;
  lastRunId?: string;
  lastEventTs?: number;
  lastLabel?: string;
  tokensIn: number;
  tokensOut: number;
  runs: number;
}

interface DemoState {
  // domain records
  leads: Record<string, Lead>;
  underwritings: Record<string, Underwriting>;
  contracts: Record<string, Contract>;

  // realtime state
  events: AgentEvent[];
  alerts: SupervisorAlert[];
  agents: Record<AgentName, AgentState>;

  // actions
  ingestEvent: (e: AgentEvent) => void;
  ingestAlert: (a: SupervisorAlert) => void;
  upsertLead: (l: Lead) => void;
  upsertUnderwriting: (u: Underwriting) => void;
  upsertContract: (c: Contract) => void;
  reset: () => void;
}

const blankAgent = (): AgentState => ({
  status: "idle",
  tokensIn: 0,
  tokensOut: 0,
  runs: 0,
});

const initialAgents = (): Record<AgentName, AgentState> => ({
  "lead-capture": blankAgent(),
  underwriting: blankAgent(),
  contract: blankAgent(),
  supervisor: blankAgent(),
});

const EVENT_CAP = 300;

export const useDemoStore = create<DemoState>()(
  persist(
    (set) => ({
      leads: {},
      underwritings: {},
      contracts: {},
      events: [],
      alerts: [],
      agents: initialAgents(),

      ingestEvent: (e) =>
        set((s) => {
          const next = { ...s.agents[e.agent] };
          next.lastRunId = e.runId;
          next.lastEventTs = e.ts;
          if (e.kind === "started") {
            next.status = "running";
            next.runs += 1;
          } else if (e.kind === "step") {
            next.status = "running";
            next.lastLabel = e.label;
          } else if (e.kind === "llm") {
            next.tokensIn += e.tokens_in;
            next.tokensOut += e.tokens_out;
          } else if (e.kind === "finished") {
            // needs_human is "this run wants attention" — preserve it past
            // the agent's own finish so the purple pill doesn't flicker
            // straight to ok. The next "started" resets to running.
            if (next.status !== "needs_human") next.status = "ok";
          } else if (e.kind === "error") {
            next.status = "error";
          } else if (e.kind === "needs_human") {
            next.status = "needs_human";
          }
          const events = [...s.events, e].slice(-EVENT_CAP);
          return { events, agents: { ...s.agents, [e.agent]: next } };
        }),

      ingestAlert: (a) =>
        set((s) => ({ alerts: [a, ...s.alerts].slice(0, 50) })),

      upsertLead: (l) => set((s) => ({ leads: { ...s.leads, [l.id]: l } })),
      upsertUnderwriting: (u) =>
        set((s) => ({ underwritings: { ...s.underwritings, [u.id]: u } })),
      upsertContract: (c) => set((s) => ({ contracts: { ...s.contracts, [c.id]: c } })),

      reset: () =>
        set({
          leads: {},
          underwritings: {},
          contracts: {},
          events: [],
          alerts: [],
          agents: initialAgents(),
        }),
    }),
    {
      name: "oceanx-demo-store",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        leads: s.leads,
        underwritings: s.underwritings,
        contracts: s.contracts,
      }),
    },
  ),
);
