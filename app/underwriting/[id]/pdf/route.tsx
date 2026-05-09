import { renderToStream } from "@react-pdf/renderer";
import { records } from "@/lib/orchestrator";
import { UnderwritingReport } from "@/components/pdf/underwriting-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;
  const u = records.underwritings.get(id);
  if (!u) return new Response("not found", { status: 404 });
  const lead = records.leads.get(u.lead_id);
  if (!lead) return new Response("lead not found", { status: 404 });

  const stream = await renderToStream(<UnderwritingReport lead={lead} underwriting={u} />);

  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="oceanx-underwriting-${id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
