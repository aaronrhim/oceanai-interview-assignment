import type { NextRequest } from "next/server";
import { z } from "zod";
import { orchestrate } from "@/lib/orchestrator";
import { makeId } from "@/lib/ids";
import seedLeadsRaw from "@/fixtures/leads.json" with { type: "json" };

export const runtime = "nodejs";
export const maxDuration = 60;

const PipelineRequest = z.object({
  /** Optional: kick the pipeline using a fixture id ("lead_seed_alpha", etc.). */
  seedId: z.string().optional(),
  raw: z
    .object({
      name: z.string(),
      company: z.string(),
      email: z.string(),
      requestedCreditUsd: z.number().int().positive(),
      source: z.enum([
        "cold-email",
        "linkedin",
        "apollo",
        "tradeshow",
        "referral",
        "ads",
        "broker",
      ]),
      notes: z.string().optional(),
    })
    .optional(),
  order: z
    .object({
      goods: z.string().default("Mixed inventory consignment"),
      supplier: z.string().default("Anchor Trade Sourcing Pte Ltd"),
      total_value_usd: z.number().int().positive().default(180_000),
      margin_pct: z.number().min(0).max(80).default(20),
    })
    .optional(),
});

type SeedLead = {
  id: string;
  name: string;
  company: string;
  email: string;
  requestedCreditUsd: number;
  source: string;
  notes?: string;
};

const SEEDS: SeedLead[] = seedLeadsRaw as SeedLead[];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = PipelineRequest.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { seedId, raw: rawIn, order: orderIn } = parsed.data;

  let raw;
  if (seedId) {
    const seed = SEEDS.find((s) => s.id === seedId);
    if (!seed) return Response.json({ error: `unknown seedId: ${seedId}` }, { status: 400 });
    raw = { ...seed, source: seed.source as Exclude<typeof seed.source, string> } as never;
  } else if (rawIn) {
    raw = { id: makeId("lead"), ...rawIn };
  } else {
    // default: random seed
    const seed = SEEDS[Math.floor(Math.random() * SEEDS.length)];
    if (!seed) return Response.json({ error: "no seeds available" }, { status: 500 });
    raw = { ...seed } as never;
  }

  const order = {
    goods: orderIn?.goods ?? "Mixed inventory consignment",
    supplier: orderIn?.supplier ?? "Anchor Trade Sourcing Pte Ltd",
    total_value_usd: orderIn?.total_value_usd ?? 180_000,
    margin_pct: orderIn?.margin_pct ?? 20,
  };

  // Fire-and-forget the pipeline. Events stream via SSE.
  // We don't await, so the HTTP response returns immediately and the SSE
  // stream is the source of truth for progress.
  void orchestrate({ raw, order }).catch((err) => {
    console.error("[orchestrate] failed", err);
  });

  return Response.json({ accepted: true, leadId: (raw as { id: string }).id });
}

export async function GET() {
  return Response.json({ seeds: SEEDS });
}
