import type { NextRequest } from "next/server";
import { eventBus, alertBus } from "@/agents/event-bus";
import { ensureSupervisor } from "@/agents/supervisor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 15_000;

/**
 * Server-Sent Events stream. Emits two event types: `event` (AgentEvent) and
 * `alert` (SupervisorAlert). Heartbeats every 15s.
 *
 * On connect, we replay the last 30 events so the dashboard hydrates quickly
 * after a navigation.
 */
export function GET(_req: NextRequest) {
  ensureSupervisor();

  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let unsubE: (() => void) | null = null;
  let unsubA: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          // controller closed
        }
      };

      // Initial hello + replay
      send("hello", { ts: Date.now() });
      for (const e of eventBus.history(30)) send("event", e);

      unsubE = eventBus.subscribe((e) => send("event", e));
      unsubA = alertBus.subscribe((a) => send("alert", a));

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
        } catch {
          // closed
        }
      }, HEARTBEAT_MS);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      unsubE?.();
      unsubA?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
