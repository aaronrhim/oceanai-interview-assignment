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
