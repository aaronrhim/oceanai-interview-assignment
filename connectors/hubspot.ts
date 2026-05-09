import { beat } from "@/agents/runner";
import { makeId } from "@/lib/ids";

export interface HubspotDealCreated {
  deal_id: string;
  contact_id: string;
  pipeline: string;
  stage: string;
}

export async function createDeal(input: {
  email: string;
  name: string;
  company: string;
  amount_usd: number;
}): Promise<HubspotDealCreated> {
  await beat(380);
  return {
    deal_id: makeId("deal"),
    contact_id: makeId("ctc"),
    pipeline: "trade-finance-default",
    stage: "qualified-to-meet",
  };
}

export async function bookMeeting(input: {
  contact_id: string;
  duration_min: number;
}): Promise<{ meeting_url: string; slot_iso: string }> {
  await beat(280);
  // pick a slot 2 business days out at 10:00 UTC for demo determinism
  const slot = new Date();
  slot.setUTCDate(slot.getUTCDate() + 2);
  slot.setUTCHours(10, 0, 0, 0);
  const id = makeId("mtg").replace("_", "-");
  return {
    meeting_url: `https://app.hubspot.com/meetings/oceanx/${id}`,
    slot_iso: slot.toISOString(),
  };
}
