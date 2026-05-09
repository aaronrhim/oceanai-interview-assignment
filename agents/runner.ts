import type { AgentEvent, AgentName } from "@/lib/types";
import { makeId } from "@/lib/ids";
import { eventBus } from "./event-bus";

export interface AgentContext {
  runId: string;
  agent: AgentName;
  emit: (e: Omit<AgentEvent, "runId" | "agent" | "ts">) => void;
}

export type AgentBody<TIn, TOut> = (input: TIn, ctx: AgentContext) => Promise<TOut>;

/**
 * Wraps an agent body so it always emits started / finished / error events to
 * the bus. Returns the run's output. The body is responsible for emitting
 * step / llm / needs_human events as it works.
 */
export async function runAgent<TIn, TOut>(
  agent: AgentName,
  input: TIn,
  body: AgentBody<TIn, TOut>,
): Promise<{ runId: string; output: TOut }> {
  const runId = makeId(agent);
  const ts = () => Date.now();

  const ctx: AgentContext = {
    runId,
    agent,
    emit: (e) => {
      eventBus.publish({ ...e, runId, agent, ts: ts() } as AgentEvent);
    },
  };

  eventBus.publish({ kind: "started", agent, runId, ts: ts(), input });

  try {
    const output = await body(input, ctx);
    eventBus.publish({ kind: "finished", agent, runId, ts: ts(), output });
    return { runId, output };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    eventBus.publish({ kind: "error", agent, runId, ts: ts(), message });
    throw err;
  }
}

/** Sleep for a small, jittery delay — gives demo events visible breathing room. */
export function beat(ms: number): Promise<void> {
  const j = ms * 0.2;
  const wait = ms + (Math.random() * 2 - 1) * j;
  return new Promise((r) => setTimeout(r, Math.max(40, wait)));
}
