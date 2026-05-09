import { records } from "@/lib/orchestrator";
import { eventBus, alertBus } from "@/agents/event-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Snapshot of in-memory state. Used by the dashboard on load. */
export function GET() {
  return Response.json({
    leads: Array.from(records.leads.values()),
    underwritings: Array.from(records.underwritings.values()),
    contracts: Array.from(records.contracts.values()),
    events: eventBus.history(),
    alerts: alertBus.history(),
  });
}

/** Wipe all in-memory state. Lets the demo restart cleanly between rehearsals. */
export function DELETE() {
  records.leads.clear();
  records.underwritings.clear();
  records.contracts.clear();
  eventBus.clear();
  alertBus.clear();
  return Response.json({ ok: true });
}
