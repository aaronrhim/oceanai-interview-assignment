import type { Metadata } from "next";
import { LandingShell } from "@/components/landing/landing-shell";
import { liveAgentsEnabled } from "@/lib/env";

export const metadata: Metadata = {
  title: "OceanX AI — Agents that run the desk",
  description:
    "Trade finance automation, end-to-end. Lead Capture → Underwriting → Contract, supervised by Opus 4.7.",
};

export default function Home() {
  return <LandingShell liveLLM={liveAgentsEnabled()} />;
}
