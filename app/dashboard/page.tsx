import { liveAgentsEnabled } from "@/lib/env";
import { DashboardShell } from "./dashboard-shell";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <DashboardShell
      initial={{
        liveLLM: liveAgentsEnabled(),
        records: { leadIds: [], underwritingIds: [], contractIds: [] },
      }}
    />
  );
}
