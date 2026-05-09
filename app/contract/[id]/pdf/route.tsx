import { renderToStream } from "@react-pdf/renderer";
import { records } from "@/lib/orchestrator";
import { ContractDoc } from "@/components/pdf/contract-doc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;
  const c = records.contracts.get(id);
  if (!c) return new Response("not found", { status: 404 });
  const u = records.underwritings.get(c.underwriting_id);
  if (!u) return new Response("underwriting not found", { status: 404 });
  const lead = records.leads.get(u.lead_id);
  if (!lead) return new Response("lead not found", { status: 404 });

  const stream = await renderToStream(<ContractDoc lead={lead} contract={c} />);

  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="oceanx-contract-${id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
