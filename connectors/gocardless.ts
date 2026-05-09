import { beat } from "@/agents/runner";
import { makeId } from "@/lib/ids";

export interface DirectDebitMandate {
  mandate_id: string;
  status: "pending_customer_approval" | "active";
  customer_email: string;
}

export async function createMandate(input: {
  customer_email: string;
  customer_name: string;
}): Promise<DirectDebitMandate> {
  await beat(400);
  return {
    mandate_id: makeId("mnd"),
    status: "pending_customer_approval",
    customer_email: input.customer_email,
  };
}
