import { beat } from "@/agents/runner";
import { makeId } from "@/lib/ids";

export interface XeroInvoice {
  invoice_id: string;
  invoice_number: string;
  status: "DRAFT" | "AUTHORISED";
  total_usd: number;
}

export interface XeroBill {
  bill_id: string;
  bill_number: string;
  status: "DRAFT" | "AUTHORISED";
  total_usd: number;
}

export async function createInvoice(input: {
  customer: string;
  amount_usd: number;
  reference: string;
}): Promise<XeroInvoice> {
  await beat(320);
  const n = String(Math.floor(Math.random() * 9000) + 1000);
  return {
    invoice_id: makeId("inv"),
    invoice_number: `OXAI-INV-${n}`,
    status: "DRAFT",
    total_usd: input.amount_usd,
  };
}

export async function createBill(input: {
  supplier: string;
  amount_usd: number;
  reference: string;
}): Promise<XeroBill> {
  await beat(320);
  const n = String(Math.floor(Math.random() * 9000) + 1000);
  return {
    bill_id: makeId("bil"),
    bill_number: `OXAI-BILL-${n}`,
    status: "DRAFT",
    total_usd: input.amount_usd,
  };
}
