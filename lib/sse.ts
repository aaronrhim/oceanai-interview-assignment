"use client";

import { useEffect } from "react";
import type { AgentEvent, SupervisorAlert } from "./types";
import { useDemoStore } from "./store";

/**
 * Subscribes the demo store to /api/events. Mounts once on the client.
 * Reconnects with backoff on transport errors.
 */
export function useAgentEventStream() {
  const ingestEvent = useDemoStore((s) => s.ingestEvent);
  const ingestAlert = useDemoStore((s) => s.ingestAlert);

  useEffect(() => {
    let es: EventSource | null = null;
    let attempt = 0;
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (cancelled) return;
      es = new EventSource("/api/events");

      es.addEventListener("event", (msg) => {
        try {
          const e = JSON.parse((msg as MessageEvent).data) as AgentEvent;
          ingestEvent(e);
        } catch {
          /* ignore */
        }
      });

      es.addEventListener("alert", (msg) => {
        try {
          const a = JSON.parse((msg as MessageEvent).data) as SupervisorAlert;
          ingestAlert(a);
        } catch {
          /* ignore */
        }
      });

      es.addEventListener("hello", () => {
        attempt = 0;
      });

      es.onerror = () => {
        es?.close();
        es = null;
        if (cancelled) return;
        attempt = Math.min(attempt + 1, 5);
        const delay = 500 * 2 ** attempt;
        reconnectTimer = setTimeout(connect, delay);
      };
    };

    connect();
    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
    };
  }, [ingestEvent, ingestAlert]);
}
