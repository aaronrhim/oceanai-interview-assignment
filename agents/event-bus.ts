import type { AgentEvent, SupervisorAlert } from "@/lib/types";

type Listener<T> = (e: T) => void;

class Bus<T> {
  private listeners = new Set<Listener<T>>();
  private buffer: T[] = [];
  private cap: number;

  constructor(cap = 500) {
    this.cap = cap;
  }

  publish(event: T) {
    this.buffer.push(event);
    if (this.buffer.length > this.cap) this.buffer.shift();
    for (const l of this.listeners) {
      try {
        l(event);
      } catch (err) {
        // listeners must not break the bus
        console.error("[event-bus] listener threw", err);
      }
    }
  }

  subscribe(l: Listener<T>): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  /** Snapshot of the last N events. Default returns full buffer. */
  history(n?: number): T[] {
    if (n === undefined) return [...this.buffer];
    return this.buffer.slice(-n);
  }

  size(): number {
    return this.buffer.length;
  }

  clear() {
    this.buffer = [];
  }
}

// ─── Module-level singletons ─────────────────────────────────────────────────
//
// Next.js module caching ensures these survive across requests within a single
// server process. Good enough for a single-process demo. (For multi-instance
// hosting we'd swap to Redis pub/sub; out of scope here.)

declare global {
  // eslint-disable-next-line no-var
  var __oceanx_event_bus: Bus<AgentEvent> | undefined;
  // eslint-disable-next-line no-var
  var __oceanx_alert_bus: Bus<SupervisorAlert> | undefined;
}

export const eventBus: Bus<AgentEvent> =
  globalThis.__oceanx_event_bus ?? (globalThis.__oceanx_event_bus = new Bus<AgentEvent>(500));

export const alertBus: Bus<SupervisorAlert> =
  globalThis.__oceanx_alert_bus ?? (globalThis.__oceanx_alert_bus = new Bus<SupervisorAlert>(200));
