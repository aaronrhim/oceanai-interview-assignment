import type { DemoMode } from "./types";

function readEnv(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

export const env = {
  anthropicKey: readEnv("ANTHROPIC_API_KEY"),
  workerModel: readEnv("ANTHROPIC_MODEL_WORKER") ?? "claude-sonnet-4-6",
  supervisorModel: readEnv("ANTHROPIC_MODEL_SUPERVISOR") ?? "claude-opus-4-7",
  demoMode: ((): DemoMode => {
    const v = readEnv("DEMO_MODE");
    return v === "fixtures" ? "fixtures" : "live";
  })(),
  origin: readEnv("NEXT_PUBLIC_APP_ORIGIN") ?? "http://localhost:3000",
} as const;

/**
 * Whether real Anthropic calls should be attempted. False if explicitly
 * fixtures mode, or if no key is configured.
 */
export function liveAgentsEnabled(): boolean {
  return env.demoMode === "live" && Boolean(env.anthropicKey);
}
