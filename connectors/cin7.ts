import { beat } from "@/agents/runner";
import { makeId } from "@/lib/ids";

export interface Cin7Product {
  product_id: string;
  sku: string;
  name: string;
}

export interface Cin7PurchaseOrder {
  po_id: string;
  po_number: string;
  supplier: string;
  total_usd: number;
}

export async function upsertProduct(input: {
  name: string;
  sku?: string;
}): Promise<Cin7Product> {
  await beat(280);
  const sku = input.sku ?? input.name.toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 16);
  return { product_id: makeId("prd"), sku, name: input.name };
}

export async function createPurchaseOrder(input: {
  supplier: string;
  product_id: string;
  qty: number;
  unit_cost_usd: number;
}): Promise<Cin7PurchaseOrder> {
  await beat(360);
  const n = String(Math.floor(Math.random() * 9000) + 1000);
  return {
    po_id: makeId("po"),
    po_number: `OXAI-PO-${n}`,
    supplier: input.supplier,
    total_usd: input.qty * input.unit_cost_usd,
  };
}
